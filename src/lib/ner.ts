"use client";

const NER_MODEL_ID = "onnx-community/distilbert-NER-ONNX";

type TokenClassificationOptions = {
  aggregation_strategy: "simple";
};

type TokenClassifier = (
  input: string,
  options: TokenClassificationOptions,
) => Promise<unknown>;

type RawEntity = {
  entity?: string;
  end?: number;
  entity_group?: string;
  index?: number;
  label?: string;
  score?: number;
  start?: number;
  word?: string;
};

export type NerEntityType = "location" | "organization" | "person";

export interface NerEntity {
  end: number;
  start: number;
  type: NerEntityType;
}

let nerPipelinePromise: Promise<TokenClassifier> | null = null;
let nerPipelineReady = false;

function getWebGpuInfo() {
  if (typeof navigator === "undefined") {
    return { available: false, reason: "navigator-unavailable" };
  }

  const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
  if (!gpu) {
    return { available: false, reason: "navigator.gpu-missing" };
  }

  return { available: true, reason: "ok" };
}

function normalizeEntityType(value: string | undefined): NerEntityType | null {
  if (!value) return null;

  const normalized = value.toUpperCase().replace(/^[BI]-/, "");

  if (
    normalized.includes("PER") ||
    normalized.includes("PERSON") ||
    normalized.includes("NPP")
  ) {
    return "person";
  }

  if (
    normalized.includes("ORG") ||
    normalized.includes("ORGANIZATION") ||
    normalized.includes("NOG") ||
    normalized.includes("NOR")
  ) {
    return "organization";
  }

  if (
    normalized.includes("LOC") ||
    normalized.includes("GPE") ||
    normalized.includes("NOL")
  ) {
    return "location";
  }

  return null;
}

function getRawEntityLabel(entity: RawEntity): string | undefined {
  return entity.entity_group ?? entity.entity ?? entity.label;
}

function cleanTokenWord(word: string | undefined): string {
  if (!word) return "";

  return word
    .replace(/^##/, "")
    .replace(/[▁Ġ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findTokenOffsets(
  text: string,
  tokenWord: string | undefined,
  searchFrom: number,
): { end: number; start: number } | null {
  const normalizedToken = cleanTokenWord(tokenWord);
  if (!normalizedToken) return null;

  const direct = text.indexOf(normalizedToken, searchFrom);
  if (direct >= 0) {
    return {
      end: direct + normalizedToken.length,
      start: direct,
    };
  }

  const lowerText = text.toLowerCase();
  const lowerToken = normalizedToken.toLowerCase();
  const fallback = lowerText.indexOf(lowerToken, searchFrom);
  if (fallback >= 0) {
    return {
      end: fallback + lowerToken.length,
      start: fallback,
    };
  }

  return null;
}

async function getNerPipeline(): Promise<TokenClassifier> {
  if (!nerPipelinePromise) {
    const webGpuInfo = getWebGpuInfo();
    console.info("[NER] Initializing pipeline", {
      model: NER_MODEL_ID,
      webGpuAvailable: webGpuInfo.available,
      webGpuReason: webGpuInfo.reason,
    });

    nerPipelinePromise = (async () => {
      const loadStart = performance.now();
      const { pipeline } = await import("@huggingface/transformers");
      const classifier = await pipeline("token-classification", NER_MODEL_ID, {
        device: "webgpu",
      });
      const loadMs = Math.round(performance.now() - loadStart);
      nerPipelineReady = true;

      console.info("[NER] Pipeline ready", {
        loadMs,
        model: NER_MODEL_ID,
      });

      return classifier as TokenClassifier;
    })();
  } else if (nerPipelineReady) {
    console.debug("[NER] Reusing cached pipeline");
  }

  return nerPipelinePromise;
}

export async function detectNamedEntities(text: string): Promise<NerEntity[]> {
  if (!text.trim()) {
    console.debug("[NER] Skipping inference for empty paragraph");
    return [];
  }

  const preview = text.slice(0, 120);
  console.info("[NER] Inference started", {
    length: text.length,
    preview,
  });

  const inferenceStart = performance.now();
  const model = await getNerPipeline();
  const result = await model(text, {
    aggregation_strategy: "simple",
  });
  const inferenceMs = Math.round(performance.now() - inferenceStart);

  if (!Array.isArray(result)) {
    console.warn("[NER] Inference result is not an array", {
      inferenceMs,
      resultType: typeof result,
    });
    return [];
  }

  const labelCounts = result.reduce<Record<string, number>>((acc, item) => {
    const entity = item as RawEntity;
    const label = getRawEntityLabel(entity) ?? "undefined";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const mappedRaw = result
    .map((item) => {
      const entity = item as RawEntity;
      const rawLabel = getRawEntityLabel(entity);
      const type = normalizeEntityType(rawLabel);

      return {
        end: entity.end,
        rawLabel,
        score: entity.score,
        start: entity.start,
        tokenIndex: entity.index,
        type,
        word: entity.word,
      };
    })
    .filter((item) => item.type !== null);

  let derivedOffsetCount = 0;
  let searchCursor = 0;
  const mappedWithOffsets = mappedRaw
    .map((item) => {
      const hasOffsets =
        Number.isInteger(item.start) &&
        Number.isInteger(item.end) &&
        (item.start as number) < (item.end as number);

      if (hasOffsets) {
        return {
          end: item.end as number,
          start: item.start as number,
          type: item.type as NerEntityType,
        };
      }

      const derived = findTokenOffsets(text, item.word, searchCursor);
      if (!derived) return null;

      derivedOffsetCount += 1;
      searchCursor = derived.end;
      return {
        end: derived.end,
        start: derived.start,
        type: item.type as NerEntityType,
      };
    })
    .filter((item): item is NerEntity => item !== null)
    .sort((a, b) => a.start - b.start);

  const merged: NerEntity[] = [];
  for (const entity of mappedWithOffsets) {
    const previous = merged[merged.length - 1];

    if (!previous) {
      merged.push(entity);
      continue;
    }

    const overlapsOrTouches = entity.start <= previous.end + 1;
    if (overlapsOrTouches && entity.type === previous.type) {
      previous.end = Math.max(previous.end, entity.end);
      continue;
    }

    merged.push(entity);
  }

  console.info("[NER] Inference completed", {
    derivedOffsetCount,
    inferenceMs,
    mappedCount: merged.length,
    rawCount: result.length,
  });

  if (result.length > 0) {
    const sample = result.slice(0, 8).map((item) => {
      const entity = item as RawEntity;
      return {
        end: entity.end,
        entity_group: entity.entity_group,
        start: entity.start,
      };
    });
    console.debug("[NER] Raw entity sample", sample);
  }

  console.debug("[NER] Raw label counts", labelCounts);

  if (merged.length > 0) {
    console.debug("[NER] Normalized entities", merged);
    console.info(
      "[NER] Normalized entity spans",
      merged.map((entity, index) => ({
        end: entity.end,
        entityIndex: index,
        spanText: text.slice(entity.start, entity.end),
        start: entity.start,
        type: entity.type,
      })),
    );
  } else {
    console.warn("[NER] No normalized entities from raw result", {
      labelCounts,
      note: "If labels are mostly O/undefined, the model is not finding entities for this input.",
      typedRawCount: mappedRaw.length,
    });
  }

  return merged;
}
