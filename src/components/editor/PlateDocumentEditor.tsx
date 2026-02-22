"use client";

import type { Observable } from "@legendapp/state";
import { use$ } from "@legendapp/state/react";
import { Loader2, Send, Sparkles, WandSparkles, X } from "lucide-react";
import { NodeApi, type Path, type PathRef, TextApi, type TText } from "platejs";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { debugInfo, debugLog } from "~/lib/debug";
import { detectNamedEntities } from "~/lib/ner";
import { updateDocument, updateDocumentContent } from "~/lib/state";
import type { Document } from "~/lib/state/documents";
import { callLLMStreaming, modelProps$ } from "~/lib/state/llm";
import type { LLMMessage } from "~/lib/state/types";
import { uiPreferences$ } from "~/lib/state/ui";
import type { MyEditor, MyValue } from "./plate-types";
import { AI_SEGMENT_TYPE } from "./plugins/ai-segment-kit";
import { UnifiedEditorKitWithAI } from "./plugins/unified-editor-kit";
import { preventBackspaceNavigation } from "./prevent-backspace-navigation";

interface PlateDocumentEditorProps {
  document$: Observable<Document>;
}

const PERSIST_DEBOUNCE_MS = 1000;

interface AISegmentNodeData {
  aiSegmentId?: string;
  type?: string;
}

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

const insertAISegmentNodeAtEnd = (
  editor: MyEditor,
  text: string,
  aiSegmentId: string,
) => {
  const path = [editor.children.length];
  editor.tf.insertNodes(
    {
      aiSegmentId,
      children: [{ text }],
      type: AI_SEGMENT_TYPE,
    },
    { at: path, select: false },
  );
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
  const { documentWidth = 800 } = use$(uiPreferences$);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningNer, setIsRunningNer] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const suppressOnChangeRef = useRef(false);
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPersistedContentRef = useRef<string>("");

  const docId = document$.id.peek();
  const content = document.content || "";
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

  const persistEditorState = () => {
    const persistStart = performance.now();
    const serialized = editor.api.markdown.serialize();
    lastPersistedContentRef.current = serialized;

    updateDocumentContent(docId, serialized);

    const persistMs = performance.now() - persistStart;
    if (persistMs > 40) {
      console.warn("[EditorPerf] Slow persist", {
        docId,
        persistMs: Math.round(persistMs),
        textLength: serialized.length,
      });
    }
  };

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

  const generateNextSegment = async () => {
    if (isGenerating) return;

    const runId = `gen-next-${crypto.randomUUID()}`;
    const runStart = performance.now();
    debugInfo("[GenerateNext] Run started", {
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

    const aiSegmentId = `ai-segment-${crypto.randomUUID()}`;
    const targetEditor = editorRef.current;
    const insertedPath: Path = [targetEditor.children.length];
    suppressOnChangeRef.current = true;
    try {
      insertAISegmentNodeAtEnd(targetEditor, "", aiSegmentId);
    } finally {
      suppressOnChangeRef.current = false;
    }
    const segmentPathRef = targetEditor.api.pathRef(insertedPath);

    try {
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
          const segmentPath = getAISegmentPathFromRef(
            currentEditor,
            segmentPathRef,
            aiSegmentId,
          );
          replaceAISegmentNodeTextAtPath(
            currentEditor,
            segmentPath,
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
              error,
              runId,
            });
          },
        );
      }

      flushStreamedTextToEditor();
      persistEditorState();
      debugInfo("[GenerateNext] Run persisted successfully", {
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
    } finally {
      segmentPathRef.unref();
      setAiInstructions("");
      setIsGenerating(false);
      debugInfo("[GenerateNext] Run finalized", {
        aiSegmentId,
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
    </div>
  );
}
