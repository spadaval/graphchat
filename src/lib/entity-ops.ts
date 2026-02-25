import { TextApi, type TText } from "platejs";
import type { PlateEditor } from "platejs/react";
import { Editor, type Range, type RangeRef } from "slate";
import { debugLog, debugWarn } from "~/lib/debug";
import type { PersistedEntityMark } from "~/lib/entity-types";

type CandidateText = TText & {
  candidateRevision?: number;
  candidateState?: "active" | "dismissed";
  entity?: boolean;
  entityCanonicalName?: string;
  entityConfidence?: number;
  entityId?: string;
  entitySource?: "manual" | "model";
  entityType?: PersistedEntityMark["entityType"];
  ner?: boolean;
  nerCanonicalName?: string;
  nerConfidence?: number;
  nerId?: string;
  nerSource?: "manual" | "model";
  nerType?: PersistedEntityMark["entityType"];
};

const ENTITY_FIELDS = [
  "entity",
  "entityId",
  "entityType",
  "entitySource",
  "entityCanonicalName",
  "entityConfidence",
  "candidateState",
  "candidateRevision",
] as const;

const LEGACY_NER_FIELDS = [
  "ner",
  "nerId",
  "nerType",
  "nerSource",
  "nerCanonicalName",
  "nerConfidence",
] as const;

const ALL_CANDIDATE_FIELDS = [...ENTITY_FIELDS, ...LEGACY_NER_FIELDS] as const;

function createCandidateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `entity-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function getAllTextNodes(editor: PlateEditor): Array<[TText, number[]]> {
  return [...editor.api.nodes<TText>({ match: TextApi.isText })];
}

function isEntityLeaf(leaf: CandidateText): boolean {
  return (
    (leaf.entity === true && !!leaf.entityType) ||
    (leaf.ner === true && !!leaf.nerType)
  );
}

function getLeafEntityId(leaf: CandidateText): string | undefined {
  return leaf.entityId ?? leaf.nerId;
}

function getLeafType(
  leaf: CandidateText,
): PersistedEntityMark["entityType"] | undefined {
  return leaf.entityType ?? leaf.nerType;
}

export function getEntityRangeById(
  editor: PlateEditor,
  entityId: string,
): Range | null {
  if (!entityId) return null;

  const textNodes = getAllTextNodes(editor);
  let segmentStartPath: number[] | null = null;
  let segmentEndPath: number[] | null = null;
  let segmentEndOffset = 0;
  let inSegment = false;
  let segmentCount = 0;

  for (const [node, path] of textNodes) {
    const leaf = node as CandidateText;
    const matches = isEntityLeaf(leaf) && getLeafEntityId(leaf) === entityId;

    if (matches) {
      if (!inSegment) {
        inSegment = true;
        segmentCount += 1;
        segmentStartPath = path;
      }

      segmentEndPath = path;
      segmentEndOffset = node.text.length;
      continue;
    }

    inSegment = false;
  }

  if (!segmentStartPath || !segmentEndPath || segmentCount === 0) {
    return null;
  }

  if (segmentCount > 1) {
    debugWarn(
      "[Entity] Refusing operation: disjoint fragments share entityId",
      {
        entityId,
        segmentCount,
      },
    );
    return null;
  }

  return {
    anchor: { offset: 0, path: segmentStartPath },
    focus: { offset: segmentEndOffset, path: segmentEndPath },
  };
}

export function getEntityRangeRefById(
  editor: PlateEditor,
  entityId: string,
): RangeRef | null {
  const range = getEntityRangeById(editor, entityId);
  if (!range) return null;
  return Editor.rangeRef(editor as unknown as Editor, range, {
    affinity: "inward",
  });
}

export function getEntityMarkById(
  editor: PlateEditor,
  entityId: string,
): PersistedEntityMark | null {
  const rangeRef = getEntityRangeRefById(editor, entityId);
  const range = rangeRef?.current;
  if (!rangeRef || !range) return null;

  const nodeEntry = editor.api.node(range.anchor.path);
  if (!nodeEntry || !TextApi.isText(nodeEntry[0])) {
    rangeRef.unref();
    return null;
  }
  const leaf = nodeEntry[0] as CandidateText;

  const type = getLeafType(leaf);
  const source = leaf.entitySource ?? leaf.nerSource;
  const resolvedId = getLeafEntityId(leaf);
  if (!type || !source || !resolvedId) {
    rangeRef.unref();
    return null;
  }

  const result = {
    candidateRevision: leaf.candidateRevision,
    candidateState: leaf.candidateState ?? "active",
    entity: true,
    entityCanonicalName: leaf.entityCanonicalName ?? leaf.nerCanonicalName,
    entityConfidence: leaf.entityConfidence ?? leaf.nerConfidence,
    entityId: resolvedId,
    entitySource: source,
    entityType: type,
  };
  rangeRef.unref();
  return result;
}

export function getEntityTextById(
  editor: PlateEditor,
  entityId: string,
): string {
  const rangeRef = getEntityRangeRefById(editor, entityId);
  const range = rangeRef?.current;
  if (!rangeRef || !range) return "";

  const textNodes = [
    ...editor.api.nodes<TText>({ at: range, match: TextApi.isText }),
  ];
  const text = textNodes.map(([node]) => node.text).join("");
  rangeRef.unref();
  return text;
}

export function clearEntityMark(editor: PlateEditor, entityId: string): void {
  const rangeRef = getEntityRangeRefById(editor, entityId);
  const range = rangeRef?.current;
  if (!rangeRef || !range) return;

  debugLog("[Entity] Clearing candidate mark", { entityId, range });
  editor.tf.unsetNodes([...ALL_CANDIDATE_FIELDS], {
    at: range,
    match: TextApi.isText,
    split: true,
  });
  rangeRef.unref();
}

export function replaceEntityMark(
  editor: PlateEditor,
  entityId: string,
  nextRange: Range,
  mark: PersistedEntityMark,
): void {
  const currentRangeRef = getEntityRangeRefById(editor, entityId);
  const currentRange = currentRangeRef?.current;
  if (!currentRangeRef || !currentRange) return;

  const nextRangeRef = Editor.rangeRef(editor as unknown as Editor, nextRange, {
    affinity: "inward",
  });

  editor.tf.unsetNodes([...ALL_CANDIDATE_FIELDS], {
    at: currentRange,
    match: TextApi.isText,
    split: true,
  });

  const resolvedNextRange = nextRangeRef.current;
  if (!resolvedNextRange) {
    currentRangeRef.unref();
    nextRangeRef.unref();
    return;
  }

  editor.tf.setNodes(mark, {
    at: resolvedNextRange,
    match: TextApi.isText,
    split: true,
  });

  currentRangeRef.unref();
  nextRangeRef.unref();
}

export function normalizeLegacyEntityMarksAndIds(editor: PlateEditor): boolean {
  const updates: Array<{ path: number[]; patch: Partial<CandidateText> }> = [];
  const textNodes = getAllTextNodes(editor);
  let currentLegacyGroupId: string | null = null;
  let previousLegacySignature: string | null = null;

  for (const [node, path] of textNodes) {
    const leaf = node as CandidateText;
    const isLegacyNer = leaf.ner === true && !!leaf.nerType;
    const isEntity = leaf.entity === true && !!leaf.entityType;

    if (!isLegacyNer && !isEntity) {
      currentLegacyGroupId = null;
      previousLegacySignature = null;
      continue;
    }

    const existingId = getLeafEntityId(leaf);
    const resolvedType = getLeafType(leaf);
    const resolvedSource = leaf.entitySource ?? leaf.nerSource ?? "model";
    const resolvedCanonical = leaf.entityCanonicalName ?? leaf.nerCanonicalName;
    const resolvedConfidence = leaf.entityConfidence ?? leaf.nerConfidence;

    let entityId = existingId;

    // Legacy leaves may have no id at all: group contiguous leaves with same signature.
    if (!entityId) {
      const currentSignature = JSON.stringify({
        canonicalName: resolvedCanonical ?? null,
        confidence: resolvedConfidence ?? null,
        source: resolvedSource,
        type: resolvedType ?? null,
      });
      if (
        !currentLegacyGroupId ||
        currentSignature !== previousLegacySignature
      ) {
        currentLegacyGroupId = createCandidateId();
      }
      previousLegacySignature = currentSignature;
      entityId = currentLegacyGroupId;
    } else {
      currentLegacyGroupId = null;
      previousLegacySignature = null;
    }

    if (!resolvedType) continue;

    const patch: Partial<CandidateText> = {
      candidateState: leaf.candidateState ?? "active",
      entity: true,
      entityCanonicalName: resolvedCanonical,
      entityConfidence: resolvedConfidence,
      entityId,
      entitySource: resolvedSource,
      entityType: resolvedType,
    };

    const needsLegacyCleanup = isLegacyNer || leaf.nerId || leaf.nerType;
    if (needsLegacyCleanup) {
      patch.ner = undefined;
      patch.nerCanonicalName = undefined;
      patch.nerConfidence = undefined;
      patch.nerId = undefined;
      patch.nerSource = undefined;
      patch.nerType = undefined;
    }

    const changed =
      leaf.entity !== patch.entity ||
      leaf.entityId !== patch.entityId ||
      leaf.entityType !== patch.entityType ||
      leaf.entitySource !== patch.entitySource ||
      leaf.entityCanonicalName !== patch.entityCanonicalName ||
      leaf.entityConfidence !== patch.entityConfidence ||
      leaf.candidateState !== patch.candidateState ||
      needsLegacyCleanup;

    if (changed) {
      updates.push({ path, patch });
    }
  }

  if (updates.length === 0) return false;

  for (const update of updates) {
    editor.tf.setNodes(update.patch, {
      at: update.path,
      match: TextApi.isText,
      split: false,
    });
    editor.tf.unsetNodes([...LEGACY_NER_FIELDS], {
      at: update.path,
      match: TextApi.isText,
      split: false,
    });
  }

  debugLog("[Entity] Normalized legacy candidate marks", {
    updatedLeafCount: updates.length,
  });
  return true;
}

export function createEntityId(): string {
  return createCandidateId();
}

export const ENTITY_MARK_FIELDS = ENTITY_FIELDS;
export const ALL_ENTITY_MARK_FIELDS = ALL_CANDIDATE_FIELDS;
