"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { use$ } from "@legendapp/state/react";
import { GripVertical, Trash2 } from "lucide-react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useMemo, useEffect } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { blocks$ } from "~/lib/state/block";
import { syncDocumentContent } from "~/lib/state/documents";
import type { BlockId, DocumentId } from "~/lib/state/types";
import { UnifiedEditorKitWithAI } from "./unified-editor-kit";
import { cn } from "~/lib/utils";

interface BlockCardProps {
  blockId: BlockId;
  docId: DocumentId;
  onDelete: (id: BlockId) => void;
}

export function BlockCard({ blockId, docId, onDelete }: BlockCardProps) {
  const block$ = blocks$[blockId];
  const block = use$(block$);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const editor = usePlateEditor({
    id: `editor-${blockId}`,
    plugins: [...UnifiedEditorKitWithAI],
    value: block.text
      ? (editor) => {
          try {
            return (editor.api as any).markdown.deserialize(block.text);
          } catch (error) {
            console.error("Error deserializing initial value:", error);
            return [{ type: "p", children: [{ text: block.text }] }];
          }
        }
      : undefined,
  });

  // Update editor content when block.text changes externally
  useEffect(() => {
    if ((editor.api as any)?.markdown && block.text !== undefined) {
      const currentMarkdown = (editor.api as any).markdown.serialize();
      if (currentMarkdown !== block.text) {
        try {
          const deserialized = (editor.api as any).markdown.deserialize(block.text);
          editor.tf.setValue(deserialized);
        } catch (error) {
          console.error("Error updating editor content:", error);
        }
      }
    }
  }, [block.text, editor]);

  // Word count calculation
  const wordCount = useMemo(() => {
    return block.text?.trim() ? block.text.trim().split(/\s+/).length : 0;
  }, [block.text]);

  const handleContentChange = () => {
    const content = (editor.api as any).markdown.serialize();
    block$.text.set(content);
    syncDocumentContent(docId);
  };

  if (!block) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative mb-4 transition-opacity",
        isDragging ? "opacity-50" : "opacity-100"
      )}
    >
      {/* Metadata/Decoration above card */}
      <div className="flex items-center justify-between px-2 mb-1 text-[10px] text-zinc-500 uppercase tracking-wider font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span>{block.type}</span>
          <span>•</span>
          <span>{wordCount} words</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(blockId)}
            className="p-1 hover:text-red-400 transition-colors"
            title="Delete block"
          >
            <Trash2 size={12} />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing hover:text-zinc-300 transition-colors"
          >
            <GripVertical size={12} />
          </div>
        </div>
      </div>

      <Card className={cn(
        "border-zinc-800 bg-zinc-900/50 overflow-hidden",
        block.role === "assistant" ? "border-blue-900/30 bg-blue-950/10" : ""
      )}>
        <CardContent className="p-0">
          <Plate editor={editor} onChange={handleContentChange}>
            <PlateContent
              className="p-4 min-h-[60px] text-zinc-200 outline-none"
              placeholder="Write something..."
            />
          </Plate>
        </CardContent>
      </Card>
      
      {/* Gap below card for "add block" button or spacing */}
      <div className="h-2" />
    </div>
  );
}
