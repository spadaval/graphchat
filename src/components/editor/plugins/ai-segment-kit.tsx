"use client";

import { TextApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import { createPlatePlugin } from "platejs/react";

import { AISegmentElement } from "~/components/editor/ai-segment-node";

export const AI_SEGMENT_TYPE = "ai_segment";

const isSelectionInsideAISegment = (editor: PlateEditor) =>
  Boolean(
    editor.selection &&
      editor.api.above({
        at: editor.selection,
        match: (node) =>
          !TextApi.isText(node) &&
          (node as { type?: string }).type === AI_SEGMENT_TYPE,
      }),
  );

const isKeyboardMutation = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return ["Backspace", "Delete", "Enter"].includes(event.key);
  }

  if (
    event.key === "Backspace" ||
    event.key === "Delete" ||
    event.key === "Enter"
  ) {
    return true;
  }

  return event.key.length === 1;
};

export const aiSegmentPlugin = createPlatePlugin({
  handlers: {
    onBeforeInput: ({ editor, event }) => {
      if (!isSelectionInsideAISegment(editor)) return;

      const beforeInputEvent = event as unknown as InputEvent;
      const inputType = beforeInputEvent.inputType || "";
      if (
        inputType.startsWith("insert") ||
        inputType.startsWith("delete") ||
        inputType.startsWith("format")
      ) {
        event.preventDefault();
      }
    },
    onCut: ({ editor, event }) => {
      if (!isSelectionInsideAISegment(editor)) return;
      event.preventDefault();
    },
    onDrop: ({ editor, event }) => {
      if (!isSelectionInsideAISegment(editor)) return;
      event.preventDefault();
    },
    onKeyDown: ({ editor, event }) => {
      if (!isSelectionInsideAISegment(editor)) return;

      const keyboardEvent = event as unknown as KeyboardEvent;
      if (!isKeyboardMutation(keyboardEvent)) return;

      event.preventDefault();
      event.stopPropagation();
    },
    onPaste: ({ editor, event }) => {
      if (!isSelectionInsideAISegment(editor)) return;
      event.preventDefault();
    },
  },
  key: AI_SEGMENT_TYPE,
  node: {
    isElement: true,
  },
}).configure({
  node: {
    component: AISegmentElement,
  },
});

export const AiSegmentKit = [aiSegmentPlugin];
