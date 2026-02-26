import { use$ } from "@legendapp/state/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Link2, RefreshCw, XCircle } from "lucide-react";
import { useEffect } from "react";
import { serverStore$, setServerUrl } from "~/lib/state/server";
import { setServerModelId, uiPreferences$ } from "~/lib/state/ui";
import { getV1Models } from "../llamacpp-client";
import { Button } from "./ui/button";

type ServerModel = {
  id: string;
  created?: number;
  object?: string;
  owned_by?: string;
};

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatModelMeta(model: ServerModel): string {
  const parts: string[] = [];
  if (model.owned_by) {
    parts.push(model.owned_by);
  }
  if (model.created) {
    parts.push(new Date(model.created * 1000).toLocaleDateString());
  }
  return parts.join(" • ");
}

type ServerInfoMode = "sidebar" | "backends" | "models" | "serverConfig";

interface ServerInfoComponentProps {
  mode?: ServerInfoMode;
}

export function ServerInfoComponent({
  mode = "backends",
}: ServerInfoComponentProps) {
  const { serverUrl } = use$(serverStore$);
  const { serverModelId } = use$(uiPreferences$);
  const hasValidServerUrl = isValidHttpUrl(serverUrl.trim());

  const {
    data: models,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["v1-models", serverUrl],
    enabled: hasValidServerUrl,
    queryFn: async () => {
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
        .filter((model): model is ServerModel => Boolean(model?.id))
        .map((model) => ({
          id: model.id as string,
          created: model.created,
          object: model.object,
          owned_by: model.owned_by,
        }));
    },
    refetchInterval: 30000,
  });

  const selectedModelId = serverModelId ?? "";

  useEffect(() => {
    if (
      hasValidServerUrl &&
      models &&
      models.length > 0 &&
      !models.some((model) => model.id === selectedModelId)
    ) {
      setServerModelId(models[0].id);
    }
  }, [hasValidServerUrl, models, selectedModelId]);

  const handleLoadModels = () => {
    refetch();
  };

  const showBaseUrl = mode === "backends" || mode === "serverConfig";
  const showStatus =
    mode === "sidebar" || mode === "backends" || mode === "serverConfig";
  const showModelDropdown =
    mode === "sidebar" || mode === "models" || mode === "serverConfig";
  const showReadonlyList = mode === "models";

  return (
    <div
      className={`space-y-4 overflow-y-auto ${mode === "sidebar" ? "h-auto bg-transparent p-3" : "h-auto bg-transparent p-0"}`}
    >
      {showBaseUrl ? (
        <div className="space-y-2">
          <label
            htmlFor="server-url"
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Base URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="server-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-700"
            />
            <Button
              size="sm"
              onClick={handleLoadModels}
              disabled={!hasValidServerUrl || isFetching}
              className="h-8 px-3"
            >
              {isFetching ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                "Load Models"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {showStatus ? (
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-900/45 p-2">
          {!hasValidServerUrl || isError ? (
            <XCircle size={14} className="text-rose-500" />
          ) : models && models.length > 0 ? (
            <CheckCircle2 size={14} className="text-emerald-400" />
          ) : (
            <RefreshCw size={14} className="text-slate-500" />
          )}
          <span
            className={`text-[11px] font-medium ${!hasValidServerUrl || isError ? "text-rose-300" : "text-slate-400"}`}
          >
            {!hasValidServerUrl
              ? "Invalid URL"
              : isError
                ? "Connection Failed"
                : models && models.length > 0
                  ? "Models Loaded"
                  : "No Models Loaded"}
          </span>
        </div>
      ) : null}

      {!hasValidServerUrl && mode !== "sidebar" ? (
        <div className="rounded border border-rose-900/30 bg-rose-950/20 p-2 text-[10px] text-rose-300/85">
          Enter a valid http(s) URL.
        </div>
      ) : null}

      {isError ? (
        <div className="rounded border border-rose-900/30 bg-rose-950/20 p-2 text-[10px] text-rose-300/85">
          {error instanceof Error
            ? error.message
            : "Failed to connect to server"}
        </div>
      ) : null}

      {showModelDropdown ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Link2 size={16} className="text-teal-300" />
              Model Picker
            </h3>
            {!showBaseUrl ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleLoadModels}
                disabled={!hasValidServerUrl || isFetching}
                className="h-7 border-slate-700 bg-slate-900 text-[11px] hover:bg-slate-800"
              >
                {isFetching ? "Loading..." : "Load Models"}
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={14} className="animate-spin" />
              Loading models from /v1/models...
            </div>
          ) : null}

          {!isLoading && hasValidServerUrl && models && models.length === 0 ? (
            <div className="text-xs text-slate-500">
              No models returned by /v1/models.
            </div>
          ) : null}

          {!hasValidServerUrl ? (
            <div className="text-xs text-slate-500">
              {mode === "sidebar"
                ? "Configure a valid server URL in Full Settings to load models."
                : "Configure a valid server URL to load available models."}
            </div>
          ) : null}

          <select
            value={selectedModelId}
            onChange={(event) => setServerModelId(event.target.value)}
            disabled={!models || models.length === 0}
            className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 disabled:opacity-50"
          >
            <option value="">Select a model</option>
            {(models || []).map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showReadonlyList ? (
        <div className="space-y-2 rounded-md border border-white/10 bg-slate-900/50 p-3">
          <p className="text-xs font-medium text-slate-300">Fetched Models</p>
          {!models || models.length === 0 ? (
            <p className="text-xs text-slate-500">No fetched models.</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="rounded border border-slate-700 px-2 py-1.5"
                >
                  <div className="text-xs break-all text-slate-100">
                    {model.id}
                  </div>
                  {formatModelMeta(model) ? (
                    <div className="text-[10px] text-slate-500">
                      {formatModelMeta(model)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
