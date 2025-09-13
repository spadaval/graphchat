"use client";

import { BaseParagraphPlugin } from "platejs";

import { AIKit } from "./ai-kit";
import { BasicMarksKit } from "./basic-marks-kit";
import { CursorOverlayKit } from "./cursor-overlay-kit";
import { MarkdownKit } from "./markdown-kit";
import { MentionKit } from "./mention-kit";
import { DocumentAIMenu, AILoadingBar } from "~/components/ui/document-ai-menu";

// Unified editor kit that includes all plugins needed for both chat and document editors
const UnifiedPlugins = [
  // Core plugins
  BaseParagraphPlugin,
  
  // Basic text formatting
  ...BasicMarksKit,
  
  // Cursor overlay for collaborative features
  ...CursorOverlayKit,
  
  // Markdown support
  ...MarkdownKit,
  
  // Mention support for document referencing
  ...MentionKit,
];

// Extended kit with AI features for document editor
export const UnifiedEditorKitWithAI = [
  ...UnifiedPlugins,
  ...AIKit,
  {
    key: 'document-ai-menu',
    render: {
      afterContainer: AILoadingBar,
      afterEditable: DocumentAIMenu,
    },
  }
];

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