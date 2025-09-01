import { observable } from "@legendapp/state";
import { err, ok, type Result } from "neverthrow";
import { postV1ChatCompletions } from "../../client";
import {
  type AppResult,
  createAPIError,
  createLLMError,
  createNetworkError,
} from "../errors";
import { safePromise } from "../utils-neverthrow";

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
): Promise<AppResult<LLMResponse>> {
  // Prepare messages for API call
  const messagesForAPI = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.variants.find((v) => v.id === msg.currentVariantId)?.text || "",
  }));

  // Call the LLM server
  const apiCallResult = await safePromise(
    postV1ChatCompletions({
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
    }),
    "Failed to call LLM API",
  );

  if (apiCallResult.isErr()) {
    return err(
      createLLMError(
        "Failed to get response from LLM server",
        "llama",
        apiCallResult.error.cause,
      ),
    );
  }

  const response = apiCallResult.value;

  // Extract the assistant's response
  const assistantContent =
    response.data?.choices?.[0]?.message?.content ||
    "Sorry, I couldn't generate a response.";

  return ok({
    content: assistantContent,
  });
}

/**
 * Parses streaming response data from the LLM server
 */
export function parseStreamingResponse(
  data: string,
): Result<StreamingLLMResponse, null> {
  if (data === "[DONE]") {
    return ok({ content: "", done: true });
  }

  try {
    const parsed = JSON.parse(data);
    const content = parsed.choices?.[0]?.delta?.content || "";

    if (content) {
      return ok({ content, done: false });
    }

    // No content in this chunk
    return err(null);
  } catch (parseError) {
    // Log the parsing error for debugging
    console.warn("Failed to parse streaming data:", data, parseError);
    return err(null);
  }
}

/**
 * Calls the LLM server with streaming enabled
 */
export async function* callLLMStreaming(
  messages: ChatMessage[],
  modelProperties: ModelProperties,
): AsyncGenerator<Result<StreamingLLMResponse, Error>, void, unknown> {
  try {
    // Prepare messages for API call
    const messagesForAPI = messages.map((msg) => ({
      role: msg.role,
      content:
        msg.variants.find((v) => v.id === msg.currentVariantId)?.text || "",
    }));

    // Call the LLM server with streaming enabled
    const fetchResult = await safePromise(
      fetch("http://localhost:8080/v1/chat/completions", {
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
      }),
      "Failed to initiate streaming request",
    );

    if (fetchResult.isErr()) {
      yield err(
        createNetworkError(
          "Failed to connect to LLM server",
          "http://localhost:8080/v1/chat/completions",
          fetchResult.error.cause,
        ),
      );
      return;
    }

    const response = fetchResult.value;

    if (!response.ok) {
      yield err(
        createAPIError(
          `HTTP error! status: ${response.status}`,
          response.status,
          "http://localhost:8080/v1/chat/completions",
        ),
      );
      return;
    }

    if (!response.body) {
      yield err(createNetworkError("Response body is null"));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const readResult = await safePromise(
          reader.read(),
          "Failed to read from response stream",
        );

        if (readResult.isErr()) {
          yield err(
            createNetworkError(
              "Failed to read from response stream",
              undefined,
              readResult.error.cause,
            ),
          );
          break;
        }

        const { done, value } = readResult.value;

        if (done) {
          // Yield final done signal
          yield ok({ content: "", done: true });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            const parsedResponse = parseStreamingResponse(data);

            if (parsedResponse.isOk()) {
              if (parsedResponse.value.done) {
                // Stream is complete
                yield ok(parsedResponse.value);
                return;
              } else {
                yield ok(parsedResponse.value);
              }
            }
            // If parsing failed, we skip this chunk but don't yield an error
            // to avoid breaking the stream
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error("Error calling LLM server with streaming:", error);
    // Yield the error instead of throwing
    yield err(
      createLLMError(
        "Streaming error occurred",
        "llama",
        error instanceof Error ? error : undefined,
      ),
    );
  }
}
