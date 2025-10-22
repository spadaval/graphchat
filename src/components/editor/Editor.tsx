"use client";

import { useEffect } from "react";
import { use$ } from "@legendapp/state/react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import type { Observable } from "@legendapp/state";
import { type DocumentId, updateDocument } from "~/lib/state";
import { Button } from "~/components/ui/button";
import { QuickInlineEdit } from "~/components/ui/quick-inline-edit";
import { UnifiedEditorKitWithAI, UnifiedEditorKit } from "./unified-editor-kit";

export interface EditorConfig {
  placeholder?: string;
  toolbar?: boolean;
  aiEnabled?: boolean;
  mentionsEnabled?: boolean;
  readonly?: boolean;
  aiMenu?: boolean; // For compatibility
  showTitle?: boolean;
  showActions?: boolean;
  autoUpdateDocument?: boolean;
}

export interface EditorProps {
  value: string | Observable<string>;
  onChange?: (content: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  config?: EditorConfig;
  plugins?: any[];
  disabled?: boolean;
  document$?: Observable<any>; // For document mode
  documentId?: DocumentId; // For document mode
}

export function Editor({
  value,
  onChange,
  onSave,
  onCancel,
  onDelete,
  config = {},
  plugins,
  disabled,
  document$,
  documentId,
}: EditorProps) {
  // Get current value - handle both string and observable
  const currentValue = typeof value === "string" ? value : use$(value);

  const editorPlugins =
    plugins ||
    (config.aiEnabled ? [...UnifiedEditorKitWithAI] : [...UnifiedEditorKit]);

  const editor = usePlateEditor({
    id: "editor",
    plugins: editorPlugins,
    value: currentValue
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

  // Update editor content when currentValue changes externally
  useEffect(() => {
    if (editor.api?.markdown && currentValue !== undefined) {
      try {
        const deserialized = editor.api.markdown.deserialize(currentValue);
        editor.tf.setValue(deserialized);
      } catch (error) {
        console.error("Error updating editor content:", error);
      }
    }
  }, [currentValue, editor]);

  // Handle content changes
  const handleContentChange = () => {
    if (editor.api?.markdown) {
      try {
        const content = editor.api.markdown.serialize();
        if (config.autoUpdateDocument && documentId) {
          // Update the document directly
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

  const isReadonly = config.readonly || disabled;
  const document = document$ ? use$(document$) : null;

  return (
    <Plate editor={editor} onChange={handleContentChange}>
      <div className="flex flex-col h-full">
        {config.showTitle && document$ && (
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
        )}

        <div className="flex-1 flex flex-col p-4 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <PlateContent
              className={`resize-none bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 border border-zinc-700 focus:ring-zinc-600 rounded-md p-3 ${
                config.showTitle
                  ? "min-h-[300px]"
                  : "min-h-[60px] max-h-32 overflow-y-auto"
              }`}
              placeholder={config.placeholder}
              readOnly={isReadonly}
            />
          </div>
        </div>

        {config.showActions && (
          <div className="p-4 border-t border-zinc-800 flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={!document?.title?.trim()}
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </Plate>
  );
}
