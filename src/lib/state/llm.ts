import { observable } from "@legendapp/state";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { postV1ChatCompletions } from "../../client";
import { client } from "../../client/client.gen";
import { type AppError, type AppResult, createLLMError } from "../errors";

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

  // Call the LLM server using ResultAsync
  const resultAsync = ResultAsync.fromPromise(
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
    (error) =>
      createLLMError("Failed to call LLM API", "llama", error as Error),
  )
    .andThen((response) => {
      // Extract the assistant's response
      const assistantContent =
        response.data?.choices?.[0]?.message?.content ||
        "Sorry, I couldn't generate a response.";

      return ok({
        content: assistantContent,
      });
    })
    .mapErr((error) =>
      createLLMError(
        "Failed to get response from LLM server",
        "llama",
        error.cause,
      ),
    );

  return resultAsync;
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
 * Calls the LLM server with streaming enabled using the generated client
 */
export async function* callLLMStreaming(
  messages: ChatMessage[],
  modelProperties: ModelProperties,
): AsyncGenerator<Result<StreamingLLMResponse, AppError>, void, unknown> {
  // Prepare messages for API call
  const messagesForAPI = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.variants.find((v) => v.id === msg.currentVariantId)?.text || "",
  }));

  // Use ResultAsync to handle the SSE client creation
  const sseResultAsync = ResultAsync.fromPromise(
    client.sse.post({
      url: "/v1/chat/completions",
      body: {
        model: "llama",
        messages: messagesForAPI,
        temperature: modelProperties.temperature,
        top_p: modelProperties.top_p,
        max_tokens: modelProperties.n_predict,
        presence_penalty: modelProperties.presence_penalty,
        frequency_penalty: modelProperties.frequency_penalty,
        stream: true, // Enable streaming
      },
      headers: {
        "Content-Type": "application/json",
      },
    }),
    (error) =>
      createLLMError(
        "Failed to initialize streaming connection",
        "llama",
        error as Error,
      ),
  );

  const sseResult = await sseResultAsync;

  if (sseResult.isErr()) {
    yield err(
      createLLMError(
        "Failed to initialize streaming connection",
        "llama",
        sseResult.error,
      ),
    );
    return;
  }

  const sseClient = sseResult.value;

  // Handle the SSE events
  for await (const event of sseClient.stream) {
    console.log(event);
    if (event === "[DONE]") {
      yield ok({ content: "", done: true });
      break;
    }

    yield ok({ content: event.choices[0].delta.content ?? "", done: false });
  }
}
