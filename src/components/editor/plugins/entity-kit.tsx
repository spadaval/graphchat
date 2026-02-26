"use client";

import { type Path, TextApi } from "platejs";
import { createPlatePlugin, type PlateEditor } from "platejs/react";
import { Editor, type PathRef, Path as SlatePath } from "slate";
import { EntityLeaf } from "~/components/editor/entity-leaf";
import { debugInfo, debugLog, debugWarn } from "~/lib/debug";
import {
  adjustEntityBoundary,
  type BoundaryDirection,
  type BoundaryEdge,
} from "~/lib/entity-boundary";
import {
  type ApplyEntityOptions,
  rangeToOffsets,
  runEntityDetectionOnParagraph,
} from "~/lib/entity-editor";
import { linkRangeToCanonical } from "~/lib/entity-linking";
import {
  clearEntityMark,
  getEntityMarkById,
  getEntityRangeRefById,
  getEntityTextById,
  normalizeLegacyEntityMarksAndIds,
} from "~/lib/entity-ops";
import {
  clearParagraphSuppressions,
  createParagraphSuppressionKey,
  createSuppressionSignature,
  isSuppressed,
  pruneSuppressionStore,
  recordSuppression,
} from "~/lib/entity-suppression";
import type { EntityType } from "~/lib/entity-types";
import { uiPreferences$ } from "~/lib/state/ui";
import { AI_SEGMENT_TYPE } from "./ai-segment-kit";

const ENTITY_IDLE_DEBOUNCE_MS = 700;
const DOCUMENT_EDITOR_ID_PREFIX = "document-editor-";

type EntityRuntimeState = {
  normalizing: boolean;
  pendingParagraphRefs: Set<PathRef>;
  running: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

const entityRuntime = new WeakMap<PlateEditor, EntityRuntimeState>();

function pathRefFor(editor: PlateEditor, path: Path): PathRef {
  return Editor.pathRef(editor as unknown as Editor, path);
}

function getDocumentId(editor: PlateEditor): string {
  const editorId = (editor as { id?: string }).id ?? "";
  if (editorId.startsWith(DOCUMENT_EDITOR_ID_PREFIX)) {
    return editorId.slice(DOCUMENT_EDITOR_ID_PREFIX.length);
  }
  return editorId || "unknown-document";
}

function toParagraphPath(path: Path): number[] {
  return path.map((segment) => Number(segment));
}

function pruneStaleRuntimeRefs(runtime: EntityRuntimeState): void {
  const nextPendingRefs = new Set<PathRef>();
  for (const ref of runtime.pendingParagraphRefs) {
    if (ref.current === null) {
      ref.unref();
      continue;
    }
    nextPendingRefs.add(ref);
  }
  runtime.pendingParagraphRefs = nextPendingRefs;
}

function matchesPath(pathRef: PathRef, path: Path): boolean {
  const current = pathRef.current;
  return !!current && SlatePath.equals(current, path);
}

function getEntityOffsetsAndText(
  editor: PlateEditor,
  entityId: string,
): { end: number; start: number; text: string } | null {
  const rangeRef = getEntityRangeRefById(editor, entityId);
  const range = rangeRef?.current;
  if (!rangeRef || !range) return null;
  const paragraphPath = [range.anchor.path[0] ?? 0];
  const offsets = rangeToOffsets(editor, paragraphPath, range);
  if (!offsets) {
    rangeRef.unref();
    return null;
  }
  const text = editor.api
    .string(paragraphPath)
    .slice(offsets.start, offsets.end);
  rangeRef.unref();
  return { end: offsets.end, start: offsets.start, text };
}

function getRuntime(editor: PlateEditor): EntityRuntimeState {
  const existing = entityRuntime.get(editor);
  if (existing) return existing;

  pruneSuppressionStore();

  const initial: EntityRuntimeState = {
    normalizing: false,
    pendingParagraphRefs: new Set<PathRef>(),
    running: false,
    timer: null,
  };
  entityRuntime.set(editor, initial);
  return initial;
}

function queueParagraphEntityDetection(
  editor: PlateEditor,
  paragraphPath: Path,
): void {
  const runtime = getRuntime(editor);
  pruneStaleRuntimeRefs(runtime);
  if (
    [...runtime.pendingParagraphRefs].some((ref) =>
      matchesPath(ref, paragraphPath),
    )
  ) {
    return;
  }
  runtime.pendingParagraphRefs.add(pathRefFor(editor, paragraphPath));

  if (runtime.timer) clearTimeout(runtime.timer);
  runtime.timer = setTimeout(() => {
    void flushDirtyParagraphEntityDetection(editor);
  }, ENTITY_IDLE_DEBOUNCE_MS);
}

function shouldSkipSuppressedCandidate(
  editor: PlateEditor,
  options: Parameters<
    NonNullable<ApplyEntityOptions["shouldSkipCandidate"]>
  >[0],
): boolean {
  const docId = getDocumentId(editor);
  const paragraphPath = toParagraphPath(options.paragraphPath);
  const paragraphKey = createParagraphSuppressionKey(
    docId,
    paragraphPath,
    options.paragraphText,
  );
  const signature = createSuppressionSignature({
    end: options.span.end,
    entityType: options.span.type,
    spanText: options.spanText,
    start: options.span.start,
  });

  return isSuppressed(docId, paragraphKey, signature);
}

function recordCandidateSuppression(
  editor: PlateEditor,
  entityId: string,
): void {
  const rangeRef = getEntityRangeRefById(editor, entityId);
  const range = rangeRef?.current;
  const mark = getEntityMarkById(editor, entityId);
  if (!rangeRef || !range || !mark) return;

  try {
    const paragraphPath = [range.anchor.path[0] ?? 0];
    const offsets = rangeToOffsets(editor, paragraphPath, range);
    if (!offsets) return;

    const paragraphText = editor.api.string(paragraphPath);
    const spanText = paragraphText.slice(offsets.start, offsets.end);
    const docId = getDocumentId(editor);
    const paragraphKey = createParagraphSuppressionKey(
      docId,
      paragraphPath,
      paragraphText,
    );
    const signature = createSuppressionSignature({
      end: offsets.end,
      entityType: mark.entityType,
      spanText,
      start: offsets.start,
    });

    recordSuppression(docId, paragraphKey, signature);
    debugLog("[Entity] Recorded candidate suppression", {
      docId,
      entityId,
      offsets,
      paragraphKey,
      signature,
    });
  } finally {
    rangeRef.unref();
  }
}

async function flushDirtyParagraphEntityDetection(
  editor: PlateEditor,
): Promise<void> {
  const runtime = getRuntime(editor);
  if (!uiPreferences$.entityAutoRunOnIdle.get()) {
    for (const ref of runtime.pendingParagraphRefs) ref.unref();
    runtime.pendingParagraphRefs.clear();
    return;
  }
  if (runtime.running) return;

  const queued = [...runtime.pendingParagraphRefs];
  runtime.pendingParagraphRefs.clear();
  if (!queued.length) return;

  runtime.running = true;
  let scannedParagraphs = 0;

  try {
    for (const paragraphPathRef of queued) {
      const path = paragraphPathRef.current;
      paragraphPathRef.unref();
      if (!path) continue;

      const blockEntry = editor.api.node(path);
      if (!blockEntry) continue;
      const [blockNode] = blockEntry;
      if ((blockNode as { type?: string }).type !== "p") continue;

      scannedParagraphs += 1;
      await runEntityDetectionOnParagraph(editor, path, {
        shouldSkipCandidate: (params) =>
          shouldSkipSuppressedCandidate(editor, params),
      });
    }

    debugInfo("[Entity] Dirty paragraph pass complete", {
      queued: queued.length,
      scannedParagraphs,
    });
  } catch (error) {
    console.error("[Entity] Auto-idle paragraph pass failed", { error });
  } finally {
    runtime.running = false;
  }
}

function normalizeEntityMarks(editor: PlateEditor): void {
  const runtime = getRuntime(editor);
  if (runtime.normalizing) return;

  runtime.normalizing = true;
  try {
    const changed = normalizeLegacyEntityMarksAndIds(editor);
    if (changed) {
      debugInfo("[Entity] Normalized legacy marks during onChange");
    }
  } finally {
    runtime.normalizing = false;
  }
}

async function runFullDocumentPass(editor: PlateEditor): Promise<void> {
  normalizeEntityMarks(editor);
  const runtime = getRuntime(editor);
  if (runtime.running) return;

  runtime.running = true;
  let scannedParagraphs = 0;
  try {
    const paragraphEntries = [
      ...editor.api.blocks({
        match: (node) =>
          !TextApi.isText(node) && (node as { type?: string }).type === "p",
        mode: "lowest",
      }),
    ];

    for (const [, paragraphPath] of paragraphEntries) {
      scannedParagraphs += 1;
      await runEntityDetectionOnParagraph(editor, paragraphPath, {
        shouldSkipCandidate: (params) =>
          shouldSkipSuppressedCandidate(editor, params),
      });
    }

    debugInfo("[Entity] Full document pass complete", {
      scannedParagraphs,
      totalParagraphs: paragraphEntries.length,
    });
  } finally {
    runtime.running = false;
  }
}

export const entityPlugin = createPlatePlugin({
  handlers: {
    onChange: ({ editor }) => {
      normalizeEntityMarks(editor);
    },
    onTextChange: ({ editor, operation }) => {
      if (!uiPreferences$.entityAutoRunOnIdle.get()) return;
      if (editor.dom.readOnly) return;

      const operationType = (operation as { type?: string }).type;
      if (operationType !== "insert_text" && operationType !== "remove_text") {
        return;
      }

      const opPath = (operation as { path?: Path }).path;
      if (!opPath || opPath.length === 0) return;

      const paragraphPath = [opPath[0]];
      const nodeEntry = editor.api.node(paragraphPath);
      if (!nodeEntry) return;

      const [node] = nodeEntry;
      const nodeType = (node as { type?: string }).type;
      if (nodeType !== "p" || nodeType === AI_SEGMENT_TYPE) return;

      const docId = getDocumentId(editor);
      const paragraphText = editor.api.string(paragraphPath);
      const paragraphKey = createParagraphSuppressionKey(
        docId,
        toParagraphPath(paragraphPath),
        paragraphText,
      );
      clearParagraphSuppressions(docId, paragraphKey);
      queueParagraphEntityDetection(editor, paragraphPath);
    },
  },
  key: "entity",
  node: {
    isLeaf: true,
  },
})
  .configure({
    node: { component: EntityLeaf },
  })
  .extendApi(({ editor }) => ({
    runDirtyParagraphs: async () => {
      await flushDirtyParagraphEntityDetection(editor);
    },
    runDocument: async () => {
      await runFullDocumentPass(editor);
    },
    runFullDocumentPass: async () => {
      await runFullDocumentPass(editor);
    },
    runParagraph: async (path: Path) => {
      normalizeEntityMarks(editor);
      await runEntityDetectionOnParagraph(editor, path, {
        shouldSkipCandidate: (params) =>
          shouldSkipSuppressedCandidate(editor, params),
      });
    },
  }))
  .extendTransforms(({ editor }) => ({
    adjustBoundary: (
      entityId: string,
      edge: BoundaryEdge,
      direction: BoundaryDirection,
    ) => {
      normalizeEntityMarks(editor);
      try {
        const before = getEntityOffsetsAndText(editor, entityId);
        debugLog("[Entity] adjustBoundary transform request", {
          beforeEnd: before?.end ?? null,
          beforeStart: before?.start ?? null,
          beforeText: before?.text ?? null,
          direction,
          edge,
          entityId,
        });
        adjustEntityBoundary(editor, entityId, edge, direction);
        const after = getEntityOffsetsAndText(editor, entityId);
        debugLog("[Entity] adjustBoundary transform success", {
          afterEnd: after?.end ?? null,
          afterStart: after?.start ?? null,
          afterText: after?.text ?? null,
          direction,
          edge,
          entityId,
        });
      } catch (error) {
        debugWarn("[Entity] adjustBoundary transform failed", {
          direction,
          edge,
          entityId,
          error,
        });
        throw error;
      }
    },
    convertToLink: (entityId: string, canonicalName: string) => {
      normalizeEntityMarks(editor);
      const rangeRef = getEntityRangeRefById(editor, entityId);
      const range = rangeRef?.current;
      if (!rangeRef || !range) return;

      try {
        debugLog("[Entity] Convert candidate to link", {
          canonicalName,
          entityId,
          entityText: getEntityTextById(editor, entityId),
        });
        clearEntityMark(editor, entityId);
        const rangeAfterClear = rangeRef.current;
        if (rangeAfterClear) {
          linkRangeToCanonical(editor, rangeAfterClear, canonicalName);
        }
      } finally {
        rangeRef.unref();
      }
    },
    dismiss: (entityId: string) => {
      normalizeEntityMarks(editor);
      recordCandidateSuppression(editor, entityId);
      clearEntityMark(editor, entityId);
    },
    remove: (entityId: string) => {
      normalizeEntityMarks(editor);
      debugLog("[Entity] Remove candidate", {
        entityId,
        entityText: getEntityTextById(editor, entityId),
      });
      recordCandidateSuppression(editor, entityId);
      clearEntityMark(editor, entityId);
    },
    setType: (entityId: string, type: EntityType) => {
      normalizeEntityMarks(editor);
      const rangeRef = getEntityRangeRefById(editor, entityId);
      const range = rangeRef?.current;
      const mark = getEntityMarkById(editor, entityId);
      if (!rangeRef || !range || !mark) return;

      try {
        debugLog("[Entity] Set candidate type", {
          entityId,
          nextType: type,
          previousType: mark.entityType,
        });
        editor.tf.setNodes(
          {
            ...mark,
            candidateRevision: (mark.candidateRevision ?? 0) + 1,
            entitySource: "manual",
            entityType: type,
          },
          {
            at: rangeRef.current ?? range,
            match: TextApi.isText,
            split: true,
          },
        );
      } finally {
        rangeRef.unref();
      }
    },
  }));

export const EntityKit = [entityPlugin];
