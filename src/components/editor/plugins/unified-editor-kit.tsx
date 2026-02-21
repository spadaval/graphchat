"use client";

import { BaseParagraphPlugin } from "platejs";
import { ParagraphElement } from "~/components/editor/paragraph-node";
import { AIKit } from "./ai-kit";
import { BasicMarksKit } from "./basic-marks-kit";
import { BlockMenuKit } from "./block-menu-kit";
import { DndKit } from "./dnd-kit";
// import { CursorOverlayKit } from "./cursor-overlay-kit";
import { MarkdownKit } from "./markdown-kit";
import { MentionKit } from "./mention-kit";
import { NerKit } from "./ner-kit";
import { SlashKit } from "./slash-kit";

// Unified editor kit that includes all plugins needed for both chat and document editors
const UnifiedPlugins = [
  // Core plugins
  BaseParagraphPlugin.withComponent(ParagraphElement),

  // Basic text formatting
  ...BasicMarksKit,

  // Cursor overlay for collaborative features
  // ...CursorOverlayKit,

  // Markdown support
  ...MarkdownKit,

  // Mention support for document referencing
  ...MentionKit,

  // Browser-side NER marks
  ...NerKit,

  // Drag and drop support
  ...DndKit,

  // Slash commands for quick actions
  ...SlashKit,

  // Context menu for block-level actions
  ...BlockMenuKit,
];

// Extended kit with AI features for document editor
export const UnifiedEditorKitWithAI = [...UnifiedPlugins, ...AIKit];

// Basic kit without AI for chat editor
export const UnifiedEditorKit = [...UnifiedPlugins];

// Configuration for chat editor usage
export const ChatEditorConfig = {
  // Minimal toolbar for chat
  toolbar: false,
  // Simple placeholder
  placeholder: "Type your message... Type @ to reference documents",
  // Disable complex features for chat
  aiMenu: false,
};

// Configuration for document editor usage
export const DocumentEditorConfig = {
  // Full toolbar for documents
  toolbar: true,
  // Detailed placeholder
  placeholder: "Start writing your document...",
  // Enable AI menu for documents
  aiMenu: true,
};
