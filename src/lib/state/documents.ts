import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { removeDocumentFromAllBlocks } from "./block";
import type { DocumentId, FolderId } from "./types";

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

export interface Folder {
  id: FolderId;
  name: string;
  parentId: FolderId | "root";
  isOpen: boolean;
}

export interface Document {
  id: DocumentId;
  title: string;
  blocks: BlockId[];
  content?: string; // Keep for backward compatibility and easy searching
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  type: string;
  parentId: FolderId | "root";
}

// export type DocumentType = "character" | "location" | "magic" | "general";

interface DocumentStore {
  documents: Record<DocumentId, Document>;
  folders: Record<FolderId, Folder>;
  documentTypes: Record<string, DocumentTypeDefinition>;
  currentDocumentId: DocumentId | undefined;
  openDocumentIds: DocumentId[];
}

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
  folders: {} as Record<FolderId, Folder>,
  documentTypes: defaultDocumentTypes,
  currentDocumentId: undefined,
  openDocumentIds: [],
};

export const documentStore$ = observable<DocumentStore>(documentStore);

import { blocks$, createBlock } from "./block";
import type { BlockId } from "./types";

// Actions
export const createDocument = (
  title: string,
  initialContent: string = "",
  type: string = "general",
  tags: string[] = [],
  parentId: FolderId | "root" = "root",
): DocumentId => {
  const id: DocumentId = `doc-${crypto.randomUUID()}`;
  const now = new Date();

  // Use template if initialContent is empty and type has a template
  let contentToUse = initialContent;
  if (!contentToUse) {
    const typeDef = documentStore$.documentTypes[type].get();
    if (typeDef?.template) {
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
    parentId,
  };

  documentStore$.documents[id].set(document);
  return id;
};

export const createFolder = (
  name: string,
  parentId: FolderId | "root" = "root",
): FolderId => {
  const id: FolderId = `folder-${crypto.randomUUID()}`;

  const folder: Folder = {
    id,
    name,
    parentId,
    isOpen: true,
  };

  documentStore$.folders[id].set(folder);
  return id;
};

export const updateFolder = (
  id: FolderId,
  updates: Partial<Omit<Folder, "id">>,
) => {
  const folder = documentStore$.folders[id].get();
  if (!folder) return;

  documentStore$.folders[id].assign(updates);
};

export const deleteFolder = (id: FolderId) => {
  // Move all documents and folders inside this folder to its parent
  const folder = documentStore$.folders[id].get();
  if (!folder) return;

  const parentId = folder.parentId;

  const docs = documentStore$.documents.get();
  Object.values(docs).forEach((doc) => {
    if (doc.parentId === id) {
      documentStore$.documents[doc.id].parentId.set(parentId);
    }
  });

  const folders = documentStore$.folders.get();
  Object.values(folders).forEach((f) => {
    if (f.parentId === id) {
      documentStore$.folders[f.id].parentId.set(parentId);
    }
  });

  documentStore$.folders[id].delete();
};

export const moveDocument = (
  docId: DocumentId,
  newParentId: FolderId | "root",
) => {
  const doc = documentStore$.documents[docId].get();
  if (!doc) return;
  documentStore$.documents[docId].parentId.set(newParentId);
};

export const moveFolder = (
  folderId: FolderId,
  newParentId: FolderId | "root",
) => {
  // Prevent moving a folder into itself or its descendants
  if (newParentId !== "root") {
    let current: FolderId | "root" = newParentId;
    while (current !== "root") {
      if (current === folderId) return; // Recursive move
      current = documentStore$.folders[current].parentId.get();
    }
  }

  const folder = documentStore$.folders[folderId].get();
  if (!folder) return;
  documentStore$.folders[folderId].parentId.set(newParentId);
};

export const syncDocumentContent = (id: DocumentId) => {
  const doc = documentStore$.documents[id].get();
  if (!doc) return;

  const blockIds = doc.blocks || [];
  const allBlocks = blocks$.get();

  const content = blockIds
    .map((bid) => allBlocks[bid]?.text || "")
    .join("\n\n");

  documentStore$.documents[id].content.set(content);
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

  // If blocks were updated, sync content
  if (updates.blocks) {
    syncDocumentContent(id);
  }

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

  // Remove from open documents
  const openIds = documentStore$.openDocumentIds.get();
  if (openIds.includes(id)) {
    documentStore$.openDocumentIds.set(openIds.filter((oid) => oid !== id));
  }
};

export const setCurrentDocument = (id: DocumentId | undefined) => {
  documentStore$.currentDocumentId.set(id);
  if (id && !documentStore$.openDocumentIds.get().includes(id)) {
    documentStore$.openDocumentIds.push(id);
  }
};

export const closeDocument = (id: DocumentId) => {
  const openIds = documentStore$.openDocumentIds.get();
  const newOpenIds = openIds.filter((oid) => oid !== id);
  documentStore$.openDocumentIds.set(newOpenIds);

  if (documentStore$.currentDocumentId.get() === id) {
    documentStore$.currentDocumentId.set(
      newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : undefined,
    );
  }
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
