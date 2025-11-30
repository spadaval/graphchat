import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { removeDocumentFromAllBlocks } from "./block";
import type { DocumentId } from "./types";

export enum DocumentIcon {
  FileText = "FileText",
  User = "User",
  Map = "Map",
  Sparkles = "Sparkles",
  Ghost = "Ghost",
  Building = "Building",
  Book = "Book",
  Scroll = "Scroll",
}

export interface DocumentTypeDefinition {
  id: string;
  name: string;
  icon: DocumentIcon;
  template: string;
}

export interface Document {
  id: DocumentId;
  title: string;
  blocks: BlockId[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  type: string; // Changed from union type to string
}

// export type DocumentType = "character" | "location" | "magic" | "general";

interface DocumentStore {
  documents: Record<DocumentId, Document>;
  documentTypes: Record<string, DocumentTypeDefinition>;
  currentDocumentId: DocumentId | undefined;
}

let nextDocumentId = 1;

const defaultDocumentTypes: Record<string, DocumentTypeDefinition> = {
  general: {
    id: "general",
    name: "General",
    icon: DocumentIcon.FileText,
    template: "",
  },
  person: {
    id: "person",
    name: "Person",
    icon: DocumentIcon.User,
    template: "Name:\nAge:\nOccupation:\n\nDescription:",
  },
  place: {
    id: "place",
    name: "Place",
    icon: DocumentIcon.Map,
    template: "Name:\nLocation:\n\nDescription:",
  },
};

const documentStore: DocumentStore = {
  documents: {} as Record<DocumentId, Document>,
  documentTypes: defaultDocumentTypes,
  currentDocumentId: undefined,
};

export const documentStore$ = observable<DocumentStore>(documentStore);

// Initialize default types if missing (will happen after persistence load if empty)
// We can't easily hook into "after load" with legend-state sync immediately, 
// but we can ensure they exist when accessing or via an effect if needed.
// For now, let's just ensure the store starts with them. 
// If persistence overwrites them with empty, we might need a re-init check.
// However, since we want to *add* them if missing, let's do a check.

import { createBlock, blocks$ } from "./block";
import type { BlockId } from "./types";

// Actions
export const createDocument = (
  title: string,
  initialContent: string = "",
  type: string = "general",
  tags: string[] = [],
): DocumentId => {
  const id: DocumentId = `doc-${nextDocumentId++}`;
  const now = new Date();

  // Use template if initialContent is empty and type has a template
  let contentToUse = initialContent;
  if (!contentToUse) {
    const typeDef = documentStore$.documentTypes[type].get();
    if (typeDef && typeDef.template) {
      contentToUse = typeDef.template;
    }
  }

  // Create initial block if content is provided
  const blocks: BlockId[] = [];
  if (contentToUse) {
    const block = createBlock(contentToUse, "user", "paragraph");
    blocks$.assign({ [block.id]: block });
    blocks.push(block.id);
  }

  const document: Document = {
    id,
    title,
    blocks,
    createdAt: now,
    updatedAt: now,
    tags,
    type,
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
  return updatedDocument;
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

export const ensureDefaultDocumentTypes = () => {
  const types = documentStore$.documentTypes.get();
  if (!types.person) {
    documentStore$.documentTypes.person.set(defaultDocumentTypes.person);
  }
  if (!types.place) {
    documentStore$.documentTypes.place.set(defaultDocumentTypes.place);
  }
  if (!types.general) {
    documentStore$.documentTypes.general.set(defaultDocumentTypes.general);
  }
};

// Persist state
syncObservable(documentStore$, {
  persist: {
    name: "documentStore",
    plugin: ObservablePersistLocalStorage,
  },
});

// Run initialization check
ensureDefaultDocumentTypes();

export default documentStore$;
