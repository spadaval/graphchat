import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { type Block, blocks$, createBlock } from "./block";
import { callLLMStreaming, modelProps$ } from "./llm";
import type { BlockId, ChatId } from "./types";

// Global configuration

export interface ChatThread {
  id: ChatId;
  title: string;
  messages: BlockId[];
  createdAt: Date;
  lastMessageAt: Date;
}

interface ChatStore {
  threads: Record<ChatId, ChatThread>;
  currentThreadId: ChatId | undefined;
  currentUserMessage: string;
}

// Create a global observable for the chat store
let nextThreadId = 1;

const newThread = (title?: string, initialMessage?: string): ChatThread => {
  const thread: ChatThread = {
    id: `chat-${nextThreadId++}`,
    title: title || "New Chat",
    messages: [],
    createdAt: new Date(),
    lastMessageAt: new Date(),
  };

  // If there's an initial message, create it and add to thread
  if (initialMessage) {
    // Create a block for the initial message
    const block = createBlock(initialMessage, "user");
    blocks$.assign({ [block.id]: block });
    // Directly update the thread properties instead of reassigning
    thread.messages.push(block.id);
    thread.lastMessageAt = new Date();
  }

  return thread;
};

const chatStore: ChatStore = {
  threads: {} as Record<ChatId, ChatThread>,
  currentThreadId: undefined,
  currentUserMessage: "",
};

export const chatStore$ = observable<ChatStore>(chatStore);

// Standalone functions moved out of the observable
export const setCurrentUserMessage = (message: string) => {
  chatStore$.currentUserMessage.set(message);
};

// TODO: Reimplement these functions for the new block-based system
// These functions need to be redesigned since we're no longer storing message objects directly
// We'll need to work with blocks as needed

export const createNewThread = (initialMessage?: string) => {
  // Use first 30 characters of the initial message as the thread title, or default to "New Chat"
  console.log("initialMessage", initialMessage);
  const title = initialMessage
    ? initialMessage.trim().substring(0, 30) +
      (initialMessage.trim().length > 30 ? "..." : "")
    : "New Chat";

  const thread = newThread(title, initialMessage);
  chatStore$.threads[thread.id].set(thread);
  chatStore$.currentThreadId.set(thread.id);
  return thread.id;
};

export const switchThread = (threadId: ChatId) => {
  chatStore$.currentThreadId.set(threadId);
};

export const deleteThread = (threadId: ChatId) => {
  // Delete the thread directly
  chatStore$.threads[threadId].delete();

  // If we're deleting the current thread, switch to another thread or unset current thread
  const currentThreadId = chatStore$.currentThreadId.get();
  if (currentThreadId === threadId) {
    const threads = chatStore$.threads.get();
    const threadIds = Object.keys(threads);
    if (threadIds.length > 0) {
      chatStore$.currentThreadId.set(threadIds[0] as ChatId);
    } else {
      chatStore$.currentThreadId.set(undefined);
    }
  }
};

export const deleteAllThreads = () => {
  // Get all thread keys and delete each one directly
  const threads = chatStore$.threads.get();
  Object.keys(threads).forEach((threadId) => {
    chatStore$.threads[threadId as ChatId].delete();
  });
  chatStore$.currentThreadId.set(undefined);
};

export const duplicateThread = (threadId: ChatId) => {
  const threads = chatStore$.threads.get();
  const originalThread = threads[threadId];

  if (!originalThread) return;

  // Create a new thread with the same title and messages
  const newThread: ChatThread = {
    id: `chat-${nextThreadId++}`,
    title: `${originalThread.title} (Copy)`,
    messages: [...originalThread.messages], // Copy message IDs
    createdAt: new Date(),
    lastMessageAt: new Date(),
  };

  // Add the new thread to the store
  chatStore$.threads[newThread.id].set(newThread);
  chatStore$.currentThreadId.set(newThread.id);

  return newThread.id;
};

export const editThreadTitle = (threadId: ChatId, newTitle: string) => {
  const threads = chatStore$.threads.get();
  const thread = threads[threadId];

  if (!thread) return;

  // Update the thread title
  chatStore$.threads[threadId].title.set(newTitle);
};

// Helper function to get messages for a thread (converted from blocks)
// TODO: This function should be deprecated in favor of working directly with blocks
export const getThreadMessages = (threadId: ChatId): Block[] => {
  const threads = chatStore$.threads.get();
  const thread = threads[threadId];
  if (!thread) return [];

  // Get blocks directly
  return thread.messages
    .map((blockId) => {
      const block = blocks$.get()[blockId];
      return block || null;
    })
    .filter((block): block is Block => block !== null);
};

export const getCurrentThread = (): ChatThread | undefined => {
  const currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) return undefined;
  const threads = chatStore$.threads.get();
  return threads[currentThreadId];
};

// Backward compatibility function that returns a thread with actual messages
// Note: This function returns a modified thread type for backward compatibility
export interface ChatThreadWithMessages extends Omit<ChatThread, "messages"> {
  messages: Block[];
}

/**
 * @deprecated This method is deprecated and will be removed in a future version.
 * Please use `getCurrentThread` instead.
 */
export const getCurrentThreadWithMessages = ():
  | ChatThreadWithMessages
  | undefined => {
  const currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) return undefined;
  const threads = chatStore$.threads.get();
  const thread = threads[currentThreadId];
  if (!thread) return undefined;

  // Create a new thread object with actual messages instead of IDs
  return {
    ...thread,
    messages: getThreadMessages(currentThreadId),
  };
};

// Helper function to get blocks for LLM
const getBlocksForLLM = (blockIds: BlockId[]): Block[] => {
  return blockIds.map((blockId) => {
    const block = blocks$.get()[blockId];
    if (!block) {
      // Return a placeholder block if block not found
      return createBlock("", "user");
    }
    return block;
  });
};

export const sendMessage = async (text?: string) => {
  if (!text) {
    text = chatStore$.currentUserMessage.get();
    console.log("No message to save");
    return;
  }

  // Create a block for the user message
  const userBlock = createBlock(text, "user");
  blocks$.assign({ [userBlock.id]: userBlock });

  let currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) {
    currentThreadId = createNewThread();
  }

  const currentThread$ = chatStore$.threads[currentThreadId];

  // Add the user block ID to the thread
  currentThread$.messages.push(userBlock.id);
  chatStore$.currentUserMessage.set("");

  // Create a block for the assistant response
  const assistantBlock = createBlock("", "assistant");
  blocks$.assign({ [assistantBlock.id]: assistantBlock });
  currentThread$.messages.push(assistantBlock.id);

  // Get all blocks for the thread to send to the LLM
  const threadBlocks = currentThread$.messages.get();
  const blocksForLLM = getBlocksForLLM(threadBlocks);

  // Set the last block as generating by directly updating the observable
  const lastBlockIndex = blocksForLLM.length - 1;
  if (lastBlockIndex >= 0) {
    const lastBlockId = threadBlocks[lastBlockIndex];
    blocks$[lastBlockId].isGenerating.set(true);
  }

  // Stream the response and update the assistant block
  const responseStream = callLLMStreaming(blocksForLLM, modelProps$.get());

  let accumulatedContent = "";

  for await (const chunkResult of responseStream) {
    chunkResult.match(
      (chunk) => {
        if (chunk.done) {
          // Stream is complete
          return;
        }
        // Accumulate content and update the assistant block directly
        accumulatedContent += chunk.content;
        blocks$[assistantBlock.id].text.set(accumulatedContent);
      },
      (error) => {
        // Handle streaming error
        console.error("Streaming error:", error.message);
        blocks$[assistantBlock.id].text.set(
          `${accumulatedContent}\n\n[Error: ${error.message}]`,
        );
      },
    );
  }
};

export const regenerateMessage = async (blockId: BlockId) => {
  // Get the current thread
  const currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) return;

  const threads = chatStore$.threads.get();
  const currentThread = threads[currentThreadId];
  if (!currentThread) return;

  // Find the block to regenerate
  const blocks = blocks$.get();
  const blockToRegenerate = blocks[blockId];
  if (!blockToRegenerate || blockToRegenerate.role !== "assistant") return;

  // Find the position of this block in the thread
  const blockIndex = currentThread.messages.indexOf(blockId);
  if (blockIndex === -1) return;

  // Get all blocks up to and including the block before the one we're regenerating
  const previousBlocks = currentThread.messages.slice(0, blockIndex);
  const blocksForLLM = getBlocksForLLM(previousBlocks);

  // Create a new block for the regenerated response
  const newBlock = createBlock("", "assistant");
  blocks$.assign({ [newBlock.id]: newBlock });

  // Replace the old block with the new one in the thread
  chatStore$.threads[currentThreadId].messages[blockIndex].set(newBlock.id);
  
  // Remove the old block from the blocks store
  blocks$[blockId].delete();

  // Set the new block as generating
  blocks$[newBlock.id].isGenerating.set(true);

  // Stream the response and update the new block
  const responseStream = callLLMStreaming(blocksForLLM, modelProps$.get());

  let accumulatedContent = "";

  for await (const chunkResult of responseStream) {
    chunkResult.match(
      (chunk) => {
        if (chunk.done) {
          // Stream is complete
          return;
        }
        // Accumulate content and update the new block directly
        accumulatedContent += chunk.content;
        blocks$[newBlock.id].text.set(accumulatedContent);
      },
      (error) => {
        // Handle streaming error
        console.error("Streaming error:", error.message);
        blocks$[newBlock.id].text.set(
          `${accumulatedContent}\n\n[Error: ${error.message}]`,
        );
      },
    );
  }
  
  // Mark generation as complete
  blocks$[newBlock.id].isGenerating.set(false);
};

export default chatStore$;

// Persist state
syncObservable(chatStore$, {
  persist: {
    name: "chatStore",
    plugin: ObservablePersistLocalStorage,
  },
});