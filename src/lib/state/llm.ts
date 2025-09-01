import { observable } from "@legendapp/state";
import { postV1ChatCompletions } from "../../client";

export interface MessageVariant {
	id: string;
	text: string;
	createdAt: Date;
}

export interface ChatMessage {
	id: number;
	role: "user" | "assistant";
	variants: MessageVariant[];
	currentVariantId: string;
	createdAt: Date;
	isGenerating: boolean;
}

export interface LLMResponse {
	content: string;
	error?: string;
}

export interface StreamingLLMResponse {
	content: string;
	done: boolean;
	error?: string;
}

export interface ModelProperties {
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

export const modelProps$ = observable<ModelProperties>({
	temperature: 0.8,
	top_k: 40,
	top_p: 0.9,
	n_predict: 5000,
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
});

/**
 * Calls the LLM server with the provided messages and returns the response
 */
export async function callLLM(
	messages: ChatMessage[],
	modelProperties: ModelProperties,
): Promise<LLMResponse> {
	try {
		// Prepare messages for API call
		const messagesForAPI = messages.map((msg) => ({
			role: msg.role,
			content:
				msg.variants.find((v) => v.id === msg.currentVariantId)?.text || "",
		}));

		// Call the LLM server
		const response = await postV1ChatCompletions({
			body: {
				model: "llama",
				messages: messagesForAPI,
				temperature: modelProperties.temperature,
				top_p: modelProperties.top_p,
				max_tokens: modelProperties.n_predict,
				presence_penalty: modelProperties.presence_penalty,
				frequency_penalty: modelProperties.frequency_penalty,
				stream: false, // Non-streaming call
			},
		});

		// Extract the assistant's response
		const assistantContent =
			response.data?.choices?.[0]?.message?.content ||
			"Sorry, I couldn't generate a response.";

		return {
			content: assistantContent,
		};
	} catch (error) {
		console.error("Error calling LLM server:", error);

		return {
			content:
				"Sorry, I encountered an error while processing your message. Please try again.",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Parses streaming response data from the LLM server
 */
export function parseStreamingResponse(
	data: string,
): StreamingLLMResponse | null {
	if (data === "[DONE]") {
		return { content: "", done: true };
	}

	try {
		const parsed = JSON.parse(data);
		const content = parsed.choices?.[0]?.delta?.content || "";

		if (content) {
			return { content, done: false };
		}
	} catch (parseError) {
		console.warn("Failed to parse streaming data:", data, parseError);
	}

	return null;
}

/**
 * Calls the LLM server with streaming enabled
 */
export async function* callLLMStreaming(
	messages: ChatMessage[],
	modelProperties: ModelProperties,
): AsyncGenerator<StreamingLLMResponse, void, unknown> {
	try {
		// Prepare messages for API call
		const messagesForAPI = messages.map((msg) => ({
			role: msg.role,
			content:
				msg.variants.find((v) => v.id === msg.currentVariantId)?.text || "",
		}));

		// Call the LLM server with streaming enabled
		const response = await fetch("http://localhost:8080/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "llama",
				messages: messagesForAPI,
				temperature: modelProperties.temperature,
				top_p: modelProperties.top_p,
				max_tokens: modelProperties.n_predict,
				presence_penalty: modelProperties.presence_penalty,
				frequency_penalty: modelProperties.frequency_penalty,
				stream: modelProperties.stream,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		if (!response.body) {
			throw new Error("Response body is null");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					// Yield final done signal
					yield { content: "", done: true };
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || ""; // Keep incomplete line in buffer

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						const parsedResponse = parseStreamingResponse(data);

						if (parsedResponse) {
							if (parsedResponse.done) {
								// Stream is complete
								yield parsedResponse;
								return;
							} else {
								yield parsedResponse;
							}
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	} catch (error) {
		console.error("Error calling LLM server with streaming:", error);
		throw error; // Re-throw the error to be handled by the caller
	}
}
