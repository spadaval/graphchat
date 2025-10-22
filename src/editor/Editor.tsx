"use client";

import { use$ } from "@legendapp/state/react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useEffect } from "react";
import type { Observable } from "@legendapp/state";
import { updateDocument } from "~/lib/state";
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
  Smile,
  Palette,
} from "lucide-react";
import {
  UnifiedEditorKitWithAI,
  UnifiedEditorKit,
  ChatEditorConfig,
  DocumentEditorConfig,
} from "./unified-editor-kit";

export type EditorMode = "document" | "chat" | "comment" | "readonly";

export interface EditorConfig {
  placeholder?: string;
  toolbar?: boolean;
  aiEnabled?: boolean;
  mentionsEnabled?: boolean;
  readonly?: boolean;
  aiMenu?: boolean; // For compatibility
}

export interface EditorProps {
  mode: EditorMode;
  value: string | Observable<string>;
  onChange?: (content: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onSend?: () => void;
  onDelete?: () => void;
  config?: EditorConfig;
  plugins?: any[];
  disabled?: boolean;
  document$?: Observable<any>; // For document mode
  documentId?: string; // For document mode
}

export function Editor({
  mode,
  value,
  onChange,
  onSave,
  onCancel,
  onSend,
  onDelete,
  config,
  plugins,
  disabled,
  document$,
  documentId,
}: EditorProps) {
  // Get current value - handle both string and observable
  const currentValue = typeof value === "string" ? value : use$(value);

  // Determine plugins based on mode
  const getPlugins = () => {
    if (plugins) return plugins;

    switch (mode) {
      case "document":
        return [...UnifiedEditorKitWithAI];
      case "chat":
        return [...UnifiedEditorKit];
      case "comment":
        return [...UnifiedEditorKit]; // Could be customized
      case "readonly":
        return [...UnifiedEditorKit];
      default:
        return [...UnifiedEditorKit];
    }
  };

  // Get configuration based on mode
  const getConfig = () => {
    if (config) return config;

    switch (mode) {
      case "document":
        return DocumentEditorConfig;
      case "chat":
        return ChatEditorConfig;
      case "comment":
        return { ...ChatEditorConfig, placeholder: "Add a comment..." };
      case "readonly":
        return { ...DocumentEditorConfig, readonly: true };
      default:
        return DocumentEditorConfig;
    }
  };

  const editorConfig = getConfig();
  const editorPlugins = getPlugins();

  const editor = usePlateEditor({
    id: `${mode}-editor`,
    plugins: editorPlugins,
    value:
      mode === "document" && currentValue
        ? (editor) => {
            if (editor.api?.markdown) {
              try {
                return editor.api.markdown.deserialize(currentValue);
              } catch (error) {
                console.error("Error deserializing initial value:", error);
                return [];
              }
            }
            return [];
          }
        : undefined,
  });

  // Set editor value when currentValue changes (for chat mode)
  useEffect(() => {
    // Only update for chat mode, document mode sets initial value
    if (
      mode === "chat" &&
      editor &&
      editor.api &&
      editor.api.markdown &&
      currentValue !== undefined
    ) {
      try {
        const deserialized = editor.api.markdown.deserialize(
          currentValue || "",
        );
        editor.tf.setValue(deserialized);
      } catch (error) {
        console.error("Error setting editor value:", error);
      }
    }
  }, [currentValue, editor, mode]);

  // Handle content changes
  const handleContentChange = () => {
    if (editor.api?.markdown) {
      try {
        const content = editor.api.markdown.serialize();
        if (mode === "document" && documentId) {
          // For document mode, update the document directly
          updateDocument(documentId, { content });
        } else {
          if (onChange) {
            onChange(content);
          }
          // For observables, update directly
          if (typeof value !== "string") {
            (value as Observable<string>).set(content);
          }
        }
      } catch (error) {
        console.error("Error serializing markdown:", error);
      }
    }
  };

  // Handle save for document mode
  const handleSave = () => {
    if (onSave) onSave();
  };

  // Handle delete for document mode
  const handleDelete = () => {
    if (onDelete) onDelete();
  };

  // Render based on mode
  if (mode === "document" && document$) {
    const document = use$(document$);
    return (
      <Plate editor={editor} onChange={handleContentChange}>
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

          <div className="flex-1 flex flex-col p-4 min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <PlateContent
                className="resize-none bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 border border-zinc-700 focus:ring-zinc-600 rounded-md p-3 min-h-[300px]"
                placeholder={editorConfig.placeholder}
                readOnly={
                  (editorConfig.readonly !== undefined
                    ? editorConfig.readonly
                    : false) || disabled
                }
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

  // Chat mode
  if (mode === "chat") {
    return (
      <Plate editor={editor} onChange={handleContentChange}>
        <PlateContent
          className="w-full p-3 border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 min-h-[60px] max-h-32 overflow-y-auto"
          placeholder={editorConfig.placeholder}
          readOnly={disabled}
        />
      </Plate>
    );
  }

  // Comment mode - simplified for now
  if (mode === "comment") {
    return (
      <Plate editor={editor} onChange={handleContentChange}>
        <PlateContent
          className="w-full p-2 border border-zinc-600 rounded bg-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 min-h-[40px]"
          placeholder={editorConfig.placeholder}
          readOnly={disabled}
        />
      </Plate>
    );
  }

  // Readonly mode
  return (
    <Plate editor={editor}>
      <PlateContent
        className="w-full p-3 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-md min-h-[100px]"
        placeholder={editorConfig.placeholder}
        readOnly={true}
      />
    </Plate>
  );
}
