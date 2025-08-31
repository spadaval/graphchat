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

/**
 * Calls the LLM server with the provided messages and returns the response
 */
export async function callLLM(messages: ChatMessage[]): Promise<LLMResponse> {
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
				temperature: 0.7,
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
