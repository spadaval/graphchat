"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { use$ } from "@legendapp/state/react";
import {
  Binary,
  Edit,
  Eye,
  FastForward,
  FileText,
  GripVertical,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "~/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { blocks$ } from "~/lib/state/block";
import { syncDocumentContent } from "~/lib/state/documents";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";
import type {
  BlockId,
  DocumentId,
  LLMMessage,
  LLMRequest,
  TokenProbability,
} from "~/lib/state/types";
import { getTokenCount, getTokens } from "~/lib/tokenizer";
import { cn } from "~/lib/utils";
import type { MyEditor, MyValue } from "./plate-types";
import { UnifiedEditorKitWithAI } from "./unified-editor-kit";

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
            return (editor as MyEditor).api.markdown.deserialize(block.text);
          } catch (error) {
            console.error("Error deserializing initial value:", error);
            return [{ type: "p", children: [{ text: block.text }] }] as MyValue;
          }
        }
      : undefined,
  });

  // Update editor content when block.text changes externally
  useEffect(() => {
    const myEditor = editor as MyEditor;
    if (myEditor.api.markdown && block.text !== undefined) {
      const currentMarkdown = myEditor.api.markdown.serialize();
      if (currentMarkdown !== block.text) {
        try {
          const deserialized = myEditor.api.markdown.deserialize(block.text);
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
  const tokenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tokenTimeoutRef.current) clearTimeout(tokenTimeoutRef.current);

    tokenTimeoutRef.current = setTimeout(() => {
      getTokenCount(block.text || "").then(setTokenCount);
      if (block.viewMode === "tokens") {
        getTokens(block.text || "").then(setTokens);
      }
    }, 1000);

    return () => {
      if (tokenTimeoutRef.current) clearTimeout(tokenTimeoutRef.current);
    };
  }, [block.text, block.viewMode]);

  // Debounce syncDocumentContent to avoid re-rendering the whole document list too often
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = () => {
    const content = (editor as MyEditor).api.markdown.serialize();
    block$.text.set(content);

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncDocumentContent(docId);
    }, 1000);
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
            block$.text.set(fullText);
          },
          (error) => console.error("Regeneration error:", error),
        );
      }

      if (finalRequest) {
        const request = finalRequest as LLMRequest;
        block$.metadata.set({
          ...block.metadata,
          sourceMessages: request.sourceMessages,
          tokenProbabilities: allProbabilities,
          aiGenerated: true,
        });
      }
    } finally {
      block$.isGenerating.set(false);
      syncDocumentContent(docId);
    }
  };

  const handleContinue = async () => {
    block$.isGenerating.set(true);

    try {
      // Create a continuation prompt
      const previousText = block.text;
      const continuationMessage: LLMMessage = {
        role: "user",
        content:
          "Continue writing from the previous text. Do not repeat the previous text. Just continue.",
      };

      // Construct messages history for context
      // If we have source messages, use them, otherwise treat current text as context
      const messages: LLMMessage[] = block.metadata?.sourceMessages
        ? [...block.metadata.sourceMessages]
        : [];

      // If the last message in history is not the current text (assistant), append it
      if (
        messages.length === 0 ||
        messages[messages.length - 1].role !== "assistant"
      ) {
        messages.push({
          role: "assistant",
          content: previousText,
        });
      } else {
        // Update the last assistant message to match current text in case it was edited
        messages[messages.length - 1].content = previousText;
      }

      messages.push(continuationMessage);

      const stream = callLLMStreaming(messages, modelProps$.get());
      const fullText = previousText;
      // We start with previous text.
      // Note: Ideally we want to stream JUST the new part, but for simplicity in this UI we append to full text state.
      // Depending on how callLLMStreaming works, it might return just delta or full.
      // Based on handleRegenerate, it returns full accumulated text of the NEW generation in chunk.response.content if we accumulate?
      // Wait, handleRegenerate accumulates: fullText += chunk.response.content.
      // So chunk.response.content is a DELTA.

      let newGeneratedText = "";
      let finalRequest: LLMRequest | null = null;
      let allProbabilities: TokenProbability[] =
        block.metadata?.tokenProbabilities || [];

      for await (const chunkResult of stream) {
        chunkResult.match(
          (chunk) => {
            if (chunk.response.done) {
              finalRequest = chunk.request;
              return;
            }
            newGeneratedText += chunk.response.content;
            if (chunk.response.probabilities) {
              allProbabilities = [
                ...allProbabilities,
                ...chunk.response.probabilities,
              ];
            }
            // Update block text live
            block$.text.set(fullText + newGeneratedText);
          },
          (error) => console.error("Continue generation error:", error),
        );
      }

      if (finalRequest) {
        // Update metadata with new history
        // finalRequest.sourceMessages likely contains the messages we sent.
        // We want to update sourceMessages to include the continuation for future turns.
        // Actually, we should probably merge the new generation into the last assistant message
        // OR keep it as separate turns?
        // For a "Continue" action in a single block, it usually implies extending the SAME block content.
        // So we effectively merge the continuation into the block.
        // The "sourceMessages" for THIS block should probably reflect that it was generated from the original prompt + continuation?
        // Or we just update the last assistant message in sourceMessages to be the FULL text.

        const _updatedMessages = [...messages];
        // Remove the "Continue" user prompt we added, and merge the result?
        // Or keep the "Continue" prompt in history to show how we got here?
        // If we keep it, it becomes a chat history.
        // But this is a single block representation.
        // Let's keep it simple: The sourceMessages track the conversation that led to this block.

        // We need to capture the fact that we extended it.
        // Let's assume we just want to update the last assistant message in the history to equal the new full text,
        // effectively "rewriting history" so it looks like it generated the full thing at once?
        // OR we just append the new turn.
        // Let's append the new turn (User: Continue -> Assistant: <new text>)
        // BUT display it as one merged block.
        // The block.text IS merged.

        // Let's update sourceMessages to be what we sent + the result.
        // user: continue
        // assistant: [new part]

        const newHistory: LLMMessage[] = [
          ...messages,
          { role: "assistant", content: newGeneratedText },
        ];

        block$.metadata.set({
          ...block.metadata,
          sourceMessages: newHistory,
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
            type="button"
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
            <div
              className={cn(
                "px-4 py-3 min-h-[60px] flex flex-wrap gap-1 items-start content-start",
                isAi && "pt-6",
              )}
            >
              {(block.metadata?.tokenProbabilities?.length
                ? block.metadata.tokenProbabilities
                : tokens.map((t) => ({ token: t }) as TokenProbability)
              ).map((tokenData: TokenProbability, i: number) => {
                const tokenText = tokenData.token || "";
                // If we have prob info, use it. If not (local tokens), default to 0/undefined
                const _probInfo = block.metadata?.tokenProbabilities?.[i];
                // Check if we are using the probability data directly
                const isProbData =
                  !!tokenData.logprob || tokenData.logprob === 0;

                const logprob = isProbData ? tokenData.logprob : 0;
                const prob = Math.exp(logprob);
                const hasProb = isProbData;

                // Color based on probability (only if we have probability data)
                const bgColor = hasProb
                  ? prob > 0.9
                    ? "bg-green-500/20"
                    : prob > 0.5
                      ? "bg-zinc-800/30"
                      : "bg-red-500/20"
                  : "bg-zinc-800/10";
                const borderColor = hasProb
                  ? prob > 0.9
                    ? "border-green-500/30"
                    : prob > 0.5
                      ? "border-zinc-700/50"
                      : "border-red-500/30"
                  : "border-zinc-700/30";

                return (
                  <Popover key={`${i}-${tokenText}`}>
                    <PopoverTrigger asChild>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[11px] font-mono border rounded text-zinc-400 leading-none cursor-help transition-colors select-none hover:bg-zinc-700",
                          bgColor,
                          borderColor,
                        )}
                      >
                        {tokenText.replace(/ /g, "\u00A0")}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1 border-b border-zinc-800 pb-2">
                          <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                            Token
                          </span>
                          <span className="font-mono text-lg bg-black/30 p-1 rounded px-2 self-start min-w-[30px] text-center">
                            {tokenText}
                          </span>
                        </div>

                        {hasProb && (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                                Probability
                              </span>
                              <span
                                className={cn(
                                  "font-mono font-bold",
                                  prob > 0.9
                                    ? "text-green-400"
                                    : prob > 0.5
                                      ? "text-yellow-400"
                                      : "text-red-400",
                                )}
                              >
                                {(prob * 100).toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-zinc-500">
                              <span>Logprob</span>
                              <span className="font-mono">
                                {logprob.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        )}

                        {tokenData?.top_logprobs && (
                          <div className="space-y-2">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                              Top Alternatives
                            </div>
                            <div className="flex flex-col gap-1">
                              {tokenData.top_logprobs.map(
                                (
                                  alt: { token: string; logprob: number },
                                  j: number,
                                ) => {
                                  const altProb = Math.exp(alt.logprob);
                                  return (
                                    <div
                                      key={`${tokenData.token}-${j}`}
                                      className="flex justify-between items-center font-mono text-xs bg-zinc-800/30 p-1 px-2 rounded hover:bg-zinc-800/50 transition-colors"
                                    >
                                      <span className="text-zinc-300">
                                        {alt.token}
                                      </span>
                                      <div className="flex gap-3">
                                        <span
                                          className={cn(
                                            "w-12 text-right",
                                            altProb > 0.5
                                              ? "text-green-400"
                                              : "text-zinc-500",
                                          )}
                                        >
                                          {(altProb * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
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
                  AI blocks cannot be edited directly. Convert to a regular
                  block to enable editing.
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
                  type="button"
                  onClick={handleContinue}
                  className="p-1.5 rounded-md bg-zinc-800/80 text-blue-400 hover:text-blue-300 hover:bg-zinc-700 transition-all"
                  title="Continue generating"
                  disabled={block.isGenerating}
                >
                  <FastForward
                    size={14}
                    className={block.isGenerating ? "animate-pulse" : ""}
                  />
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="p-1.5 rounded-md bg-zinc-800/80 text-blue-400 hover:text-blue-300 hover:bg-zinc-700 transition-all"
                  title="Regenerate block"
                  disabled={block.isGenerating}
                >
                  <RotateCcw
                    size={14}
                    className={block.isGenerating ? "animate-spin" : ""}
                  />
                </button>
                <button
                  type="button"
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
                type="button"
                onClick={() => {
                  block$.viewMode.set("edit");
                  setTimeout(() => {
                    (editor as MyEditor).api.aiChat.show();
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
              type="button"
              onClick={() =>
                block$.viewMode.set(
                  block.viewMode === "preview"
                    ? isAi
                      ? "preview"
                      : "edit"
                    : "preview",
                )
              }
              className="p-1.5 rounded-md bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-all"
              title={
                block.viewMode === "preview"
                  ? isAi
                    ? "View mode"
                    : "Edit block"
                  : "View preview"
              }
              disabled={isAi && block.viewMode === "preview"}
            >
              {block.viewMode === "preview" ? (
                <Edit
                  size={14}
                  className={isAi ? "opacity-30 cursor-not-allowed" : ""}
                />
              ) : (
                <Eye size={14} />
              )}
            </button>

            {/* Tokens Toggle Button */}
            <button
              type="button"
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
              title={
                block.viewMode === "tokens" ? "View preview" : "View tokens"
              }
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
