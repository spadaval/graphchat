// Primary API exports for the state module

// Types
export type { BlockId, ChatId, MessageId, VariantId, DocumentId } from './types';
export type { Block } from './block';
export type { ChatThread, ChatThreadWithMessages } from './chat';
export type { ModelProperties } from './llm';
export type { Document } from './documents';

// Block exports
export { blocks$, createBlock } from './block';

// Chat exports
export {
  chatStore$,
  createNewThread,
  switchThread,
  deleteThread,
  deleteAllThreads,
  duplicateThread,
  editThreadTitle,
  getCurrentThread,
  getCurrentThreadWithMessages,
  sendMessage,
  setCurrentUserMessage,
  getThreadMessages,
} from './chat';

// Document exports
export {
  documentStore$,
  createDocument,
  updateDocument,
  deleteDocument,
  setCurrentDocument,
  getAllDocuments,
  getDocumentById,
} from './documents';

// LLM exports
export { modelProps$ } from './llm';

// Hooks exports
export { 
  useThread, 
  useThreadMessages, 
  useBlock, 
  useCurrentThreadId, 
  useThreadsArray 
} from './hooks';