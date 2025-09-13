import React, { useEffect, useRef } from "react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";

import { use$ } from "@legendapp/state/react";
import type { Observable } from "@legendapp/state";
import { Button } from "~/components/ui/button";
import { QuickInlineEdit } from "~/components/ui/quick-inline-edit";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "~/components/ui/toolbar";
import { MarkToolbarButton } from "~/components/ui/mark-toolbar-button";
import { DocumentAIToolbarButton } from "~/components/ui/document-ai-toolbar-button";
import { EmojiToolbarButton } from "~/components/ui/emoji-toolbar-button";
import { FontColorToolbarButton } from "~/components/ui/font-color-toolbar-button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  List,
  ListOrdered,
  Link,
  Image,
  Table,
  Smile,
  Undo,
  Redo,
  Type,
  Palette,
} from "lucide-react";
import type { Document } from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";
import { UnifiedEditorKitWithAI, DocumentEditorConfig } from "./unified-editor-kit";
import { deleteDocument } from "~/lib/state";

// Create the plugins
const plugins = [...UnifiedEditorKitWithAI];

interface PlateDocumentEditorProps {
  document$: Observable<Document>;
  onCancel?: () => void;
}

export function PlateDocumentEditor({
  document$,
  onCancel,
}: PlateDocumentEditorProps) {
  // Always use use$ hook to avoid conditional hook usage
  const document = use$(document$);

  // Create the editor
  const editor = usePlateEditor({
    id: "document-editor",
    plugins,
    value: (editor) => editor.api.markdown.deserialize(document.content || ""),
  });

  // Handle save
  const handleSave = () => {
    if (document.title?.trim()) {
      // Get the editor content and serialize to markdown
      let markdownContent = "";

      try {
        // Try to use the markdown plugin's serialize method
        if ((editor as any).api?.markdown?.serialize) {
          markdownContent = (editor as any).api.markdown.serialize();
        } else if (editor.children) {
          // Fallback: extract text content from editor nodes
          markdownContent = editor.children
            .map((node: any) => {
              if (node.type === "p" || !node.type) {
                return (
                  node.children
                    ?.map((child: any) => child.text || "")
                    .join("") || ""
                );
              }
              return (
                node.children?.map((child: any) => child.text || "").join("") ||
                ""
              );
            })
            .filter((text: string) => text.trim())
            .join("\n\n");
        }
      } catch (error) {
        console.error("Error serializing content:", error);
        // Last resort: use the current content
        markdownContent = document.content || "";
      }

      // Update the observable directly
      document$.set({
        ...document,
        content: markdownContent,
        updatedAt: new Date(),
      });
    }
  };

  // Handle delete
  const handleDelete = () => {
    deleteDocument(document.id);
  };

  return (
    <Plate editor={editor}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <QuickInlineEdit
            value$={document$.title}
            placeholder="Document title"
            className="flex-1"
          />
          <div className="flex items-center space-x-2 ml-4">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 text-zinc-200 rounded text-sm"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-zinc-800 px-4 py-2">
          <Toolbar>
            <ToolbarGroup>
              <MarkToolbarButton tooltip="Bold" nodeType="bold">
                <Bold className="size-4" />
              </MarkToolbarButton>
              <MarkToolbarButton tooltip="Italic" nodeType="italic">
                <Italic className="size-4" />
              </MarkToolbarButton>
              <MarkToolbarButton tooltip="Underline" nodeType="underline">
                <Underline className="size-4" />
              </MarkToolbarButton>
              <MarkToolbarButton
                tooltip="Strikethrough"
                nodeType="strikethrough"
              >
                <Strikethrough className="size-4" />
              </MarkToolbarButton>
              <MarkToolbarButton tooltip="Code" nodeType="code">
                <Code className="size-4" />
              </MarkToolbarButton>
              <MarkToolbarButton tooltip="Highlight" nodeType="highlight">
                <Highlighter className="size-4" />
              </MarkToolbarButton>
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <EmojiToolbarButton tooltip="Emoji">
                <Smile className="size-4" />
              </EmojiToolbarButton>
              <FontColorToolbarButton tooltip="Text color">
                <Palette className="size-4" />
              </FontColorToolbarButton>
              <DocumentAIToolbarButton tooltip="AI Assistant (Ctrl+J / Cmd+J)">
                <span className="text-xs font-bold">AI</span>
              </DocumentAIToolbarButton>
            </ToolbarGroup>
          </Toolbar>
        </div>

        <div className="flex-1 flex flex-col p-4 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <PlateContent
              className="resize-none bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 border border-zinc-700 focus:ring-zinc-600 rounded-md p-3 min-h-[300px]"
              placeholder={DocumentEditorConfig.placeholder}
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!document.title?.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </Plate>
  );
}
