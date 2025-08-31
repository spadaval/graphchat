import { type Observable, observable } from "@legendapp/state";
import { postV1ChatCompletions } from "./client";

interface ChatMessage {
	id: number;
	text: string;
	role: "user" | "assistant";
}

interface ChatThread {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: Date;
	lastMessageAt: Date;
}

interface ChatStore {
	threads: ChatThread[];
	currentThreadId: string | null;
	currentMessage: string | undefined;
	isTyping: boolean;
	setCurrentMessage: (message: string | undefined) => void;
	saveMessage: () => void;
	setTyping: (typing: boolean) => void;
	createNewThread: () => void;
	switchThread: (threadId: string) => void;
	getCurrentThread: () => ChatThread | null;
}

// Create a global observable for the Todos
let nextId = 0;
let nextThreadId = 1;

const createDefaultThread = (): ChatThread => ({
	id: `thread-${nextThreadId++}`,
	title: "New Chat",
	messages: [],
	createdAt: new Date(),
	lastMessageAt: new Date(),
});

const chatStore$: Observable<ChatStore> = observable<ChatStore>({
	threads: [createDefaultThread()] as ChatThread[],
	currentThreadId: "thread-1",
	currentMessage: undefined,
	isTyping: false,
	setCurrentMessage: (message: string | undefined) => {
		chatStore$.currentMessage.set(message);
	},
	setTyping: (typing: boolean) => {
		chatStore$.isTyping.set(typing);
	},
	createNewThread: () => {
		const newThread = createDefaultThread();
		chatStore$.threads.push(newThread);
		chatStore$.currentThreadId.set(newThread.id);
	},
	switchThread: (threadId: string) => {
		chatStore$.currentThreadId.set(threadId);
		chatStore$.currentMessage.set(undefined);
		chatStore$.isTyping.set(false);
	},
	getCurrentThread: () => {
		const currentThreadId = chatStore$.currentThreadId.get();
		const threads = chatStore$.threads.get();
		return threads.find((thread) => thread.id === currentThreadId) || null;
	},
	saveMessage: async () => {
		const text = chatStore$.currentMessage.get();
		if (!text) {
			console.log("No message to save");
			return;
		}

		const currentThread = chatStore$.getCurrentThread();
		if (!currentThread) return;

		const message: ChatMessage = {
			id: nextId++,
			text: text,
			role: "user",
		};

		// Update the current thread's messages
		const threads = chatStore$.threads.get();
		const threadIndex = threads.findIndex((t) => t.id === currentThread.id);
		if (threadIndex !== -1) {
			threads[threadIndex].messages.push(message);
			threads[threadIndex].lastMessageAt = new Date();
			chatStore$.threads.set(threads);
		}

		chatStore$.currentMessage.set(undefined);

		// Start assistant typing indicator
		chatStore$.setTyping(true);

		try {
			// Prepare messages for API call
			const messagesForAPI = currentThread.messages
				.concat(message)
				.map((msg) => ({
					role: msg.role,
					content: msg.text,
				}));

			// Call the LLM server
			const response = await postV1ChatCompletions({
				body: {
					model: "llama", // You might need to adjust this based on your model
					messages: messagesForAPI,
					temperature: 0.7,
					max_tokens: 1000,
				},
			});

			// Extract the assistant's response
			const assistantContent =
				response.data?.choices?.[0]?.message?.content ||
				"Sorry, I couldn't generate a response.";

			const assistantMessage: ChatMessage = {
				id: nextId++,
				text: assistantContent,
				role: "assistant",
			};

			// Add assistant message to thread
			const updatedThreads = chatStore$.threads.get();
			const currentIndex = updatedThreads.findIndex(
				(t) => t.id === currentThread.id,
			);
			if (currentIndex !== -1) {
				updatedThreads[currentIndex].messages.push(assistantMessage);
				updatedThreads[currentIndex].lastMessageAt = new Date();
				chatStore$.threads.set(updatedThreads);
			}
		} catch (error) {
			console.error("Error calling LLM server:", error);

			// Add error message
			const errorMessage: ChatMessage = {
				id: nextId++,
				text: "Sorry, I encountered an error while processing your message. Please try again.",
				role: "assistant",
			};

			const updatedThreads = chatStore$.threads.get();
			const currentIndex = updatedThreads.findIndex(
				(t) => t.id === currentThread.id,
			);
			if (currentIndex !== -1) {
				updatedThreads[currentIndex].messages.push(errorMessage);
				updatedThreads[currentIndex].lastMessageAt = new Date();
				chatStore$.threads.set(updatedThreads);
			}
		} finally {
			chatStore$.setTyping(false);
		}
	},
});

export default chatStore$;
