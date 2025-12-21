import type { Observable } from "@legendapp/state";
import { use$ } from "@legendapp/state/react";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "~/components/ui/button";
import type { Document } from "~/lib/state";
import { updateDocument, createBlock, blocks$ } from "~/lib/state";
import { BlockCard } from "./BlockCard";
import type { BlockId } from "~/lib/state/types";

interface PlateDocumentEditorProps {
  document$: Observable<Document>;
  onCancel?: () => void;
}

export function PlateDocumentEditor({
  document$,
  onCancel,
}: PlateDocumentEditorProps) {
  const document = use$(document$);
  const blocks = document.blocks || [];

  // Migration: If document has content but no blocks, create a block from content
  useEffect(() => {
    // Use the raw observable to check and update to avoid dependency on document.blocks which we just read
    const doc = document$.get();
    if ((!doc.blocks || doc.blocks.length === 0) && (doc as any).content) {
      const newBlock = createBlock((doc as any).content, "user", "paragraph");
      blocks$.assign({ [newBlock.id]: newBlock });
      updateDocument(doc.id, { blocks: [newBlock.id] });
    }
  }, [document$.id]); // Only run when document ID changes

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.indexOf(active.id as BlockId);
      const newIndex = blocks.indexOf(over.id as BlockId);
      
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      updateDocument(document.id, { blocks: newBlocks });
    }
  };

  const addBlock = (afterBlockId?: BlockId) => {
    const newBlock = createBlock("", "user", "paragraph");
    blocks$.assign({ [newBlock.id]: newBlock });
    
    const currentBlocks = [...blocks];
    const index = afterBlockId 
      ? currentBlocks.indexOf(afterBlockId) + 1 
      : currentBlocks.length;
    
    currentBlocks.splice(index, 0, newBlock.id);
    updateDocument(document.id, { blocks: currentBlocks });
  };

  const deleteBlock = (blockId: BlockId) => {
    const newBlocks = blocks.filter(id => id !== blockId);
    updateDocument(document.id, { blocks: newBlocks });
    // Optionally delete from blocks$ store too
    // blocks$[blockId].delete(); 
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-8 pb-32">
        <input
          type="text"
          value={document.title || ""}
          onChange={(e) => updateDocument(document.id, { title: e.target.value })}
          className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-12 text-zinc-100 placeholder-zinc-800"
          placeholder="Untitled Document"
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
            {blocks.map((blockId) => (
              <BlockCard
                key={blockId}
                blockId={blockId}
                docId={document.id}
                onDelete={deleteBlock}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className="flex justify-center mt-8">
          <Button
            variant="ghost"
            className="text-zinc-500 hover:text-zinc-300 gap-2"
            onClick={() => addBlock()}
          >
            <Plus size={16} />
            Add Block
          </Button>
        </div>
      </div>
    </div>
  );
}
