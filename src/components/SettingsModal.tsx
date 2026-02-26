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
  DialogDescription,
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
      <div className="flex items-center gap-2 rounded-md border border-zinc-800/50 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-500">
        <RefreshCw size={12} className="animate-spin" />
        Searching registry...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-md border border-rose-900/30 bg-rose-950/20 px-3 py-2 text-[11px] text-rose-400/80">
        {errorMessage}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800/50 bg-zinc-900/30 px-3 py-2 text-[11px] text-zinc-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-hide">
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`group w-full rounded-md border px-3 py-2.5 text-left transition-all duration-200 ${
              isSelected
                ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]"
                : "border-zinc-800/50 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-800/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`truncate text-xs font-medium transition-colors ${isSelected ? "text-emerald-400" : "text-zinc-200 group-hover:text-zinc-100"}`}
                  >
                    {option.title || option.id}
                  </p>
                  {isSelected && (
                    <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                  {option.id}
                </p>
                {(option.description || option.meta) && (
                  <div className="mt-1.5 space-y-0.5">
                    {option.description && (
                      <p className="text-[10px] leading-relaxed text-zinc-500">
                        {option.description}
                      </p>
                    )}
                    {option.meta && (
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                        {option.meta}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {isSelected ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check size={10} strokeWidth={3} />
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full border border-zinc-800 group-hover:border-zinc-700" />
              )}
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
    description: "Backend engines and model selection",
    icon: Cable,
    id: "backends",
    title: "Backends",
  },
  {
    description: "Sampling controls and tokenizer tools",
    icon: SlidersHorizontal,
    id: "models",
    title: "Models",
  },
  {
    description: "Runtime logging and diagnostics",
    icon: Bug,
    id: "debug",
    title: "Debug",
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
    <div className="group flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-zinc-200 transition-colors group-hover:text-zinc-100">
          {title}
        </p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 ${
          checked ? "bg-emerald-500/60" : "bg-zinc-800"
        }`}
      >
        <span
          className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-zinc-100 shadow-lg ring-0 transition-transform duration-200 ${
            checked ? "translate-x-4.5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 space-y-1">
      <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-500/80">
        {title}
      </h2>
      <p className="text-[11px] text-zinc-500">{description}</p>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-zinc-800 via-zinc-800 to-transparent" />
    </div>
  );
}

function TestResult({ status }: { status: TestStatus }) {
  if (!status.message) return null;

  return (
    <div
      className={`mt-3 overflow-hidden rounded border px-3 py-2 text-[11px] transition-all animate-in fade-in slide-in-from-top-1 ${
        status.success
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400/90"
          : "border-rose-500/20 bg-rose-500/5 text-rose-400/90"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className={`h-1.5 w-1.5 rounded-full ${status.success ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
        />
        <p className="font-medium">{status.message}</p>
      </div>
      {status.output ? (
        <p className="font-mono leading-relaxed opacity-70 line-clamp-2 select-all">
          {status.output}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const {
    activeSamplerPreset,
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

  const trimmedOpenRouterKey = (openRouterApiKey || "").trim();
  const hasValidServerUrl = isValidHttpUrl(serverUrl.trim());

  const {
    data: localModels = [],
    isLoading: isLocalModelsLoading,
    isFetching: isLocalModelsFetching,
    isError: isLocalModelsError,
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
          ? `CTX: ${model.contextLength.toLocaleString()}`
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
            ? "Backend did not return a usable response."
            : backend === "server"
              ? "Backend did not return a usable response."
              : "Backend did not return a usable response.",
        output: output || "No output received.",
        success: false,
      });
      return;
    }

    setStatus({
      loading: false,
      message: "Backend responded successfully.",
      output: output.slice(0, 180),
      success: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80vh] max-h-[80vh] overflow-hidden border-zinc-800 bg-[#0a0a0a] p-0 text-zinc-300 sm:max-w-[900px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Terminal Configuration</DialogTitle>
          <DialogDescription>
            Adjust editor preferences, inference backends, and model sampling
            parameters.
          </DialogDescription>
        </DialogHeader>

        <div className="grid h-full min-h-0 grid-cols-[200px_1fr]">
          <aside className="flex min-h-0 flex-col border-r border-zinc-800 bg-[#0d0d0d] p-4">
            <div className="mb-8 px-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                <Settings size={12} className="text-emerald-500" />
                Terminal Config
              </div>
            </div>

            <nav className="flex-1 space-y-1">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-500/5 text-emerald-400"
                        : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    )}
                    <Icon
                      size={16}
                      className={
                        isActive
                          ? "text-emerald-500"
                          : "transition-colors group-hover:text-zinc-400"
                      }
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {section.title}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-zinc-800 pt-4 px-2">
              <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                SYSTEM READY
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-8 scrollbar-hide">
              {activeSection === "general" ? (
                <div className="space-y-8 max-w-2xl">
                  <SectionHeader
                    title="Interface Preferences"
                    description="Tailor the editor behavior and layout to your workflow."
                  />

                  <div className="divide-y divide-zinc-800/50">
                    <ToggleRow
                      checked={inlineCompletion}
                      onChange={setInlineCompletionEnabled}
                      title="Ghost-Text Predictions"
                      description="Display subtle, inline suggestions as you compose text."
                    />
                    <ToggleRow
                      checked={entityAutoRunOnIdle}
                      onChange={setEntityAutoRunOnIdle}
                      title="Passive Entity Scanning"
                      description="Analyze document context for entities during natural typing pauses."
                    />
                    <div className="group flex items-center justify-between gap-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
                          Scanning Interval
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Wait duration before a full document pass occurs.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
                          className="h-7 w-16 border-zinc-800 bg-zinc-900/50 text-right font-mono text-[11px] text-emerald-400 focus:border-emerald-500/50 focus:ring-0"
                        />
                        <span className="text-[10px] font-mono text-zinc-600 uppercase">
                          sec
                        </span>
                      </div>
                    </div>
                    <ToggleRow
                      checked={entityAutoLinkStrictMatches}
                      onChange={setEntityAutoLinkStrictMatches}
                      title="Strict Link Synthesis"
                      description="Automatically transform high-confidence entity matches into document links."
                    />
                    <ToggleRow
                      checked={entityPreloadModel}
                      onChange={setEntityPreloadModel}
                      title="Model Warm-up"
                      description="Keep the entity extraction model active in memory for instant responses."
                    />
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-zinc-200">
                          Viewport Constraint
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Maximum horizontal span of the primary editor surface.
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20">
                        {documentWidth}PX
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
                      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-emerald-500 transition-all hover:accent-emerald-400"
                    />
                  </div>
                </div>
              ) : null}

              {activeSection === "backends" ? (
                <div className="space-y-10 max-w-3xl">
                  <SectionHeader
                    title="Inference Engines"
                    description="Configure the underlying models powering your creative session."
                  />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {(
                      [
                        {
                          id: "browser",
                          title: "Local/Edge",
                          description:
                            "Zero-latency. Runs entirely in your browser memory.",
                        },
                        {
                          id: "server",
                          title: "Remote Host",
                          description:
                            "Professional grade. Connects to your dedicated server.",
                        },
                        {
                          id: "openrouter",
                          title: "OpenRouter",
                          description:
                            "Global mesh. Access 100+ state-of-the-art models.",
                        },
                      ] as const
                    ).map((option) => {
                      const isActive = llmBackend === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleBackendChange(option.id)}
                          className={`group relative overflow-hidden rounded-lg border p-4 text-left transition-all duration-300 ${
                            isActive
                              ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_-10px_rgba(16,185,129,0.2)]"
                              : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/40"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute top-0 right-0 p-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            </div>
                          )}
                          <p
                            className={`text-xs font-bold uppercase tracking-widest ${isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-200"}`}
                          >
                            {option.title}
                          </p>
                          <p className="mt-2 text-[10px] leading-relaxed text-zinc-500 group-hover:text-zinc-400">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-8">
                    {/* Browser Backend Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Edge Registry
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void runBackendTest("browser")}
                          disabled={browserTestStatus.loading}
                          className="h-6 gap-1.5 px-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-emerald-400"
                        >
                          <RefreshCw
                            size={10}
                            className={
                              browserTestStatus.loading ? "animate-spin" : ""
                            }
                          />
                          {browserTestStatus.loading
                            ? "Testing..."
                            : "Diagnostic Test"}
                        </Button>
                      </div>

                      <CompactModelCardPicker
                        options={BROWSER_MODEL_OPTIONS}
                        selectedId={browserModelId}
                        onSelect={setBrowserModelId}
                        isLoading={false}
                        emptyMessage="No edge models discovered."
                      />
                      <TestResult status={browserTestStatus} />
                    </div>

                    {/* Server Backend Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Host Endpoint
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void refetchLocalModels()}
                            disabled={
                              !hasValidServerUrl || isLocalModelsFetching
                            }
                            className="h-6 gap-1.5 px-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-emerald-400"
                          >
                            <RefreshCw
                              size={10}
                              className={
                                isLocalModelsFetching ? "animate-spin" : ""
                              }
                            />
                            Re-scan
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void runBackendTest("server")}
                            disabled={apiTestStatus.loading}
                            className="h-6 gap-1.5 px-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-emerald-400"
                          >
                            Test Connection
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-lg bg-zinc-900/40 p-1 border border-zinc-800/50">
                          <ServerInfoComponent mode="backends" />
                        </div>
                        <CompactModelCardPicker
                          options={localModelOptions}
                          selectedId={serverModelId || ""}
                          onSelect={setServerModelId}
                          isLoading={isLocalModelsLoading}
                          errorMessage={
                            !hasValidServerUrl
                              ? "Valid host address required."
                              : isLocalModelsError
                                ? "Host connection failed."
                                : undefined
                          }
                          emptyMessage="No available models on host."
                        />
                        <div className="px-1">
                          <ToggleRow
                            checked={enableTokenProbabilities}
                            onChange={setEnableTokenProbabilities}
                            title="Probability Metadata"
                            description="Stream confidence scores for each generated token."
                          />
                        </div>
                      </div>
                      <TestResult status={apiTestStatus} />
                    </div>

                    {/* OpenRouter Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Cloud Mesh (OpenRouter)
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void refetchOpenRouterModels()}
                            disabled={
                              trimmedOpenRouterKey.length === 0 ||
                              isOpenRouterModelsFetching
                            }
                            className="h-6 gap-1.5 px-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-emerald-400"
                          >
                            <RefreshCw
                              size={10}
                              className={
                                isOpenRouterModelsFetching ? "animate-spin" : ""
                              }
                            />
                            Sync Registry
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void runBackendTest("openrouter")}
                            disabled={
                              openRouterTestStatus.loading || !openRouterApiKey
                            }
                            className="h-6 gap-1.5 px-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-emerald-400"
                          >
                            Auth Test
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5 px-1">
                          <Label
                            htmlFor="openrouter-key"
                            className="font-mono text-[10px] uppercase tracking-wider text-zinc-600"
                          >
                            Access Token
                          </Label>
                          <Input
                            id="openrouter-key"
                            type="password"
                            value={openRouterApiKey || ""}
                            onChange={(event) =>
                              setOpenRouterApiKey(event.target.value)
                            }
                            placeholder="sk-or-v1-..."
                            className="h-8 border-zinc-800 bg-zinc-900/50 px-3 font-mono text-[11px] text-emerald-400 focus:border-emerald-500/50 focus:ring-0 placeholder:text-zinc-800"
                          />
                        </div>
                        <CompactModelCardPicker
                          options={openRouterModelOptions}
                          selectedId={openRouterModelId}
                          onSelect={setOpenRouterModelId}
                          isLoading={isOpenRouterModelsLoading}
                          errorMessage={
                            trimmedOpenRouterKey.length === 0
                              ? "API token required for cloud mesh."
                              : isOpenRouterModelsError
                                ? "Mesh synchronization failed."
                                : undefined
                          }
                          emptyMessage="No remote models discovered."
                        />
                      </div>
                      <TestResult status={openRouterTestStatus} />
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSection === "models" ? (
                <div className="space-y-10 max-w-2xl">
                  <SectionHeader
                    title="Sampling & Tokenization"
                    description="Fine-tune the mathematical behavior of the generative process."
                  />

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800/50 pb-2">
                        Behavioral Profiles
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {SAMPLER_PRESETS.map((preset) => {
                          const isActive = activeSamplerPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleApplyPreset(preset.id)}
                              className={`group relative overflow-hidden rounded-lg border px-3 py-3 text-left transition-all duration-300 ${
                                isActive
                                  ? "border-emerald-500/40 bg-emerald-500/5"
                                  : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/40"
                              }`}
                            >
                              <p
                                className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-200"}`}
                              >
                                {preset.name}
                              </p>
                              <p className="mt-1 text-[10px] leading-snug text-zinc-600 group-hover:text-zinc-500">
                                {preset.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      {activeSamplerPreset && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setActiveSamplerPreset(undefined)}
                          className="h-6 px-2 text-[9px] uppercase tracking-widest text-zinc-600 hover:text-rose-400 transition-colors"
                        >
                          Reset to custom profile
                        </Button>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/10 p-6 backdrop-blur-sm">
                      <ModelProperties />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800/50 pb-2">
                        Lexicon Mapping
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="tokenizer-model"
                            className="font-mono text-[10px] uppercase tracking-wider text-zinc-600"
                          >
                            Vocabulary ID
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
                              placeholder="HuggingFace repository path..."
                              className="h-8 flex-1 border-zinc-800 bg-zinc-900/50 px-3 font-mono text-[11px] text-emerald-400 focus:border-emerald-500/50 focus:ring-0 placeholder:text-zinc-800"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={handleTokenizerTest}
                              disabled={
                                tokenizerTestStatus.loading || !tokenizerModelId
                              }
                              className="h-8 border border-zinc-800 px-3 text-[10px] uppercase tracking-wider hover:bg-zinc-800"
                            >
                              Test
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="huggingface-token"
                            className="font-mono text-[10px] uppercase tracking-wider text-zinc-600"
                          >
                            HF Token (Optional)
                          </Label>
                          <Input
                            id="huggingface-token"
                            type="password"
                            value={huggingfaceToken || ""}
                            onChange={(event) =>
                              setHuggingfaceToken(event.target.value)
                            }
                            placeholder="hf_..."
                            className="h-8 border-zinc-800 bg-zinc-900/50 px-3 font-mono text-[11px] text-emerald-400 focus:border-emerald-500/50 focus:ring-0 placeholder:text-zinc-800"
                          />
                        </div>
                      </div>
                      <TestResult status={tokenizerTestStatus} />
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSection === "debug" ? (
                <div className="space-y-8 max-w-2xl">
                  <SectionHeader
                    title="Diagnostic Tools"
                    description="Monitor internal engine states and verbose execution logs."
                  />

                  <div className="divide-y divide-zinc-800/50">
                    <ToggleRow
                      checked={debugMode}
                      onChange={setDebugMode}
                      title="Verbose Stream Analysis"
                      description="Expose detailed runtime logs for LLM operations and entity resolution in the system console."
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-800/50 bg-emerald-500/5 p-4">
                    <div className="flex gap-3">
                      <Bug size={14} className="mt-0.5 text-emerald-500" />
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-emerald-400/80 uppercase tracking-wider">
                          System Advisory
                        </p>
                        <p className="text-[11px] leading-relaxed text-zinc-500">
                          Enabling verbose logging may impact performance during
                          high-frequency text generation. Logs are routed
                          directly to the browser's developer environment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
