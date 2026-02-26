import { use$ } from "@legendapp/state/react";
import { OpenRouter } from "@openrouter/sdk";
import { useQuery } from "@tanstack/react-query";
import {
  Bug,
  Cable,
  Check,
  Layout,
  type LucideIcon,
  RefreshCw,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ModelProperties } from "~/components/ModelProperties";
import { ServerInfoComponent } from "~/components/ServerInfo";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  applySamplerPreset,
  callLLM,
  modelProps$,
  SAMPLER_PRESETS,
  type SamplerPresetId,
} from "~/lib/state/llm";
import { serverStore$ } from "~/lib/state/server";
import type { LLMBackend } from "~/lib/state/types";
import {
  setActiveSamplerPreset,
  setAPIBackendEnabled,
  setBrowserModelId,
  setDebugMode,
  setDocumentWidth,
  setEnableTokenProbabilities,
  setEntityAutoLinkStrictMatches,
  setEntityAutoRunOnIdle,
  setEntityFullPassIntervalSeconds,
  setEntityPreloadModel,
  setHuggingfaceToken,
  setInlineCompletionEnabled,
  setLLMBackend,
  setOpenRouterApiKey,
  setOpenRouterModelId,
  setServerModelId,
  setTokenizerModelId,
  uiPreferences$,
} from "~/lib/state/ui";
import { testTokenizerMetadata } from "~/lib/tokenizer";
import { getV1Models } from "~/llamacpp-client";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSectionId = "general" | "backends" | "models" | "debug";

interface SettingsSection {
  description: string;
  icon: LucideIcon;
  id: SettingsSectionId;
  title: string;
}

interface TestStatus {
  loading: boolean;
  message?: string;
  output?: string;
  success?: boolean;
}

type ModelPickerOption = {
  description?: string;
  id: string;
  meta?: string;
  title?: string;
};

type LocalModel = {
  created?: number;
  id: string;
  owned_by?: string;
};

type OpenRouterModel = {
  contextLength?: number | null;
  id: string;
  name: string;
};

const BROWSER_MODEL_OPTIONS: ModelPickerOption[] = [
  {
    id: "onnx-community/Qwen3-0.6B-ONNX",
    title: "Qwen3 0.6B",
    description: "Fastest startup, lowest local resource usage.",
  },
  {
    id: "onnx-community/Qwen3-1.7B-ONNX",
    title: "Qwen3 1.7B",
    description: "Balanced quality and speed for in-browser inference.",
  },
  {
    id: "onnx-community/SmolLM3-3B-ONNX",
    title: "SmolLM3 3B",
    description: "Higher quality for local responses, slower on weak devices.",
  },
];

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function CompactModelCardPicker({
  emptyMessage,
  errorMessage,
  isLoading,
  onSelect,
  options,
  selectedId,
}: {
  emptyMessage: string;
  errorMessage?: string;
  isLoading: boolean;
  onSelect: (modelId: string) => void;
  options: ModelPickerOption[];
  selectedId: string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-zinc-700/80 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
        <RefreshCw size={12} className="animate-spin" />
        Loading models...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-md border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
        {errorMessage}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="rounded-md border border-zinc-700/80 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
              isSelected
                ? "border-blue-600/60 bg-blue-500/10"
                : "border-zinc-700 bg-zinc-950 hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-zinc-100">
                  {option.title || option.id}
                </p>
                <p className="mt-0.5 break-all text-[11px] text-zinc-400">
                  {option.id}
                </p>
                {option.description ? (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {option.description}
                  </p>
                ) : null}
                {option.meta ? (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {option.meta}
                  </p>
                ) : null}
              </div>
              {isSelected ? (
                <Check size={14} className="mt-0.5 shrink-0 text-blue-400" />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    description: "Editor layout and inline assistance",
    icon: Layout,
    id: "general",
    title: "General",
  },
  {
    description: "Browser + API backend behavior",
    icon: Cable,
    id: "backends",
    title: "Backends",
  },
  {
    description: "Sampling controls and tokenizer tools",
    icon: SlidersHorizontal,
    id: "models",
    title: "Model Settings",
  },
  {
    description: "Runtime logging and diagnostics",
    icon: Bug,
    id: "debug",
    title: "Debug Tools",
  },
];

function ToggleRow({
  checked,
  description,
  onChange,
  title,
}: {
  checked: boolean;
  description: string;
  onChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-blue-500"
      />
    </div>
  );
}

function TestResult({ status }: { status: TestStatus }) {
  if (!status.message) return null;

  return (
    <div
      className={`mt-3 rounded border p-2 text-xs ${status.success ? "border-green-800/70 bg-green-950/20 text-green-300" : "border-red-900/70 bg-red-950/20 text-red-300"}`}
    >
      <p>{status.message}</p>
      {status.output ? (
        <p className="mt-1 line-clamp-3 text-zinc-300">{status.output}</p>
      ) : null}
    </div>
  );
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const {
    activeSamplerPreset,
    apiBackendEnabled,
    browserModelId,
    debugMode,
    documentWidth = 800,
    enableTokenProbabilities,
    huggingfaceToken,
    inlineCompletion,
    llmBackend,
    openRouterApiKey,
    openRouterModelId,
    entityAutoLinkStrictMatches,
    entityAutoRunOnIdle,
    entityFullPassIntervalSeconds = 10,
    entityPreloadModel,
    serverModelId,
    tokenizerModelId,
  } = use$(uiPreferences$);
  const { serverUrl } = use$(serverStore$);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const [tokenizerTestStatus, setTokenizerTestStatus] = useState<TestStatus>({
    loading: false,
  });
  const [browserTestStatus, setBrowserTestStatus] = useState<TestStatus>({
    loading: false,
  });
  const [apiTestStatus, setApiTestStatus] = useState<TestStatus>({
    loading: false,
  });
  const [openRouterTestStatus, setOpenRouterTestStatus] = useState<TestStatus>({
    loading: false,
  });

  const sectionMeta = useMemo(
    () => SETTINGS_SECTIONS.find((section) => section.id === activeSection),
    [activeSection],
  );
  const trimmedOpenRouterKey = (openRouterApiKey || "").trim();
  const hasValidServerUrl = isValidHttpUrl(serverUrl.trim());

  const {
    data: localModels = [],
    isLoading: isLocalModelsLoading,
    isFetching: isLocalModelsFetching,
    isError: isLocalModelsError,
    error: localModelsError,
    refetch: refetchLocalModels,
  } = useQuery({
    queryKey: ["settings-local-models", serverUrl],
    enabled: activeSection === "backends" && hasValidServerUrl,
    queryFn: async (): Promise<LocalModel[]> => {
      const response = await getV1Models();
      if (response.error) {
        const message =
          response.error instanceof Error
            ? response.error.message
            : "Failed to fetch models from /v1/models";
        throw new Error(message);
      }

      const data = response.data?.data ?? [];
      return data
        .filter((model): model is LocalModel => Boolean(model?.id))
        .map((model) => ({
          id: model.id as string,
          created: model.created,
          owned_by: model.owned_by,
        }));
    },
    refetchInterval: 30000,
  });

  const {
    data: openRouterModels = [],
    isLoading: isOpenRouterModelsLoading,
    isFetching: isOpenRouterModelsFetching,
    isError: isOpenRouterModelsError,
    error: openRouterModelsError,
    refetch: refetchOpenRouterModels,
  } = useQuery({
    queryKey: ["settings-openrouter-models", trimmedOpenRouterKey],
    enabled: activeSection === "backends" && trimmedOpenRouterKey.length > 0,
    queryFn: async (): Promise<OpenRouterModel[]> => {
      const openRouter = new OpenRouter({ apiKey: trimmedOpenRouterKey });
      const response = await openRouter.models.list();
      return (response.data || [])
        .filter((model): model is OpenRouterModel => Boolean(model?.id))
        .map((model) => ({
          id: model.id,
          name: model.name,
          contextLength: model.contextLength,
        }));
    },
    refetchInterval: 30000,
  });

  const localModelOptions = useMemo<ModelPickerOption[]>(
    () =>
      localModels.map((model) => ({
        id: model.id,
        meta:
          model.created || model.owned_by
            ? [model.owned_by, model.created]
                .filter(Boolean)
                .map((item) =>
                  typeof item === "number"
                    ? new Date(item * 1000).toLocaleDateString()
                    : item,
                )
                .join(" • ")
            : undefined,
      })),
    [localModels],
  );

  const openRouterModelOptions = useMemo<ModelPickerOption[]>(
    () =>
      openRouterModels.map((model) => ({
        id: model.id,
        title: model.name,
        meta: model.contextLength
          ? `Context: ${model.contextLength.toLocaleString()}`
          : undefined,
      })),
    [openRouterModels],
  );

  useEffect(() => {
    if (
      localModels.length > 0 &&
      !localModels.some((model) => model.id === (serverModelId || ""))
    ) {
      setServerModelId(localModels[0].id);
    }
  }, [localModels, serverModelId]);

  useEffect(() => {
    if (
      openRouterModels.length > 0 &&
      !openRouterModels.some((model) => model.id === openRouterModelId)
    ) {
      setOpenRouterModelId(openRouterModels[0].id);
    }
  }, [openRouterModels, openRouterModelId]);

  const handleApplyPreset = (presetId: SamplerPresetId) => {
    const applied = applySamplerPreset(presetId);
    if (!applied) return;
    setActiveSamplerPreset(presetId);
  };

  const handleBackendChange = (backend: LLMBackend) => {
    setLLMBackend(backend);
    setAPIBackendEnabled(backend !== "browser");
  };

  const handleTokenizerTest = async () => {
    if (!tokenizerModelId || tokenizerTestStatus.loading) return;

    setTokenizerTestStatus({ loading: true });
    const result = await testTokenizerMetadata(tokenizerModelId);
    setTokenizerTestStatus({
      loading: false,
      message: result.message,
      success: result.success,
    });
  };

  const runBackendTest = async (backend: LLMBackend) => {
    const setStatus =
      backend === "browser"
        ? setBrowserTestStatus
        : backend === "server"
          ? setApiTestStatus
          : setOpenRouterTestStatus;
    const currentStatus =
      backend === "browser"
        ? browserTestStatus
        : backend === "server"
          ? apiTestStatus
          : openRouterTestStatus;

    if (currentStatus.loading) return;

    setStatus({ loading: true });

    const result = await callLLM(
      [
        {
          content:
            "Return a short health-check response with the word READY and one sentence.",
          role: "user",
        },
      ],
      {
        ...modelProps$.get(),
        n_predict: 64,
        stream: false,
        temperature: 0.2,
      },
      { forceBackend: backend, task: "simple" },
    );

    if (result.isErr()) {
      setStatus({
        loading: false,
        message: result.error.message,
        success: false,
      });
      return;
    }

    const output = result.value.response.content.trim();
    const normalizedOutput = output
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    const failedResponsePhrases = [
      "sorry, i couldn't generate a response.",
      "sorry, i could not generate a response.",
    ];
    const emptyResponseDiagnosticPrefix = "no response text was returned by";
    const hasValidOutput =
      normalizedOutput.length > 0 &&
      !failedResponsePhrases.includes(normalizedOutput) &&
      !normalizedOutput.startsWith(emptyResponseDiagnosticPrefix);

    if (!hasValidOutput) {
      setStatus({
        loading: false,
        message:
          backend === "browser"
            ? "In-browser backend did not return a usable response."
            : backend === "server"
              ? "Server backend did not return a usable response."
              : "OpenRouter backend did not return a usable response.",
        output: output || "No output received.",
        success: false,
      });
      return;
    }

    setStatus({
      loading: false,
      message:
        backend === "browser"
          ? "In-browser backend responded successfully."
          : backend === "server"
            ? "Server backend responded successfully."
            : "OpenRouter backend responded successfully.",
      output: output.slice(0, 180),
      success: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] max-h-[85vh] overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100 sm:max-w-[980px]">
        <DialogHeader className="border-b border-zinc-800 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="grid h-[calc(85vh-73px)] grid-cols-[240px_1fr]">
          <aside className="border-r border-zinc-800 bg-zinc-950/90 p-3">
            <div className="space-y-1">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "border-blue-600/50 bg-blue-500/10"
                        : "border-transparent hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      {section.title}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {section.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="overflow-y-auto p-6">
            <div className="mb-5">
              <h3 className="text-base font-semibold text-zinc-100">
                {sectionMeta?.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {sectionMeta?.description}
              </p>
            </div>

            {activeSection === "general" ? (
              <div className="space-y-3">
                <ToggleRow
                  checked={inlineCompletion}
                  onChange={setInlineCompletionEnabled}
                  title="Inline completion"
                  description="Show ghost-text suggestions while you type."
                />
                <ToggleRow
                  checked={entityAutoRunOnIdle}
                  onChange={setEntityAutoRunOnIdle}
                  title="Entity auto-run on idle"
                  description="Auto-run entity detection on edited paragraphs after typing pauses."
                />
                <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-100">
                      Entity full-pass interval (seconds)
                    </p>
                    <p className="text-xs text-zinc-500">
                      Run full-document entity detection periodically while
                      auto-run is enabled.
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={300}
                    value={entityFullPassIntervalSeconds}
                    onChange={(event) =>
                      setEntityFullPassIntervalSeconds(
                        Number(event.target.value),
                      )
                    }
                    className="h-8 w-24 border-zinc-700 bg-zinc-950 text-right text-zinc-200"
                  />
                </div>
                <ToggleRow
                  checked={entityAutoLinkStrictMatches}
                  onChange={setEntityAutoLinkStrictMatches}
                  title="Entity strict auto-link"
                  description="Convert strict entity matches to canonical document links."
                />
                <ToggleRow
                  checked={entityPreloadModel}
                  onChange={setEntityPreloadModel}
                  title="Preload entity model"
                  description="Warm up the browser entity model when the editor is idle."
                />

                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        Document editor width
                      </p>
                      <p className="text-xs text-zinc-500">
                        Adjust the max width of document content.
                      </p>
                    </div>
                    <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-300">
                      {documentWidth}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="1600"
                    step="50"
                    value={documentWidth}
                    onChange={(event) =>
                      setDocumentWidth(Number(event.target.value))
                    }
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-blue-500"
                  />
                </div>
              </div>
            ) : null}

            {activeSection === "backends" ? (
              <div className="space-y-6">
                <div className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      Active backend
                    </p>
                    <p className="text-xs text-zinc-500">
                      Choose which backend handles primary chat and generation
                      requests.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {(
                      [
                        {
                          id: "browser",
                          title: "In-browser",
                          description:
                            "Runs locally in your browser with no external API key.",
                        },
                        {
                          id: "server",
                          title: "Local Server API",
                          description:
                            "Uses your configured server URL and model endpoint.",
                        },
                        {
                          id: "openrouter",
                          title: "OpenRouter",
                          description:
                            "Routes requests through OpenRouter using an API key.",
                        },
                      ] as const
                    ).map((option) => {
                      const isActive = llmBackend === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleBackendChange(option.id)}
                          className={`rounded-md border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? "border-blue-600/60 bg-blue-500/10"
                              : "border-zinc-700 bg-zinc-900 hover:bg-zinc-850"
                          }`}
                        >
                          <p className="text-sm font-medium text-zinc-100">
                            {option.title}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/70 p-3 text-xs text-zinc-400">
                    <p>
                      Routing status:{" "}
                      <span className="font-medium text-zinc-200">
                        {apiBackendEnabled
                          ? llmBackend === "openrouter"
                            ? "OpenRouter active"
                            : llmBackend === "server"
                              ? "Server API active"
                              : "In-browser active"
                          : "In-browser active (API disabled)"}
                      </span>
                    </p>
                  </div>
                </div>

                <section className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        In-browser backend
                      </p>
                      <p className="text-xs text-zinc-500">
                        Local generation that runs entirely in-browser.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={llmBackend === "browser" ? "default" : "outline"}
                      onClick={() => handleBackendChange("browser")}
                      className={
                        llmBackend === "browser"
                          ? "bg-blue-600 text-white hover:bg-blue-500"
                          : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                      }
                    >
                      {llmBackend === "browser" ? "Active" : "Set Active"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-zinc-400">
                        In-browser model picker
                      </Label>
                    </div>
                    <CompactModelCardPicker
                      options={BROWSER_MODEL_OPTIONS}
                      selectedId={browserModelId}
                      onSelect={setBrowserModelId}
                      isLoading={false}
                      emptyMessage="No in-browser models available."
                    />
                  </div>

                  <div className="rounded-md border border-zinc-700/80 bg-zinc-950/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          Backend test
                        </p>
                        <p className="text-xs text-zinc-500">
                          Runs a minimal completion through the browser model
                          pipeline.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void runBackendTest("browser")}
                        disabled={browserTestStatus.loading}
                        className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                      >
                        {browserTestStatus.loading ? "Running..." : "Run Test"}
                      </Button>
                    </div>
                    <TestResult status={browserTestStatus} />
                  </div>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        Local server backend
                      </p>
                      <p className="text-xs text-zinc-500">
                        Uses your configured server URL and selected server
                        model.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={llmBackend === "server" ? "default" : "outline"}
                      onClick={() => handleBackendChange("server")}
                      className={
                        llmBackend === "server"
                          ? "bg-blue-600 text-white hover:bg-blue-500"
                          : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                      }
                    >
                      {llmBackend === "server" ? "Active" : "Set Active"}
                    </Button>
                  </div>

                  <ToggleRow
                    checked={enableTokenProbabilities}
                    onChange={setEnableTokenProbabilities}
                    title="Token probabilities"
                    description="Request token probability metadata from server responses when available."
                  />

                  <div className="overflow-hidden rounded-md border border-zinc-700/80 bg-zinc-950/70 p-3">
                    <ServerInfoComponent mode="backends" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-zinc-400">
                        Local server model picker
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refetchLocalModels()}
                        disabled={!hasValidServerUrl || isLocalModelsFetching}
                        className="h-7 border-zinc-700 bg-zinc-900 text-[11px] hover:bg-zinc-800"
                      >
                        {isLocalModelsFetching ? "Loading..." : "Refresh"}
                      </Button>
                    </div>
                    <CompactModelCardPicker
                      options={localModelOptions}
                      selectedId={serverModelId || ""}
                      onSelect={setServerModelId}
                      isLoading={isLocalModelsLoading}
                      errorMessage={
                        !hasValidServerUrl
                          ? "Configure a valid server URL to load models."
                          : isLocalModelsError
                            ? localModelsError instanceof Error
                              ? localModelsError.message
                              : "Failed to load local models."
                            : undefined
                      }
                      emptyMessage="No models returned by /v1/models."
                    />
                  </div>

                  <div className="rounded-md border border-zinc-700/80 bg-zinc-950/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          Backend test
                        </p>
                        <p className="text-xs text-zinc-500">
                          Runs a minimal completion directly against the
                          configured local server backend.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void runBackendTest("server")}
                        disabled={apiTestStatus.loading}
                        className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                      >
                        {apiTestStatus.loading ? "Running..." : "Run Test"}
                      </Button>
                    </div>
                    <TestResult status={apiTestStatus} />
                  </div>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        OpenRouter backend
                      </p>
                      <p className="text-xs text-zinc-500">
                        Routes requests through OpenRouter with your API key and
                        chosen model.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={
                        llmBackend === "openrouter" ? "default" : "outline"
                      }
                      onClick={() => handleBackendChange("openrouter")}
                      className={
                        llmBackend === "openrouter"
                          ? "bg-blue-600 text-white hover:bg-blue-500"
                          : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                      }
                    >
                      {llmBackend === "openrouter" ? "Active" : "Set Active"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="openrouter-key"
                      className="text-xs text-zinc-400"
                    >
                      OpenRouter API key
                    </Label>
                    <Input
                      id="openrouter-key"
                      type="password"
                      value={openRouterApiKey || ""}
                      onChange={(event) =>
                        setOpenRouterApiKey(event.target.value)
                      }
                      placeholder="sk-or-v1-..."
                      className="h-8 border-zinc-700 bg-zinc-950 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-zinc-400">
                        OpenRouter model picker
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refetchOpenRouterModels()}
                        disabled={
                          trimmedOpenRouterKey.length === 0 ||
                          isOpenRouterModelsFetching
                        }
                        className="h-7 border-zinc-700 bg-zinc-900 text-[11px] hover:bg-zinc-800"
                      >
                        {isOpenRouterModelsFetching ? "Loading..." : "Refresh"}
                      </Button>
                    </div>
                    <CompactModelCardPicker
                      options={openRouterModelOptions}
                      selectedId={openRouterModelId}
                      onSelect={setOpenRouterModelId}
                      isLoading={isOpenRouterModelsLoading}
                      errorMessage={
                        trimmedOpenRouterKey.length === 0
                          ? "Set an OpenRouter API key to load available models."
                          : isOpenRouterModelsError
                            ? openRouterModelsError instanceof Error
                              ? openRouterModelsError.message
                              : "Failed to load OpenRouter models."
                            : undefined
                      }
                      emptyMessage="No OpenRouter models available for this key."
                    />
                  </div>

                  <div className="rounded-md border border-zinc-700/80 bg-zinc-950/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          Backend test
                        </p>
                        <p className="text-xs text-zinc-500">
                          Runs a minimal completion through OpenRouter with your
                          configured key.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void runBackendTest("openrouter")}
                        disabled={
                          openRouterTestStatus.loading || !openRouterApiKey
                        }
                        className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                      >
                        {openRouterTestStatus.loading
                          ? "Running..."
                          : "Run Test"}
                      </Button>
                    </div>
                    <TestResult status={openRouterTestStatus} />
                  </div>
                </section>
              </div>
            ) : null}

            {activeSection === "models" ? (
              <div className="space-y-6">
                <div className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      Reusable presets
                    </p>
                    <p className="text-xs text-zinc-500">
                      Apply and re-apply baseline sampler configurations.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                    {SAMPLER_PRESETS.map((preset) => {
                      const isActive = activeSamplerPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.id)}
                          className={`rounded-md border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? "border-blue-600/60 bg-blue-500/10"
                              : "border-zinc-700 bg-zinc-900 hover:bg-zinc-850"
                          }`}
                        >
                          <p className="text-sm font-medium text-zinc-100">
                            {preset.name}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveSamplerPreset(undefined)}
                    className="w-fit border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                  >
                    Clear active preset label
                  </Button>
                </div>

                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <ModelProperties />
                </div>

                <div className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <p className="text-sm font-medium text-zinc-100">Tokenizer</p>

                  <div className="space-y-2">
                    <Label
                      htmlFor="tokenizer-model"
                      className="text-xs text-zinc-400"
                    >
                      HuggingFace model ID
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="tokenizer-model"
                        value={tokenizerModelId}
                        onChange={(event) => {
                          setTokenizerModelId(event.target.value);
                          if (tokenizerTestStatus.message) {
                            setTokenizerTestStatus({ loading: false });
                          }
                        }}
                        placeholder="e.g. HuggingFaceTB/SmolLM3-3B"
                        className="h-8 border-zinc-700 bg-zinc-950 text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleTokenizerTest}
                        disabled={
                          tokenizerTestStatus.loading || !tokenizerModelId
                        }
                        className="h-8 border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                      >
                        {tokenizerTestStatus.loading ? "Testing..." : "Test"}
                      </Button>
                    </div>
                    <TestResult status={tokenizerTestStatus} />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="huggingface-token"
                      className="text-xs text-zinc-400"
                    >
                      HuggingFace token (optional)
                    </Label>
                    <Input
                      id="huggingface-token"
                      type="password"
                      value={huggingfaceToken || ""}
                      onChange={(event) =>
                        setHuggingfaceToken(event.target.value)
                      }
                      placeholder="hf_..."
                      className="h-8 border-zinc-700 bg-zinc-950 text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activeSection === "debug" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <ToggleRow
                    checked={debugMode}
                    onChange={setDebugMode}
                    title="Debug mode"
                    description="Enable verbose runtime logs for LLM and entity internals."
                  />
                </div>

                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4 text-xs text-zinc-400">
                  <p>
                    With debug mode enabled, verbose stream and entity
                    instrumentation are printed to the browser console.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
