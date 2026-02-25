import { type Path, TextApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import { Editor, type PathRef, type Range } from "slate";
import { debugLog, debugWarn } from "~/lib/debug";
import { offsetsToRange, rangeToOffsets } from "~/lib/entity-editor";
import {
  ENTITY_MARK_FIELDS,
  getEntityMarkById,
  getEntityRangeRefById,
} from "~/lib/entity-ops";

export type BoundaryEdge = "left" | "right";
export type BoundaryDirection = "expand" | "contract";

type Token = { end: number; start: number; text: string };

export class NoAdjacentWord extends Error {
  constructor(message = "NoAdjacentWord") {
    super(message);
    this.name = "NoAdjacentWord";
  }
}

export class OverlapConflict extends Error {
  constructor(message = "OverlapConflict") {
    super(message);
    this.name = "OverlapConflict";
  }
}

export class MinimumSpanViolation extends Error {
  constructor(message = "MinimumSpanViolation") {
    super(message);
    this.name = "MinimumSpanViolation";
  }
}

export class OutOfBounds extends Error {
  constructor(message = "OutOfBounds") {
    super(message);
    this.name = "OutOfBounds";
  }
}

let boundaryActionSeq = 0;

function nextBoundaryActionId(): string {
  boundaryActionSeq += 1;
  return `entity-boundary-${boundaryActionSeq}`;
}

function segmentWords(text: string): Token[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    const segments = [...segmenter.segment(text)];
    return segments
      .filter((segment) => segment.isWordLike)
      .map((segment) => ({
        end: segment.index + segment.segment.length,
        start: segment.index,
        text: segment.segment,
      }));
  }

  const regex = /[\p{L}\p{N}_'’-]+/gu;
  const words: Token[] = [];
  let match = regex.exec(text);
  while (match) {
    const start = match.index;
    const token = match[0] ?? "";
    words.push({ end: start + token.length, start, text: token });
    match = regex.exec(text);
  }
  return words;
}

function findWordAtOffset(words: Token[], offset: number): number {
  return words.findIndex((word) => offset >= word.start && offset <= word.end);
}

export function computeAdjustedOffsets(
  text: string,
  currentStart: number,
  currentEnd: number,
  edge: BoundaryEdge,
  direction: BoundaryDirection,
  _options: { trace?: boolean } = {},
): { end: number; start: number } {
  if (
    currentStart < 0 ||
    currentEnd > text.length ||
    currentStart >= currentEnd
  ) {
    throw new OutOfBounds();
  }

  const words = segmentWords(text);
  if (words.length === 0) {
    throw new NoAdjacentWord();
  }

  const startIndex = findWordAtOffset(words, currentStart);
  const endIndex = findWordAtOffset(
    words,
    Math.max(currentStart, currentEnd - 1),
  );
  if (startIndex < 0 || endIndex < 0) {
    throw new OutOfBounds();
  }

  let nextStart = currentStart;
  let nextEnd = currentEnd;

  if (edge === "left" && direction === "expand") {
    const adjacent = words[startIndex - 1];
    if (!adjacent) {
      throw new NoAdjacentWord();
    }
    nextStart = adjacent.start;
  } else if (edge === "left" && direction === "contract") {
    const next = words[startIndex + 1];
    if (!next) {
      throw new MinimumSpanViolation();
    }
    if (next.start >= currentEnd) {
      throw new MinimumSpanViolation();
    }
    nextStart = next.start;
  } else if (edge === "right" && direction === "expand") {
    const adjacent = words[endIndex + 1];
    if (!adjacent) {
      throw new NoAdjacentWord();
    }
    nextEnd = adjacent.end;
  } else if (edge === "right" && direction === "contract") {
    const previous = words[endIndex - 1];
    if (!previous) {
      throw new MinimumSpanViolation();
    }
    if (previous.end <= currentStart) {
      throw new MinimumSpanViolation();
    }
    nextEnd = previous.end;
  }

  if (nextStart < 0 || nextEnd > text.length || nextStart >= nextEnd) {
    throw new OutOfBounds();
  }
  return { end: nextEnd, start: nextStart };
}

function rangesOverlap(
  a: { end: number; start: number },
  b: { end: number; start: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

function getParagraphPath(range: Range): Path {
  return [range.anchor.path[0] ?? 0];
}

function collectLinkOffsetRanges(
  editor: PlateEditor,
  paragraphPath: Path,
): Array<{ end: number; start: number }> {
  const linkType = editor.getType("a");
  const links = [
    ...editor.api.nodes({
      at: paragraphPath,
      match: (node) => !TextApi.isText(node) && node.type === linkType,
    }),
  ];

  const offsetRanges: Array<{ end: number; start: number }> = [];
  for (const [, path] of links) {
    const linkRange = editor.api.range(path);
    if (!linkRange) continue;
    const offsets = rangeToOffsets(editor, paragraphPath, linkRange);
    if (!offsets) continue;
    offsetRanges.push(offsets);
  }

  return offsetRanges;
}

function collectEntityOffsetRanges(
  editor: PlateEditor,
  paragraphPath: Path,
  skipEntityId: string,
): Array<{ end: number; entityId: string; start: number }> {
  const textNodes = [
    ...editor.api.nodes({ at: paragraphPath, match: TextApi.isText }),
  ];

  const byId = new Map<string, { end: number; start: number }>();
  let cursor = 0;
  for (const [node] of textNodes) {
    const leaf = node as {
      entity?: boolean;
      entityId?: string;
      entityType?: string;
      text: string;
    };
    const length = leaf.text.length;
    const start = cursor;
    const end = cursor + length;
    cursor = end;

    if (leaf.entity !== true || !leaf.entityId || !leaf.entityType) {
      continue;
    }
    if (leaf.entityId === skipEntityId) continue;

    const existing = byId.get(leaf.entityId);
    if (!existing) {
      byId.set(leaf.entityId, { end, start });
    } else {
      existing.start = Math.min(existing.start, start);
      existing.end = Math.max(existing.end, end);
    }
  }

  return [...byId.entries()].map(([entityId, offsets]) => ({
    end: offsets.end,
    entityId,
    start: offsets.start,
  }));
}

export function adjustEntityBoundary(
  editor: PlateEditor,
  entityId: string,
  edge: BoundaryEdge,
  direction: BoundaryDirection,
): void {
  const actionId = nextBoundaryActionId();

  const rangeRef = getEntityRangeRefById(editor, entityId);
  const range = rangeRef?.current;
  const mark = getEntityMarkById(editor, entityId);
  if (!rangeRef || !range || !mark) {
    debugWarn("[EntityBoundary] adjust:aborted missing range/mark", {
      actionId,
      entityId,
      hasMark: !!mark,
      hasRange: !!rangeRef,
    });
    return;
  }

  const paragraphPath = getParagraphPath(range);
  const paragraphPathRef: PathRef = Editor.pathRef(
    editor as unknown as Editor,
    paragraphPath,
  );
  const paragraphEntry = editor.api.node(paragraphPath);
  if (!paragraphEntry) {
    rangeRef.unref();
    paragraphPathRef.unref();
    debugWarn("[EntityBoundary] adjust:aborted missing paragraph", {
      actionId,
      entityId,
      paragraphPath,
    });
    return;
  }

  const paragraphText = editor.api.string(paragraphPath);
  const currentOffsets = rangeToOffsets(editor, paragraphPath, range);
  if (!currentOffsets) {
    rangeRef.unref();
    paragraphPathRef.unref();
    debugWarn("[EntityBoundary] adjust:aborted offsets unresolved", {
      actionId,
      entityId,
      paragraphPath,
      range,
    });
    return;
  }

  debugLog("[EntityBoundary] adjust:before", {
    actionId,
    beforeEnd: currentOffsets.end,
    beforeStart: currentOffsets.start,
    beforeText: paragraphText.slice(currentOffsets.start, currentOffsets.end),
    direction,
    edge,
    entityId,
  });

  const nextOffsets = computeAdjustedOffsets(
    paragraphText,
    currentOffsets.start,
    currentOffsets.end,
    edge,
    direction,
    { trace: true },
  );

  const linkRanges = collectLinkOffsetRanges(editor, paragraphPath);
  if (linkRanges.some((linkRange) => rangesOverlap(linkRange, nextOffsets))) {
    debugWarn("[EntityBoundary] adjust:blocked overlap-link", {
      actionId,
      beforeEnd: currentOffsets.end,
      beforeStart: currentOffsets.start,
      entityId,
      nextEnd: nextOffsets.end,
      nextStart: nextOffsets.start,
    });
    rangeRef.unref();
    paragraphPathRef.unref();
    throw new OverlapConflict("OverlapConflict: link range");
  }

  const entityRanges = collectEntityOffsetRanges(
    editor,
    paragraphPath,
    entityId,
  );
  if (
    entityRanges.some((entityRange) =>
      rangesOverlap(
        { end: entityRange.end, start: entityRange.start },
        nextOffsets,
      ),
    )
  ) {
    debugWarn("[EntityBoundary] adjust:blocked overlap-entity", {
      actionId,
      beforeEnd: currentOffsets.end,
      beforeStart: currentOffsets.start,
      entityId,
      nextEnd: nextOffsets.end,
      nextStart: nextOffsets.start,
    });
    rangeRef.unref();
    paragraphPathRef.unref();
    throw new OverlapConflict("OverlapConflict: adjacent entity");
  }

  const nextRange = offsetsToRange(
    editor,
    paragraphPath,
    nextOffsets.start,
    nextOffsets.end,
  );
  if (!nextRange) {
    rangeRef.unref();
    paragraphPathRef.unref();
    debugWarn("[EntityBoundary] adjust:aborted next range unresolved", {
      actionId,
      entityId,
      nextOffsets,
      paragraphPath,
    });
    return;
  }

  const nextRangeRef = Editor.rangeRef(editor as unknown as Editor, nextRange, {
    affinity: "inward",
  });

  editor.tf.unsetNodes([...ENTITY_MARK_FIELDS], {
    at: rangeRef.current ?? range,
    match: TextApi.isText,
    split: true,
  });

  const resolvedParagraphPath = paragraphPathRef.current ?? paragraphPath;

  const nextRangeForSet = nextRangeRef.current;
  if (!nextRangeForSet) {
    debugWarn("[EntityBoundary] adjust:aborted nextRangeRef detached", {
      actionId,
      entityId,
    });
    rangeRef.unref();
    paragraphPathRef.unref();
    nextRangeRef.unref();
    return;
  }

  editor.tf.setNodes(
    {
      ...mark,
      candidateRevision: (mark.candidateRevision ?? 0) + 1,
      entitySource: "manual",
    },
    {
      at: nextRangeForSet,
      match: TextApi.isText,
      split: true,
    },
  );

  const resolvedRangeRef = getEntityRangeRefById(editor, entityId);
  const resolvedRange = resolvedRangeRef?.current;
  const resolvedOffsets = resolvedRange
    ? rangeToOffsets(editor, resolvedParagraphPath, resolvedRange)
    : null;
  const afterText = resolvedOffsets
    ? editor.api
        .string(resolvedParagraphPath)
        .slice(resolvedOffsets.start, resolvedOffsets.end)
    : null;

  if (!resolvedOffsets) {
    debugWarn("[EntityBoundary] adjust:after missing range", {
      actionId,
      entityId,
      expectedEnd: nextOffsets.end,
      expectedStart: nextOffsets.start,
    });
  } else {
    debugLog("[EntityBoundary] adjust:after", {
      actionId,
      afterEnd: resolvedOffsets.end,
      afterStart: resolvedOffsets.start,
      afterText,
      entityId,
      expectedEnd: nextOffsets.end,
      expectedStart: nextOffsets.start,
      expectedText: paragraphText.slice(nextOffsets.start, nextOffsets.end),
    });
  }

  rangeRef.unref();
  paragraphPathRef.unref();
  nextRangeRef.unref();
  resolvedRangeRef?.unref();
}

export function validateEntityBoundaryAdjustment(
  editor: PlateEditor,
  entityId: string,
  edge: BoundaryEdge,
  direction: BoundaryDirection,
): { reason?: string; valid: boolean } {
  try {
    const rangeRef = getEntityRangeRefById(editor, entityId);
    const range = rangeRef?.current;
    if (!rangeRef || !range) return { reason: "missing-entity", valid: false };

    const paragraphPath = getParagraphPath(range);
    const paragraphText = editor.api.string(paragraphPath);
    const currentOffsets = rangeToOffsets(editor, paragraphPath, range);
    if (!currentOffsets) {
      rangeRef.unref();
      return { reason: "offsets-unresolved", valid: false };
    }

    const nextOffsets = computeAdjustedOffsets(
      paragraphText,
      currentOffsets.start,
      currentOffsets.end,
      edge,
      direction,
      { trace: false },
    );

    const linkRanges = collectLinkOffsetRanges(editor, paragraphPath);
    if (linkRanges.some((linkRange) => rangesOverlap(linkRange, nextOffsets))) {
      rangeRef.unref();
      return { reason: "overlap-link", valid: false };
    }

    const entityRanges = collectEntityOffsetRanges(
      editor,
      paragraphPath,
      entityId,
    );
    if (
      entityRanges.some((entityRange) =>
        rangesOverlap(
          { end: entityRange.end, start: entityRange.start },
          nextOffsets,
        ),
      )
    ) {
      rangeRef.unref();
      return { reason: "overlap-entity", valid: false };
    }

    rangeRef.unref();
    return { valid: true } as const;
  } catch (error) {
    return error instanceof Error
      ? ({ reason: error.name, valid: false } as const)
      : ({ reason: "unknown", valid: false } as const);
  }
}
