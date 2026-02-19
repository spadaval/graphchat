"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Observable } from "@legendapp/state";
import { use$ } from "@legendapp/state/react";
import { Loader2, Plus, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import type {
  Block,
  BlockId,
  Document,
  LLMRequest,
  TokenProbability,
} from "~/lib/state";
import { blocks$, createBlock, updateDocument } from "~/lib/state";
import { syncDocumentContent } from "~/lib/state/documents";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";
import { uiPreferences$ } from "~/lib/state/ui";
import { BlockCard } from "./BlockCard";

interface PlateDocumentEditorProps {
  document$: Observable<Document>;
  onCancel?: () => void;
}

export function PlateDocumentEditor({ document$ }: PlateDocumentEditorProps) {
  const docTitle = use$(document$.title);
  const blockIds = use$(document$.blocks) || [];
  const docId = document$.id.peek();
  const { aiEnabled, documentWidth = 800 } = use$(uiPreferences$);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const aiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAiInput && aiInputRef.current) {
      aiInputRef.current.focus();
    }
  }, [showAiInput]);

  // Migration: If document has content but no blocks, create a block from content
  useEffect(() => {
    const doc = document$.get();
    if ((!doc.blocks || doc.blocks.length === 0) && doc.content) {
      const newBlock = createBlock(doc.content, "user", "paragraph");
      blocks$.assign({ [newBlock.id]: newBlock });
      updateDocument(doc.id, { blocks: [newBlock.id] });
    }
  }, [document$]); // Watch the observable itself for changes in reference

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blockIds.indexOf(active.id as BlockId);
      const newIndex = blockIds.indexOf(over.id as BlockId);

      const newBlocks = arrayMove(blockIds, oldIndex, newIndex);
      updateDocument(docId, { blocks: newBlocks });
    }
  };

  const addBlock = (afterBlockId?: BlockId) => {
    const newBlock = createBlock("", "user", "paragraph", undefined, "edit");
    blocks$.assign({ [newBlock.id]: newBlock });

    const currentBlocks = [...blockIds];
    const index = afterBlockId
      ? currentBlocks.indexOf(afterBlockId) + 1
      : currentBlocks.length;

    currentBlocks.splice(index, 0, newBlock.id);
    updateDocument(docId, { blocks: currentBlocks });
  };

  const deleteBlock = (blockId: BlockId) => {
    const newBlocks = blockIds.filter((id) => id !== blockId);
    updateDocument(docId, { blocks: newBlocks });
  };

  const generateNextBlock = async (instructions?: string) => {
    if (isAiGenerating) return;
    setIsAiGenerating(true);
    setShowAiInput(false);
    setAiInstructions("");

    const doc = document$.get();
    const currentBlockIds = doc.blocks || [];
    const allBlocks = blocks$.get();

    // Create the new block first
    const newBlock = createBlock("", "assistant", "paragraph", {
      aiGenerated: true,
    });

    blocks$.assign({ [newBlock.id]: newBlock });
    blocks$[newBlock.id].isGenerating.set(true);

    const newBlocks = [...currentBlockIds, newBlock.id];
    updateDocument(doc.id, { blocks: newBlocks });

    try {
      // Format context from previous blocks
      const contextBlocks = currentBlockIds
        .map((id) => allBlocks[id])
        .filter(Boolean);

      // If instructions are provided, add them as a user prompt
      if (instructions?.trim()) {
        contextBlocks.push(createBlock(instructions.trim(), "user"));
      } else if (contextBlocks.length === 0) {
        // If no blocks and no instructions, add a dummy user prompt to start
        contextBlocks.push(
          createBlock("Please start writing a story.", "user"),
        );
      }

      const stream = callLLMStreaming(
        contextBlocks as Block[],
        modelProps$.get(),
      );

      let fullText = "";
      let allProbabilities: TokenProbability[] = [];
      let finalRequest: LLMRequest | null = null;

      for await (const chunkResult of stream) {
        chunkResult.match(
          (chunk) => {
            if (chunk.response.done) {
              finalRequest = chunk.request;
              return;
            }
            fullText += chunk.response.content;
            if (chunk.response.probabilities) {
              allProbabilities = [
                ...allProbabilities,
                ...chunk.response.probabilities,
              ];
            }
            blocks$[newBlock.id].text.set(fullText);
          },
          (error) => {
            console.error("AI Generation error:", error);
            blocks$[newBlock.id].text.set(`Error: ${error.message}`);
          },
        );
      }

      if (finalRequest) {
        blocks$[newBlock.id].metadata.set({
          ...blocks$[newBlock.id].metadata.get(),
          sourceMessages: (finalRequest as LLMRequest).sourceMessages,
          tokenProbabilities: allProbabilities,
          aiGenerated: true,
        });
      }
    } catch (error) {
      console.error("Critical AI error:", error);
    } finally {
      blocks$[newBlock.id].isGenerating.set(false);
      setIsAiGenerating(false);
      syncDocumentContent(doc.id);
    }
  };

  const aiFillBetween = async (beforeId: BlockId, _afterId: BlockId) => {
    if (isAiGenerating) return;
    setIsAiGenerating(true);

    const doc = document$.get();
    const currentBlockIds = doc.blocks || [];
    const allBlocks = blocks$.get();

    const newBlock = createBlock("", "assistant", "paragraph", {
      aiGenerated: true,
    });
    blocks$.assign({ [newBlock.id]: newBlock });
    blocks$[newBlock.id].isGenerating.set(true);

    const beforeIndex = currentBlockIds.indexOf(beforeId);
    const newBlocksList = [...currentBlockIds];
    newBlocksList.splice(beforeIndex + 1, 0, newBlock.id);
    updateDocument(doc.id, { blocks: newBlocksList });

    try {
      const beforeBlocks = currentBlockIds
        .slice(0, beforeIndex + 1)
        .map((id) => allBlocks[id])
        .filter(Boolean);
      const afterBlocks = currentBlockIds
        .slice(beforeIndex + 1)
        .map((id) => allBlocks[id])
        .filter(Boolean);

      const context = [
        ...beforeBlocks,
        createBlock(
          "Generate a bridging paragraph or sentence that smoothly connects the content above with the content below. Response ONLY with the transition text.",
          "system",
        ),
        ...afterBlocks,
      ];

      const stream = callLLMStreaming(context as Block[], modelProps$.get());

      let fullText = "";
      for await (const chunkResult of stream) {
        chunkResult.match(
          (chunk) => {
            if (chunk.response.done) return;
            fullText += chunk.response.content;
            blocks$[newBlock.id].text.set(fullText);
          },
          (error) => console.error("AI Fill error:", error),
        );
      }
    } finally {
      blocks$[newBlock.id].isGenerating.set(false);
      setIsAiGenerating(false);
      syncDocumentContent(doc.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-y-auto">
      <div
        className="mx-auto w-full p-8 pb-32 transition-all duration-300 ease-in-out"
        style={{ maxWidth: `${documentWidth}px` }}
      >
        <input
          type="text"
          value={docTitle || ""}
          onChange={(e) => updateDocument(docId, { title: e.target.value })}
          className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-12 text-zinc-100 placeholder-zinc-800"
          placeholder="Untitled Document"
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blockIds}
            strategy={verticalListSortingStrategy}
          >
            {blockIds.map((blockId, index) => (
              <div key={blockId} className="relative group/block-wrapper">
                <BlockCard
                  blockId={blockId}
                  docId={docId}
                  onDelete={deleteBlock}
                />

                {/* AI Fill Button between blocks */}
                {aiEnabled && index < blockIds.length - 1 && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover/block-wrapper:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] bg-zinc-900 border border-zinc-800 text-blue-400 hover:text-blue-300 hover:bg-zinc-800 gap-1 rounded-full shadow-lg"
                      onClick={() =>
                        aiFillBetween(blockId, blockIds[index + 1])
                      }
                      disabled={isAiGenerating}
                    >
                      <Sparkles size={10} />
                      AI Fill
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </SortableContext>
        </DndContext>

        <div className="flex justify-center mt-8 gap-4">
          <Button
            variant="ghost"
            className="text-zinc-500 hover:text-zinc-300 gap-2"
            onClick={() => addBlock()}
          >
            <Plus size={16} />
            Add Block
          </Button>

          {aiEnabled && (
            <div className="flex flex-col items-center gap-2">
              {showAiInput ? (
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        generateNextBlock(aiInstructions);
                      } else if (e.key === "Escape") {
                        setShowAiInput(false);
                      }
                    }}
                    placeholder="What should I generate?"
                    className="bg-transparent border-none outline-none text-zinc-100 px-3 py-1 w-64 text-sm"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
                      onClick={() => setShowAiInput(false)}
                    >
                      <X size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40"
                      onClick={() => generateNextBlock(aiInstructions)}
                      disabled={isAiGenerating}
                    >
                      {isAiGenerating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="border-blue-900/30 bg-blue-950/20 text-blue-400 hover:bg-blue-900/40 hover:text-blue-300 gap-2 border-dashed"
                  onClick={() => setShowAiInput(true)}
                  disabled={isAiGenerating}
                >
                  {isAiGenerating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {isAiGenerating ? "Generating..." : "Generate Next"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
