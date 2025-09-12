import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type { DocumentId } from "./types";
import { removeDocumentFromAllBlocks } from "./block";

export interface Document {
  id: DocumentId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

interface DocumentStore {
  documents: Record<DocumentId, Document>;
  currentDocumentId: DocumentId | undefined;
}

let nextDocumentId = 1;

const documentStore: DocumentStore = {
  documents: {} as Record<DocumentId, Document>,
  currentDocumentId: undefined,
};

export const documentStore$ = observable<DocumentStore>(documentStore);

// Actions
export const createDocument = (
  title: string,
  content: string = "",
  tags: string[] = [],
): DocumentId => {
  const id: DocumentId = `doc-${nextDocumentId++}`;
  const now = new Date();

  const document: Document = {
    id,
    title,
    content,
    createdAt: now,
    updatedAt: now,
    tags,
  };

  documentStore$.documents[id].set(document);
  return id;
};

export const updateDocument = (
  id: DocumentId,
  updates: Partial<Omit<Document, "id" | "createdAt">>,
) => {
  const documents = documentStore$.documents.get();
  const document = documents[id];

  if (!document) return;

  const updatedDocument = {
    ...document,
    ...updates,
    updatedAt: new Date(),
  };

  documentStore$.documents[id].set(updatedDocument);
};

export const deleteDocument = (id: DocumentId) => {
  // Remove the document reference from all blocks first
  try {
    removeDocumentFromAllBlocks(id);
  } catch (error) {
    console.error("Error removing document from blocks:", error);
  }

  // Then delete the document from the document store
  documentStore$.documents[id].delete();

  // If we're deleting the current document, unset current document
  const currentDocumentId = documentStore$.currentDocumentId.get();
  if (currentDocumentId === id) {
    documentStore$.currentDocumentId.set(undefined);
  }
};

export const setCurrentDocument = (id: DocumentId) => {
  documentStore$.currentDocumentId.set(id);
};

export const getAllDocuments = (): Document[] => {
  const documents = documentStore$.documents.get();
  return Object.values(documents);
};

export const getDocumentById = (id: DocumentId): Document | undefined => {
  const documents = documentStore$.documents.get();
  return documents[id];
};

// Persist state
syncObservable(documentStore$, {
  persist: {
    name: "documentStore",
    plugin: ObservablePersistLocalStorage,
  },
});

export default documentStore$;
