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
export type { Document } from "./documents";
// Document exports
export {
  createDocument,
  deleteDocument,
  documentStore$,
  getAllDocuments,
  getDocumentById,
  migrateDocumentsToEditorV2,
  setCurrentDocument,
  updateDocument,
  updateDocumentContent,
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
