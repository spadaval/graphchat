"use client";

import { use$ } from "@legendapp/state/react";
import type { TText } from "platejs";
import type { PlateLeafProps } from "platejs/react";
import { PlateLeaf } from "platejs/react";
import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { debugWarn } from "~/lib/debug";
import { serializeModelToPreviewText } from "~/lib/document-content";
import { validateEntityBoundaryAdjustment } from "~/lib/entity-boundary";
import { resolveStrictCanonicalMatch } from "~/lib/entity-linking";
import { getEntityTextById } from "~/lib/entity-ops";
import type { EntityType } from "~/lib/entity-types";
import { canonicalizeName } from "~/lib/state/document-model";
import {
  createDocument,
  documentStore$,
  setCurrentDocument,
} from "~/lib/state/documents";
import { worldStore$ } from "~/lib/state/worlds";
import { cn } from "~/lib/utils";

type EntityLeafText = TText & {
  candidateRevision?: number;
  candidateState?: "active" | "dismissed";
  entity?: boolean;
  entityCanonicalName?: string;
  entityConfidence?: number;
  entityId?: string;
  entitySource?: "manual" | "model";
  entityType?: EntityType;
};

const typeStyles: Record<EntityType, string> = {
  location: "underline decoration-cyan-400/90 bg-cyan-500/10",
  organization: "underline decoration-amber-400/90 bg-amber-500/10",
  person: "underline decoration-emerald-400/90 bg-emerald-500/10",
};

const typeLabels: Record<EntityType, string> = {
  location: "Location",
  organization: "Organization",
  person: "Person",
};

type BoundaryAction = {
  direction: "expand" | "contract";
  edge: "left" | "right";
  label: string;
};

const boundaryActions: BoundaryAction[] = [
  { direction: "expand", edge: "left", label: "Expand Left" },
  { direction: "contract", edge: "left", label: "Contract Left" },
  { direction: "contract", edge: "right", label: "Contract Right" },
  { direction: "expand", edge: "right", label: "Expand Right" },
];

export function EntityLeaf(props: PlateLeafProps<EntityLeafText>) {
  const { editor, leaf } = props;
  const entityType = leaf.entityType;
  const entityId = leaf.entityId;
  const hasEntity = leaf.entity && !!entityType;
  const hasEntityId = !!entityId;
  const currentWorldId = use$(worldStore$.currentWorldId);
  const documents = use$(documentStore$.documents);
  const entityText = hasEntityId
    ? getEntityTextById(editor, entityId).trim()
    : "";

  const strictMatch = useMemo(() => {
    if (!entityText) return null;
    return resolveStrictCanonicalMatch(entityText);
  }, [entityText]);

  const convertTarget = leaf.entityCanonicalName ?? strictMatch;
  const linkedDocument = useMemo(() => {
    if (!convertTarget) return undefined;
    const normalizedTarget = canonicalizeName(convertTarget);
    return Object.values(documents).find((document) => {
      if (currentWorldId && document.worldId !== currentWorldId) {
        return false;
      }

      return (
        document.canonicalName === normalizedTarget ||
        document.aliases?.includes(normalizedTarget)
      );
    });
  }, [convertTarget, currentWorldId, documents]);

  const previewText = useMemo(() => {
    if (!linkedDocument) return "";
    return serializeModelToPreviewText(linkedDocument.contentModel || [])
      .trim()
      .slice(0, 180);
  }, [linkedDocument]);

  const boundaryState = useMemo(() => {
    if (!entityId)
      return new Map<string, { reason?: string; valid: boolean }>();
    const map = new Map<string, { reason?: string; valid: boolean }>();
    for (const action of boundaryActions) {
      map.set(
        `${action.edge}-${action.direction}`,
        validateEntityBoundaryAdjustment(
          editor,
          entityId,
          action.edge,
          action.direction,
        ),
      );
    }
    return map;
  }, [editor, entityId]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <PlateLeaf
            {...props}
            className={cn(
              hasEntity &&
                "rounded-sm px-0.5 underline decoration-2 underline-offset-2",
              hasEntity && entityType && typeStyles[entityType],
            )}
            data-entity-type={hasEntity ? entityType : undefined}
            data-entity-label={
              hasEntity && entityType ? typeLabels[entityType] : undefined
            }
          >
            {props.children}
          </PlateLeaf>
        </span>
      </PopoverTrigger>
      {hasEntity && hasEntityId && entityId && (
        <PopoverContent className="w-72 border-zinc-700 bg-zinc-900 p-2 text-zinc-100">
          <div className="mb-2 text-xs text-zinc-400">
            {entityType ? typeLabels[entityType] : "Entity"} Candidate
          </div>

          <div className="my-2 flex gap-1 text-xs">
            {(["person", "organization", "location"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={cn(
                  "rounded border px-2 py-1 capitalize",
                  entityType === type
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-zinc-700 hover:bg-zinc-800",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.tf.entity?.setType(entityId, type);
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="mb-2 grid grid-cols-2 gap-1 text-xs">
            {boundaryActions.map((action) => {
              const key = `${action.edge}-${action.direction}`;
              const status = boundaryState.get(key) ?? { valid: false };
              const reason = status.reason ?? "";
              return (
                <button
                  key={key}
                  type="button"
                  title={status.valid ? action.label : `Disabled: ${reason}`}
                  disabled={!status.valid}
                  className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (!status.valid) {
                      debugWarn("[EntityLeaf] boundary action blocked", {
                        action,
                        entityId,
                        entityText,
                        reason: reason || "unknown",
                      });
                      return;
                    }
                    editor.tf.entity?.adjustBoundary(
                      entityId,
                      action.edge,
                      action.direction,
                    );
                  }}
                >
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className="mb-2 rounded border border-zinc-700/80 p-2 text-xs">
            {linkedDocument ? (
              <>
                <div className="mb-1 text-emerald-300">
                  Linked document found
                </div>
                <div className="mb-1 font-medium text-zinc-100">
                  {linkedDocument.title}
                </div>
                {previewText ? (
                  <div className="line-clamp-4 text-zinc-300">
                    {previewText}
                  </div>
                ) : (
                  <div className="text-zinc-400">No preview content yet.</div>
                )}
                <button
                  type="button"
                  className="mt-2 rounded border border-zinc-600 px-2 py-1 hover:bg-zinc-800"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setCurrentDocument(linkedDocument.id);
                  }}
                >
                  Open Document
                </button>
              </>
            ) : (
              <>
                <div className="mb-1 text-zinc-300">No linked document</div>
                <button
                  type="button"
                  disabled={!entityText}
                  className="rounded border border-zinc-600 px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (!entityText || !entityType) return;
                    const type =
                      entityType === "location" ? "place" : entityType;
                    const documentId = createDocument(entityText, "", type);
                    const createdDocument =
                      documentStore$.documents[documentId].get();
                    if (createdDocument?.canonicalName) {
                      editor.tf.entity?.convertToLink(
                        entityId,
                        createdDocument.canonicalName,
                      );
                    }
                    setCurrentDocument(documentId);
                  }}
                >
                  Create and Link Document
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1 text-xs">
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.tf.entity?.dismiss(entityId);
              }}
            >
              Dismiss
            </button>
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.tf.entity?.remove(entityId);
              }}
            >
              Remove Mark
            </button>
            <button
              type="button"
              disabled={!linkedDocument}
              className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
              onMouseDown={(event) => {
                event.preventDefault();
                if (!linkedDocument) return;
                editor.tf.entity?.convertToLink(
                  entityId,
                  linkedDocument.canonicalName,
                );
              }}
            >
              Convert to Link
            </button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
