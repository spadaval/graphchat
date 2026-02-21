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

export function ServerInfoComponent() {
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

  const handleTestConnection = () => {
    refetch();
  };

  return (
    <div className="space-y-6 p-4 overflow-y-auto h-full bg-zinc-900/30">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Link2 size={16} className="text-blue-400" />
          Server Configuration
        </h3>

        <div className="space-y-2">
          <label
            htmlFor="server-url"
            className="text-[10px] uppercase tracking-wider font-bold text-zinc-500"
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
              className="flex-1 px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button
              size="sm"
              onClick={handleTestConnection}
              disabled={!hasValidServerUrl || isFetching}
              className="h-8 px-3"
            >
              {isFetching ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                "Test"
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-800/30 border border-zinc-700/50">
          {!hasValidServerUrl || isError ? (
            <XCircle size={14} className="text-red-500" />
          ) : models && models.length > 0 ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : (
            <RefreshCw size={14} className="text-zinc-500" />
          )}
          <span
            className={`text-[11px] font-medium ${!hasValidServerUrl || isError ? "text-red-400" : "text-zinc-400"}`}
          >
            {!hasValidServerUrl
              ? "Invalid URL"
              : isError
                ? "Connection Failed"
                : models && models.length > 0
                  ? "Connected"
                  : "Not Connected"}
          </span>
        </div>

        {!hasValidServerUrl ? (
          <div className="text-[10px] text-red-500/80 bg-red-950/20 p-2 rounded border border-red-900/30">
            Enter a valid http(s) URL.
          </div>
        ) : null}

        {isError ? (
          <div className="text-[10px] text-red-500/80 bg-red-950/20 p-2 rounded border border-red-900/30">
            {error instanceof Error
              ? error.message
              : "Failed to connect to server"}
          </div>
        ) : null}
      </div>

      <div className="h-px bg-zinc-800" />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100">Model Picker</h3>

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <RefreshCw size={14} className="animate-spin" />
            Loading models from /v1/models...
          </div>
        ) : null}

        {!isLoading && hasValidServerUrl && models && models.length === 0 ? (
          <div className="text-xs text-zinc-500">
            No models returned by /v1/models.
          </div>
        ) : null}

        {!hasValidServerUrl ? (
          <div className="text-xs text-zinc-500">
            Configure a valid server URL to load available models.
          </div>
        ) : null}

        {models && models.length > 0 ? (
          <div className="space-y-2">
            {models.map((model) => {
              const isSelected = selectedModelId === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setServerModelId(model.id)}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="text-xs font-medium text-zinc-100 break-all">
                    {model.id}
                  </div>
                  {formatModelMeta(model) ? (
                    <div className="mt-1 text-[10px] text-zinc-500">
                      {formatModelMeta(model)}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
