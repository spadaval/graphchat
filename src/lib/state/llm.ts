import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { OpenRouter } from "@openrouter/sdk";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { postV1ChatCompletions } from "../../llamacpp-client";
import { client } from "../../llamacpp-client/client.gen";
import { debugInfo, debugLog } from "../debug";
import { serializeModelToReadableMarkdown } from "../document-content";
import { type AppError, type AppResult, createLLMError } from "../errors";
import { getDocumentById } from "./documents";
import { getRelatedDocuments } from "./graph";
import type {
  Block,
  DocumentId,
  LLMBackend,
  LLMMessage,
  LLMRequest,
  MessageType,
  ModelProperties,
  TokenProbability,
} from "./types";
import { uiPreferences$ } from "./ui";

const DEFAULT_SERVER_MODEL_ID = "llama";
const DEFAULT_BROWSER_MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";
const DEFAULT_OPENROUTER_MODEL_ID = "openai/gpt-4o-mini";

type EmptyResponseDiagnosticInput = {
  backend: LLMBackend;
  messageCount: number;
  modelId: string;
  rawResponse: string;
};

type LLMTaskType = "chat" | "inline" | "simple";

export type BackendRoutingOptions = {
  forceBackend?: LLMBackend;
  task?: LLMTaskType;
};

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
type BrowserGenerationResult = {
  generatedText: string;
  rawResultPreview: string;
};

let browserGenerationPipelineState: {
  modelId: string;
  promise: Promise<TextGenerator>;
  ready: boolean;
} | null = null;
let openRouterClientCache:
  | {
      apiKey: string;
      client: OpenRouter;
    }
  | undefined;

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

function getModelId(backend: LLMBackend): string {
  if (backend === "browser") {
    const browserModelId = uiPreferences$.browserModelId.get().trim();
    return browserModelId || DEFAULT_BROWSER_MODEL_ID;
  }
  if (backend === "openrouter") {
    const openRouterModelId = uiPreferences$.openRouterModelId.get().trim();
    return openRouterModelId || DEFAULT_OPENROUTER_MODEL_ID;
  }
  const serverModelId = uiPreferences$.serverModelId.get();
  return serverModelId || DEFAULT_SERVER_MODEL_ID;
}

function resolveBackend({
  apiBackendEnabled,
  configuredBackend,
  forceBackend,
  task,
}: {
  apiBackendEnabled: boolean;
  configuredBackend?: LLMBackend;
} & BackendRoutingOptions): LLMBackend {
  if (forceBackend) {
    return forceBackend;
  }
  if (task === "inline" || task === "simple") {
    return "browser";
  }
  if (!apiBackendEnabled) {
    return "browser";
  }
  if (configuredBackend === "openrouter") {
    return "openrouter";
  }
  if (configuredBackend === "browser") {
    return "browser";
  }
  return "server";
}

function getOpenRouterClient(apiKey: string): OpenRouter {
  if (
    openRouterClientCache &&
    openRouterClientCache.apiKey === apiKey &&
    openRouterClientCache.client
  ) {
    return openRouterClientCache.client;
  }

  const client = new OpenRouter({ apiKey });
  openRouterClientCache = { apiKey, client };
  return client;
}

function extractOpenRouterContentText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const textParts: string[] = [];
  for (const part of content) {
    if (typeof part === "string") {
      textParts.push(part);
      continue;
    }

    if (!part || typeof part !== "object") {
      continue;
    }

    const withText = part as { text?: unknown };
    if (typeof withText.text === "string") {
      textParts.push(withText.text);
    }
  }

  return textParts.join("");
}

function toError(value: unknown): Error | undefined {
  return value instanceof Error ? value : undefined;
}

function toSingleLineText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toPreviewText(value: string, maxLength = 1200): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...(truncated)`;
}

function toRawValuePreview(value: unknown, maxLength = 1200): string {
  if (typeof value === "string") {
    return toPreviewText(toSingleLineText(value), maxLength);
  }

  if (value instanceof Error) {
    const causeText = value.cause
      ? ` | cause=${toRawValuePreview(value.cause, 400)}`
      : "";
    return toPreviewText(
      `${value.name}: ${toSingleLineText(value.message)}${causeText}`,
      maxLength,
    );
  }

  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  try {
    const serialized = JSON.stringify(value);
    if (!serialized) {
      return String(value);
    }
    return toPreviewText(toSingleLineText(serialized), maxLength);
  } catch {
    return toPreviewText(toSingleLineText(String(value)), maxLength);
  }
}

function buildEmptyResponseDiagnostic({
  backend,
  messageCount,
  modelId,
  rawResponse,
}: EmptyResponseDiagnosticInput): string {
  const backendLabel =
    backend === "browser"
      ? "browser"
      : backend === "openrouter"
        ? "OpenRouter"
        : "server";

  return `No response text was returned by the ${backendLabel} model "${modelId}" for ${messageCount} input message(s). This may indicate a model refusal, safety filtering, invalid prompt formatting, token limits, or provider/network failure. Raw response: ${rawResponse}`;
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

async function getBrowserGenerationPipeline(
  modelId: string,
): Promise<TextGenerator> {
  if (
    !browserGenerationPipelineState ||
    browserGenerationPipelineState.modelId !== modelId
  ) {
    const webGpuInfo = getWebGpuInfo();
    debugInfo("[LLM] Initializing browser pipeline", {
      model: modelId,
      webGpuAvailable: webGpuInfo.available,
      webGpuReason: webGpuInfo.reason,
    });

    const nextPipelineState = {
      modelId,
      ready: false,
      promise: (async () => {
        const loadStart = performance.now();
        const { pipeline } = await import("@huggingface/transformers");
        const generator = await pipeline("text-generation", modelId, {
          ...(webGpuInfo.available ? { device: "webgpu" } : {}),
          dtype: "q4f16",
        });
        const loadMs = Math.round(performance.now() - loadStart);
        if (
          browserGenerationPipelineState &&
          browserGenerationPipelineState.modelId === modelId
        ) {
          browserGenerationPipelineState.ready = true;
        }

        debugInfo("[LLM] Browser pipeline ready", {
          loadMs,
          model: modelId,
        });

        return generator as TextGenerator;
      })(),
    };
    browserGenerationPipelineState = nextPipelineState;
  } else if (browserGenerationPipelineState.ready) {
    debugLog("[LLM] Reusing cached browser pipeline");
  }

  return browserGenerationPipelineState.promise;
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
): Promise<BrowserGenerationResult> {
  const browserModelId = getModelId("browser");
  const generationRunId = `browser-gen-${crypto.randomUUID()}`;
  const runStart = performance.now();
  const pipelineStart = performance.now();
  const generator = await getBrowserGenerationPipeline(browserModelId);
  const pipelineMs = Math.round(performance.now() - pipelineStart);
  const prompt = buildPromptFromMessages(messages);
  const approxPromptTokens = Math.round(prompt.length / 4);
  debugInfo("[LLM Browser] Generation starting", {
    approxPromptTokens,
    messageCount: messages.length,
    pipelineMs,
    promptLength: prompt.length,
    runId: generationRunId,
  });

  const inferenceStart = performance.now();
  const result = await generator(prompt, {
    max_new_tokens: modelProperties.n_predict,
    temperature: modelProperties.temperature,
    top_p: modelProperties.top_p,
    top_k: modelProperties.top_k,
    repetition_penalty: modelProperties.repeat_penalty,
    do_sample: modelProperties.temperature > 0,
    return_full_text: false,
  });
  const inferenceMs = Math.round(performance.now() - inferenceStart);
  const totalMs = Math.round(performance.now() - runStart);

  const generated = extractGeneratedText(result).trim();
  const rawResultPreview = toRawValuePreview(result);
  const approxGeneratedTokens = Math.round(generated.length / 4);
  const tokensPerSecond =
    inferenceMs > 0
      ? +(approxGeneratedTokens / (inferenceMs / 1000)).toFixed(3)
      : 0;
  debugInfo("[LLM Browser] Generation completed", {
    approxGeneratedTokens,
    generatedLength: generated.length,
    inferenceMs,
    runId: generationRunId,
    tokensPerSecond,
    totalMs,
  });

  return {
    generatedText: generated,
    rawResultPreview,
  };
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
      const content = serializeModelToReadableMarkdown(doc.contentModel || []);
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

export const SAMPLER_PRESETS = [
  {
    description: "Balanced generation for most tasks.",
    id: "balanced",
    name: "Balanced",
    values: {
      frequency_penalty: 0,
      mirostat: 0 as const,
      n_predict: 1600,
      presence_penalty: 0,
      repeat_penalty: 1.08,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
    },
  },
  {
    description: "More deterministic output for editing and extraction.",
    id: "focused",
    name: "Focused",
    values: {
      frequency_penalty: 0,
      mirostat: 0 as const,
      n_predict: 1200,
      presence_penalty: 0,
      repeat_penalty: 1.15,
      temperature: 0.25,
      top_k: 30,
      top_p: 0.8,
    },
  },
  {
    description: "Higher creativity and variation for brainstorming.",
    id: "creative",
    name: "Creative",
    values: {
      frequency_penalty: 0.15,
      mirostat: 0 as const,
      n_predict: 2200,
      presence_penalty: 0.2,
      repeat_penalty: 1.05,
      temperature: 1.05,
      top_k: 60,
      top_p: 0.95,
    },
  },
] as const;

export type SamplerPresetId = (typeof SAMPLER_PRESETS)[number]["id"];

export function applySamplerPreset(presetId: SamplerPresetId): boolean {
  const preset = SAMPLER_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) return false;
  modelProps$.assign(preset.values);
  return true;
}

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
  routing: BackendRoutingOptions = {},
): Promise<AppResult<{ response: LLMResponse; request: LLMRequest }>> {
  const messagesForAPI = buildMessagesForLLM(messages);
  const uiPrefs = uiPreferences$.get();
  const backend = resolveBackend({
    ...routing,
    apiBackendEnabled: uiPrefs.apiBackendEnabled,
    configuredBackend: uiPrefs.llmBackend,
  });
  const modelId = getModelId(backend);

  const request = createLLMRequest(modelId, modelProperties);
  request.sourceMessages = messagesForAPI;
  const startTime = Date.now();

  if (backend === "browser") {
    try {
      const generation = await generateBrowserResponse(
        messagesForAPI,
        modelProperties,
      );
      const assistantContent = generation.generatedText;

      request.duration = Date.now() - startTime;
      request.success = true;

      return ok({
        response: {
          content:
            assistantContent ||
            buildEmptyResponseDiagnostic({
              backend,
              messageCount: messagesForAPI.length,
              modelId,
              rawResponse: generation.rawResultPreview,
            }),
        },
        request,
      });
    } catch (error) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = toRawValuePreview(error);

      return err(
        createLLMError(
          `Failed to run browser LLM. Raw error: ${toRawValuePreview(error)}`,
          modelId,
          toError(error),
        ),
      );
    }
  }

  if (backend === "openrouter") {
    const apiKey = uiPrefs.openRouterApiKey?.trim() || "";
    if (!apiKey) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = "OpenRouter API key is not configured";
      return err(
        createLLMError(
          "OpenRouter API key is not configured",
          modelId,
          undefined,
        ),
      );
    }

    try {
      const openRouter = getOpenRouterClient(apiKey);
      const openRouterResponse = await openRouter.chat.send({
        chatGenerationParams: {
          messages: messagesForAPI.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          model: modelId,
          stream: false,
          temperature: modelProperties.temperature,
          topP: modelProperties.top_p,
          maxTokens: modelProperties.n_predict,
          presencePenalty: modelProperties.presence_penalty,
          frequencyPenalty: modelProperties.frequency_penalty,
        },
      });

      const assistantContent = extractOpenRouterContentText(
        openRouterResponse.choices?.[0]?.message?.content,
      );

      request.duration = Date.now() - startTime;
      request.success = true;

      return ok({
        response: {
          content:
            assistantContent ||
            buildEmptyResponseDiagnostic({
              backend,
              messageCount: messagesForAPI.length,
              modelId,
              rawResponse: toRawValuePreview(openRouterResponse),
            }),
        },
        request,
      });
    } catch (error) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = toRawValuePreview(error);
      return err(
        createLLMError(
          `Failed to call OpenRouter. Raw error: ${toRawValuePreview(error)}`,
          modelId,
          toError(error),
        ),
      );
    }
  }

  const resultAsync = ResultAsync.fromPromise(
    postV1ChatCompletions({
      body: {
        model: modelId,
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
      createLLMError(
        `Failed to call LLM API. Raw error: ${toRawValuePreview(error)}`,
        modelId,
        toError(error),
      ),
  )
    .andThen((response) => {
      const assistantContent =
        extractOpenRouterContentText(
          response.data?.choices?.[0]?.message?.content,
        ) ||
        buildEmptyResponseDiagnostic({
          backend,
          messageCount: messagesForAPI.length,
          modelId,
          rawResponse: toRawValuePreview(response.data),
        });

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
        `Failed to get response from LLM server. Raw error: ${error.message}${error.cause ? ` | cause: ${toRawValuePreview(error.cause)}` : ""}`,
        modelId,
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
  routing: BackendRoutingOptions = {},
): AsyncGenerator<
  Result<{ response: StreamingLLMResponse; request: LLMRequest }, AppError>,
  void,
  unknown
> {
  const messagesForAPI = buildMessagesForLLM(messages);
  const uiPrefs = uiPreferences$.get();
  const backend = resolveBackend({
    ...routing,
    apiBackendEnabled: uiPrefs.apiBackendEnabled,
    configuredBackend: uiPrefs.llmBackend,
  });
  const modelId = getModelId(backend);

  const request = createLLMRequest(modelId, modelProperties);
  request.sourceMessages = messagesForAPI;
  const startTime = Date.now();
  const perfStart = performance.now();
  let firstChunkAt: number | null = null;
  let lastChunkAt: number | null = null;
  let nonEmptyChunkCount = 0;
  let emptyChunkCount = 0;
  let totalContentChars = 0;
  debugInfo("[LLM Streaming] Request started", {
    messageCount: messagesForAPI.length,
    modelId,
    provider: backend,
    requestId: request.id,
    stream: modelProperties.stream,
  });

  if (backend === "browser") {
    try {
      const generation = await generateBrowserResponse(
        messagesForAPI,
        modelProperties,
      );
      const content = generation.generatedText;
      const chunks = splitIntoChunks(content);
      debugInfo("[LLM Streaming] Browser response ready", {
        chunkCount: chunks.length,
        contentLength: content.length,
        requestId: request.id,
      });

      for (const chunk of chunks) {
        const now = performance.now();
        if (firstChunkAt === null) {
          firstChunkAt = now;
          debugInfo("[LLM Streaming] First chunk emitted", {
            requestId: request.id,
            timeToFirstChunkMs: Math.round(now - perfStart),
          });
        }
        const gapMs = lastChunkAt === null ? 0 : Math.round(now - lastChunkAt);
        lastChunkAt = now;
        if (chunk.length > 0) {
          nonEmptyChunkCount += 1;
          totalContentChars += chunk.length;
        } else {
          emptyChunkCount += 1;
        }
        debugLog("[LLM Streaming] Browser chunk", {
          chunkGapMs: gapMs,
          chunkLength: chunk.length,
          emptyChunkCount,
          nonEmptyChunkCount,
          requestId: request.id,
        });
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
      const totalStreamMs = Math.round(performance.now() - perfStart);
      const throughputCharsPerSecond =
        totalStreamMs > 0
          ? +((totalContentChars / totalStreamMs) * 1000).toFixed(3)
          : 0;
      debugInfo("[LLM Streaming] Browser stream completed", {
        durationMs: request.duration,
        emptyChunkCount,
        nonEmptyChunkCount,
        throughputCharsPerSecond,
        timeToFirstChunkMs:
          firstChunkAt === null ? null : Math.round(firstChunkAt - perfStart),
        totalContentChars,
        totalStreamMs,
        requestId: request.id,
      });
      yield ok({ response: { content: "", done: true }, request });
      return;
    } catch (error) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[LLM Streaming] Browser stream failed", {
        durationMs: request.duration,
        error,
        requestId: request.id,
      });

      yield err(
        createLLMError(
          "Failed to initialize browser LLM",
          modelId,
          error instanceof Error ? error : undefined,
        ),
      );
      return;
    }
  }

  if (backend === "openrouter") {
    const apiKey = uiPrefs.openRouterApiKey?.trim() || "";
    if (!apiKey) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = "OpenRouter API key is not configured";
      yield err(
        createLLMError(
          "OpenRouter API key is not configured",
          modelId,
          undefined,
        ),
      );
      return;
    }

    try {
      const openRouter = getOpenRouterClient(apiKey);
      const stream = await openRouter.chat.send({
        chatGenerationParams: {
          messages: messagesForAPI.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          model: modelId,
          stream: true,
          temperature: modelProperties.temperature,
          topP: modelProperties.top_p,
          maxTokens: modelProperties.n_predict,
          presencePenalty: modelProperties.presence_penalty,
          frequencyPenalty: modelProperties.frequency_penalty,
        },
      });

      for await (const event of stream) {
        const now = performance.now();
        if (firstChunkAt === null) {
          firstChunkAt = now;
          debugInfo("[LLM Streaming] First OpenRouter event received", {
            requestId: request.id,
            timeToFirstEventMs: Math.round(now - perfStart),
          });
        }
        const gapMs = lastChunkAt === null ? 0 : Math.round(now - lastChunkAt);
        lastChunkAt = now;

        const content = event.choices?.[0]?.delta?.content ?? "";
        if (content.length > 0) {
          nonEmptyChunkCount += 1;
          totalContentChars += content.length;
        } else {
          emptyChunkCount += 1;
        }
        debugLog("[LLM Streaming] OpenRouter chunk", {
          chunkGapMs: gapMs,
          contentLength: content.length,
          emptyChunkCount,
          nonEmptyChunkCount,
          requestId: request.id,
        });

        yield ok({
          response: {
            content,
            done: false,
          },
          request,
        });
      }

      request.duration = Date.now() - startTime;
      request.success = true;
      const totalStreamMs = Math.round(performance.now() - perfStart);
      const throughputCharsPerSecond =
        totalStreamMs > 0
          ? +((totalContentChars / totalStreamMs) * 1000).toFixed(3)
          : 0;
      debugInfo("[LLM Streaming] OpenRouter stream completed", {
        durationMs: request.duration,
        emptyChunkCount,
        nonEmptyChunkCount,
        throughputCharsPerSecond,
        timeToFirstEventMs:
          firstChunkAt === null ? null : Math.round(firstChunkAt - perfStart),
        totalContentChars,
        totalStreamMs,
        requestId: request.id,
      });

      yield ok({ response: { content: "", done: true }, request });
      return;
    } catch (error) {
      request.duration = Date.now() - startTime;
      request.success = false;
      request.error = error instanceof Error ? error.message : "Unknown error";
      yield err(
        createLLMError(
          "Failed to initialize OpenRouter streaming connection",
          modelId,
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
        model: modelId,
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
        modelId,
        error as Error,
      ),
  );

  const sseResult = await sseResultAsync;

  if (sseResult.isErr()) {
    request.duration = Date.now() - startTime;
    request.success = false;
    request.error = sseResult.error.message;
    console.error("[LLM Streaming] SSE init failed", {
      durationMs: request.duration,
      error: sseResult.error,
      requestId: request.id,
    });

    yield err(
      createLLMError(
        "Failed to initialize streaming connection",
        modelId,
        sseResult.error,
      ),
    );
    return;
  }

  const sseClient = sseResult.value;
  debugInfo("[LLM Streaming] SSE stream connected", {
    requestId: request.id,
  });

  for await (const event of sseClient.stream) {
    const now = performance.now();
    if (firstChunkAt === null) {
      firstChunkAt = now;
      debugInfo("[LLM Streaming] First SSE event received", {
        requestId: request.id,
        timeToFirstEventMs: Math.round(now - perfStart),
      });
    }
    const gapMs = lastChunkAt === null ? 0 : Math.round(now - lastChunkAt);
    lastChunkAt = now;

    if (event === "[DONE]") {
      request.duration = Date.now() - startTime;
      request.success = true;
      const totalStreamMs = Math.round(performance.now() - perfStart);
      const throughputCharsPerSecond =
        totalStreamMs > 0
          ? +((totalContentChars / totalStreamMs) * 1000).toFixed(3)
          : 0;
      debugInfo("[LLM Streaming] SSE stream completed", {
        durationMs: request.duration,
        emptyChunkCount,
        nonEmptyChunkCount,
        throughputCharsPerSecond,
        timeToFirstEventMs:
          firstChunkAt === null ? null : Math.round(firstChunkAt - perfStart),
        totalContentChars,
        totalStreamMs,
        requestId: request.id,
      });

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
    const normalizedProbabilities = Array.isArray(logprobs)
      ? logprobs
      : (logprobs as { content?: TokenProbability[] })?.content
        ? (logprobs as { content: TokenProbability[] }).content
        : logprobs
          ? [logprobs as TokenProbability]
          : undefined;
    if (content.length > 0) {
      nonEmptyChunkCount += 1;
      totalContentChars += content.length;
    } else {
      emptyChunkCount += 1;
    }
    if (gapMs > 2_000) {
      console.warn("[LLM Streaming] Large gap between SSE events", {
        gapMs,
        requestId: request.id,
      });
    }
    debugLog("[LLM Streaming] SSE chunk", {
      chunkGapMs: gapMs,
      contentLength: content.length,
      emptyChunkCount,
      hasContent: content.length > 0,
      nonEmptyChunkCount,
      probabilitiesCount: normalizedProbabilities?.length || 0,
      requestId: request.id,
    });

    yield ok({
      response: {
        content,
        done: false,
        probabilities: normalizedProbabilities,
      },
      request,
    });
  }
}
