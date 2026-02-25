import { NodeApi, type Path, PathApi, TextApi, type TText } from "platejs";
import type { PlateEditor } from "platejs/react";
import type { Point, Range } from "slate";
import { debugInfo, debugLog } from "~/lib/debug";
import { detectEntitySpans } from "~/lib/entity-detection";
import {
  linkRangeToCanonical,
  resolveStrictCanonicalMatch,
} from "~/lib/entity-linking";
import { ALL_ENTITY_MARK_FIELDS, createEntityId } from "~/lib/entity-ops";
import type { EntitySpan, PersistedEntityMark } from "~/lib/entity-types";
import { uiPreferences$ } from "~/lib/state/ui";

export interface ApplyEntityOptions {
  entitySource?: PersistedEntityMark["entitySource"];
  normalizeToWordBoundaries?: boolean;
  shouldSkipCandidate?: (params: {
    paragraphPath: Path;
    paragraphText: string;
    span: EntitySpan;
    spanText: string;
  }) => boolean;
}

export function offsetsToRange(
  editor: PlateEditor,
  paragraphPath: Path,
  start: number,
  end: number,
): Range | null {
  const textNodes = [
    ...editor.api.nodes<TText>({ at: paragraphPath, match: TextApi.isText }),
  ];
  if (textNodes.length === 0) return null;

  const totalLength = textNodes.reduce(
    (sum, [node]) => sum + node.text.length,
    0,
  );
  const normalizedStart = Math.min(Math.max(start, 0), totalLength);
  const normalizedEnd = Math.min(Math.max(end, normalizedStart), totalLength);

  let currentOffset = 0;
  let anchor: Point | null = null;
  let focus: Point | null = null;

  for (const [node, path] of textNodes) {
    const textLength = node.text.length;
    const nodeStart = currentOffset;
    const nodeEnd = nodeStart + textLength;

    if (!anchor && normalizedStart >= nodeStart && normalizedStart <= nodeEnd) {
      anchor = { offset: normalizedStart - nodeStart, path };
    }

    if (!focus && normalizedEnd >= nodeStart && normalizedEnd <= nodeEnd) {
      focus = { offset: normalizedEnd - nodeStart, path };
      break;
    }

    currentOffset = nodeEnd;
  }

  if (!anchor) {
    const [, firstPath] = textNodes[0];
    anchor = { offset: 0, path: firstPath };
  }

  if (!focus) {
    const [lastNode, lastPath] = textNodes[textNodes.length - 1];
    focus = { offset: lastNode.text.length, path: lastPath };
  }

  return { anchor, focus };
}

function isWordChar(char: string | undefined): boolean {
  if (!char) return false;
  return /[\p{L}\p{N}_'’-]/u.test(char);
}

export function normalizeToWordBoundaries(
  text: string,
  span: EntitySpan,
): EntitySpan {
  let start = Math.max(0, Math.min(span.start, text.length));
  let end = Math.max(start, Math.min(span.end, text.length));

  while (start > 0 && isWordChar(text[start - 1])) {
    start -= 1;
  }

  while (end < text.length && isWordChar(text[end])) {
    end += 1;
  }

  return { ...span, end, start };
}

export function clearEntityMarksInBlock(
  editor: PlateEditor,
  blockPath: Path,
): void {
  editor.tf.unsetNodes([...ALL_ENTITY_MARK_FIELDS], {
    at: blockPath,
    match: TextApi.isText,
    split: true,
  });
}

export function rangeToOffsets(
  editor: PlateEditor,
  blockPath: Path,
  range: Range,
): { start: number; end: number } | null {
  const textNodes = [
    ...editor.api.nodes<TText>({ at: blockPath, match: TextApi.isText }),
  ];
  if (!textNodes.length) return null;

  let cursor = 0;
  let startOffset: number | null = null;
  let endOffset: number | null = null;

  for (const [node, path] of textNodes) {
    const length = node.text.length;
    const isAnchor = PathApi.equals(path, range.anchor.path);
    const isFocus = PathApi.equals(path, range.focus.path);

    if (isAnchor) startOffset = cursor + range.anchor.offset;
    if (isFocus) endOffset = cursor + range.focus.offset;

    cursor += length;
  }

  if (startOffset === null || endOffset === null) return null;
  return {
    end: Math.max(startOffset, endOffset),
    start: Math.min(startOffset, endOffset),
  };
}

function rangesOverlap(
  a: { end: number; start: number },
  b: { end: number; start: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

export function collectLinkOffsetRanges(
  editor: PlateEditor,
  paragraphPath: Path,
): Array<{ start: number; end: number }> {
  const linkType = editor.getType("a");
  const links = [
    ...editor.api.nodes({
      at: paragraphPath,
      match: (node) =>
        !TextApi.isText(node) && (node as { type?: string }).type === linkType,
    }),
  ];

  const ranges: Array<{ start: number; end: number }> = [];
  for (const [, linkPath] of links) {
    const linkRange = editor.api.range(linkPath);
    if (!linkRange) continue;
    const offsets = rangeToOffsets(editor, paragraphPath, linkRange);
    if (!offsets) continue;
    ranges.push(offsets);
  }
  return ranges;
}

export function collectExistingEntityRanges(
  editor: PlateEditor,
  paragraphPath: Path,
): Array<{ start: number; end: number; entityId: string }> {
  const textNodes = [
    ...editor.api.nodes<TText>({ at: paragraphPath, match: TextApi.isText }),
  ];

  const rangesById = new Map<string, { start: number; end: number }>();
  let cursor = 0;
  for (const [node] of textNodes) {
    const leaf = node as {
      entity?: boolean;
      entityId?: string;
      entityType?: string;
      text: string;
    };
    const start = cursor;
    const end = cursor + node.text.length;
    cursor = end;

    if (leaf.entity !== true || !leaf.entityId || !leaf.entityType) {
      continue;
    }

    const existing = rangesById.get(leaf.entityId);
    if (!existing) {
      rangesById.set(leaf.entityId, { end, start });
    } else {
      existing.start = Math.min(existing.start, start);
      existing.end = Math.max(existing.end, end);
    }
  }

  return [...rangesById.entries()].map(([entityId, range]) => ({
    end: range.end,
    entityId,
    start: range.start,
  }));
}

export async function applyEntitySpansToBlock(
  editor: PlateEditor,
  blockPath: Path,
  spans: EntitySpan[],
  options: ApplyEntityOptions = {},
): Promise<void> {
  const paragraphNode = editor.api.node(blockPath);
  if (!paragraphNode) return;

  const paragraphText = NodeApi.string(paragraphNode[0]);
  if (!paragraphText.trim()) return;

  const entitySource = options.entitySource ?? "model";
  const autoLink = uiPreferences$.entityAutoLinkStrictMatches.get() !== false;

  const linkRanges = collectLinkOffsetRanges(editor, blockPath);
  const reservedRanges = [...linkRanges];
  let appliedCount = 0;
  let skippedOverlapCount = 0;
  let skippedLinkCount = 0;
  let skippedDismissedCount = 0;

  debugLog("[Entity] Applying spans to block", {
    autoLink,
    blockPath,
    entitySource,
    linkRanges,
    paragraphText,
    spans,
  });

  for (const span of spans) {
    const normalizedSpan = options.normalizeToWordBoundaries
      ? normalizeToWordBoundaries(paragraphText, span)
      : span;

    const range = offsetsToRange(
      editor,
      blockPath,
      normalizedSpan.start,
      normalizedSpan.end,
    );
    if (!range) continue;

    const spanOffsets = rangeToOffsets(editor, blockPath, range);
    if (!spanOffsets) continue;
    const spanText = paragraphText
      .slice(spanOffsets.start, spanOffsets.end)
      .trim();

    if (linkRanges.some((linkRange) => rangesOverlap(linkRange, spanOffsets))) {
      skippedLinkCount += 1;
      debugLog("[Entity] Skipping span due to link intersection", {
        blockPath,
        linkRanges,
        span,
        spanOffsets,
        spanText,
      });
      continue;
    }

    if (
      options.shouldSkipCandidate?.({
        paragraphPath: blockPath,
        paragraphText,
        span: normalizedSpan,
        spanText,
      })
    ) {
      skippedDismissedCount += 1;
      debugLog("[Entity] Skipping dismissed span", {
        blockPath,
        span: normalizedSpan,
        spanText,
      });
      continue;
    }

    if (
      reservedRanges.some((existing) => rangesOverlap(existing, spanOffsets))
    ) {
      skippedOverlapCount += 1;
      debugLog("[Entity] Skipping overlap span", {
        blockPath,
        reservedRanges,
        span: normalizedSpan,
        spanOffsets,
        spanText,
      });
      continue;
    }

    const canonicalName = autoLink
      ? resolveStrictCanonicalMatch(spanText)
      : null;
    if (canonicalName) {
      editor.tf.unsetNodes([...ALL_ENTITY_MARK_FIELDS], {
        at: range,
        match: TextApi.isText,
        split: true,
      });
      linkRangeToCanonical(editor, range, canonicalName);
      reservedRanges.push(spanOffsets);
      appliedCount += 1;
      continue;
    }

    const entityId = createEntityId();
    editor.tf.setNodes(
      {
        candidateRevision: 0,
        candidateState: "active",
        entity: true,
        entityCanonicalName: undefined,
        entityConfidence: normalizedSpan.confidence,
        entityId,
        entitySource,
        entityType: normalizedSpan.type,
      },
      {
        at: range,
        match: TextApi.isText,
        split: true,
      },
    );
    reservedRanges.push(spanOffsets);
    appliedCount += 1;
  }

  debugInfo("[Entity] Applied spans summary", {
    appliedCount,
    blockPath,
    skippedDismissedCount,
    skippedLinkCount,
    skippedOverlapCount,
    totalSpans: spans.length,
  });
}

export async function runEntityDetectionOnParagraph(
  editor: PlateEditor,
  blockPath: Path,
  options: ApplyEntityOptions = {},
): Promise<void> {
  const nodeEntry = editor.api.node(blockPath);
  if (!nodeEntry) return;

  const text = NodeApi.string(nodeEntry[0]);
  clearEntityMarksInBlock(editor, blockPath);

  if (!text.trim()) return;

  const spans = await detectEntitySpans(text);
  await applyEntitySpansToBlock(editor, blockPath, spans, {
    ...options,
    entitySource: "model",
    normalizeToWordBoundaries: true,
  });
}
