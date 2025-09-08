// Primary API exports for the state module

export type { Block } from "./block";
// Block exports
export { blocks$, createBlock } from "./block";
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
  useCurrentThreadId,
  useThread,
  useThreadMessages,
  useThreadsArray,
} from "./hooks";
export type { ModelProperties } from "./llm";

// LLM exports
export { modelProps$ } from "./llm";
// Types
export type {
  BlockId,
  ChatId,
  DocumentId,
  MessageId,
  VariantId,
} from "./types";
