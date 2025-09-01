import { observable } from "@legendapp/state";
import { logError } from "../utils-neverthrow";
import {
  type ChatMessage,
  callLLM,
  callLLMStreaming,
  type MessageVariant,
  modelProps$,
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

  const responseResult = await callLLM(messagesUpToThis, modelProps$.get());

  // Log any errors but don't return early - we want to handle errors gracefully
  logError(responseResult, "Regenerating message");

  responseResult.match(
    (response) => {
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
    },
    (error) => {
      // Error is already logged by logError, but we could show a user notification here
      console.error("Failed to regenerate message:", error.message);
    },
  );
};

export const createNewThread = (initialMessage?: string) => {
  const thread = newThread(initialMessage?.slice(0, 100), initialMessage);
  chatStore$.threads.set(thread.id, thread);
  chatStore$.currentThreadId.set(thread.id);
  return thread.id;
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

export const sendMessage = async (text?: string) => {
  if (!text) {
    text = chatStore$.currentUserMessage.get();
    console.log("No message to save");
    return;
  }

  const message = createChatMessage(text, "user");

  let currentThreadId = chatStore$.currentThreadId.get();
  if (!currentThreadId) {
    currentThreadId = createNewThread();
  }

  const currentThread$ = chatStore$.threads.get(currentThreadId);

  currentThread$.messages.push(message);
  chatStore$.currentUserMessage.set("");

  const assistantMessage = createChatMessage("", "assistant");
  currentThread$.messages.push(assistantMessage);

  const response = callLLMStreaming(
    currentThread$.messages.get(),
    modelProps$.get(),
  );
  console.log("response", response);

  const messageToUpdate =
    currentThread$.messages[currentThread$.messages.length - 1];
  const variantToUpdate =
    messageToUpdate.variants[messageToUpdate.variants.length - 1];

  for await (const chunkResult of response) {
    chunkResult.match(
      (chunk) => {
        if (chunk.done) {
          // Stream is complete
          return;
        }
        // Append content to the message
        variantToUpdate.text.set(variantToUpdate.text.get() + chunk.content);
      },
      (error) => {
        // Handle streaming error
        console.error("Streaming error:", error.message);
        variantToUpdate.text.set(
          `${variantToUpdate.text.get()}\n\n[Error: ${error.message}]`,
        );
      },
    );
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
