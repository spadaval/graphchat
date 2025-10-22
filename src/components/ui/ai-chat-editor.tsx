"use client";

import { useAIChatEditor } from "@platejs/ai/react";
import { usePlateEditor } from "platejs/react";
import * as React from "react";

import { Editor } from "~/editor/Editor";

export const AIChatEditor = React.memo(function AIChatEditor({
  content,
}: {
  content: string;
}) {
  return <Editor value={content} config={{ readonly: true }} />;
});
