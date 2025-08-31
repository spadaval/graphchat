import { type Observable, observable } from "@legendapp/state";
import {
	callLLM,
	callLLMStreaming,
	type ChatMessage,
	type StreamingLLMResponse,
} from "./llm";

interface ChatThread {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: Date;
	lastMessageAt: Date;
}

interface ModelProperties {
	temperature: number;
	top_k: number;
	top_p: number;
	n_predict: number;
	stream: boolean;
	stop: string[];
	repeat_penalty: number;
	presence_penalty: number;
	frequency_penalty: number;
	mirostat: 0 | 1 | 2;
	mirostat_tau: number;
	mirostat_eta: number;
	seed: number;
	n_probs: number;
	cache_prompt: boolean;
	return_tokens: boolean;
}

interface ChatStore {
	threads: ChatThread[];
	currentThreadId: string | null;
	currentMessage: string | undefined;
	isTyping: boolean;
	streamingMessageId: number | null;
	modelProperties: ModelProperties;
	setCurrentMessage: (message: string | undefined) => void;
	saveMessage: () => void;
	setTyping: (typing: boolean) => void;
	setStreamingMessageId: (id: number | null) => void;
	updateStreamingMessage: (content: string) => void;
	createNewThread: () => void;
	switchThread: (threadId: string) => void;
	getCurrentThread: () => ChatThread | null;
	updateModelProperty: <K extends keyof ModelProperties>(
		key: K,
		value: ModelProperties[K],
	) => void;
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
	streamingMessageId: null,
	modelProperties: {
		temperature: 0.8,
		top_k: 40,
		top_p: 0.9,
		n_predict: 128,
		stream: true,
		stop: [],
		repeat_penalty: 1.1,
		presence_penalty: 0.0,
		frequency_penalty: 0.0,
		mirostat: 0,
		mirostat_tau: 5.0,
		mirostat_eta: 0.1,
		seed: -1,
		n_probs: 0,
		cache_prompt: true,
		return_tokens: false,
	} as ModelProperties,
	setCurrentMessage: (message: string | undefined) => {
		chatStore$.currentMessage.set(message);
	},
	setTyping: (typing: boolean) => {
		chatStore$.isTyping.set(typing);
	},
	setStreamingMessageId: (id: number | null) => {
		chatStore$.streamingMessageId.set(id);
	},
	updateStreamingMessage: (content: string) => {
		const streamingMessageId = chatStore$.streamingMessageId.get();
		if (streamingMessageId === null) return;

		const currentThreadId = chatStore$.currentThreadId.get();
		const threads = chatStore$.threads.get();

		// Find the current thread and message
		const threadIndex = threads.findIndex((t) => t.id === currentThreadId);
		if (threadIndex === -1) return;

		const messageIndex = threads[threadIndex].messages.findIndex(
			(msg) => msg.id === streamingMessageId,
		);
		if (messageIndex === -1) return;

		// Use Legend's reactive update pattern
		const currentText = threads[threadIndex].messages[messageIndex].text;
		const newText = currentText + content;

		chatStore$.threads[threadIndex].messages[messageIndex].text.set(newText);
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
	updateModelProperty: <K extends keyof ModelProperties>(
		key: K,
		value: ModelProperties[K],
	) => {
		chatStore$.modelProperties[key].set(value);
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
			// Create initial assistant message for streaming
			const assistantMessage: ChatMessage = {
				id: nextId++,
				text: "",
				role: "assistant",
			};

			// Add initial assistant message to thread
			const updatedThreads = chatStore$.threads.get();
			const currentIndex = updatedThreads.findIndex(
				(t) => t.id === currentThread.id,
			);
			if (currentIndex !== -1) {
				updatedThreads[currentIndex].messages.push(assistantMessage);
				updatedThreads[currentIndex].lastMessageAt = new Date();
				chatStore$.threads.set(updatedThreads);
			}

			// Set streaming state and hide typing indicator
			chatStore$.setTyping(false);
			chatStore$.setStreamingMessageId(assistantMessage.id);

			// Call the LLM with streaming enabled
			const allMessages = currentThread.messages.concat(message);
			const currentModelProperties = chatStore$.modelProperties.get();
			let hasError = false;
			let streamingTimeout: number | null = null;

			// Set a timeout for streaming (30 seconds)
			const STREAMING_TIMEOUT = 30000;
			streamingTimeout = window.setTimeout(() => {
				hasError = true;
				console.error("Streaming timeout - falling back to non-streaming");
			}, STREAMING_TIMEOUT);

			try {
				for await (const chunk of callLLMStreaming(
					allMessages,
					currentModelProperties,
				)) {
					if (chunk.error) {
						hasError = true;
						console.error("Streaming error:", chunk.error);
						break;
					}

					if (chunk.done) {
						if (streamingTimeout) {
							window.clearTimeout(streamingTimeout);
							streamingTimeout = null;
						}
						chatStore$.setStreamingMessageId(null);
						break;
					}

					// Update the streaming message with new content
					chatStore$.updateStreamingMessage(chunk.content);
				}
			} catch (streamingError) {
				hasError = true;
				console.error(
					"Streaming failed, falling back to non-streaming:",
					streamingError,
				);
				chatStore$.setStreamingMessageId(null);
				chatStore$.setTyping(true);
			} finally {
				if (streamingTimeout) {
					window.clearTimeout(streamingTimeout);
				}
			}

			if (hasError) {
				// Reset states before fallback
				chatStore$.setStreamingMessageId(null);
				chatStore$.setTyping(true);

				// Handle streaming completion or fallback
				try {
					// Fallback to non-streaming
					console.log("Falling back to non-streaming response");
					const fallbackResponse = await callLLM(
						allMessages,
						currentModelProperties,
					);

					// Replace the streaming message with the complete response
					const fallbackMessage: ChatMessage = {
						id: assistantMessage.id,
						text: fallbackResponse.content,
						role: "assistant",
					};

					const fallbackThreads = chatStore$.threads.get();
					const fallbackIndex = fallbackThreads.findIndex(
						(t) => t.id === currentThread.id,
					);
					if (fallbackIndex !== -1) {
						const msgIndex = fallbackThreads[fallbackIndex].messages.findIndex(
							(msg) => msg.id === assistantMessage.id,
						);
						if (msgIndex !== -1) {
							fallbackThreads[fallbackIndex].messages[msgIndex] =
								fallbackMessage;
							chatStore$.threads.set(fallbackThreads);
						}
					}
				} catch (fallbackError) {
					console.error("Fallback also failed:", fallbackError);

					// Replace the streaming message with error message
					const errorMessage: ChatMessage = {
						id: assistantMessage.id,
						text: "Sorry, I encountered an error while processing your message. Please try again.",
						role: "assistant",
					};

					const errorThreads = chatStore$.threads.get();
					const errorIndex = errorThreads.findIndex(
						(t) => t.id === currentThread.id,
					);
					if (errorIndex !== -1) {
						const msgIndex = errorThreads[errorIndex].messages.findIndex(
							(msg) => msg.id === assistantMessage.id,
						);
						if (msgIndex !== -1) {
							errorThreads[errorIndex].messages[msgIndex] = errorMessage;
							chatStore$.threads.set(errorThreads);
						}
					}
				}
			}
		} catch (error) {
			console.error("Error in saveMessage:", error);

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
			chatStore$.setStreamingMessageId(null);
			chatStore$.setStreamingMessageId(null);
		}
	},
});

export default chatStore$;
