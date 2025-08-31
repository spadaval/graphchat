import { observable } from "@legendapp/state";

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

const chatStore$ = observable<ChatStore>({
	threads: [createDefaultThread()],
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
	saveMessage: () => {
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

		// Simulate assistant typing
		chatStore$.setTyping(true);
		setTimeout(() => {
			const assistantMessage: ChatMessage = {
				id: nextId++,
				text: "This is a simulated assistant response.",
				role: "assistant",
			};

			const updatedThreads = chatStore$.threads.get();
			const currentIndex = updatedThreads.findIndex(
				(t) => t.id === currentThread.id,
			);
			if (currentIndex !== -1) {
				updatedThreads[currentIndex].messages.push(assistantMessage);
				updatedThreads[currentIndex].lastMessageAt = new Date();
				chatStore$.threads.set(updatedThreads);
			}

			chatStore$.setTyping(false);
		}, 2000);
	},
});

export default chatStore$;
