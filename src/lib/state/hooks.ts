import { use$ } from "@legendapp/state/react";
import { blocks$, chatStore$ } from "./index";
import type { BlockId, ChatId } from "./types";
import { getThreadMessages } from "./chat";

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