import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { getDocumentById } from "./documents";
import type { RelationMetadata, RelationRecord } from "./relation-model";
import {
  RELATION_TYPE_DEFINITIONS,
  validateRelationEndpointTypes,
} from "./relation-model";
import type { DocumentId } from "./types";

interface GraphStore {
  relations: RelationRecord[];
}

const nowIso = () => new Date().toISOString();

const graphStore = observable<GraphStore>({
  relations: [],
});

export const graphStore$ = graphStore;

const normalizeRelationEndpoints = (
  source: DocumentId,
  target: DocumentId,
  typeId: string,
): { source: DocumentId; target: DocumentId } => {
  const definition = RELATION_TYPE_DEFINITIONS[typeId];
  if (!definition?.symmetric) {
    return { source, target };
  }

  return source.localeCompare(target) <= 0
    ? { source, target }
    : { source: target, target: source };
};

const relationExists = (
  source: DocumentId,
  target: DocumentId,
  typeId: string,
): boolean => {
  const normalized = normalizeRelationEndpoints(source, target, typeId);
  return graphStore$.relations
    .get()
    .some(
      (relation) =>
        relation.typeId === typeId &&
        relation.sourceId === normalized.source &&
        relation.targetId === normalized.target,
    );
};

export const addRelation = (
  sourceId: DocumentId,
  targetId: DocumentId,
  typeId: string,
  metadata: RelationMetadata = {},
): { ok: true; relation: RelationRecord } | { ok: false; reason: string } => {
  const sourceDocument = getDocumentById(sourceId);
  if (!sourceDocument) {
    return { ok: false, reason: `Source document not found: ${sourceId}` };
  }

  const targetDocument = getDocumentById(targetId);
  if (!targetDocument) {
    return { ok: false, reason: `Target document not found: ${targetId}` };
  }

  const validationResult = validateRelationEndpointTypes(
    typeId,
    sourceDocument.baseTypeId,
    targetDocument.baseTypeId,
  );
  if (!validationResult.valid) {
    return {
      ok: false,
      reason: validationResult.reason,
    };
  }

  if (relationExists(sourceId, targetId, typeId)) {
    return {
      ok: false,
      reason: "Relation already exists",
    };
  }

  const normalized = normalizeRelationEndpoints(sourceId, targetId, typeId);
  const timestamp = nowIso();
  const relation: RelationRecord = {
    id: `rel-${crypto.randomUUID()}`,
    typeId,
    sourceId: normalized.source,
    targetId: normalized.target,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  graphStore$.relations.push(relation);
  return { ok: true, relation };
};

export const updateRelationMetadata = (
  relationId: string,
  metadata: RelationMetadata,
): boolean => {
  const relations = graphStore$.relations.get();
  const index = relations.findIndex((relation) => relation.id === relationId);
  if (index === -1) {
    return false;
  }

  const relation = relations[index];
  graphStore$.relations[index].assign({
    metadata: {
      ...relation.metadata,
      ...metadata,
    },
    updatedAt: nowIso(),
  });
  return true;
};

export const removeRelation = (
  sourceId: DocumentId,
  targetId: DocumentId,
  typeId: string,
): boolean => {
  const normalized = normalizeRelationEndpoints(sourceId, targetId, typeId);
  const relations = graphStore$.relations.get();
  const index = relations.findIndex(
    (relation) =>
      relation.typeId === typeId &&
      relation.sourceId === normalized.source &&
      relation.targetId === normalized.target,
  );

  if (index === -1) {
    return false;
  }

  graphStore$.relations.splice(index, 1);
  return true;
};

export const getRelationsForDocument = (
  documentId: DocumentId,
): RelationRecord[] => {
  const relations = graphStore$.relations.get();
  return relations.filter(
    (relation) =>
      relation.sourceId === documentId || relation.targetId === documentId,
  );
};

export const getOutgoingRelations = (
  documentId: DocumentId,
): RelationRecord[] => {
  const relations = graphStore$.relations.get();
  return relations.filter((relation) => relation.sourceId === documentId);
};

export const getIncomingRelations = (
  documentId: DocumentId,
): RelationRecord[] => {
  const relations = graphStore$.relations.get();
  return relations.filter((relation) => relation.targetId === documentId);
};

export const getRelatedDocuments = (documentId: DocumentId): DocumentId[] => {
  const related = new Set<DocumentId>();

  for (const relation of getRelationsForDocument(documentId)) {
    if (relation.sourceId === documentId) {
      related.add(relation.targetId as DocumentId);
      continue;
    }

    related.add(relation.sourceId as DocumentId);
  }

  return [...related];
};

// Backward-compatible wrappers
export const addEdge = (
  source: DocumentId,
  target: DocumentId,
  type: string,
) => {
  const result = addRelation(source, target, type);
  if (!result.ok) {
    console.warn("Failed to add relation", result.reason);
  }
};

export const removeEdge = (
  source: DocumentId,
  target: DocumentId,
  type: string,
) => {
  removeRelation(source, target, type);
};

export const getEdgesForDocument = (documentId: DocumentId) => {
  return getRelationsForDocument(documentId).map((relation) => ({
    source: relation.sourceId,
    target: relation.targetId,
    type: relation.typeId,
  }));
};

const migrateLegacyEdgesToRelations = () => {
  const rawStore = graphStore$.peek() as unknown as {
    edges?: Array<{ source?: string; target?: string; type?: string }>;
    relations?: RelationRecord[];
  };

  if (!Array.isArray(rawStore.edges) || rawStore.edges.length === 0) {
    return;
  }

  for (const edge of rawStore.edges) {
    if (!edge.source || !edge.target || !edge.type) {
      continue;
    }

    if (relationExists(edge.source, edge.target, edge.type)) {
      continue;
    }

    addRelation(edge.source, edge.target, edge.type);
  }
};

syncObservable(graphStore$, {
  persist: {
    name: "graphStore",
    plugin: ObservablePersistLocalStorage,
  },
});

migrateLegacyEdgesToRelations();
