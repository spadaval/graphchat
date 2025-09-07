// Primary API exports for the state module

// Types
export type { BlockId, ChatId, MessageId, VariantId } from './types';
export type { Block } from './block';
export type { ChatThread, ChatThreadWithMessages } from './chat';
export type { ModelProperties } from './llm';

// Block exports
export { blocks$, createBlock } from './block';

// Chat exports
export {
  chatStore$,
  createNewThread,
  switchThread,
  deleteThread,
  deleteAllThreads,
  getCurrentThread,
  getCurrentThreadWithMessages,
  sendMessage,
  setCurrentUserMessage,
  getThreadMessages,
} from './chat';

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