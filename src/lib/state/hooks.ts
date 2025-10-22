import { use$ } from "@legendapp/state/react";
import { getThreadMessages } from "./chat";
import type { Document } from "./documents";
import {
  blocks$,
  chatStore$,
  documentStore$,
  serverStore$,
  uiPreferences$,
} from "./index";
import type { BlockId, ChatId, DocumentId } from "./types";

// Hook to get a thread by ID
export const useThread = (threadId: ChatId) => {
  const threads = use$(chatStore$.threads);
  return threads[threadId];
};

// Hook to get messages for a thread by ID
export const useThreadMessages = (threadId: ChatId) => {
  // We need to use the getThreadMessages function which converts blocks to messages
  // This is a computed value based on the blocks and thread structure
  const threads = use$(chatStore$.threads);
  const thread = threads[threadId];

  // If thread doesn't exist, return empty array
  if (!thread) return [];

  // Get the messages using the existing helper function
  return getThreadMessages(threadId);
};

// Hook to get a block by ID
export const useBlock = (blockId: BlockId) => {
  const blocks = use$(blocks$);
  return blocks[blockId];
};

// Hook to get current thread ID
export const useCurrentThreadId = () => {
  return use$(chatStore$.currentThreadId);
};

// Hook to get all threads as an array
export const useThreadsArray = () => {
  const threads = use$(chatStore$.threads);
  return Object.values(threads);
};

// Hook to get all documents as an array
export const useDocuments = () => {
  const documents = use$(documentStore$.documents);
  return Object.values(documents);
};

// Hook to get current document
export const useCurrentDocument = () => {
  const currentDocumentId = use$(documentStore$.currentDocumentId);
  const documents = use$(documentStore$.documents);
  return currentDocumentId ? documents[currentDocumentId] : undefined;
};

// Hook to get a document by ID
export const useDocument = (documentId: DocumentId) => {
  const documents = use$(documentStore$.documents);
  return documents[documentId];
};

// Hook to get server info
export const useServerInfo = () => {
  return use$(serverStore$);
};

// Hook to get UI preferences
export const useUIPreferences = () => {
  return use$(uiPreferences$);
};
