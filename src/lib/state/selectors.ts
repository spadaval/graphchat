import { extractInternalCanonicalLinksFromModel } from "../document-content";
import { type BaseTypeId, normalizeTag } from "./document-model";
import {
  type Document,
  documentStore$,
  getDocumentByCanonicalName,
  getDocumentById,
  getReferencedCanonicalNames,
} from "./documents";
import {
  getIncomingRelations,
  getOutgoingRelations,
  getRelationsForDocument,
} from "./graph";
import type { RelationRecord } from "./relation-model";
import type { DocumentId, WorldId } from "./types";

const filterByWorld = (
  documents: Document[],
  worldId?: WorldId,
): Document[] => {
  if (!worldId) return documents;
  return documents.filter((document) => document.worldId === worldId);
};

const getDocuments = (): Document[] =>
  Object.values(documentStore$.documents.get());

export const selectDocumentsByBaseType = (
  baseTypeId: BaseTypeId,
  worldId?: WorldId,
): Document[] => {
  const documents = getDocuments().filter(
    (document) => document.baseTypeId === baseTypeId,
  );
  return filterByWorld(documents, worldId);
};

export const selectDocumentsByTemplate = (
  templateId: string,
  worldId?: WorldId,
): Document[] => {
  const documents = getDocuments().filter(
    (document) => document.templateId === templateId,
  );
  return filterByWorld(documents, worldId);
};

export const selectDocumentsByTag = (
  tag: string,
  worldId?: WorldId,
): Document[] => {
  const normalizedTag = normalizeTag(tag);
  const documents = getDocuments().filter((document) =>
    document.tags.includes(normalizedTag),
  );
  return filterByWorld(documents, worldId);
};

export const selectAllTags = (): string[] => {
  const tags = new Set<string>();
  for (const document of getDocuments()) {
    for (const tag of document.tags) {
      tags.add(tag);
    }
  }

  return [...tags].sort((left, right) => left.localeCompare(right));
};

export const selectTagSuggestions = (prefix = ""): string[] => {
  const normalizedPrefix = normalizeTag(prefix);
  const allTags = selectAllTags();
  if (!normalizedPrefix) return allTags;
  return allTags.filter((tag) => tag.startsWith(normalizedPrefix));
};

export const selectOutgoingRelationsByDocument = (
  documentId: DocumentId,
): RelationRecord[] => {
  return getOutgoingRelations(documentId);
};

export const selectIncomingRelationsByDocument = (
  documentId: DocumentId,
): RelationRecord[] => {
  return getIncomingRelations(documentId);
};

export const selectRelationsByDocument = (
  documentId: DocumentId,
): RelationRecord[] => {
  return getRelationsForDocument(documentId);
};

export const selectReferencedCanonicalNames = (
  documentId: DocumentId,
): string[] => {
  return getReferencedCanonicalNames(documentId);
};

export const selectReferencedDocuments = (
  documentId: DocumentId,
): Document[] => {
  const canonicalNames = selectReferencedCanonicalNames(documentId);
  const documents: Document[] = [];

  for (const canonicalName of canonicalNames) {
    const document = getDocumentByCanonicalName(canonicalName);
    if (document) {
      documents.push(document);
    }
  }

  return documents;
};

export const selectReferencingDocuments = (
  targetDocumentId: DocumentId,
): Document[] => {
  const targetDocument = getDocumentById(targetDocumentId);
  if (!targetDocument) {
    return [];
  }

  return getDocuments().filter((document) => {
    if (document.id === targetDocumentId) {
      return false;
    }

    const references = extractInternalCanonicalLinksFromModel(
      document.contentModel || [],
    );
    return references.includes(targetDocument.canonicalName);
  });
};
