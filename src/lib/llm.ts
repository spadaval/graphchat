import { postCompletion, postV1ChatCompletions } from "../client";

export interface ChatMessage {
	id: number;
	text: string;
	role: "user" | "assistant";
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
			content: msg.text,
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
			content: msg.text,
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

						if (data === "[DONE]") {
							// Stream is complete
							yield { content: "", done: true };
							return;
						}

						try {
							const parsed = JSON.parse(data);
							const content = parsed.choices?.[0]?.delta?.content || "";

							if (content) {
								yield { content, done: false };
							}
						} catch (parseError) {
							console.warn("Failed to parse streaming data:", data, parseError);
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
