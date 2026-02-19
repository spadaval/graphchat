import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { postV1ChatCompletions } from "../../llamacpp-client";
import { client } from "../../llamacpp-client/client.gen";
import { type AppError, type AppResult, createLLMError } from "../errors";

import { getDocumentById } from "./documents";
import type {
  Block,
  DocumentId,
  LLMMessage,
  LLMRequest,
  MessageType,
  ModelProperties,
  TokenProbability,
} from "./types";
import { uiPreferences$ } from "./ui";

// Helper function to generate unique request IDs
const generateRequestId = (): string => `req-${crypto.randomUUID()}`;

// Helper function to create LLMRequest object
const createLLMRequest = (
  model: string,
  parameters: ModelProperties,
): LLMRequest => ({
  id: generateRequestId(),
  timestamp: new Date(),
  model,
  parameters: { ...parameters }, // Clone to avoid mutations
  success: false, // Will be updated when request completes
  sourceMessages: [], // Will be filled with the actual messages sent
});

export interface LLMResponse {
  content: string;
  probabilities?: TokenProbability[];
}

export interface StreamingLLMResponse {
  content: string;
  done: boolean;
  error?: string;
  probabilities?: TokenProbability[];
}

import { blocks$ } from "./block";

/**
 * Formats document content for inclusion in LLM context
 */
export function formatDocumentsForContext(documentIds: DocumentId[]): string {
  if (documentIds.length === 0) {
    return "";
  }

  const documents = documentIds
    .map((id) => getDocumentById(id))
    .filter((doc) => doc !== undefined);

  if (documents.length === 0) {
    return "";
  }

  const formattedDocs = documents
    .map((doc) => {
      const blocks = blocks$.get();
      const content = doc.blocks
        .map((blockId) => blocks[blockId]?.text || "")
        .join("\n\n");
      return `### ${doc.title}\n${content}`;
    })
    .join("\n\n");

  return `## Referenced Documents\n\n${formattedDocs}\n\n## Conversation\n`;
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

// Persist model properties state
syncObservable(modelProps$, {
  persist: {
    name: "modelPropsStore",
    plugin: ObservablePersistLocalStorage,
  },
});

import { getRelatedDocuments } from "./graph";

/**
 * Calls the LLM server with the provided messages and returns the response with attribution
 */
export async function callLLM(
  messages: (Block | LLMMessage)[],
  modelProperties: ModelProperties,
): Promise<AppResult<{ response: LLMResponse; request: LLMRequest }>> {
  // Collect all document IDs from all messages
  const directDocumentIds = messages.flatMap((msg) =>
    "linkedDocuments" in msg
      ? msg.linkedDocuments || []
      : (msg as LLMMessage).linkedDocuments || [],
  );

  // Get related documents from the graph
  const relatedDocumentIds = directDocumentIds.flatMap((id) =>
    getRelatedDocuments(id),
  );

  const allDocumentIds = [...directDocumentIds, ...relatedDocumentIds];
  const uniqueDocumentIds = [...new Set(allDocumentIds)];

  // Format document content for context
  const documentContext = formatDocumentsForContext(uniqueDocumentIds);

  // Prepare messages for API call
  const messagesForAPI = messages.map((msg) => ({
    role: msg.role as MessageType,
    content: "text" in msg ? msg.text : (msg as LLMMessage).content,
  }));

  // If we have document context, prepend it to the first user message
  if (documentContext && messagesForAPI.length > 0) {
    const firstUserMessageIndex = messagesForAPI.findIndex(
      (msg) => msg.role === "user",
    );
    if (firstUserMessageIndex !== -1) {
      messagesForAPI[firstUserMessageIndex].content =
        documentContext + messagesForAPI[firstUserMessageIndex].content;
    } else {
      // If no user message, add document context as a system message
      messagesForAPI.unshift({
        role: "system",
        content: documentContext.trim(),
      });
    }
  }

  // Create request metadata
  const request = createLLMRequest("llama", modelProperties);
  request.sourceMessages = messagesForAPI;
  const startTime = Date.now();
  const uiPrefs = uiPreferences$.get();

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
        ...(uiPrefs.enableTokenProbabilities
          ? ({ n_probs: modelProperties.n_probs || 10 } as Record<
              string,
              unknown
            >)
          : {}),
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

      // Extract probabilities if available
      const data = response.data as Record<string, unknown>;
      // choices is an unknown external type from the LLM response
      const choices = data.choices as unknown[];
      const typedChoices = choices as { logprobs?: TokenProbability[] }[];
      const probabilities =
        (data.completion_probabilities as TokenProbability[]) ||
        (typedChoices?.[0]?.logprobs as TokenProbability[]);

      return ok({
        response: {
          content: assistantContent,
          probabilities,
        },
        request,
      });
    })
    .mapErr((error) => {
      // Update request metadata with error info
      const duration = Date.now() - startTime;
      request.duration = duration;
      request.success = false;
      request.error = error.message;

      return createLLMError(
        "Failed to get response from LLM server",
        "llama",
        error.cause,
      );
    });

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
  messages: (Block | LLMMessage)[],
  modelProperties: ModelProperties,
): AsyncGenerator<
  Result<{ response: StreamingLLMResponse; request: LLMRequest }, AppError>,
  void,
  unknown
> {
  // Collect all document IDs from all messages
  const directDocumentIds = messages.flatMap((msg) =>
    "linkedDocuments" in msg
      ? msg.linkedDocuments || []
      : (msg as LLMMessage).linkedDocuments || [],
  );

  // Get related documents from the graph
  const relatedDocumentIds = directDocumentIds.flatMap((id) =>
    getRelatedDocuments(id),
  );

  const allDocumentIds = [...directDocumentIds, ...relatedDocumentIds];
  const uniqueDocumentIds = [...new Set(allDocumentIds)];

  // Format document content for context
  const documentContext = formatDocumentsForContext(uniqueDocumentIds);

  // Prepare messages for API call
  const messagesForAPI = messages.map((msg) => ({
    role: msg.role as MessageType,
    content: "text" in msg ? msg.text : (msg as LLMMessage).content,
  }));

  // If we have document context, prepend it to the first user message
  if (documentContext && messagesForAPI.length > 0) {
    const firstUserMessageIndex = messagesForAPI.findIndex(
      (msg) => msg.role === "user",
    );
    if (firstUserMessageIndex !== -1) {
      messagesForAPI[firstUserMessageIndex].content =
        documentContext + messagesForAPI[firstUserMessageIndex].content;
    } else {
      // If no user message, add document context as a system message
      messagesForAPI.unshift({
        role: "system",
        content: documentContext.trim(),
      });
    }
  }

  // Create request metadata
  const request = createLLMRequest("llama", modelProperties);
  request.sourceMessages = messagesForAPI;
  const startTime = Date.now();
  const uiPrefs = uiPreferences$.get();

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
        ...(uiPrefs.enableTokenProbabilities
          ? ({ n_probs: modelProperties.n_probs || 10 } as Record<
              string,
              unknown
            >)
          : {}),
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
    // Update request metadata with error info
    const duration = Date.now() - startTime;
    request.duration = duration;
    request.success = false;
    request.error = sseResult.error.message;

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
    if (event === "[DONE]") {
      // Update request metadata with success info
      const duration = Date.now() - startTime;
      request.duration = duration;
      request.success = true;
      // Note: tokensUsed and tokensGenerated would need to be extracted from final event if available

      yield ok({ response: { content: "", done: true }, request });
      break;
    }

    const typedEvent = event as {
      choices: {
        delta: { content?: string };
        // logprobs is an unknown external type from the streaming event
        logprobs?: unknown;
      }[];
    };
    const content = typedEvent.choices[0].delta.content ?? "";
    const logprobs = typedEvent.choices[0].logprobs as
      | undefined
      | TokenProbability[]
      | { content?: TokenProbability[] };

    yield ok({
      response: {
        content,
        done: false,
        // If probability data exists, it might be an array or an object with 'content'
        probabilities: Array.isArray(logprobs)
          ? logprobs
          : (logprobs as { content?: TokenProbability[] })?.content
            ? (logprobs as { content: TokenProbability[] }).content
            : logprobs
              ? [logprobs as TokenProbability]
              : undefined,
      },
      request,
    });
  }
}
