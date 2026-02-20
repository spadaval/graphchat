import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { postV1ChatCompletions } from "../../llamacpp-client";
import { client } from "../../llamacpp-client/client.gen";
import { type AppError, type AppResult, createLLMError } from "../errors";
import { blocks$ } from "./block";
import { getDocumentById } from "./documents";
import { getRelatedDocuments } from "./graph";
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

const SERVER_MODEL_ID = "llama";
const BROWSER_MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";

type AIProvider = "browser" | "server";

type TextGenerationOptions = {
  do_sample: boolean;
  max_new_tokens: number;
  repetition_penalty: number;
  return_full_text: boolean;
  temperature: number;
  top_k: number;
  top_p: number;
};

type TextGenerator = (
  input: string,
  options: TextGenerationOptions,
) => Promise<unknown>;

type GeneratedTextMessage = {
  content?: string;
  role?: string;
};

type GenerationOutputEntry = {
  generated_text?: string | GeneratedTextMessage[];
};

let browserGenerationPipelinePromise: Promise<TextGenerator> | null = null;
let browserGenerationPipelineReady = false;

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
  parameters: { ...parameters },
  success: false,
  sourceMessages: [],
});

function getAIProvider(value: unknown): AIProvider {
  return value === "server" ? "server" : "browser";
}

function getModelId(provider: AIProvider): string {
  return provider === "browser" ? BROWSER_MODEL_ID : SERVER_MODEL_ID;
}

function getWebGpuInfo() {
  if (typeof navigator === "undefined") {
    return { available: false, reason: "navigator-unavailable" };
  }

  const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
  if (!gpu) {
    return { available: false, reason: "navigator.gpu-missing" };
  }

  return { available: true, reason: "ok" };
}

async function getBrowserGenerationPipeline(): Promise<TextGenerator> {
  if (!browserGenerationPipelinePromise) {
    const webGpuInfo = getWebGpuInfo();
    console.info("[LLM] Initializing browser pipeline", {
      model: BROWSER_MODEL_ID,
      webGpuAvailable: webGpuInfo.available,
      webGpuReason: webGpuInfo.reason,
    });

    browserGenerationPipelinePromise = (async () => {
      const loadStart = performance.now();
      const { pipeline } = await import("@huggingface/transformers");
      const generator = await pipeline("text-generation", BROWSER_MODEL_ID, {
        ...(webGpuInfo.available ? { device: "webgpu" } : {}),
        dtype: "q4f16",
      });
      const loadMs = Math.round(performance.now() - loadStart);
      browserGenerationPipelineReady = true;

      console.info("[LLM] Browser pipeline ready", {
        loadMs,
        model: BROWSER_MODEL_ID,
      });

      return generator as TextGenerator;
    })();
  } else if (browserGenerationPipelineReady) {
    console.debug("[LLM] Reusing cached browser pipeline");
  }

  return browserGenerationPipelinePromise;
}

function buildPromptFromMessages(
  messages: { content: string; role: MessageType }[],
): string {
  const conversation = messages
    .map((message) => {
      if (message.role === "system") {
        return `System: ${message.content}`;
      }
      if (message.role === "user") {
        return `User: ${message.content}`;
      }
      return `Assistant: ${message.content}`;
    })
    .join("\n\n");

  return `${conversation}\n\nAssistant:`;
}

function extractGeneratedText(result: unknown): string {
  if (!Array.isArray(result) || result.length === 0) {
    return "";
  }

  const first = result[0] as GenerationOutputEntry;
  const generated = first.generated_text;

  if (typeof generated === "string") {
    return generated;
  }

  if (Array.isArray(generated)) {
    const assistantMessage = [...generated]
      .reverse()
      .find((message) => message.role === "assistant");

    if (assistantMessage?.content) {
      return assistantMessage.content;
    }

    const lastWithContent = [...generated]
      .reverse()
      .find((message) => typeof message.content === "string");

    return lastWithContent?.content ?? "";
  }

  return "";
}

function splitIntoChunks(text: string, size = 60): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }

  return chunks;
}

async function generateBrowserResponse(
  messages: { content: string; role: MessageType }[],
  modelProperties: ModelProperties,
): Promise<string> {
  const generator = await getBrowserGenerationPipeline();
  const prompt = buildPromptFromMessages(messages);

  const result = await generator(prompt, {
    max_new_tokens: modelProperties.n_predict,
    temperature: modelProperties.temperature,
    top_p: modelProperties.top_p,
    top_k: modelProperties.top_k,
    repetition_penalty: modelProperties.repeat_penalty,
    do_sample: modelProperties.temperature > 0,
    return_full_text: false,
  });

  return extractGeneratedText(result).trim();
}

function buildMessagesForLLM(
  messages: (Block | LLMMessage)[],
): { content: string; role: MessageType }[] {
  const directDocumentIds = messages.flatMap((msg) =>
    "linkedDocuments" in msg
      ? msg.linkedDocuments || []
      : (msg as LLMMessage).linkedDocuments || [],
  );

  const relatedDocumentIds = directDocumentIds.flatMap((id) =>
    getRelatedDocuments(id),
  );

  const allDocumentIds = [...directDocumentIds, ...relatedDocumentIds];
  const uniqueDocumentIds = [...new Set(allDocumentIds)];
  const documentContext = formatDocumentsForContext(uniqueDocumentIds);

  const messagesForAPI = messages.map((msg) => ({
    role: msg.role as MessageType,
    content: "text" in msg ? msg.text : (msg as LLMMessage).content,
  }));

  if (documentContext && messagesForAPI.length > 0) {
    const firstUserMessageIndex = messagesForAPI.findIndex(
      (msg) => msg.role === "user",
    );

    if (firstUserMessageIndex !== -1) {
      messagesForAPI[firstUserMessageIndex].content =
        documentContext + messagesForAPI[firstUserMessageIndex].content;
    } else {
      messagesForAPI.unshift({
        role: "system",
        content: documentContext.trim(),
      });
    }
  }

  return messagesForAPI;
}

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
      const content =
        doc.editorVersion === 2
          ? doc.content || ""
          : doc.blocks
              .map((blockId) => blocks$.get()[blockId]?.text || "")
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

/**
 * Calls the LLM with the provided messages and returns the response with attribution
 */
export async function callLLM(
  messages: (Block | LLMMessage)[],
  modelProperties: ModelProperties,
): Promise<AppResult<{ response: LLMResponse; request: LLMRequest }>> {
  const messagesForAPI = buildMessagesForLLM(messages);
  const uiPrefs = uiPreferences$.get();
  const provider = getAIProvider(uiPrefs.aiProvider);
  const modelId = getModelId(provider);

  const request = createLLMRequest(modelId, modelProperties);
  request.sourceMessages = messagesForAPI;
  const startTime = Date.now();

  if (provider === "browser") {
    try {
      const assistantContent = await generateBrowserResponse(
        messagesForAPI,
        modelProperties,
      );

      request.duration = Date.now() - startTime;
      request.success = true;

      return ok({
        response: {
          content: assistantContent || "Sorry, I couldn't generate a response.",
        },
        request,
      });
    } catch (error) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = error instanceof Error ? error.message : "Unknown error";

      return err(
        createLLMError(
          "Failed to run browser LLM",
          BROWSER_MODEL_ID,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  const resultAsync = ResultAsync.fromPromise(
    postV1ChatCompletions({
      body: {
        model: SERVER_MODEL_ID,
        messages: messagesForAPI,
        temperature: modelProperties.temperature,
        top_p: modelProperties.top_p,
        max_tokens: modelProperties.n_predict,
        presence_penalty: modelProperties.presence_penalty,
        frequency_penalty: modelProperties.frequency_penalty,
        stream: false,
        ...(uiPrefs.enableTokenProbabilities
          ? ({ n_probs: modelProperties.n_probs || 10 } as Record<
              string,
              unknown
            >)
          : {}),
      },
    }),
    (error) =>
      createLLMError("Failed to call LLM API", SERVER_MODEL_ID, error as Error),
  )
    .andThen((response) => {
      const assistantContent =
        response.data?.choices?.[0]?.message?.content ||
        "Sorry, I couldn't generate a response.";

      const data = response.data as Record<string, unknown>;
      const choices = data.choices as unknown[];
      const typedChoices = choices as { logprobs?: TokenProbability[] }[];
      const probabilities =
        (data.completion_probabilities as TokenProbability[]) ||
        (typedChoices?.[0]?.logprobs as TokenProbability[]);

      request.duration = Date.now() - startTime;
      request.success = true;

      return ok({
        response: {
          content: assistantContent,
          probabilities,
        },
        request,
      });
    })
    .mapErr((error) => {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = error.message;

      return createLLMError(
        "Failed to get response from LLM server",
        SERVER_MODEL_ID,
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

    return err(null);
  } catch (parseError) {
    console.warn("Failed to parse streaming data:", data, parseError);
    return err(null);
  }
}

/**
 * Calls the LLM with streaming enabled.
 */
export async function* callLLMStreaming(
  messages: (Block | LLMMessage)[],
  modelProperties: ModelProperties,
): AsyncGenerator<
  Result<{ response: StreamingLLMResponse; request: LLMRequest }, AppError>,
  void,
  unknown
> {
  const messagesForAPI = buildMessagesForLLM(messages);
  const uiPrefs = uiPreferences$.get();
  const provider = getAIProvider(uiPrefs.aiProvider);
  const modelId = getModelId(provider);

  const request = createLLMRequest(modelId, modelProperties);
  request.sourceMessages = messagesForAPI;
  const startTime = Date.now();

  if (provider === "browser") {
    try {
      const content = await generateBrowserResponse(
        messagesForAPI,
        modelProperties,
      );
      const chunks = splitIntoChunks(content);

      for (const chunk of chunks) {
        yield ok({
          response: {
            content: chunk,
            done: false,
          },
          request,
        });
      }

      request.duration = Date.now() - startTime;
      request.success = true;
      yield ok({ response: { content: "", done: true }, request });
      return;
    } catch (error) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = error instanceof Error ? error.message : "Unknown error";

      yield err(
        createLLMError(
          "Failed to initialize browser LLM",
          BROWSER_MODEL_ID,
          error instanceof Error ? error : undefined,
        ),
      );
      return;
    }
  }

  const sseResultAsync = ResultAsync.fromPromise(
    client.sse.post({
      url: "/v1/chat/completions",
      body: {
        model: SERVER_MODEL_ID,
        messages: messagesForAPI,
        temperature: modelProperties.temperature,
        top_p: modelProperties.top_p,
        max_tokens: modelProperties.n_predict,
        presence_penalty: modelProperties.presence_penalty,
        frequency_penalty: modelProperties.frequency_penalty,
        stream: true,
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
        SERVER_MODEL_ID,
        error as Error,
      ),
  );

  const sseResult = await sseResultAsync;

  if (sseResult.isErr()) {
    request.duration = Date.now() - startTime;
    request.success = false;
    request.error = sseResult.error.message;

    yield err(
      createLLMError(
        "Failed to initialize streaming connection",
        SERVER_MODEL_ID,
        sseResult.error,
      ),
    );
    return;
  }

  const sseClient = sseResult.value;

  for await (const event of sseClient.stream) {
    if (event === "[DONE]") {
      request.duration = Date.now() - startTime;
      request.success = true;

      yield ok({ response: { content: "", done: true }, request });
      break;
    }

    const typedEvent = event as {
      choices: {
        delta: { content?: string };
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
