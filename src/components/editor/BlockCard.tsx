"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { use$ } from "@legendapp/state/react";
import { GripVertical, Trash2, Edit, Eye, Sparkles, Binary, RotateCcw, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "~/components/ui/card";
import { blocks$ } from "~/lib/state/block";
import { uiPreferences$ } from "~/lib/state/ui";
import { syncDocumentContent, updateDocument } from "~/lib/state/documents";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";
import type { BlockId, DocumentId, Block } from "~/lib/state/types";
import { UnifiedEditorKitWithAI } from "./unified-editor-kit";
import { cn } from "~/lib/utils";
import { getTokenCount, getTokens } from "~/lib/tokenizer";
import { useState } from "react";

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
          const deserialized = (editor.api as any).markdown.deserialize(
            block.text,
          );
          editor.tf.setValue(deserialized);
        } catch (error) {
          console.error("Error updating editor content:", error);
        }
      }
    }
  }, [block.text, editor]);

  // Token count calculation
  const [tokenCount, setTokenCount] = useState(0);
  const [tokens, setTokens] = useState<string[]>([]);

  const { tokenizerModelId } = use$(uiPreferences$);
  useEffect(() => {
    getTokenCount(block.text || "").then(setTokenCount);
    if (block.viewMode === "tokens") {
      getTokens(block.text || "").then(setTokens);
    }
  }, [block.text, block.viewMode, tokenizerModelId]);

  const handleContentChange = () => {
    const content = (editor.api as any).markdown.serialize();
    block$.text.set(content);
    syncDocumentContent(docId);
  };

  const isAi = block.role === "assistant" || block.metadata?.aiGenerated;

  const handleRegenerate = async () => {
    const sourceMessages = block.metadata?.sourceMessages;
    if (!sourceMessages) {
      console.warn("No source messages for regeneration");
      return;
    }

    block$.isGenerating.set(true);
    block$.text.set("");

    try {
      const stream = callLLMStreaming(sourceMessages, modelProps$.get());
      let fullText = "";
      let allProbabilities: any[] = [];
      let finalRequest: any = null;

      for await (const chunkResult of stream) {
        chunkResult.match(
          (chunk) => {
            if (chunk.response.done) {
              finalRequest = chunk.request;
              return;
            }
            fullText += chunk.response.content;
            if (chunk.response.probabilities) {
              allProbabilities = [...allProbabilities, ...chunk.response.probabilities];
            }
            block$.text.set(fullText);
          },
          (error) => console.error("Regeneration error:", error)
        );
      }

      if (finalRequest) {
        block$.metadata.set({
          ...block.metadata,
          sourceMessages: finalRequest.sourceMessages,
          tokenProbabilities: allProbabilities,
          aiGenerated: true,
        });
      }
    } finally {
      block$.isGenerating.set(false);
      syncDocumentContent(docId);
    }
  };

  const convertToRegular = () => {
    block$.metadata.set({
      ...block.metadata,
      aiGenerated: false,
    });
    block$.role.set("user"); // Convert assistant role back to user for editing
    block$.viewMode.set("edit");
  };

  if (!block) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative transition-opacity",
        isDragging ? "opacity-50" : "opacity-100",
        block.viewMode === "preview" ? "mb-2" : "mb-4",
      )}
    >
      {/* Metadata/Decoration above card */}
      <div className="flex items-center justify-between px-2 mb-1 text-[10px] text-zinc-500 uppercase tracking-wider font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span>{block.type}</span>
          <span>•</span>
          <span>{tokenCount} tokens</span>
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

      <Card
        className={cn(
          "transition-all duration-300 overflow-hidden relative",
          block.viewMode === "preview"
            ? "border-transparent bg-transparent shadow-none hover:bg-zinc-900/20"
            : cn(
              "border-zinc-800 bg-zinc-900/50 shadow-sm",
              isAi && "border-blue-900/30 bg-blue-950/10",
            ),
        )}
      >
        {/* AI Banner */}
        {isAi && (
          <div className="absolute top-0 left-0 bg-blue-600 text-[9px] font-bold text-white px-2 py-0.5 rounded-br uppercase tracking-tighter flex items-center gap-1 z-20">
            <Sparkles size={8} />
            AI Generated
          </div>
        )}

        <CardContent className="p-0 relative group/card">
          {block.viewMode === "preview" ? (
            <div
              className={cn(
                "px-4 py-2 min-h-[60px] text-zinc-200 prose prose-invert max-w-none transition-all",
                isAi && "pt-6",
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
              >
                {block.text}
              </ReactMarkdown>
            </div>
          ) : block.viewMode === "tokens" ? (
            <div className={cn("px-4 py-3 min-h-[60px] flex flex-wrap gap-1 items-start content-start", isAi && "pt-6")}>
              {tokens.map((token, i) => {
                const probInfo = block.metadata?.tokenProbabilities?.[i];
                const logprob = probInfo?.logprob || 0;
                const prob = Math.exp(logprob);

                // Color based on probability
                const bgColor = prob > 0.9 ? "bg-green-500/20" : prob > 0.5 ? "bg-zinc-800/30" : "bg-red-500/20";
                const borderColor = prob > 0.9 ? "border-green-500/30" : prob > 0.5 ? "border-zinc-700/50" : "border-red-500/30";

                return (
                  <Popover key={`${i}-${token}`}>
                    <PopoverTrigger asChild>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[11px] font-mono border rounded text-zinc-400 leading-none cursor-help transition-colors",
                          bgColor,
                          borderColor
                        )}
                      >
                        {token.replace(" ", " ")}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                      <div className="space-y-2">
                        <div className="font-bold flex justify-between">
                          <span>Probability:</span>
                          <span className={prob > 0.9 ? "text-green-400" : prob > 0.5 ? "text-zinc-400" : "text-red-400"}>
                            {(prob * 100).toFixed(1)}%
                          </span>
                        </div>
                        {probInfo?.top_logprobs && (
                          <div className="space-y-1 mt-2">
                            <div className="text-[10px] text-zinc-500 uppercase">Alternatives:</div>
                            {probInfo.top_logprobs.map((alt: any, j: number) => (
                              <div key={j} className="flex justify-between font-mono">
                                <span>{alt.token}</span>
                                <span className="text-zinc-500">{(Math.exp(alt.logprob) * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          ) : (
            <div className="p-0">
              {isAi ? (
                <div className="p-4 text-zinc-400 italic text-sm">
                  AI blocks cannot be edited directly. Convert to a regular block to enable editing.
                </div>
              ) : (
                <Plate editor={editor} onChange={handleContentChange}>
                  <PlateContent
                    className="p-4 min-h-[60px] text-zinc-200 outline-none"
                    placeholder="Write something..."
                  />
                </Plate>
              )}
            </div>
          )}

          {block.isGenerating && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500/30 overflow-hidden">
              <div className="h-full bg-blue-400 animate-[loading_1.5s_infinite] w-1/3" />
            </div>
          )}

          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-all z-10">
            {/* AI Regen/Convert Buttons */}
            {isAi && (
              <>
                <button
                  onClick={handleRegenerate}
                  className="p-1.5 rounded-md bg-zinc-800/80 text-blue-400 hover:text-blue-300 hover:bg-zinc-700 transition-all"
                  title="Regenerate block"
                  disabled={block.isGenerating}
                >
                  <RotateCcw size={14} className={block.isGenerating ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={convertToRegular}
                  className="p-1.5 rounded-md bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
                  title="Convert to regular block"
                >
                  <FileText size={14} />
                </button>
              </>
            )}

            {/* AI Rewrite Button */}
            {!isAi && (
              <button
                onClick={() => {
                  block$.viewMode.set("edit");
                  setTimeout(() => {
                    (editor.api as any).aiChat.show();
                  }, 50);
                }}
                className="p-1.5 rounded-md bg-zinc-800/50 text-blue-400 hover:text-blue-300 hover:bg-zinc-700 transition-all"
                title="AI Rewrite (Cmd+J)"
              >
                <Sparkles size={14} />
              </button>
            )}

            {/* Mode Toggle Button */}
            <button
              onClick={() =>
                block$.viewMode.set(
                  block.viewMode === "preview" ? (isAi ? "preview" : "edit") : "preview",
                )
              }
              className="p-1.5 rounded-md bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-all"
              title={block.viewMode === "preview" ? (isAi ? "View mode" : "Edit block") : "View preview"}
              disabled={isAi && block.viewMode === "preview"}
            >
              {block.viewMode === "preview" ? (
                <Edit size={14} className={isAi ? "opacity-30 cursor-not-allowed" : ""} />
              ) : (
                <Eye size={14} />
              )}
            </button>

            {/* Tokens Toggle Button */}
            <button
              onClick={() =>
                block$.viewMode.set(
                  block.viewMode === "tokens" ? "preview" : "tokens",
                )
              }
              className={cn(
                "p-1.5 rounded-md bg-zinc-800/50 transition-all",
                block.viewMode === "tokens"
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700",
              )}
              title={block.viewMode === "tokens" ? "View preview" : "View tokens"}
            >
              <Binary size={14} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Gap below card for "add block" button or spacing */}
      <div
        className={cn(
          "transition-all",
          block.viewMode === "preview" ? "h-0" : "h-2",
        )}
      />
    </div>
  );
}
