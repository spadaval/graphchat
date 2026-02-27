"use client";

import type { Observable } from "@legendapp/state";
import { use$ } from "@legendapp/state/react";
import {
  Book,
  Building,
  FileText,
  Ghost,
  Loader2,
  Map as MapIcon,
  Scroll,
  Sparkles,
  User,
  WandSparkles,
} from "lucide-react";
import { KEYS, type Path, PathApi, type PathRef, TextApi } from "platejs";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { debugInfo, debugLog } from "~/lib/debug";
import {
  deserializeMarkdownToModel,
  isValidModel,
} from "~/lib/document-content";
import { warmupEntityDetectionPipeline } from "~/lib/entity-detection";
import { updateDocument, updateDocumentContentModel } from "~/lib/state";
import type { BaseTypeId } from "~/lib/state/document-model";
import {
  type Document,
  DocumentIcon,
  documentStore$,
} from "~/lib/state/documents";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";
import type { LLMMessage } from "~/lib/state/types";
import { uiPreferences$ } from "~/lib/state/ui";
import {
  ACCEPT_AI_SEGMENT_EVENT,
  type AcceptAISegmentEventDetail,
  GENERATE_NEXT_SLASH_EVENT,
  type GenerateNextSlashEventDetail,
  RUN_AI_SEGMENT_EVENT,
  type RunAISegmentEventDetail,
} from "./generate-next-events";
import type { MyEditor } from "./plate-types";
import { AI_SEGMENT_TYPE } from "./plugins/ai-segment-kit";
import { UnifiedEditorKitWithAI } from "./plugins/unified-editor-kit";
import { preventBackspaceNavigation } from "./prevent-backspace-navigation";

interface PlateDocumentEditorProps {
  document$: Observable<Document>;
}

const PERSIST_DEBOUNCE_MS = 1000;

interface AISegmentNodeData {
  aiSegmentId?: string;
  aiPrompt?: string;
  aiStatus?: "awaiting_prompt" | "generating" | "ready";
  type?: string;
}

const iconMap: Record<
  DocumentIcon,
  React.ComponentType<{ className?: string }>
> = {
  [DocumentIcon.FileText]: FileText,
  [DocumentIcon.User]: User,
  [DocumentIcon.Map]: MapIcon,
  [DocumentIcon.Sparkles]: Sparkles,
  [DocumentIcon.Ghost]: Ghost,
  [DocumentIcon.Building]: Building,
  [DocumentIcon.Book]: Book,
  [DocumentIcon.Scroll]: Scroll,
};

const getAISegmentPathFromRef = (
  editor: MyEditor,
  segmentPathRef: PathRef,
  aiSegmentId: string,
) => {
  const segmentPath = segmentPathRef.current;
  if (!segmentPath) {
    console.error("[GenerateNext] AI segment path ref is no longer valid", {
      aiSegmentId,
    });
    throw new Error(`AI segment path ref lost: ${aiSegmentId}`);
  }

  const segmentEntry = editor.api.node(segmentPath);
  if (!segmentEntry) {
    console.error("[GenerateNext] AI segment path no longer resolves", {
      aiSegmentId,
      segmentPath,
    });
    throw new Error(`Missing AI segment at path: ${aiSegmentId}`);
  }

  const [segmentNode] = segmentEntry;
  const typedNode = segmentNode as AISegmentNodeData;
  if (typedNode.type !== AI_SEGMENT_TYPE) {
    console.error("[GenerateNext] Resolved node is not an AI segment", {
      aiSegmentId,
      resolvedType: typedNode.type,
      segmentPath,
    });
    throw new Error(`Node at path is not AI segment: ${aiSegmentId}`);
  }

  if (typedNode.aiSegmentId !== aiSegmentId) {
    console.error("[GenerateNext] AI segment identity mismatch", {
      aiSegmentId,
      foundAiSegmentId: typedNode.aiSegmentId,
      segmentPath,
    });
    throw new Error(`AI segment identity mismatch: ${aiSegmentId}`);
  }

  return segmentPath;
};

const replaceAISegmentNodeTextAtPath = (
  editor: MyEditor,
  segmentPath: Path,
  aiSegmentId: string,
  text: string,
) => {
  const textPath = [...segmentPath, 0];
  const textEntry = editor.api.node(textPath);
  if (!textEntry || !TextApi.isText(textEntry[0])) {
    console.error("[GenerateNext] AI segment text leaf not found", {
      aiSegmentId,
      textPath,
    });
    throw new Error(`Missing AI segment text leaf: ${aiSegmentId}`);
  }

  editor.tf.removeNodes({ at: textPath });
  editor.tf.insertNodes({ text }, { at: textPath, select: false });
};

const getAISegmentEntryById = (editor: MyEditor, aiSegmentId: string) => {
  const segmentEntry = editor.api.node({
    at: [],
    match: (node) =>
      !TextApi.isText(node) &&
      (node as AISegmentNodeData).type === AI_SEGMENT_TYPE &&
      (node as AISegmentNodeData).aiSegmentId === aiSegmentId,
  });

  if (!segmentEntry) {
    console.error("[GenerateNext] Could not find AI segment by id", {
      aiSegmentId,
    });
    throw new Error(`Missing AI segment: ${aiSegmentId}`);
  }

  return segmentEntry as [AISegmentNodeData, Path];
};

const upsertAISegmentNode = (
  editor: MyEditor,
  at: Path,
  text: string,
  aiSegmentId: string,
  options: {
    aiPrompt?: string;
    aiStatus: "awaiting_prompt" | "generating" | "ready";
  },
) => {
  editor.tf.insertNodes(
    {
      aiSegmentId,
      aiPrompt: options.aiPrompt,
      aiStatus: options.aiStatus,
      children: [{ text }],
      type: AI_SEGMENT_TYPE,
    },
    { at, select: false },
  );
};

export function PlateDocumentEditor({ document$ }: PlateDocumentEditorProps) {
  const document = use$(document$);
  const {
    documentWidth = 800,
    entityAutoRunOnIdle = false,
    entityFullPassIntervalSeconds = 10,
    entityPreloadModel = true,
  } = use$(uiPreferences$);
  const documentTypes = use$(documentStore$.documentTypes);
  const documentTypeRegistry = use$(documentStore$.documentTypeRegistry);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSegmentId, setGeneratingSegmentId] = useState<string | null>(
    null,
  );
  const [isRunningEntityDetection, setIsRunningEntityDetection] =
    useState(false);
  const suppressOnChangeRef = useRef(false);
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPersistedContentRef = useRef<string>("");

  const docId = document$.id.peek();
  const currentType = document.baseTypeId as BaseTypeId;
  const currentTypeDef = documentTypes[currentType] || documentTypes.general;
  const CurrentTypeIcon = currentTypeDef
    ? iconMap[currentTypeDef.icon] || FileText
    : FileText;
  const availableTypes = Object.values(documentTypeRegistry);
  const contentModel = isValidModel(document.contentModel)
    ? document.contentModel
    : deserializeMarkdownToModel("");
  const editorPlugins = useMemo(() => [...UnifiedEditorKitWithAI], []);

  const editor = usePlateEditor({
    id: `document-editor-${docId}`,
    plugins: editorPlugins,
    value: () => contentModel,
  }) as MyEditor;
  const editorRef = useRef(editor);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    lastPersistedContentRef.current = JSON.stringify(contentModel);
  }, [contentModel]);

  useEffect(() => {
    if (!entityPreloadModel) return;

    const idleCallback = (
      window as Window & {
        requestIdleCallback?: (cb: () => void) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;
    const cancelIdle = (
      window as Window & {
        cancelIdleCallback?: (id: number) => void;
      }
    ).cancelIdleCallback;

    if (idleCallback) {
      const handle = idleCallback(() => {
        void warmupEntityDetectionPipeline().catch((error) => {
          console.error("[EntityDetection] Pipeline warmup failed", { error });
        });
      });

      return () => {
        if (cancelIdle) cancelIdle(handle);
      };
    }

    const timeout = setTimeout(() => {
      void warmupEntityDetectionPipeline().catch((error) => {
        console.error("[EntityDetection] Pipeline warmup failed", { error });
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [entityPreloadModel]);

  useEffect(() => {
    const serializedModel = JSON.stringify(contentModel);
    if (serializedModel === lastPersistedContentRef.current) return;

    const currentSerializedModel = JSON.stringify(editor.children);
    if (currentSerializedModel === serializedModel) {
      lastPersistedContentRef.current = serializedModel;
      return;
    }

    try {
      suppressOnChangeRef.current = true;
      editor.tf.setValue(contentModel as never);
    } catch (error) {
      console.error("Error updating editor content:", error);
    } finally {
      suppressOnChangeRef.current = false;
    }
  }, [contentModel, editor]);

  const persistEditorState = useCallback(() => {
    const persistedModel = editor.children as unknown[];
    lastPersistedContentRef.current = JSON.stringify(persistedModel);
    updateDocumentContentModel(docId, persistedModel);
  }, [docId, editor]);

  const handleContentChange = () => {
    if (suppressOnChangeRef.current) return;

    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      persistEditorState();
    }, PERSIST_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, []);

  const insertPromptAISegment = useCallback(() => {
    if (isGenerating) return;

    const aiSegmentId = `ai-segment-${crypto.randomUUID()}`;
    const targetEditor = editorRef.current;

    suppressOnChangeRef.current = true;
    try {
      const currentBlock = targetEditor.api.block({ highest: true });

      if (currentBlock && targetEditor.api.isEmpty(currentBlock[0])) {
        targetEditor.tf.removeNodes({ at: currentBlock[1] });
        upsertAISegmentNode(targetEditor, currentBlock[1], "", aiSegmentId, {
          aiStatus: "awaiting_prompt",
        });
      } else if (currentBlock) {
        upsertAISegmentNode(
          targetEditor,
          PathApi.next(currentBlock[1]),
          "",
          aiSegmentId,
          {
            aiStatus: "awaiting_prompt",
          },
        );
      } else {
        upsertAISegmentNode(
          targetEditor,
          [targetEditor.children.length],
          "",
          aiSegmentId,
          {
            aiStatus: "awaiting_prompt",
          },
        );
      }
    } finally {
      suppressOnChangeRef.current = false;
    }

    persistEditorState();
  }, [isGenerating, persistEditorState]);

  const runAISegmentGeneration = useCallback(
    async (aiSegmentId: string, rawInstructions?: string) => {
      if (isGenerating && generatingSegmentId !== aiSegmentId) return;

      const targetEditor = editorRef.current;
      let segmentEntry: [AISegmentNodeData, Path];

      try {
        segmentEntry = getAISegmentEntryById(targetEditor, aiSegmentId);
      } catch (_error) {
        return;
      }

      const [segmentNode, segmentPath] = segmentEntry;
      const currentPrompt = segmentNode.aiPrompt?.trim() ?? "";
      const instructions = rawInstructions?.trim() ?? currentPrompt;
      const runId = `gen-next-${crypto.randomUUID()}`;
      const runStart = performance.now();
      debugInfo("[GenerateNext] Run started", {
        aiSegmentId,
        docId,
        hasInstructions: Boolean(instructions),
        runId,
      });

      setIsGenerating(true);
      setGeneratingSegmentId(aiSegmentId);

      suppressOnChangeRef.current = true;
      try {
        targetEditor.tf.setNodes(
          {
            aiPrompt: instructions || undefined,
            aiStatus: "generating",
          },
          { at: segmentPath },
        );
        replaceAISegmentNodeTextAtPath(
          targetEditor,
          segmentPath,
          aiSegmentId,
          "",
        );
      } finally {
        suppressOnChangeRef.current = false;
      }

      const segmentPathRef = targetEditor.api.pathRef(segmentPath);

      try {
        const serialized = targetEditor.api.markdown.serialize();
        const messages: LLMMessage[] = [];
        if (serialized.trim()) {
          messages.push({ role: "user", content: serialized });
        }

        if (instructions) {
          messages.push({
            role: "user",
            content: `Generate the next segment with these instructions: ${instructions}`,
          });
        } else if (!messages.length) {
          messages.push({
            role: "user",
            content: "Please start writing a story.",
          });
        } else {
          messages.push({
            role: "user",
            content: "Generate the next segment.",
          });
        }

        let fullText = "";
        const stream = callLLMStreaming(messages, modelProps$.get());
        const FLUSH_INTERVAL_MS = 50;
        let chunkCount = 0;
        let firstChunkAt: number | null = null;
        let lastChunkAt: number | null = null;
        let lastFlushAt = 0;
        let appliedLength = 0;
        let totalApplyMs = 0;
        let slowApplyCount = 0;

        const flushStreamedTextToEditor = () => {
          if (fullText.length === appliedLength) return;

          const applyStart = performance.now();
          suppressOnChangeRef.current = true;
          try {
            const currentEditor = editorRef.current;
            const currentSegmentPath = getAISegmentPathFromRef(
              currentEditor,
              segmentPathRef,
              aiSegmentId,
            );
            replaceAISegmentNodeTextAtPath(
              currentEditor,
              currentSegmentPath,
              aiSegmentId,
              fullText,
            );
          } finally {
            suppressOnChangeRef.current = false;
          }

          const applyMs = performance.now() - applyStart;
          appliedLength = fullText.length;
          lastFlushAt = applyStart;
          totalApplyMs += applyMs;
          if (applyMs > 16) {
            slowApplyCount += 1;
          }

          debugLog("[GenerateNext] Editor apply time", {
            aiSegmentId,
            applyMs: +applyMs.toFixed(3),
            appliedLength,
            chunkCount,
            runId,
            slowApplyCount,
            totalApplyMs: +totalApplyMs.toFixed(3),
          });
        };

        for await (const chunkResult of stream) {
          chunkResult.match(
            (chunk) => {
              if (chunk.response.done) {
                flushStreamedTextToEditor();
                debugInfo("[GenerateNext] Stream completed", {
                  aiSegmentId,
                  chunkCount,
                  durationMs: Math.round(performance.now() - runStart),
                  finalLength: fullText.length,
                  firstChunkLatencyMs:
                    firstChunkAt === null
                      ? null
                      : Math.round(firstChunkAt - runStart),
                  runId,
                  slowApplyCount,
                  totalApplyMs: Math.round(totalApplyMs),
                  totalInterChunkGapMs:
                    firstChunkAt === null || lastChunkAt === null
                      ? 0
                      : Math.round(lastChunkAt - firstChunkAt),
                });
                return;
              }

              const chunkNow = performance.now();
              if (firstChunkAt === null) {
                firstChunkAt = chunkNow;
                debugInfo("[GenerateNext] First chunk received", {
                  aiSegmentId,
                  runId,
                  timeToFirstChunkMs: Math.round(chunkNow - runStart),
                });
              }

              const interChunkGapMs =
                lastChunkAt === null ? 0 : Math.round(chunkNow - lastChunkAt);
              lastChunkAt = chunkNow;
              chunkCount += 1;
              fullText += chunk.response.content;

              debugLog("[GenerateNext] Stream chunk", {
                aiSegmentId,
                accumulatedLength: fullText.length,
                chunkCount,
                chunkLength: chunk.response.content.length,
                interChunkGapMs,
                runId,
              });

              const now = performance.now();
              const shouldFlush =
                chunk.response.content.length > 0 &&
                (lastFlushAt === 0 || now - lastFlushAt >= FLUSH_INTERVAL_MS);

              if (shouldFlush) {
                flushStreamedTextToEditor();
              }
            },
            (error) => {
              console.error("[GenerateNext] Stream yielded error", {
                aiSegmentId,
                error,
                runId,
              });
            },
          );
        }

        flushStreamedTextToEditor();
        suppressOnChangeRef.current = true;
        try {
          const currentSegmentPath = getAISegmentPathFromRef(
            editorRef.current,
            segmentPathRef,
            aiSegmentId,
          );
          editorRef.current.tf.setNodes(
            { aiStatus: "ready", aiPrompt: instructions || undefined },
            { at: currentSegmentPath },
          );
        } finally {
          suppressOnChangeRef.current = false;
        }
        persistEditorState();
        debugInfo("[GenerateNext] Run persisted successfully", {
          aiSegmentId,
          durationMs: Math.round(performance.now() - runStart),
          runId,
        });
      } catch (error) {
        console.error("[GenerateNext] Run failed", {
          aiSegmentId,
          durationMs: Math.round(performance.now() - runStart),
          error,
          runId,
        });

        suppressOnChangeRef.current = true;
        try {
          const currentSegmentPath = getAISegmentPathFromRef(
            editorRef.current,
            segmentPathRef,
            aiSegmentId,
          );
          editorRef.current.tf.setNodes(
            { aiStatus: "ready", aiPrompt: instructions || undefined },
            { at: currentSegmentPath },
          );
        } catch (_error) {
          // no-op: segment may have been removed
        } finally {
          suppressOnChangeRef.current = false;
        }
      } finally {
        segmentPathRef.unref();
        setIsGenerating(false);
        setGeneratingSegmentId(null);
        debugInfo("[GenerateNext] Run finalized", {
          aiSegmentId,
          durationMs: Math.round(performance.now() - runStart),
          runId,
        });
      }
    },
    [docId, generatingSegmentId, isGenerating, persistEditorState],
  );

  const acceptAISegment = useCallback(
    (aiSegmentId: string) => {
      if (generatingSegmentId === aiSegmentId) return;

      const targetEditor = editorRef.current;
      let segmentEntry: [AISegmentNodeData, Path];

      try {
        segmentEntry = getAISegmentEntryById(targetEditor, aiSegmentId);
      } catch (_error) {
        return;
      }

      suppressOnChangeRef.current = true;
      try {
        targetEditor.tf.setNodes({ type: KEYS.p }, { at: segmentEntry[1] });
        targetEditor.tf.unsetNodes(["aiSegmentId", "aiPrompt", "aiStatus"], {
          at: segmentEntry[1],
        });
      } finally {
        suppressOnChangeRef.current = false;
      }

      persistEditorState();
    },
    [generatingSegmentId, persistEditorState],
  );

  useEffect(() => {
    const onGenerateNext = (event: Event) => {
      const customEvent = event as CustomEvent<GenerateNextSlashEventDetail>;
      if (customEvent.detail.editorId !== editor.id) return;
      insertPromptAISegment();
    };

    const onRunAISegment = (event: Event) => {
      const customEvent = event as CustomEvent<RunAISegmentEventDetail>;
      if (customEvent.detail.editorId !== editor.id) return;
      void runAISegmentGeneration(
        customEvent.detail.aiSegmentId,
        customEvent.detail.instructions,
      );
    };

    const onAcceptAISegment = (event: Event) => {
      const customEvent = event as CustomEvent<AcceptAISegmentEventDetail>;
      if (customEvent.detail.editorId !== editor.id) return;
      acceptAISegment(customEvent.detail.aiSegmentId);
    };

    window.addEventListener(GENERATE_NEXT_SLASH_EVENT, onGenerateNext);
    window.addEventListener(RUN_AI_SEGMENT_EVENT, onRunAISegment);
    window.addEventListener(ACCEPT_AI_SEGMENT_EVENT, onAcceptAISegment);

    return () => {
      window.removeEventListener(GENERATE_NEXT_SLASH_EVENT, onGenerateNext);
      window.removeEventListener(RUN_AI_SEGMENT_EVENT, onRunAISegment);
      window.removeEventListener(ACCEPT_AI_SEGMENT_EVENT, onAcceptAISegment);
    };
  }, [
    acceptAISegment,
    editor.id,
    insertPromptAISegment,
    runAISegmentGeneration,
  ]);

  const runDocumentEntityDetection = useCallback(async () => {
    if (isRunningEntityDetection || isGenerating) return;
    const entityApi = (
      editor.api as {
        entity?: {
          runDocument?: () => Promise<void>;
          runFullDocumentPass?: () => Promise<void>;
        };
      }
    ).entity;
    const runFullDocumentPass =
      entityApi?.runFullDocumentPass ?? entityApi?.runDocument;
    if (!runFullDocumentPass) {
      console.warn(
        "[Entity] Plugin API missing: entity.runFullDocumentPass/entity.runDocument",
      );
      return;
    }

    setIsRunningEntityDetection(true);
    suppressOnChangeRef.current = true;

    try {
      await runFullDocumentPass();
    } catch (error) {
      console.error("[Entity] Document pass failed", { error });
    } finally {
      suppressOnChangeRef.current = false;
      persistEditorState();
      setIsRunningEntityDetection(false);
    }
  }, [editor.api, isGenerating, isRunningEntityDetection, persistEditorState]);

  useEffect(() => {
    if (!entityAutoRunOnIdle) return;

    const intervalSeconds = Number.isFinite(entityFullPassIntervalSeconds)
      ? Math.max(1, entityFullPassIntervalSeconds)
      : 10;
    debugInfo("[Entity] Starting periodic full-document pass", {
      intervalSeconds,
    });

    const intervalId = window.setInterval(() => {
      void runDocumentEntityDetection();
    }, intervalSeconds * 1000);

    return () => {
      window.clearInterval(intervalId);
      debugInfo("[Entity] Stopped periodic full-document pass", {
        intervalSeconds,
      });
    };
  }, [
    entityAutoRunOnIdle,
    entityFullPassIntervalSeconds,
    runDocumentEntityDetection,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-transparent">
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div
          className="mx-auto w-full p-6 pb-32 transition-all duration-300 ease-in-out md:p-12"
          style={{ maxWidth: `${documentWidth}px` }}
        >
          <div className="rounded-3xl border border-zinc-800/50 bg-[#0a0a0a]/50 px-8 py-10 shadow-2xl backdrop-blur-xl md:px-12">
            <div className="mb-10 flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-800/40 hover:text-zinc-200"
                    title="Change Document Type"
                    aria-label="Change document type"
                  >
                    <CurrentTypeIcon className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-64 border border-zinc-800 bg-[#0d0d0d] text-zinc-300 shadow-2xl p-1"
                >
                  <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800/50 mb-1">
                    Document Types
                  </div>
                  {availableTypes.map((typeDef) => {
                    const TypeIcon =
                      iconMap[documentTypes[typeDef.id]?.icon] || FileText;
                    const isActive = typeDef.id === currentType;
                    return (
                      <DropdownMenuItem
                        key={typeDef.id}
                        onClick={() =>
                          updateDocument(docId, { baseTypeId: typeDef.id })
                        }
                        className="group flex items-start gap-3 rounded-md py-2.5 transition-all focus:bg-emerald-500/5"
                      >
                        <TypeIcon
                          className={`mt-0.5 size-4 ${isActive ? "text-emerald-500" : "text-zinc-600 group-data-[highlighted]:text-zinc-300"}`}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span
                            className={`text-[13px] leading-tight ${isActive ? "text-emerald-400 font-bold" : "text-zinc-400 font-medium group-data-[highlighted]:text-zinc-200"}`}
                          >
                            {typeDef.name}
                            {isActive ? " (Active)" : ""}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                type="text"
                value={document.title || ""}
                onChange={(e) =>
                  updateDocument(docId, { title: e.target.value })
                }
                className="w-full border-none bg-transparent text-3xl font-bold text-zinc-100 outline-none placeholder:text-zinc-800 md:text-4xl tracking-tight"
                placeholder="Document Title..."
              />
            </div>

            <Plate editor={editor} onChange={handleContentChange}>
              <PlateContent
                className="min-h-[600px] px-1 text-zinc-200 outline-none text-lg leading-relaxed selection:bg-zinc-700 selection:text-zinc-100"
                placeholder="Start typing..."
                onKeyDownCapture={preventBackspaceNavigation}
              />
            </Plate>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div
          className="mx-auto w-full px-8 py-4"
          style={{ maxWidth: `${documentWidth}px` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {isGenerating && (
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <Loader2 size={12} className="animate-spin" />
                  Generating...
                </span>
              )}
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${isGenerating ? "bg-emerald-500" : "bg-zinc-800"}`}
                />
                {isGenerating ? "BUSY" : "READY"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void runDocumentEntityDetection()}
              disabled={isGenerating || isRunningEntityDetection}
              className="group relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-2 transition-all hover:border-zinc-700 hover:bg-zinc-800/40 disabled:opacity-50"
              title="Scan document for entities"
            >
              <span className="relative z-10 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-200 transition-colors">
                {isRunningEntityDetection ? (
                  <Loader2
                    size={12}
                    className="animate-spin"
                  />
                ) : (
                  <WandSparkles
                    size={12}
                  />
                )}
                Scan Entities
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
