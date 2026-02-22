"use client";

import type { Observable } from "@legendapp/state";
import { use$ } from "@legendapp/state/react";
import { Loader2, Send, Sparkles, WandSparkles, X } from "lucide-react";
import { NodeApi, type Path, TextApi, type TText } from "platejs";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildTokenInfosFromProbabilities } from "~/lib/ai-segments";
import { detectNamedEntities } from "~/lib/ner";
import {
  createAISegment,
  updateDocument,
  updateDocumentContent,
} from "~/lib/state";
import type { Document } from "~/lib/state/documents";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";
import type {
  AISegmentBranch,
  AISegmentMeta,
  BranchId,
  LLMMessage,
  SegmentId,
  TokenProbability,
} from "~/lib/state/types";
import { uiPreferences$ } from "~/lib/state/ui";
import type { MyEditor, MyValue } from "./plate-types";
import { UnifiedEditorKitWithAI } from "./plugins/unified-editor-kit";
import { preventBackspaceNavigation } from "./prevent-backspace-navigation";

interface PlateDocumentEditorProps {
  document$: Observable<Document>;
}

const getSegmentEntry = (editor: MyEditor, segmentId: SegmentId) => {
  return editor.api
    .blocks({
      match: (node) =>
        !TextApi.isText(node) &&
        Boolean((node as { aiSegmentId?: string }).aiSegmentId === segmentId),
      mode: "lowest",
    })
    .at(0);
};

const replaceSegmentNodeText = (
  editor: MyEditor,
  segmentId: SegmentId,
  text: string,
  nodeId?: string,
) => {
  const entry = getSegmentEntry(editor, segmentId);
  if (!entry) return;
  const [, path] = entry;

  editor.tf.removeNodes({ at: path });
  editor.tf.insertNodes(
    {
      aiNodeKind: "ai",
      aiSegmentId: segmentId,
      children: [{ text }],
      id: nodeId || `node-${crypto.randomUUID()}`,
      type: "p",
    },
    { at: path, select: false },
  );
};

const insertSegmentNodeAtEnd = (
  editor: MyEditor,
  segmentId: SegmentId,
  text: string,
  nodeId: string,
) => {
  const path = [editor.children.length];
  editor.tf.insertNodes(
    {
      aiNodeKind: "ai",
      aiSegmentId: segmentId,
      children: [{ text }],
      id: nodeId,
      type: "p",
    },
    { at: path, select: false },
  );
};

const buildInitialBranch = (
  fullText: string,
  sourceMessages: LLMMessage[],
  tokenProbabilities: TokenProbability[],
) => {
  const branchId: BranchId = `br-${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();

  return {
    branchId,
    branch: {
      id: branchId,
      createdAt: nowIso,
      fullText,
      sourceMessages,
      tokens: buildTokenInfosFromProbabilities(tokenProbabilities),
    } satisfies AISegmentBranch,
    nowIso,
  };
};

function offsetsToRange(
  editor: MyEditor,
  paragraphPath: Path,
  start: number,
  end: number,
) {
  const textNodes = [
    ...editor.api.nodes<TText>({ at: paragraphPath, match: TextApi.isText }),
  ];
  if (!textNodes.length) return null;

  const totalLength = textNodes.reduce(
    (sum, [node]) => sum + node.text.length,
    0,
  );
  const normalizedStart = Math.min(Math.max(start, 0), totalLength);
  const normalizedEnd = Math.min(Math.max(end, normalizedStart), totalLength);

  let currentOffset = 0;
  let anchor: { offset: number; path: Path } | null = null;
  let focus: { offset: number; path: Path } | null = null;

  for (const [node, path] of textNodes) {
    const textLength = node.text.length;
    const nodeStart = currentOffset;
    const nodeEnd = nodeStart + textLength;

    if (!anchor && normalizedStart >= nodeStart && normalizedStart <= nodeEnd) {
      anchor = { offset: normalizedStart - nodeStart, path };
    }

    if (!focus && normalizedEnd >= nodeStart && normalizedEnd <= nodeEnd) {
      focus = { offset: normalizedEnd - nodeStart, path };
      break;
    }

    currentOffset = nodeEnd;
  }

  if (!anchor) {
    const [_firstNode, firstPath] = textNodes[0];
    anchor = { offset: 0, path: firstPath };
  }

  if (!focus) {
    const [lastNode, lastPath] = textNodes[textNodes.length - 1];
    focus = { offset: lastNode.text.length, path: lastPath };
  }

  return { anchor, focus };
}

export function PlateDocumentEditor({ document$ }: PlateDocumentEditorProps) {
  const document = use$(document$);
  const { aiEnabled, documentWidth = 800 } = use$(uiPreferences$);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningNer, setIsRunningNer] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const suppressOnChangeRef = useRef(false);
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deepPersistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPersistedContentRef = useRef<string>("");

  const docId = document$.id.peek();
  const content = document.content || "";
  const aiSegments = document.aiSegments || {};
  const sortedSegments = useMemo(() => Object.values(aiSegments), [aiSegments]);
  const editorPlugins = useMemo(() => [...UnifiedEditorKitWithAI], []);

  const editor = usePlateEditor({
    id: `document-editor-${docId}`,
    plugins: editorPlugins,
    value: content
      ? (editor) => {
          try {
            return (editor as MyEditor).api.markdown.deserialize(content);
          } catch (error) {
            console.error("Error deserializing document content:", error);
            return [{ type: "p", children: [{ text: content }] }] as MyValue;
          }
        }
      : undefined,
  }) as MyEditor;
  const editorRef = useRef(editor);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    lastPersistedContentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (showAiInput && aiInputRef.current) {
      aiInputRef.current.focus();
    }
  }, [showAiInput]);

  useEffect(() => {
    if (content === lastPersistedContentRef.current) return;

    const serialized = editor.api.markdown.serialize();
    if (serialized === content) {
      lastPersistedContentRef.current = content;
      return;
    }

    try {
      suppressOnChangeRef.current = true;
      editor.tf.setValue(editor.api.markdown.deserialize(content));
    } catch (error) {
      console.error("Error updating editor content:", error);
    } finally {
      suppressOnChangeRef.current = false;
    }
  }, [content, editor]);

  useEffect(() => {
    if (!sortedSegments.length) return;

    const nextSegments: Record<SegmentId, AISegmentMeta> = { ...aiSegments };
    let changed = false;
    const freeBlocks = editor.api.blocks({ mode: "lowest" });

    sortedSegments.forEach((segment) => {
      const hasMappedNode = !!getSegmentEntry(editor, segment.id);
      if (hasMappedNode) return;

      const activeBranch = segment.branches[segment.activeBranchId];
      if (!activeBranch) return;

      const block = freeBlocks.find((entry) => {
        const [node] = entry;
        const typedNode = node as { aiSegmentId?: string };
        return (
          !typedNode.aiSegmentId &&
          NodeApi.string(node).trim() === activeBranch.fullText.trim()
        );
      });

      if (!block) return;
      const [node, path] = block;
      const nodeId =
        ((node as { id?: string }).id as string | undefined) ||
        `node-${crypto.randomUUID()}`;

      suppressOnChangeRef.current = true;
      editor.tf.setNodes(
        {
          aiNodeKind: "ai",
          aiSegmentId: segment.id,
          id: nodeId,
        },
        { at: path },
      );
      suppressOnChangeRef.current = false;

      nextSegments[segment.id] = {
        ...segment,
        nodeId,
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    });

    if (changed) {
      updateDocumentContent(
        docId,
        editor.api.markdown.serialize(),
        nextSegments,
      );
    }
  }, [aiSegments, docId, editor, sortedSegments]);

  const persistEditorState = (mode: "quick" | "deep" = "deep") => {
    const persistStart = performance.now();
    const serialized = editor.api.markdown.serialize();
    lastPersistedContentRef.current = serialized;

    if (mode === "quick") {
      updateDocumentContent(docId, serialized, aiSegments);
      const persistMs = performance.now() - persistStart;
      if (persistMs > 24) {
        console.warn("[EditorPerf] Slow quick persist", {
          docId,
          mode,
          persistMs: Math.round(persistMs),
          textLength: serialized.length,
        });
      }
      return;
    }

    const nextSegments: Record<SegmentId, AISegmentMeta> = { ...aiSegments };
    let changed = false;

    Object.values(nextSegments).forEach((segment) => {
      const entry = getSegmentEntry(editor, segment.id);
      if (!entry) return;

      const [node] = entry;
      const nodeId =
        ((node as { id?: string }).id as string | undefined) || segment.nodeId;
      const activeBranch = segment.branches[segment.activeBranchId];
      const nodeText = NodeApi.string(node);
      const detached = activeBranch
        ? nodeText !== activeBranch.fullText
        : false;

      if (nodeId !== segment.nodeId || detached !== segment.isDetached) {
        nextSegments[segment.id] = {
          ...segment,
          isDetached: detached,
          nodeId,
          updatedAt: new Date().toISOString(),
        };
        changed = true;
      }
    });

    const blocks = editor.api.blocks({ mode: "lowest" });
    blocks.forEach(([node, path]) => {
      const typedNode = node as { aiSegmentId?: string; id?: string };
      if (typedNode.aiSegmentId) return;

      const aiLeaves = [
        ...editor.api.nodes({
          at: path,
          match: (leaf) =>
            TextApi.isText(leaf) && Boolean((leaf as { ai?: boolean }).ai),
        }),
      ];
      if (!aiLeaves.length) return;

      const text = NodeApi.string(node);
      if (!text.trim()) return;

      const segmentId: SegmentId = `seg-${crypto.randomUUID()}`;
      const nodeId = typedNode.id || `node-${crypto.randomUUID()}`;
      const branchId: BranchId = `br-${crypto.randomUUID()}`;
      const nowIso = new Date().toISOString();

      editor.tf.setNodes(
        {
          aiNodeKind: "ai",
          aiSegmentId: segmentId,
          id: nodeId,
        },
        { at: path },
      );

      nextSegments[segmentId] = {
        id: segmentId,
        nodeId,
        activeBranchId: branchId,
        branches: {
          [branchId]: {
            id: branchId,
            createdAt: nowIso,
            fullText: text,
            sourceMessages: [],
            tokens: [],
          },
        },
        isDetached: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      changed = true;
    });

    updateDocumentContent(
      docId,
      serialized,
      changed ? nextSegments : aiSegments,
    );

    const persistMs = performance.now() - persistStart;
    if (persistMs > 40) {
      console.warn("[EditorPerf] Slow deep persist", {
        changedSegments: changed,
        docId,
        mode,
        persistMs: Math.round(persistMs),
        segmentCount: Object.keys(nextSegments).length,
        textLength: serialized.length,
      });
    }
  };

  const handleContentChange = () => {
    if (suppressOnChangeRef.current) return;

    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      persistEditorState("quick");
    }, 200);

    if (deepPersistTimeoutRef.current)
      clearTimeout(deepPersistTimeoutRef.current);
    deepPersistTimeoutRef.current = setTimeout(() => {
      persistEditorState("deep");
    }, 900);
  };

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      if (deepPersistTimeoutRef.current)
        clearTimeout(deepPersistTimeoutRef.current);
    };
  }, []);

  const createSegmentMeta = (
    segmentId: SegmentId,
    fullText: string,
    sourceMessages: LLMMessage[],
    tokenProbabilities: TokenProbability[],
    nodeId: string,
  ) => {
    const { branch, branchId, nowIso } = buildInitialBranch(
      fullText,
      sourceMessages,
      tokenProbabilities,
    );

    const segment: AISegmentMeta = {
      id: segmentId,
      nodeId,
      activeBranchId: branchId,
      branches: { [branchId]: branch },
      isDetached: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    return segment;
  };

  const generateNextSegment = async () => {
    if (isGenerating) return;
    const runId = `gen-next-${crypto.randomUUID()}`;
    const runStart = performance.now();
    console.info("[GenerateNext] Run started", {
      docId,
      hasInstructions: aiInstructions.trim().length > 0,
      runId,
    });
    setIsGenerating(true);

    const serialized = editorRef.current.api.markdown.serialize();
    const messages: LLMMessage[] = [];
    if (serialized.trim()) {
      messages.push({ role: "user", content: serialized });
    }
    if (aiInstructions.trim()) {
      messages.push({ role: "user", content: aiInstructions.trim() });
    }
    if (!messages.length) {
      messages.push({ role: "user", content: "Please start writing a story." });
    }

    console.info("[GenerateNext] Messages prepared", {
      docLength: serialized.length,
      messageCount: messages.length,
      runId,
    });

    const segmentId: SegmentId = `seg-${crypto.randomUUID()}`;
    const nodeId = `node-${crypto.randomUUID()}`;
    console.info("[GenerateNext] Segment ids allocated", {
      nodeId,
      runId,
      segmentId,
    });

    suppressOnChangeRef.current = true;
    insertSegmentNodeAtEnd(editorRef.current, segmentId, "", nodeId);
    suppressOnChangeRef.current = false;
    console.info("[GenerateNext] Placeholder node inserted", {
      nodeId,
      runId,
      segmentId,
    });

    try {
      let fullText = "";
      let sourceMessages: LLMMessage[] = messages;
      const allProbabilities: TokenProbability[] = [];
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
        const targetEditor = editorRef.current;
        if (!getSegmentEntry(targetEditor, segmentId)) {
          insertSegmentNodeAtEnd(targetEditor, segmentId, "", nodeId);
        }
        replaceSegmentNodeText(targetEditor, segmentId, fullText, nodeId);
        suppressOnChangeRef.current = false;
        const applyMs = performance.now() - applyStart;
        appliedLength = fullText.length;
        lastFlushAt = applyStart;
        totalApplyMs += applyMs;
        if (applyMs > 16) {
          slowApplyCount += 1;
        }
        console.debug("[GenerateNext] Editor apply time", {
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
              sourceMessages = chunk.request.sourceMessages || messages;
              console.info("[GenerateNext] Stream completed", {
                chunkCount,
                durationMs: Math.round(performance.now() - runStart),
                finalLength: fullText.length,
                firstChunkLatencyMs:
                  firstChunkAt === null
                    ? null
                    : Math.round(firstChunkAt - runStart),
                slowApplyCount,
                totalApplyMs: Math.round(totalApplyMs),
                totalInterChunkGapMs:
                  firstChunkAt === null || lastChunkAt === null
                    ? 0
                    : Math.round(lastChunkAt - firstChunkAt),
                requestId: chunk.request.id,
                runId,
              });
              return;
            }
            const chunkNow = performance.now();
            if (firstChunkAt === null) {
              firstChunkAt = chunkNow;
              console.info("[GenerateNext] First chunk received", {
                runId,
                timeToFirstChunkMs: Math.round(chunkNow - runStart),
              });
            }
            const interChunkGapMs =
              lastChunkAt === null ? 0 : Math.round(chunkNow - lastChunkAt);
            lastChunkAt = chunkNow;
            chunkCount += 1;
            fullText += chunk.response.content;
            if (chunk.response.probabilities) {
              allProbabilities.push(...chunk.response.probabilities);
            }
            console.debug("[GenerateNext] Stream chunk", {
              accumulatedLength: fullText.length,
              chunkCount,
              chunkLength: chunk.response.content.length,
              interChunkGapMs,
              probabilitiesInChunk: chunk.response.probabilities?.length || 0,
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
              error,
              runId,
              segmentId,
            });
          },
        );
      }

      flushStreamedTextToEditor();

      const segment = createSegmentMeta(
        segmentId,
        fullText,
        sourceMessages,
        allProbabilities,
        nodeId,
      );

      console.info("[GenerateNext] Persisting generated segment", {
        fullTextLength: fullText.length,
        probabilityCount: allProbabilities.length,
        runId,
        segmentId,
        sourceMessageCount: sourceMessages.length,
      });
      createAISegment(docId, segment);
      persistEditorState();
      console.info("[GenerateNext] Run persisted successfully", {
        durationMs: Math.round(performance.now() - runStart),
        runId,
        segmentId,
      });
    } catch (error) {
      console.error("[GenerateNext] Run failed", {
        durationMs: Math.round(performance.now() - runStart),
        error,
        runId,
        segmentId,
      });
    } finally {
      setAiInstructions("");
      setIsGenerating(false);
      console.info("[GenerateNext] Run finalized", {
        durationMs: Math.round(performance.now() - runStart),
        runId,
      });
    }
  };

  const runDocumentNer = async () => {
    if (isRunningNer || isGenerating) return;
    setIsRunningNer(true);
    setShowAiInput(false);
    suppressOnChangeRef.current = true;

    try {
      const paragraphEntries = [
        ...editor.api.blocks({
          match: (node) =>
            !TextApi.isText(node) && (node as { type?: string }).type === "p",
          mode: "lowest",
        }),
      ];

      for (const [node, paragraphPath] of paragraphEntries) {
        const paragraphText = NodeApi.string(node);

        editor.tf.unsetNodes(["ner", "nerType"], {
          at: paragraphPath,
          match: TextApi.isText,
          split: true,
        });

        if (!paragraphText.trim()) {
          continue;
        }

        const entities = await detectNamedEntities(paragraphText);
        for (const entity of entities) {
          const range = offsetsToRange(
            editor,
            paragraphPath,
            entity.start,
            entity.end,
          );
          if (!range) continue;

          editor.tf.setNodes(
            {
              ner: true,
              nerType: entity.type,
            },
            {
              at: range,
              match: TextApi.isText,
              split: true,
            },
          );
        }
      }
    } catch (error) {
      console.error("[NER] Document pass failed", { error });
    } finally {
      suppressOnChangeRef.current = false;
      persistEditorState();
      setIsRunningNer(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto w-full p-8 pb-32 transition-all duration-300 ease-in-out"
          style={{ maxWidth: `${documentWidth}px` }}
        >
          <input
            type="text"
            value={document.title || ""}
            onChange={(e) => updateDocument(docId, { title: e.target.value })}
            className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-8 text-zinc-100 placeholder-zinc-800"
            placeholder="Untitled Document"
          />

          <Plate editor={editor} onChange={handleContentChange}>
            <PlateContent
              className="min-h-[420px] text-zinc-200 outline-none px-1"
              placeholder="Start writing..."
              onKeyDownCapture={preventBackspaceNavigation}
            />
          </Plate>
        </div>
      </div>

      {aiEnabled && (
        <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
          <div
            className="mx-auto w-full px-8 py-3"
            style={{ maxWidth: `${documentWidth}px` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAiInput((v) => !v)}
                disabled={isGenerating || isRunningNer}
                className="px-3 py-1.5 text-xs rounded border border-blue-900/40 text-blue-300 hover:bg-blue-900/20 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1">
                  <Sparkles size={12} /> Generate Next
                </span>
              </button>
              {isGenerating && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-blue-900/40 text-blue-300">
                  <Loader2 size={12} className="animate-spin" />
                  Generating...
                </span>
              )}
              <button
                type="button"
                onClick={() => void runDocumentNer()}
                disabled={isGenerating || isRunningNer}
                className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                title="Re-run named entity recognition for the whole document"
              >
                <span className="inline-flex items-center gap-1">
                  {isRunningNer ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <WandSparkles size={12} />
                  )}
                  NER
                </span>
              </button>
            </div>

            {showAiInput && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={aiInputRef}
                  type="text"
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="What should I generate?"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void generateNextSegment();
                    }
                    if (e.key === "Escape") {
                      setShowAiInput(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAiInput(false)}
                  className="p-2 rounded text-zinc-500 hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void generateNextSegment()}
                  disabled={isGenerating || isRunningNer}
                  className="p-2 rounded text-blue-300 hover:text-blue-200 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
