"use client";

import { TextApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import { createPlatePlugin } from "platejs/react";

import { AISegmentElement } from "~/components/editor/ai-segment-node";
import {
  GENERATE_NEXT_SLASH_EVENT,
  type GenerateNextSlashEventDetail,
} from "~/components/editor/generate-next-events";

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

const isInteractiveTarget = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;

  if (target.closest("[data-ai-segment-prompt='true']")) return true;

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "BUTTON";
};

const shouldTriggerGenerateNext = (
  editor: PlateEditor,
  keyboardEvent: KeyboardEvent,
) => {
  if (
    (keyboardEvent.key !== " " && keyboardEvent.code !== "Space") ||
    keyboardEvent.metaKey ||
    keyboardEvent.ctrlKey ||
    keyboardEvent.altKey ||
    !editor.selection
  ) {
    return false;
  }

  if (editor.api.isExpanded()) return false;
  if (!editor.api.isAt({ end: true })) return false;

  const blockEntry = editor.api.block({ highest: true });
  if (!blockEntry || !editor.api.isEmpty(blockEntry[0])) return false;

  const beforeRange = editor.api.range("before", editor.selection);
  const previousChar = beforeRange ? editor.api.string(beforeRange) : "";
  if (!/^\s?$/.test(previousChar)) return false;

  return true;
};

export const aiSegmentPlugin = createPlatePlugin({
  handlers: {
    onBeforeInput: ({ editor, event }) => {
      if (isInteractiveTarget(event as unknown as Event)) return;
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
      if (isInteractiveTarget(event as unknown as Event)) return;
      const keyboardEvent = event as unknown as KeyboardEvent;
      if (shouldTriggerGenerateNext(editor, keyboardEvent)) {
        event.preventDefault();
        event.stopPropagation();

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent<GenerateNextSlashEventDetail>(
              GENERATE_NEXT_SLASH_EVENT,
              {
                detail: { editorId: editor.id },
              },
            ),
          );
        }
        return;
      }

      if (!isSelectionInsideAISegment(editor)) return;

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
