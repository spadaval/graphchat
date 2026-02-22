import { use$ } from "@legendapp/state/react";
import {
  Bug,
  Cable,
  Layout,
  type LucideIcon,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  setActiveSamplerPreset,
  setAPIBackendEnabled,
  setDebugMode,
  setDocumentWidth,
  setEnableTokenProbabilities,
  setHuggingfaceToken,
  setInlineCompletionEnabled,
  setTokenizerModelId,
  uiPreferences$,
} from "~/lib/state/ui";
import { testTokenizerMetadata } from "~/lib/tokenizer";

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
    description: "Sampling controls and tokenizer",
    icon: SlidersHorizontal,
    id: "models",
    title: "Models",
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
    debugMode,
    documentWidth = 800,
    enableTokenProbabilities,
    huggingfaceToken,
    inlineCompletion,
    tokenizerModelId,
  } = use$(uiPreferences$);
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

  const sectionMeta = useMemo(
    () => SETTINGS_SECTIONS.find((section) => section.id === activeSection),
    [activeSection],
  );

  const handleApplyPreset = (presetId: SamplerPresetId) => {
    const applied = applySamplerPreset(presetId);
    if (!applied) return;
    setActiveSamplerPreset(presetId);
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

  const runBackendTest = async (backend: "browser" | "server") => {
    const setStatus =
      backend === "browser" ? setBrowserTestStatus : setApiTestStatus;
    const currentStatus =
      backend === "browser" ? browserTestStatus : apiTestStatus;

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
    setStatus({
      loading: false,
      message: `${backend === "browser" ? "In-browser" : "API"} backend responded successfully.`,
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
              <div className="space-y-3">
                <ToggleRow
                  checked={apiBackendEnabled}
                  onChange={setAPIBackendEnabled}
                  title="Enable API backend"
                  description="When disabled, all requests use the in-browser model pipeline."
                />

                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4 text-xs text-zinc-400">
                  <p>
                    In-browser inference is always available. With API backend
                    enabled, chat/document generation will use your configured
                    server while lightweight tasks keep using browser inference.
                  </p>
                </div>

                <ToggleRow
                  checked={enableTokenProbabilities}
                  onChange={setEnableTokenProbabilities}
                  title="Token probabilities"
                  description="Request token probability metadata from API responses when available."
                />

                <div className="overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <ServerInfoComponent mode="backends" />
                </div>

                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        Test in-browser backend
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

                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        Test API backend
                      </p>
                      <p className="text-xs text-zinc-500">
                        Runs a minimal completion directly against the
                        configured API backend.
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
              </div>
            ) : null}

            {activeSection === "models" ? (
              <div className="space-y-6">
                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
                  <ServerInfoComponent mode="models" />
                </div>

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
                    description="Enable verbose runtime logs for LLM and NER internals."
                  />
                </div>

                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4 text-xs text-zinc-400">
                  <p>
                    With debug mode enabled, verbose stream and NER
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
