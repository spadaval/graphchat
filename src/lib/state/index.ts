// Primary API exports for the state module

export type { Block } from "./block";
// Block exports
export {
  blocks$,
  createBlock,
  addDocumentToBlock,
  removeDocumentFromBlock,
  getBlockLinkedDocuments,
  setBlockLinkedDocuments,
  removeDocumentFromAllBlocks,
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
  sendMessage,
  setCurrentUserMessage,
  switchThread,
  regenerateMessage,
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
  useThread,
  useThreadMessages,
  useThreadsArray,
  useDocuments,
  useServerInfo,
  useUIPreferences,
} from "./hooks";
export type { ModelProperties } from "./llm";

// LLM exports
export { modelProps$ } from "./llm";
// Server exports
export { serverStore$, setServerInfo, setLoading, setError } from "./server";
// UI exports
export {
  uiPreferences$,
  setActiveTab,
  documentLinking$,
  addDocumentToCurrentMessage,
  removeDocumentFromCurrentMessage,
  clearCurrentMessageLinks,
  getCurrentMessageLinks,
  addDocumentToMessage,
  removeDocumentFromMessage,
  getMessageDocumentLinks,
  setMessageDocumentLinks,
} from "./ui";
// Types
export type {
  ActiveTab,
  BlockId,
  ChatId,
  DocumentId,
  MessageId,
  ServerInfo,
} from "./types";
