import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { type ChatMessage, callLLM, type MessageVariant, modelProps$ } from "./llm";

// Global configuration

export interface ChatThread {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: Date;
	lastMessageAt: Date;
}

interface ChatStore {
	threads: ChatThread[];
	currentThreadId: string | null;
	currentUserMessage: string | undefined;
	setCurrentUserMessage: (message: string | undefined) => void;
	sendMessage: () => void;
	regenerateMessage: (messageId: number) => Promise<void>;
	nextVariant: (messageId: number) => void;
	previousVariant: (messageId: number) => void;
	createNewThread: (initialMessage?: string) => void;
	createThreadWithMessage: (message: string) => void;
	switchThread: (threadId: string) => void;
	getCurrentThread: () => ChatThread | undefined;
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

const createDefaultThread = (): ChatThread => ({
	id: `thread-${nextThreadId++}`,
	title: "New Chat",
	messages: [],
	createdAt: new Date(),
	lastMessageAt: new Date(),
});

const chatStore: ChatStore = {
	threads: [createDefaultThread()] as ChatThread[],
	currentThreadId: "thread-1",
	currentUserMessage: undefined,
	setCurrentUserMessage: (message: string | undefined) => {
		chatStore$.currentUserMessage.set(message);
	},

	nextVariant: (messageId: number) => {
		const thread = chatStore$.getCurrentThread();
		if (!thread) return;

		const threadIndex = chatStore$.threads.get().findIndex((t) => t.id === thread.id);
		if (threadIndex === -1) return;

		const messageIndex = thread.messages.findIndex((m) => m.id === messageId);
		if (messageIndex === -1) return;

		const message = thread.messages[messageIndex];
		if (message.variants.length <= 1) return;

		const currentVariantId = message.currentVariantId;
		const currentVariantIndex = message.variants.findIndex(
			(v) => v.id === currentVariantId,
		);
		const nextVariantIndex =
			(currentVariantIndex + 1) % message.variants.length;
		const nextVariantId = message.variants[nextVariantIndex].id;

		chatStore$.threads[threadIndex].messages[messageIndex].currentVariantId.set(
			nextVariantId,
		);
	},

	previousVariant: (messageId: number) => {
		const thread = chatStore$.getCurrentThread();
		if (!thread) return;

		const threadIndex = chatStore$.threads.get().findIndex((t) => t.id === thread.id);
		if (threadIndex === -1) return;

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

		chatStore$.threads[threadIndex].messages[messageIndex].currentVariantId.set(
			prevVariantId,
		);
	},

	regenerateMessage: async (messageId: number) => {
		const thread = chatStore$.getCurrentThread();
		if (!thread) return;

		const threadIndex = chatStore$.threads.get().findIndex((t) => t.id === thread.id);
		if (threadIndex === -1) return;

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

			// Update the message with the new variant
			chatStore$.threads[threadIndex].messages[messageIndex].variants.push(
				newVariant,
			);
			chatStore$.threads[threadIndex].messages[
				messageIndex
			].currentVariantId.set(newVariant.id);
		} catch (error) {
			console.error("Error regenerating message:", error);
		}
	},

	createNewThread(initialMessage?: string) {
		const newThread = createDefaultThread();
		if (initialMessage) {
			newThread.messages.push(createChatMessage(initialMessage, 'user'));
			newThread.title = initialMessage.slice(0, 30) + (initialMessage.length > 30 ? '...' : '');
		}
		chatStore$.threads.push(newThread);
		chatStore$.currentThreadId.set(newThread.id);
	},

	createThreadWithMessage(message: string) {
		chatStore.createNewThread(message);
		// Small timeout to ensure the thread is created before sending
		setTimeout(() => chatStore.sendMessage(), 0);
	},

	switchThread: (threadId: string) => {
		chatStore$.currentThreadId.set(threadId);
		chatStore$.currentUserMessage.set(undefined);
	},

	getCurrentThread: (): ChatThread | undefined => {
		const currentThreadId = chatStore$.currentThreadId.get();
		const threads = chatStore$.threads.get();
		const found = threads.find((thread: ChatThread) => thread.id === currentThreadId);
		return found || undefined;
	},

	sendMessage: async () => {
		const text = chatStore$.currentUserMessage.get();
		if (!text) {
			console.log("No message to save");
			return;
		}

		const currentThread = chatStore$.getCurrentThread();
		if (!currentThread) return;

		const message = createChatMessage(text, "user");

		// Update the current thread's messages
		const threadIndex = chatStore$.threads.get().findIndex(
			(t) => t.id === currentThread.id,
		);
		if (threadIndex !== -1) {
			chatStore$.threads[threadIndex].messages.push(message);
			chatStore$.threads[threadIndex].lastMessageAt.set(new Date());
		}

		chatStore$.currentUserMessage.set(undefined);

		try {
			// Call the LLM with all messages including the new user message
			const allMessages = currentThread.messages.concat(message);
			const response = await callLLM(allMessages, modelProps$.get());

			// Create assistant message with the response
			const assistantMessage = createChatMessage(response.content, "assistant");

			// Add assistant message to thread
			const currentIndex = chatStore$.threads.get().findIndex(
				(t) => t.id === currentThread.id,
			);
			if (currentIndex !== -1) {
				chatStore$.threads[currentIndex].messages.push(assistantMessage);
				chatStore$.threads[currentIndex].lastMessageAt.set(new Date());
			}
		} catch (error) {
			console.error("Error in sendMessage:", error);

			// Add error message
			const errorMessage = createChatMessage(
				"I'm sorry, I encountered an error while processing your message.",
				"assistant",
			);

			// Update threads with the error message
			const errorIndex = chatStore$.threads.get().findIndex(
				(t) => t.id === currentThread.id,
			);
			if (errorIndex !== -1) {
				chatStore$.threads.get()[errorIndex].messages.push(errorMessage);
				chatStore$.threads[errorIndex].lastMessageAt.set(new Date());
			}
		}
	},
};

const chatStore$ = observable<ChatStore>(chatStore);

export default chatStore$;

// Persist state
// disabled for testing
// syncObservable(chatStore$, {
// 	persist: {
// 		name: "chatStore",
// 		plugin: ObservablePersistLocalStorage,
// 	},
// });
