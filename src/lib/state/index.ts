// Primary API exports for the state module

// Block exports
export {
  addDocumentToBlock,
  blocks$,
  createBlock,
  getBlockLinkedDocuments,
  removeDocumentFromAllBlocks,
  removeDocumentFromBlock,
  setBlockLinkedDocuments,
} from "./block";
export type { ChatThread, ChatThreadWithMessages } from "./chat";
// Chat exports
export {
  chatStore$,
  createNewThread,
  deleteAllThreads,
  deleteThread,
  duplicateThread,
  editThreadTitle,
  getCurrentThread,
  getCurrentThreadWithMessages,
  getThreadMessages,
  regenerateMessage,
  sendMessage,
  setCurrentUserMessage,
  switchThread,
} from "./chat";
export type {
  BaseTypeId,
  DocumentTypeDefinitionV2,
  TemplateDefinition,
} from "./document-model";
export {
  canonicalizeName,
  DOCUMENT_TYPES_V2,
  normalizeTag,
  normalizeTags,
  TEMPLATE_DEFINITIONS,
} from "./document-model";
export type { Document } from "./documents";
// Document exports
export {
  createDocument,
  createDocumentForTemplate,
  deleteDocument,
  documentPersistence$,
  documentStore$,
  getAllDocuments,
  getDocumentByCanonicalName,
  getDocumentById,
  getDocumentTypeDisplayId,
  getTagSuggestions,
  migrateDocumentsToEditorV2,
  migrateDocumentsToModelV2,
  resolveDocumentIdByCanonicalName,
  setCurrentDocument,
  updateDocument,
  updateDocumentContentModel,
} from "./documents";
// Hooks exports
export {
  useBlock,
  useCurrentDocument,
  useCurrentThreadId,
  useDocument,
  useDocuments,
  useServerInfo,
  useThread,
  useThreadMessages,
  useThreadsArray,
  useUIPreferences,
} from "./hooks";
// LLM exports
export { modelProps$ } from "./llm";
export type {
  RelationMetadata,
  RelationRecord,
  RelationTypeDefinition,
} from "./relation-model";
export { RELATION_TYPE_DEFINITIONS } from "./relation-model";
export {
  selectAllTags,
  selectDocumentsByBaseType,
  selectDocumentsByTag,
  selectDocumentsByTemplate,
  selectIncomingRelationsByDocument,
  selectOutgoingRelationsByDocument,
  selectReferencedCanonicalNames,
  selectReferencedDocuments,
  selectReferencingDocuments,
  selectRelationsByDocument,
  selectTagSuggestions,
} from "./selectors";
// Server exports
export { serverStore$, setError, setLoading, setServerInfo } from "./server";
// Types
export type {
  Block,
  BlockId,
  ChatId,
  DocumentId,
  LLMMessage,
  LLMRequest,
  MessageId,
  ModelProperties,
  ServerInfo,
  TokenAlt,
  TokenInfo,
  TokenProbability,
  WorldId,
} from "./types";
// UI exports
export {
  addDocumentToCurrentMessage,
  addDocumentToMessage,
  clearCurrentMessageLinks,
  documentLinking$,
  getCurrentMessageLinks,
  getMessageDocumentLinks,
  removeDocumentFromCurrentMessage,
  removeDocumentFromMessage,
  setAPIBackendEnabled,
  setDebugMode,
  setMessageDocumentLinks,
  setNerAutoLinkStrictMatches,
  setNerAutoRunOnIdle,
  setNerPreloadModel,
  uiPreferences$,
} from "./ui";
// World exports
export {
  createWorld,
  deleteWorld,
  setCurrentWorld,
  updateWorld,
  worldStore$,
} from "./worlds";
