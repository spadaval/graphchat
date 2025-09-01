import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import {
  type ChatMessage,
  callLLM,
  type MessageVariant,
  modelProps$,
  callLLMStreaming,
} from "./llm";

// Global configuration

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}

interface ChatStore {
  threads: Map<string, ChatThread>;
  currentThreadId: string | undefined;
  currentUserMessage: string;
}

// Create a global observable for the chat store
let nextId = 0;
let nextThreadId = 1;

const createMessageVariant = (text: string): MessageVariant => ({
  id: crypto.randomUUID(),
  text,
  createdAt: new Date(),
});

const createChatMessage = (
  text: string,
  role: "user" | "assistant" = "user",
): ChatMessage => {
  const variant = createMessageVariant(text);
  return {
    id: nextId++,
    role,
    variants: [variant],
    currentVariantId: variant.id,
    createdAt: new Date(),
    isGenerating: false,
  };
};

const newThread = (title?: string, initialMessage?: string): ChatThread => ({
  id: `thread-${nextThreadId++}`,
  title: title || "New Chat",
  messages: initialMessage ? [createChatMessage(initialMessage)] : [],
  createdAt: new Date(),
  lastMessageAt: new Date(),
});

const chatStore: ChatStore = {
  threads: new Map<string, ChatThread>(),
  currentThreadId: undefined,
  currentUserMessage: "",
};

export const chatStore$ = observable<ChatStore>(chatStore);

// Standalone functions moved out of the observable
export const setCurrentUserMessage = (message: string) => {
  chatStore$.currentUserMessage.set(message);
};

export const nextVariant = (messageId: number) => {
  const currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) return;

  const threads = chatStore$.threads.get();
  const thread = threads.get(currentThreadId);
  if (!thread) return;

  const messageIndex = thread.messages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return;

  const message = thread.messages[messageIndex];
  if (message.variants.length <= 1) return;

  const currentVariantId = message.currentVariantId;
  const currentVariantIndex = message.variants.findIndex(
    (v) => v.id === currentVariantId,
  );
  const nextVariantIndex = (currentVariantIndex + 1) % message.variants.length;
  const nextVariantId = message.variants[nextVariantIndex].id;

  // Update the thread with the new message variant
  const updatedThread = { ...thread };
  updatedThread.messages = [...thread.messages];
  updatedThread.messages[messageIndex] = {
    ...message,
    currentVariantId: nextVariantId,
  };

  chatStore$.threads.set(currentThreadId, updatedThread);
};

export const previousVariant = (messageId: number) => {
  const currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) return;

  const threads = chatStore$.threads.get();
  const thread = threads.get(currentThreadId);
  if (!thread) return;

  const messageIndex = thread.messages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return;

  const message = thread.messages[messageIndex];
  if (message.variants.length <= 1) return;

  const currentVariantId = message.currentVariantId;
  const currentVariantIndex = message.variants.findIndex(
    (v) => v.id === currentVariantId,
  );
  const prevVariantIndex =
    (currentVariantIndex - 1 + message.variants.length) %
    message.variants.length;
  const prevVariantId = message.variants[prevVariantIndex].id;

  // Update the thread with the new message variant
  const updatedThread = { ...thread };
  updatedThread.messages = [...thread.messages];
  updatedThread.messages[messageIndex] = {
    ...message,
    currentVariantId: prevVariantId,
  };

  chatStore$.threads.set(currentThreadId, updatedThread);
};

export const regenerateMessage = async (messageId: number) => {
  const currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) return;

  const threads = chatStore$.threads.get();
  const thread = threads.get(currentThreadId);
  if (!thread) return;

  const messageIndex = thread.messages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return;

  const message = thread.messages[messageIndex];
  if (message.role !== "assistant") return;

  // Get all messages up to this point
  const messagesUpToThis = thread.messages.slice(0, messageIndex);

  try {
    const response = await callLLM(messagesUpToThis, modelProps$.get());

    if (response.error) {
      console.error("Error regenerating message:", response.error);
      return;
    }

    // Create a new variant with the regenerated content
    const newVariant = {
      id: crypto.randomUUID(),
      text: response.content,
      createdAt: new Date(),
    };

    // Update the thread with the new message variant
    const updatedThread = { ...thread };
    updatedThread.messages = [...thread.messages];
    const updatedMessage = { ...message };
    updatedMessage.variants = [...message.variants, newVariant];
    updatedMessage.currentVariantId = newVariant.id;
    updatedThread.messages[messageIndex] = updatedMessage;

    chatStore$.threads.set(currentThreadId, updatedThread);
  } catch (error) {
    console.error("Error regenerating message:", error);
  }
};

export const createNewThread = (initialMessage?: string) => {
  const thread = newThread(initialMessage?.slice(0, 100), initialMessage);
  chatStore$.threads.set(thread.id, thread);
  chatStore$.currentThreadId.set(thread.id);
  return thread;
};

export const createThreadWithMessage = (message: string) => {
  createNewThread(message);
  // Small timeout to ensure the thread is created before sending
  setTimeout(() => sendMessage(), 0);
};

export const switchThread = (threadId: string) => {
  chatStore$.currentThreadId.set(threadId);
};

export const getCurrentThread = (): ChatThread | undefined => {
  const currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) return undefined;
  const threads = chatStore$.threads.get();
  return threads.get(currentThreadId);
};

export const sendMessage = async () => {
  const text = chatStore$.currentUserMessage.get();
  if (!text) {
    console.log("No message to save");
    return;
  }

  const message = createChatMessage(text, "user");

  let currentThread = getCurrentThread();
  if (!currentThread) {
    currentThread = createNewThread();
  } else {
    currentThread.messages.push(message);
  }
  chatStore$.currentUserMessage.set("");

  const assistantMessage = createChatMessage("", "assistant");
  currentThread.messages.push(assistantMessage);

  try {
    const response = await callLLMStreaming(
      currentThread.messages,
      modelProps$.get(),
    );
  } catch (error) {
    console.error("Error in sendMessage:", error);

    // Add error message
    const errorMessage = createChatMessage(
      "I'm sorry, I encountered an error while processing your message.",
      "assistant",
    );

    // Update threads with the error message
    const currentThreads = chatStore$.threads.get();
    const currentThreadFromMap = currentThreads.get(currentThread.id);
    if (currentThreadFromMap) {
      const updatedThread = { ...currentThreadFromMap };
      updatedThread.messages = [...currentThreadFromMap.messages, errorMessage];
      updatedThread.lastMessageAt = new Date();
      chatStore$.threads.set(currentThread.id, updatedThread);
    }
  }
};

export default chatStore$;

// Persist state
// disabled for testing
// syncObservable(chatStore$, {
// 	persist: {
// 		name: "chatStore",
// 		plugin: ObservablePersistLocalStorage,
// 	},
// });
