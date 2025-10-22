// Primary API exports for the state module

export type { Block } from "./block";
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
  setCurrentDocument,
  updateDocument,
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
export type { ModelProperties } from "./llm";

// LLM exports
export { modelProps$ } from "./llm";
// Server exports
export { serverStore$, setError, setLoading, setServerInfo } from "./server";
// Types
export type {
  ActiveTab,
  BlockId,
  ChatId,
  DocumentId,
  MessageId,
  ServerInfo,
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
  setActiveTab,
  setMessageDocumentLinks,
  uiPreferences$,
} from "./ui";
