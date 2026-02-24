"use client";

import type { Path } from "platejs";
import { KEYS, type TElement, TextApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import { createPlatePlugin } from "platejs/react";

import { PlaceholderElement } from "~/components/editor/placeholder-node";

export const PLACEHOLDER_TYPE = "placeholder";

const getSelectedPlaceholderPath = (editor: PlateEditor): Path | null => {
  const block = editor.api.block();
  if (!block) return null;

  const [node, path] = block;
  const element = node as TElement;
  if (element.type !== PLACEHOLDER_TYPE) return null;

  return path;
};

const replacePlaceholderWithParagraph = (
  editor: PlateEditor,
  placeholderPath: Path,
  text: string,
) => {
  const paragraphType = editor.getType(KEYS.p);
  const textPath = [...placeholderPath, 0];

  editor.tf.withoutNormalizing(() => {
    editor.tf.setNodes({ type: paragraphType }, { at: placeholderPath });

    const textEntry = editor.api.node(textPath);
    if (textEntry && TextApi.isText(textEntry[0])) {
      editor.tf.removeNodes({ at: textPath });
    }

    editor.tf.insertNodes({ text }, { at: textPath });
    editor.tf.select({
      anchor: { offset: text.length, path: textPath },
      focus: { offset: text.length, path: textPath },
    });
  });
};

const canReplaceWithTypedInput = (
  keyboardEvent: KeyboardEvent,
  placeholderPath: Path | null,
) => {
  if (!placeholderPath) return false;
  if (keyboardEvent.metaKey || keyboardEvent.ctrlKey || keyboardEvent.altKey) {
    return false;
  }

  return keyboardEvent.key.length === 1;
};

const handleBeforeInput = (editor: PlateEditor, inputEvent: InputEvent) => {
  const placeholderPath = getSelectedPlaceholderPath(editor);
  if (!placeholderPath) return false;

  const data = inputEvent.data;
  const inputType = inputEvent.inputType ?? "";
  if (!data || !inputType.startsWith("insert")) {
    return false;
  }

  replacePlaceholderWithParagraph(editor, placeholderPath, data);
  return true;
};

export const placeholderPlugin = createPlatePlugin({
  handlers: {
    onBeforeInput: ({ editor, event }) => {
      const inputEvent = event as unknown as InputEvent;
      if (!handleBeforeInput(editor, inputEvent)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    onKeyDown: ({ editor, event }) => {
      const keyboardEvent = event as unknown as KeyboardEvent;
      const placeholderPath = getSelectedPlaceholderPath(editor);
      if (!canReplaceWithTypedInput(keyboardEvent, placeholderPath)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      replacePlaceholderWithParagraph(
        editor,
        placeholderPath,
        keyboardEvent.key,
      );
    },
  },
  key: PLACEHOLDER_TYPE,
  node: {
    isElement: true,
  },
}).configure({
  node: {
    component: PlaceholderElement,
  },
});

export const PlaceholderKit = [placeholderPlugin];
