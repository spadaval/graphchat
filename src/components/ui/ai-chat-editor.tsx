"use client";

import * as React from "react";

import { useAIChatEditor } from "@platejs/ai/react";
import { usePlateEditor } from "platejs/react";

import { Editor } from "~/components/editor/Editor";

export const AIChatEditor = React.memo(function AIChatEditor({
  content,
}: {
  content: string;
}) {
  return <Editor mode="readonly" value={content} />;
});
