import type { Observable } from "@legendapp/state";
import { use$ } from "@legendapp/state/react";
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Palette,
  Smile,
  Strikethrough,
  Underline,
} from "lucide-react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { Button } from "~/components/ui/button";
import { DocumentAIToolbarButton } from "~/components/ui/document-ai-toolbar-button";
import { EmojiToolbarButton } from "~/components/ui/emoji-toolbar-button";
import { FontColorToolbarButton } from "~/components/ui/font-color-toolbar-button";
import { MarkToolbarButton } from "~/components/ui/mark-toolbar-button";
import { QuickInlineEdit } from "~/components/ui/quick-inline-edit";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "~/components/ui/toolbar";
import type { Document } from "~/lib/state";
import { deleteDocument, updateDocument } from "~/lib/state";
import {
  DocumentEditorConfig,
  UnifiedEditorKitWithAI,
} from "./unified-editor-kit";

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

  const editor = usePlateEditor({
    id: "document-editor",
    plugins,
    value: (editor) => editor.api.markdown.deserialize(document.content || ""),
  });

  // Update document content when editor changes
  const handleContentChange = () => {
    const content = editor.api.markdown.serialize();
    updateDocument(document.id, { content });
  };

  // Handle save (title is saved directly via QuickInlineEdit)
  const handleSave = () => {
    // Content is already saved on change, but we can trigger any additional save logic here
    handleContentChange();
  };

  // Handle delete
  const handleDelete = () => {
    deleteDocument(document.id);
  };

  return (
    <Plate editor={editor} onChange={handleContentChange}>
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <PlateContent
              className="resize-none bg-transparent text-zinc-100 outline-none p-8 min-h-full"
              placeholder={DocumentEditorConfig.placeholder}
            />
          </div>
        </div>
      </div>
    </Plate>
  );
}
