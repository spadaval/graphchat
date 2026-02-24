"use client";

import { NodeApi, type Path, PathApi, TextApi, type TText } from "platejs";
import { createPlatePlugin, type PlateEditor } from "platejs/react";
import { NerLeaf } from "~/components/editor/ner-leaf";
import {
  offsetsToRange,
  rangeToOffsets,
  runNerOnParagraph,
  type SlateRange,
} from "~/lib/ner-editor";
import { linkRangeToCanonical } from "~/lib/ner-linking";
import type { NerEntityType } from "~/lib/ner-types";
import { uiPreferences$ } from "~/lib/state/ui";
import { AI_SEGMENT_TYPE } from "./ai-segment-kit";

const NER_IDLE_DEBOUNCE_MS = 700;

type NerRuntimeState = {
  pendingParagraphPathKeys: Set<string>;
  running: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

const nerRuntime = new WeakMap<PlateEditor, NerRuntimeState>();

const pathKey = (path: Path) => JSON.stringify(path);
const parsePathKey = (key: string): Path => JSON.parse(key) as Path;

function getRuntime(editor: PlateEditor): NerRuntimeState {
  const existing = nerRuntime.get(editor);
  if (existing) return existing;

  const initial: NerRuntimeState = {
    pendingParagraphPathKeys: new Set<string>(),
    running: false,
    timer: null,
  };
  nerRuntime.set(editor, initial);
  return initial;
}

function isWordChar(char: string | undefined): boolean {
  if (!char) return false;
  return /[\p{L}\p{N}_'’-]/u.test(char);
}

function getSelectedNerRange(editor: PlateEditor): SlateRange | null {
  const selection = editor.selection;
  if (!selection) return null;

  const collapsed =
    PathApi.equals(selection.anchor.path, selection.focus.path) &&
    selection.anchor.offset === selection.focus.offset;

  if (!collapsed) {
    return {
      anchor: selection.anchor,
      focus: selection.focus,
    };
  }

  const nodeEntry = editor.api.node(selection.anchor.path);
  if (!nodeEntry) return null;
  const [node, path] = nodeEntry;

  if (!TextApi.isText(node) || !(node as TText & { ner?: boolean }).ner) {
    return null;
  }

  const textNode = node as TText;
  return {
    anchor: { offset: 0, path },
    focus: { offset: textNode.text.length, path },
  };
}

function getParagraphPathForRange(
  editor: PlateEditor,
  range: SlateRange,
): Path | null {
  const entry = editor.api.above({
    at: range.anchor,
    match: (node: unknown) =>
      !TextApi.isText(node) &&
      (node as { type?: string }).type === "p" &&
      (node as { type?: string }).type !== AI_SEGMENT_TYPE,
  });

  return entry ? entry[1] : null;
}

function queueParagraphNer(editor: PlateEditor, paragraphPath: Path): void {
  const runtime = getRuntime(editor);
  runtime.pendingParagraphPathKeys.add(pathKey(paragraphPath));

  if (runtime.timer) {
    clearTimeout(runtime.timer);
  }

  runtime.timer = setTimeout(() => {
    void flushQueuedParagraphNer(editor);
  }, NER_IDLE_DEBOUNCE_MS);
}

async function flushQueuedParagraphNer(editor: PlateEditor): Promise<void> {
  const runtime = getRuntime(editor);
  if (runtime.running) return;

  const queued = [...runtime.pendingParagraphPathKeys];
  runtime.pendingParagraphPathKeys.clear();
  if (queued.length === 0) return;

  runtime.running = true;
  try {
    for (const key of queued) {
      const path = parsePathKey(key);
      const blockEntry = editor.api.node(path);
      if (!blockEntry) continue;
      const [blockNode] = blockEntry;
      if ((blockNode as { type?: string }).type !== "p") continue;

      await runNerOnParagraph(editor, path);
    }
  } catch (error) {
    console.error("[NER] Auto-idle paragraph pass failed", { error });
  } finally {
    runtime.running = false;
  }
}

function previousWordStart(text: string, offset: number): number {
  let cursor = Math.max(0, Math.min(offset, text.length));
  while (cursor > 0 && !isWordChar(text[cursor - 1])) {
    cursor -= 1;
  }
  while (cursor > 0 && isWordChar(text[cursor - 1])) {
    cursor -= 1;
  }
  return cursor;
}

function nextWordEnd(text: string, offset: number): number {
  let cursor = Math.max(0, Math.min(offset, text.length));
  while (cursor < text.length && !isWordChar(text[cursor])) {
    cursor += 1;
  }
  while (cursor < text.length && isWordChar(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function nextWordStart(text: string, offset: number, max: number): number {
  let cursor = Math.max(0, Math.min(offset, max));
  while (cursor < max && isWordChar(text[cursor])) {
    cursor += 1;
  }
  while (cursor < max && !isWordChar(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function previousWordEnd(text: string, offset: number, min: number): number {
  let cursor = Math.max(min, Math.min(offset, text.length));
  while (cursor > min && !isWordChar(text[cursor - 1])) {
    cursor -= 1;
  }
  while (cursor > min && isWordChar(text[cursor - 1])) {
    cursor -= 1;
  }
  while (cursor < offset && cursor < text.length && isWordChar(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}

export const nerPlugin = createPlatePlugin({
  handlers: {
    onTextChange: ({ editor, operation }) => {
      if (!uiPreferences$.nerAutoRunOnIdle.get()) return;
      if (editor.dom.readOnly) return;

      const opPath = (operation as { path?: Path }).path;
      if (!opPath || opPath.length === 0) return;

      const paragraphPath = [opPath[0]];
      const nodeEntry = editor.api.node(paragraphPath);
      if (!nodeEntry) return;

      const [node] = nodeEntry;
      const nodeType = (node as { type?: string }).type;
      if (nodeType !== "p" || nodeType === AI_SEGMENT_TYPE) return;

      queueParagraphNer(editor, paragraphPath);
    },
  },
  key: "ner",
  node: {
    isLeaf: true,
  },
})
  .configure({
    node: { component: NerLeaf },
  })
  .extendApi(({ editor }) => ({
    runDocument: async () => {
      const paragraphEntries = [
        ...editor.api.blocks({
          match: (node) =>
            !TextApi.isText(node) && (node as { type?: string }).type === "p",
          mode: "lowest",
        }),
      ];

      for (const [_node, paragraphPath] of paragraphEntries) {
        await runNerOnParagraph(editor, paragraphPath);
      }
    },
    runParagraph: async (path: Path) => {
      await runNerOnParagraph(editor, path);
    },
  }))
  .extendTransforms(({ editor }) => ({
    adjustBoundary: (direction: "expand" | "shrink", amount: number) => {
      const range = getSelectedNerRange(editor);
      if (!range) return;

      const paragraphPath = getParagraphPathForRange(editor, range);
      if (!paragraphPath) return;

      const offsets = rangeToOffsets(editor, paragraphPath, range);
      if (!offsets) return;

      const blockEntry = editor.api.node(paragraphPath);
      if (!blockEntry) return;
      const blockText = NodeApi.string(blockEntry[0]);

      const nodeEntry = editor.api.node(range.anchor.path);
      if (!nodeEntry || !TextApi.isText(nodeEntry[0])) return;

      const currentLeaf = nodeEntry[0] as TText & {
        ner?: boolean;
        nerCanonicalName?: string;
        nerConfidence?: number;
        nerSource?: "manual" | "model";
        nerType?: NerEntityType;
      };

      if (!currentLeaf.ner || !currentLeaf.nerType) return;

      let nextStart = offsets.start;
      let nextEnd = offsets.end;

      if (direction === "expand") {
        if (amount < 0) {
          nextStart = previousWordStart(blockText, offsets.start);
        } else {
          nextEnd = nextWordEnd(blockText, offsets.end);
        }
      } else if (amount < 0) {
        nextStart = nextWordStart(blockText, offsets.start, offsets.end);
      } else {
        nextEnd = previousWordEnd(blockText, offsets.end, offsets.start);
      }

      if (nextEnd <= nextStart) return;

      const nextRange = offsetsToRange(
        editor,
        paragraphPath,
        nextStart,
        nextEnd,
      );
      if (!nextRange) return;

      editor.tf.unsetNodes(
        ["ner", "nerType", "nerSource", "nerCanonicalName", "nerConfidence"],
        {
          at: range,
          match: TextApi.isText,
          split: true,
        },
      );

      editor.tf.setNodes(
        {
          ner: true,
          nerCanonicalName: currentLeaf.nerCanonicalName,
          nerConfidence: currentLeaf.nerConfidence,
          nerSource: currentLeaf.nerSource ?? "manual",
          nerType: currentLeaf.nerType,
        },
        {
          at: nextRange,
          match: TextApi.isText,
          split: true,
        },
      );

      editor.tf.select(nextRange);
    },
    convertToLink: (canonicalName: string) => {
      const range = getSelectedNerRange(editor);
      if (!range) return;

      editor.tf.unsetNodes(
        ["ner", "nerType", "nerSource", "nerCanonicalName", "nerConfidence"],
        {
          at: range,
          match: TextApi.isText,
          split: true,
        },
      );
      linkRangeToCanonical(editor, range, canonicalName);
    },
    remove: () => {
      const range = getSelectedNerRange(editor);
      if (!range) return;

      editor.tf.unsetNodes(
        ["ner", "nerType", "nerSource", "nerCanonicalName", "nerConfidence"],
        {
          at: range,
          match: TextApi.isText,
          split: true,
        },
      );
    },
    setType: (type: NerEntityType) => {
      const range = getSelectedNerRange(editor);
      if (!range) return;

      editor.tf.setNodes(
        {
          ner: true,
          nerSource: "manual",
          nerType: type,
        },
        {
          at: range,
          match: TextApi.isText,
          split: true,
        },
      );
    },
  }));

export const NerKit = [nerPlugin];
