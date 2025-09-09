"use client";

import { type Value, TrailingBlockPlugin } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

import { AIKit } from "./ai-kit";
import { BasicMarksKit } from "./basic-marks-kit";
import { CursorOverlayKit } from "./cursor-overlay-kit";
import { MarkdownKit } from "./markdown-kit";

export const EditorKit = [
  ...AIKit,
  ...BasicMarksKit,
  ...CursorOverlayKit,
  ...MarkdownKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
