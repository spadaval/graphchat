"use client";

import { debugInfo, debugLog } from "~/lib/debug";
import type { NerEntityType, NerSpan } from "~/lib/ner-types";

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

export type { NerEntityType };
export type NerEntity = NerSpan;

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

async function loadClassifier(): Promise<TokenClassifier> {
  const loadStart = performance.now();
  const { pipeline } = await import("@huggingface/transformers");
  const webGpuInfo = getWebGpuInfo();

  try {
    const classifier = await pipeline("token-classification", NER_MODEL_ID, {
      ...(webGpuInfo.available ? { device: "webgpu" } : {}),
    });

    const loadMs = Math.round(performance.now() - loadStart);
    debugInfo("[NER] Pipeline ready", {
      device: webGpuInfo.available ? "webgpu" : "cpu",
      loadMs,
      model: NER_MODEL_ID,
    });

    return classifier as TokenClassifier;
  } catch (error) {
    debugInfo("[NER] WebGPU pipeline failed; retrying CPU", {
      error,
      model: NER_MODEL_ID,
    });

    const classifier = await pipeline("token-classification", NER_MODEL_ID, {});
    const loadMs = Math.round(performance.now() - loadStart);

    debugInfo("[NER] CPU pipeline ready", {
      loadMs,
      model: NER_MODEL_ID,
    });

    return classifier as TokenClassifier;
  }
}

async function getNerPipeline(): Promise<TokenClassifier> {
  if (!nerPipelinePromise) {
    debugInfo("[NER] Initializing pipeline", {
      model: NER_MODEL_ID,
      webGpuInfo: getWebGpuInfo(),
    });

    nerPipelinePromise = loadClassifier()
      .then((classifier) => {
        nerPipelineReady = true;
        return classifier;
      })
      .catch((error) => {
        nerPipelinePromise = null;
        throw error;
      });
  } else if (nerPipelineReady) {
    debugLog("[NER] Reusing cached pipeline");
  }

  return nerPipelinePromise;
}

export async function warmupNerPipeline(): Promise<void> {
  await getNerPipeline();
}

export async function detectNamedEntities(text: string): Promise<NerSpan[]> {
  if (!text.trim()) {
    debugLog("[NER] Skipping inference for empty paragraph");
    return [];
  }

  const preview = text.slice(0, 120);
  debugInfo("[NER] Inference started", {
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
          confidence: item.score,
          end: item.end as number,
          start: item.start as number,
          type: item.type as NerEntityType,
        } satisfies NerSpan;
      }

      const derived = findTokenOffsets(text, item.word, searchCursor);
      if (!derived) return null;

      derivedOffsetCount += 1;
      searchCursor = derived.end;
      return {
        confidence: item.score,
        end: derived.end,
        start: derived.start,
        type: item.type as NerEntityType,
      } satisfies NerSpan;
    })
    .filter((item): item is NerSpan => item !== null)
    .sort((a, b) => a.start - b.start);

  const merged: NerSpan[] = [];
  for (const entity of mappedWithOffsets) {
    const previous = merged[merged.length - 1];

    if (!previous) {
      merged.push(entity);
      continue;
    }

    const overlapsOrTouches = entity.start <= previous.end + 1;
    if (overlapsOrTouches && entity.type === previous.type) {
      previous.end = Math.max(previous.end, entity.end);
      previous.confidence = Math.max(
        previous.confidence ?? 0,
        entity.confidence ?? 0,
      );
      continue;
    }

    merged.push(entity);
  }

  debugInfo("[NER] Inference completed", {
    derivedOffsetCount,
    inferenceMs,
    mappedCount: merged.length,
    rawCount: result.length,
  });

  debugLog("[NER] Raw label counts", labelCounts);
  return merged;
}
