"use client";

import type { Value } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

import { UnifiedEditorKitWithAI } from "~/components/editor/unified-editor-kit";

export const EditorKit = [...UnifiedEditorKitWithAI];

export type MyEditor = TPlateEditor<Value, typeof EditorKit>;

export const useEditor = () => useEditorRef<MyEditor>();
