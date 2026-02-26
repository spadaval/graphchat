import { use$ } from "@legendapp/state/react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, XCircle } from "lucide-react";
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
      className={`space-y-4 ${mode === "sidebar" ? "p-3 bg-white/[0.02]" : "p-0 bg-transparent"}`}
    >
      {showBaseUrl ? (
        <div className="space-y-1.5">
          <label
            htmlFor="server-url"
            className="text-[11px] font-semibold text-muted-foreground/50"
          >
            Endpoint URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="server-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="flex-1 rounded border border-border/60 bg-background/50 px-3 py-1.5 text-sm text-foreground/80 focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/30 transition-colors"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLoadModels}
              disabled={!hasValidServerUrl || isFetching}
              className="h-8.5 border border-border/60 text-xs font-semibold hover:bg-white/5"
            >
              {isFetching ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                "Sync"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {showStatus ? (
        <div className="flex items-center justify-between rounded border border-border/40 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                !hasValidServerUrl || isError
                  ? "bg-destructive/60"
                  : models && models.length > 0
                    ? "bg-primary/60 shadow-[0_0_8px_rgba(var(--primary),0.3)]"
                    : "bg-muted-foreground/30 animate-pulse"
              }`}
            />
            <span className="text-[11px] font-semibold text-muted-foreground/50">
              Connection
            </span>
          </div>
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${
              !hasValidServerUrl || isError
                ? "text-destructive/70"
                : "text-primary/70"
            }`}
          >
            {!hasValidServerUrl
              ? "Invalid"
              : isError
                ? "Failed"
                : models && models.length > 0
                  ? "Active"
                  : "Idle"}
          </span>
        </div>
      ) : null}

      {!hasValidServerUrl && mode !== "sidebar" ? (
        <div className="flex gap-2 rounded border border-destructive/10 bg-destructive/5 p-2.5 text-xs text-destructive/70 leading-relaxed">
          <XCircle size={14} className="shrink-0 mt-0.5" />
          <p>Protocol Mismatch: A valid HTTP/HTTPS endpoint is required.</p>
        </div>
      ) : null}

      {isError ? (
        <div className="flex gap-2 rounded border border-destructive/10 bg-destructive/5 p-2.5 text-xs text-destructive/70 leading-relaxed">
          <XCircle size={14} className="shrink-0 mt-0.5" />
          <p>{error instanceof Error ? error.message : "Handshake failure."}</p>
        </div>
      ) : null}

      {showModelDropdown ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
            <h3 className="text-[11px] font-semibold text-muted-foreground/50">
              Model Selection
            </h3>
            {!showBaseUrl ? (
              <button
                type="button"
                onClick={handleLoadModels}
                disabled={!hasValidServerUrl || isFetching}
                className="text-[11px] font-semibold text-primary/60 hover:text-primary disabled:opacity-30 transition-colors"
              >
                {isFetching ? "Syncing..." : "Sync List"}
              </button>
            ) : null}
          </div>

          <div className="relative group">
            <select
              value={selectedModelId}
              onChange={(event) => setServerModelId(event.target.value)}
              disabled={!models || models.length === 0}
              className="h-8.5 w-full appearance-none rounded border border-border/60 bg-background/50 px-3 text-xs font-medium text-foreground/80 focus:outline-none focus:border-primary/40 disabled:opacity-40 transition-all"
            >
              <option value="">Select a model...</option>
              {(models || []).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 group-hover:text-primary/40 transition-colors">
              ▼
            </div>
          </div>
        </div>
      ) : null}

      {showReadonlyList ? (
        <div className="space-y-3 rounded border border-border/40 bg-white/[0.01] p-3.5">
          <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-wider">
            Available Nodes
          </p>
          {!models || models.length === 0 ? (
            <p className="text-xs text-muted-foreground/30 font-medium italic">
              Registry empty.
            </p>
          ) : (
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 scrollbar-hide">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="group flex flex-col rounded border border-border/20 bg-background/20 px-2.5 py-2 transition-colors hover:border-primary/20 hover:bg-primary/5"
                >
                  <div className="text-xs font-medium text-foreground/60 group-hover:text-primary/80 transition-colors">
                    {model.id}
                  </div>
                  {formatModelMeta(model) ? (
                    <div className="mt-1 text-[10px] text-muted-foreground/40 font-medium transition-colors">
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
