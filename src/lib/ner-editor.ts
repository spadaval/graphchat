import { NodeApi, type Path, PathApi, TextApi, type TText } from "platejs";
import type { PlateEditor } from "platejs/react";
import { detectNamedEntities } from "~/lib/ner";
import {
  linkRangeToCanonical,
  resolveStrictCanonicalMatch,
} from "~/lib/ner-linking";
import type { NerSpan, PersistedNerMark } from "~/lib/ner-types";
import { uiPreferences$ } from "~/lib/state/ui";

export type SlatePoint = { offset: number; path: Path };
export type SlateRange = { anchor: SlatePoint; focus: SlatePoint };

export interface ApplyNerOptions {
  nerSource?: PersistedNerMark["nerSource"];
  normalizeToWordBoundaries?: boolean;
}

export function offsetsToRange(
  editor: PlateEditor,
  paragraphPath: Path,
  start: number,
  end: number,
): SlateRange | null {
  const textNodes = [
    ...editor.api.nodes<TText>({ at: paragraphPath, match: TextApi.isText }),
  ];
  if (textNodes.length === 0) {
    return null;
  }

  const totalLength = textNodes.reduce(
    (sum, [node]) => sum + node.text.length,
    0,
  );
  const normalizedStart = Math.min(Math.max(start, 0), totalLength);
  const normalizedEnd = Math.min(Math.max(end, normalizedStart), totalLength);

  let currentOffset = 0;
  let anchor: SlatePoint | null = null;
  let focus: SlatePoint | null = null;

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
    const [_firstNode, firstPath] = textNodes[0];
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
  span: NerSpan,
): NerSpan {
  let start = Math.max(0, Math.min(span.start, text.length));
  let end = Math.max(start, Math.min(span.end, text.length));

  while (start > 0 && isWordChar(text[start - 1])) {
    start -= 1;
  }

  while (end < text.length && isWordChar(text[end])) {
    end += 1;
  }

  return {
    ...span,
    end,
    start,
  };
}

export function clearNerMarksInBlock(
  editor: PlateEditor,
  blockPath: Path,
): void {
  editor.tf.unsetNodes(
    ["ner", "nerType", "nerSource", "nerCanonicalName", "nerConfidence"],
    {
      at: blockPath,
      match: TextApi.isText,
      split: true,
    },
  );
}

export function rangeToOffsets(
  editor: PlateEditor,
  blockPath: Path,
  range: SlateRange,
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

    if (isAnchor) {
      startOffset = cursor + range.anchor.offset;
    }

    if (isFocus) {
      endOffset = cursor + range.focus.offset;
    }

    cursor += length;
  }

  if (startOffset === null || endOffset === null) return null;
  return {
    end: Math.max(startOffset, endOffset),
    start: Math.min(startOffset, endOffset),
  };
}

export async function applyNerSpansToBlock(
  editor: PlateEditor,
  blockPath: Path,
  spans: NerSpan[],
  options: ApplyNerOptions = {},
): Promise<void> {
  const paragraphNode = editor.api.node(blockPath);
  if (!paragraphNode) return;

  const paragraphText = NodeApi.string(paragraphNode[0]);
  if (!paragraphText.trim()) return;

  const nerSource = options.nerSource ?? "model";
  const autoLink = uiPreferences$.nerAutoLinkStrictMatches.get() !== false;

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
    const canonicalName = autoLink
      ? resolveStrictCanonicalMatch(spanText)
      : null;

    if (canonicalName) {
      editor.tf.unsetNodes(
        ["ner", "nerType", "nerSource", "nerCanonicalName", "nerConfidence"],
        {
          at: range,
          match: TextApi.isText,
          split: true,
        },
      );
      linkRangeToCanonical(editor, range, canonicalName);
      continue;
    }

    editor.tf.setNodes(
      {
        ner: true,
        nerCanonicalName: undefined,
        nerConfidence: normalizedSpan.confidence,
        nerSource,
        nerType: normalizedSpan.type,
      },
      {
        at: range,
        match: TextApi.isText,
        split: true,
      },
    );
  }
}

export async function runNerOnParagraph(
  editor: PlateEditor,
  blockPath: Path,
): Promise<void> {
  const nodeEntry = editor.api.node(blockPath);
  if (!nodeEntry) return;

  const text = NodeApi.string(nodeEntry[0]);
  clearNerMarksInBlock(editor, blockPath);

  if (!text.trim()) return;

  const spans = await detectNamedEntities(text);
  await applyNerSpansToBlock(editor, blockPath, spans, {
    nerSource: "model",
    normalizeToWordBoundaries: true,
  });
}
