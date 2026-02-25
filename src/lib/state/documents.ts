import { observable, syncState, when } from "@legendapp/state";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { syncObservable } from "@legendapp/state/sync";
import type { DocumentModel } from "~/lib/document-content";
import {
  deserializeMarkdownToModel,
  extractInternalCanonicalLinksFromModel,
  isValidModel,
  rewriteInternalCanonicalLinksInModel,
} from "~/lib/document-content";
import { removeDocumentFromAllBlocks } from "./block";
import {
  type BaseTypeId,
  canonicalizeName,
  DOCUMENT_TYPES_V2,
  type DocumentTypeDefinitionV2,
  ensureTemplateMatchesBaseType,
  normalizeTags,
  resolveBaseTypeAndTemplate,
  TEMPLATE_DEFINITIONS,
  type TemplateDefinition,
} from "./document-model";
import type { BlockId, DocumentId, FolderId, WorldId } from "./types";
import { worldStore$ } from "./worlds";

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
  worldId: WorldId;
}

export interface Document {
  id: DocumentId;
  canonicalName: string;
  aliases: string[];
  title: string;
  blocks: BlockId[];
  contentModel: DocumentModel;
  contentModelVersion: number;
  content?: string;
  editorVersion?: number;
  migrationError?: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  baseTypeId: BaseTypeId;
  templateId?: string;
  frontmatter: Record<string, unknown>;
  type?: string;
  parentId: FolderId | "root";
  worldId: WorldId;
}

interface DocumentStore {
  documents: Record<DocumentId, Document>;
  folders: Record<FolderId, Folder>;
  documentTypes: Record<string, DocumentTypeDefinition>;
  documentTypeRegistry: Record<BaseTypeId, DocumentTypeDefinitionV2>;
  templateRegistry: Record<string, TemplateDefinition>;
  currentDocumentId: DocumentId | undefined;
  openDocumentIds: DocumentId[];
}

interface DocumentPersistenceState {
  failedDocuments: DocumentId[];
  isMigrating: boolean;
  isReady: boolean;
  migrationError?: string;
  migrationVersion: number;
}

const CONTENT_MODEL_VERSION = 1;
const DOCUMENT_MIGRATION_VERSION = 1;
const LEGACY_DOCUMENT_STORE_KEY = "documentStore";

const nowIso = () => new Date().toISOString();

const baseTypeIconMap: Record<BaseTypeId, DocumentIcon> = {
  general: DocumentIcon.FileText,
  story: DocumentIcon.Book,
  person: DocumentIcon.User,
  place: DocumentIcon.Map,
  organization: DocumentIcon.Building,
  culture: DocumentIcon.Book,
  magic_system: DocumentIcon.Sparkles,
  technology: DocumentIcon.Scroll,
  natural_law: DocumentIcon.Ghost,
  species: DocumentIcon.User,
};

const buildDefaultDocumentTypes = (): Record<
  string,
  DocumentTypeDefinition
> => {
  const baseTypes = Object.values(DOCUMENT_TYPES_V2).reduce<
    Record<string, DocumentTypeDefinition>
  >((acc, definition) => {
    acc[definition.id] = {
      id: definition.id,
      name: definition.name,
      icon: baseTypeIconMap[definition.id],
      template: "",
    };
    return acc;
  }, {});

  baseTypes.person.template = "Name:\nAge:\nOccupation:\n\nDescription:";
  baseTypes.place.template = "Name:\nLocation:\n\nDescription:";
  baseTypes.story.template =
    "Title:\nPremise:\nPOV:\n\n## Scene 1\n\n## Scene 2";

  return baseTypes;
};

const defaultDocumentTypes = buildDefaultDocumentTypes();

const documentStore: DocumentStore = {
  documents: {} as Record<DocumentId, Document>,
  folders: {} as Record<FolderId, Folder>,
  documentTypes: defaultDocumentTypes,
  documentTypeRegistry: DOCUMENT_TYPES_V2,
  templateRegistry: TEMPLATE_DEFINITIONS,
  currentDocumentId: undefined,
  openDocumentIds: [],
};

export const documentStore$ = observable<DocumentStore>(documentStore);
export const documentPersistence$ = observable<DocumentPersistenceState>({
  failedDocuments: [],
  isMigrating: false,
  isReady: false,
  migrationVersion: 0,
});

import { blocks$, createBlock } from "./block";

const getCanonicalNameSetForWorld = (
  worldId: WorldId,
  excludeDocumentId?: DocumentId,
): Set<string> => {
  const documents = documentStore$.documents.get();
  const names = new Set<string>();

  for (const document of Object.values(documents)) {
    if (document.worldId !== worldId || document.id === excludeDocumentId) {
      continue;
    }

    if (document.canonicalName) {
      names.add(document.canonicalName);
    }
  }

  return names;
};

const ensureUniqueCanonicalName = (
  requestedCanonicalName: string,
  worldId: WorldId,
  excludeDocumentId?: DocumentId,
): string => {
  const canonicalNameSet = getCanonicalNameSetForWorld(
    worldId,
    excludeDocumentId,
  );
  if (!canonicalNameSet.has(requestedCanonicalName)) {
    return requestedCanonicalName;
  }

  let index = 2;
  while (canonicalNameSet.has(`${requestedCanonicalName}-${index}`)) {
    index += 1;
  }

  return `${requestedCanonicalName}-${index}`;
};

const normalizeTimestamp = (value: unknown): string => {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return nowIso();
};

const resolveWorldId = (worldId?: WorldId): WorldId => {
  return (worldId ||
    worldStore$.currentWorldId.get() ||
    "world-default") as WorldId;
};

const resolveLegacyType = (baseTypeId: BaseTypeId): string => baseTypeId;

const mapTypeInputToModel = (
  typeOrTemplateId?: string,
): {
  baseTypeId: BaseTypeId;
  templateId?: string;
} => {
  const resolved = resolveBaseTypeAndTemplate(typeOrTemplateId);
  return {
    baseTypeId: resolved.baseTypeId,
    templateId: ensureTemplateMatchesBaseType(
      resolved.baseTypeId,
      resolved.templateId,
    ),
  };
};

const rewriteLinksForCanonicalRename = (
  previousCanonicalName: string,
  nextCanonicalName: string,
) => {
  const documents = documentStore$.documents.get();
  for (const document of Object.values(documents)) {
    if (!isValidModel(document.contentModel)) {
      continue;
    }

    const nextModel = rewriteInternalCanonicalLinksInModel(
      document.contentModel,
      previousCanonicalName,
      nextCanonicalName,
    );

    if (nextModel !== document.contentModel) {
      documentStore$.documents[document.id].assign({
        contentModel: nextModel,
        updatedAt: nowIso(),
      });
    }
  }
};

const maybeUpdateCanonicalNameFromTitle = (
  document: Document,
  title: string,
): {
  canonicalName: string;
  aliases: string[];
} => {
  const desiredCanonicalName = canonicalizeName(title);
  const canonicalName = ensureUniqueCanonicalName(
    desiredCanonicalName,
    document.worldId,
    document.id,
  );

  if (canonicalName === document.canonicalName) {
    return {
      canonicalName: document.canonicalName,
      aliases: document.aliases || [],
    };
  }

  const aliases = [...(document.aliases || [])];
  if (
    document.canonicalName &&
    document.canonicalName !== canonicalName &&
    !aliases.includes(document.canonicalName)
  ) {
    aliases.push(document.canonicalName);
  }

  rewriteLinksForCanonicalRename(document.canonicalName, canonicalName);

  return { canonicalName, aliases };
};

export const resolveDocumentIdByCanonicalName = (
  canonicalName: string,
  worldId?: WorldId,
): DocumentId | undefined => {
  const normalizedCanonicalName = canonicalizeName(canonicalName);
  const targetWorldId = worldId || worldStore$.currentWorldId.get();
  const documents = documentStore$.documents.get();

  for (const document of Object.values(documents)) {
    if (targetWorldId && document.worldId !== targetWorldId) {
      continue;
    }

    if (document.canonicalName === normalizedCanonicalName) {
      return document.id;
    }

    if (document.aliases?.includes(normalizedCanonicalName)) {
      return document.id;
    }
  }

  return undefined;
};

export const getDocumentByCanonicalName = (
  canonicalName: string,
  worldId?: WorldId,
): Document | undefined => {
  const id = resolveDocumentIdByCanonicalName(canonicalName, worldId);
  if (!id) return undefined;
  return documentStore$.documents[id].get();
};

// Actions
export const createDocument = (
  title: string,
  initialContent: string = "",
  type: string = "general",
  tags: string[] = [],
  parentId: FolderId | "root" = "root",
  worldId?: WorldId,
): DocumentId => {
  const finalWorldId = resolveWorldId(worldId);
  const { baseTypeId, templateId } = mapTypeInputToModel(type);
  const canonicalName = ensureUniqueCanonicalName(
    canonicalizeName(title),
    finalWorldId,
  );
  const id = canonicalName as DocumentId;

  // Use template if initialContent is empty and type has a template
  let contentToUse = initialContent;
  if (!contentToUse) {
    const typeDef = documentStore$.documentTypes[baseTypeId].get();
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

  const timestamp = nowIso();
  const document: Document = {
    id,
    canonicalName,
    aliases: [],
    title,
    blocks,
    contentModel: deserializeMarkdownToModel(contentToUse || ""),
    contentModelVersion: CONTENT_MODEL_VERSION,
    editorVersion: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: normalizeTags(tags),
    baseTypeId,
    templateId,
    frontmatter: {},
    type: resolveLegacyType(baseTypeId),
    parentId,
    worldId: finalWorldId,
  };

  documentStore$.documents[id].set(document);
  return id;
};

export const createDocumentForTemplate = (
  title: string,
  templateId: string,
  options?: {
    initialContent?: string;
    tags?: string[];
    parentId?: FolderId | "root";
    worldId?: WorldId;
  },
): DocumentId => {
  const template = TEMPLATE_DEFINITIONS[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  return createDocument(
    title,
    options?.initialContent,
    template.id,
    options?.tags,
    options?.parentId,
    options?.worldId,
  );
};

export const createFolder = (
  name: string,
  parentId: FolderId | "root" = "root",
  worldId?: WorldId,
): FolderId => {
  const id: FolderId = `folder-${crypto.randomUUID()}`;
  const finalWorldId = resolveWorldId(worldId);

  const folder: Folder = {
    id,
    name,
    parentId,
    isOpen: true,
    worldId: finalWorldId,
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
      if (current === folderId) return;
      current = documentStore$.folders[current].parentId.get();
    }
  }

  const folder = documentStore$.folders[folderId].get();
  if (!folder) return;
  documentStore$.folders[folderId].parentId.set(newParentId);
};

export const updateDocumentContentModel = (
  id: DocumentId,
  contentModel: DocumentModel,
) => {
  const doc = documentStore$.documents[id].get();
  if (!doc) return;

  documentStore$.documents[id].assign({
    contentModel,
    contentModelVersion: CONTENT_MODEL_VERSION,
    editorVersion: 2,
    updatedAt: nowIso(),
  });
};

export const updateDocument = (
  id: DocumentId,
  updates: Partial<Omit<Document, "id" | "createdAt">>,
) => {
  const documents = documentStore$.documents.get();
  const currentDocument = documents[id];

  if (!currentDocument) return;

  let baseTypeId = updates.baseTypeId || currentDocument.baseTypeId;
  let templateId = updates.templateId || currentDocument.templateId;

  if (updates.type && !updates.baseTypeId && !updates.templateId) {
    const mapped = mapTypeInputToModel(updates.type);
    baseTypeId = mapped.baseTypeId;
    templateId = mapped.templateId;
  }

  templateId = ensureTemplateMatchesBaseType(baseTypeId, templateId);

  const nextTags = updates.tags
    ? normalizeTags(updates.tags)
    : currentDocument.tags;

  let canonicalName = currentDocument.canonicalName;
  let aliases = currentDocument.aliases || [];

  if (typeof updates.title === "string") {
    const canonicalUpdate = maybeUpdateCanonicalNameFromTitle(
      currentDocument,
      updates.title,
    );
    canonicalName = canonicalUpdate.canonicalName;
    aliases = canonicalUpdate.aliases;
  } else if (updates.canonicalName) {
    const nextCanonicalName = ensureUniqueCanonicalName(
      canonicalizeName(updates.canonicalName),
      currentDocument.worldId,
      currentDocument.id,
    );

    if (nextCanonicalName !== canonicalName) {
      if (!aliases.includes(canonicalName)) {
        aliases = [...aliases, canonicalName];
      }
      rewriteLinksForCanonicalRename(canonicalName, nextCanonicalName);
      canonicalName = nextCanonicalName;
    }
  }

  const updatedDocument: Document = {
    ...currentDocument,
    ...updates,
    baseTypeId,
    templateId,
    canonicalName,
    aliases,
    tags: nextTags,
    type: resolveLegacyType(baseTypeId),
    updatedAt: nowIso(),
  };

  documentStore$.documents[id].set(updatedDocument);

  return updatedDocument;
};

export const deleteDocument = (id: DocumentId) => {
  try {
    removeDocumentFromAllBlocks(id);
  } catch (error) {
    console.error("Error removing document from blocks:", error);
  }

  documentStore$.documents[id].delete();

  const currentDocumentId = documentStore$.currentDocumentId.get();
  if (currentDocumentId === id) {
    documentStore$.currentDocumentId.set(undefined);
  }

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

export const getDocumentTypeDisplayId = (document: Document): string => {
  if (document.templateId) {
    return document.templateId;
  }
  if (document.baseTypeId) {
    return document.baseTypeId;
  }
  return document.type || "general";
};

export const getAllCanonicalTags = (): string[] => {
  const documents = documentStore$.documents.get();
  const tags = new Set<string>();

  for (const document of Object.values(documents)) {
    for (const tag of document.tags || []) {
      tags.add(tag);
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
};

export const getTagSuggestions = (prefix = ""): string[] => {
  const normalizedPrefix = canonicalizeName(prefix);
  const tags = getAllCanonicalTags();
  if (!normalizedPrefix) {
    return tags;
  }

  return tags.filter((tag) => tag.startsWith(normalizedPrefix));
};

export const getReferencedCanonicalNames = (
  documentId: DocumentId,
): string[] => {
  const document = documentStore$.documents[documentId].get();
  if (!document) return [];
  return extractInternalCanonicalLinksFromModel(document.contentModel || []);
};

export const ensureDefaultDocumentTypes = () => {
  const types = documentStore$.documentTypes.get();
  for (const [id, typeDef] of Object.entries(defaultDocumentTypes)) {
    if (!types[id]) {
      documentStore$.documentTypes[id].set(typeDef);
    }
  }
};

export const migrateToWorlds = () => {
  const defaultWorldId = resolveWorldId();

  const docs = documentStore$.documents.get();
  Object.values(docs).forEach((doc) => {
    if (!doc.worldId) {
      documentStore$.documents[doc.id].worldId.set(defaultWorldId);
    }
  });

  const folders = documentStore$.folders.get();
  Object.values(folders).forEach((f) => {
    if (!f.worldId) {
      documentStore$.folders[f.id].worldId.set(defaultWorldId);
    }
  });
};

export const migrateDocumentsToEditorV2 = () => {};

export const migrateDocumentsToModelV2 = () => {
  const docs = documentStore$.documents.get();

  for (const doc of Object.values(docs)) {
    const { baseTypeId, templateId } = mapTypeInputToModel(
      doc.templateId || doc.baseTypeId || doc.type,
    );

    const canonicalName = ensureUniqueCanonicalName(
      canonicalizeName(doc.canonicalName || doc.title || doc.id),
      doc.worldId,
      doc.id,
    );

    const aliases = Array.isArray(doc.aliases)
      ? normalizeTags(doc.aliases)
      : [];

    documentStore$.documents[doc.id].assign({
      canonicalName,
      aliases,
      baseTypeId,
      templateId,
      frontmatter:
        doc.frontmatter && typeof doc.frontmatter === "object"
          ? doc.frontmatter
          : {},
      type: resolveLegacyType(baseTypeId),
      tags: normalizeTags(doc.tags || []),
      createdAt: normalizeTimestamp(doc.createdAt),
      updatedAt: normalizeTimestamp(doc.updatedAt),
    });
  }
};

export const migrateDocumentsToContentModelV1 = () => {
  const docs = documentStore$.documents.get();
  const allBlocks = blocks$.get();
  const failed: DocumentId[] = [];

  for (const doc of Object.values(docs)) {
    if (isValidModel(doc.contentModel) && doc.contentModel.length > 0) {
      if (doc.content) {
        const withoutLegacy = { ...doc };
        delete withoutLegacy.content;
        documentStore$.documents[doc.id].set(withoutLegacy);
      }
      continue;
    }

    const blockText = (doc.blocks || [])
      .map((blockId) => allBlocks[blockId]?.text || "")
      .join("\n\n");
    const legacyMarkdown = typeof doc.content === "string" ? doc.content : "";
    const markdown = legacyMarkdown || blockText;

    if (!markdown.trim()) {
      failed.push(doc.id);
      documentStore$.documents[doc.id].migrationError.set(true);
      continue;
    }

    try {
      const contentModel = deserializeMarkdownToModel(markdown);
      const nextDoc: Document = {
        ...doc,
        contentModel,
        contentModelVersion: CONTENT_MODEL_VERSION,
        editorVersion: 2,
        migrationError: false,
        updatedAt: nowIso(),
      };
      delete nextDoc.content;
      documentStore$.documents[doc.id].set(nextDoc);
    } catch (error) {
      failed.push(doc.id);
      console.error("Failed to migrate markdown to model", {
        documentId: doc.id,
        error,
      });
      documentStore$.documents[doc.id].migrationError.set(true);
    }
  }

  documentPersistence$.failedDocuments.set(failed);
  documentPersistence$.migrationVersion.set(DOCUMENT_MIGRATION_VERSION);
};

const indexedDbPlugin = observablePersistIndexedDB({
  databaseName: "worldcrafter",
  tableNames: ["documents"],
  version: 1,
});

syncObservable(documentStore$, {
  persist: {
    name: "documents",
    plugin: indexedDbPlugin,
  },
});

const bootstrapFromLegacyLocalStorage = (): boolean => {
  if (typeof window === "undefined") return false;
  if (Object.keys(documentStore$.documents.get()).length > 0) return false;

  const raw = window.localStorage.getItem(LEGACY_DOCUMENT_STORE_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as
      | Partial<DocumentStore>
      | { state?: Partial<DocumentStore> };
    const candidate =
      parsed && "state" in parsed ? (parsed.state ?? null) : parsed;

    if (!candidate || typeof candidate !== "object") return false;
    if (!candidate.documents || typeof candidate.documents !== "object") {
      return false;
    }

    documentStore$.assign({
      currentDocumentId: candidate.currentDocumentId,
      documentTypeRegistry: candidate.documentTypeRegistry || DOCUMENT_TYPES_V2,
      documentTypes: candidate.documentTypes || defaultDocumentTypes,
      documents: candidate.documents as Record<DocumentId, Document>,
      folders: candidate.folders || {},
      openDocumentIds: candidate.openDocumentIds || [],
      templateRegistry: candidate.templateRegistry || TEMPLATE_DEFINITIONS,
    });

    return true;
  } catch (error) {
    console.error("Failed to import legacy localStorage document store", {
      error,
    });
    return false;
  }
};

const initializeDocumentStore = async () => {
  if (typeof window === "undefined") {
    documentPersistence$.isReady.set(true);
    return;
  }

  documentPersistence$.isMigrating.set(true);
  try {
    const state$ = syncState(documentStore$);
    await when(state$.isPersistLoaded);

    const importedFromLegacy = bootstrapFromLegacyLocalStorage();

    ensureDefaultDocumentTypes();
    migrateToWorlds();
    migrateDocumentsToEditorV2();
    migrateDocumentsToModelV2();
    migrateDocumentsToContentModelV1();

    if (importedFromLegacy) {
      window.localStorage.removeItem(LEGACY_DOCUMENT_STORE_KEY);
    }
  } catch (error) {
    documentPersistence$.migrationError.set(
      error instanceof Error ? error.message : String(error),
    );
    console.error("Document store initialization failed", { error });
  } finally {
    documentPersistence$.isMigrating.set(false);
    documentPersistence$.isReady.set(true);
  }
};

void initializeDocumentStore();

export default documentStore$;
