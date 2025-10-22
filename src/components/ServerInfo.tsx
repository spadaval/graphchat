import { useEffect } from "react";
import { useServerInfo } from "~/lib/state/hooks";
import { setError, setLoading, setServerInfo } from "~/lib/state/server";
import { fetchServerInfo } from "../lib/server";
import { SlotsComponent } from "./Slots";

export function ServerInfoComponent() {
  const { serverInfo, loading, error } = useServerInfo();

  useEffect(() => {
    const loadServerInfo = async () => {
      try {
        setLoading(true);
        const data = await fetchServerInfo();
        setServerInfo(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch server info",
        );
      } finally {
        setLoading(false);
      }
    };

    loadServerInfo();
    const interval = setInterval(loadServerInfo, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center text-zinc-500">
        Loading server info...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!serverInfo) {
    return (
      <div className="p-4 text-center text-zinc-500">
        No server information available
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-300">Model</h3>
        <div className="text-sm text-zinc-200">{serverInfo.model_name}</div>
        <div className="text-xs text-zinc-500 truncate">
          {serverInfo.model_path}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-300">Model Info</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-zinc-500">Type</div>
          <div className="text-right text-zinc-300">
            {serverInfo.model_type}
          </div>

          <div className="text-zinc-500">Size</div>
          <div className="text-right text-zinc-300">
            {serverInfo.model_size} (
            {serverInfo.model_params
              ? serverInfo.model_params.toLocaleString()
              : "N/A"}{" "}
            params)
          </div>

          <div className="text-zinc-500">Context</div>
          <div className="text-right text-zinc-300">
            {serverInfo.context_size
              ? serverInfo.context_size.toLocaleString()
              : "N/A"}{" "}
            tokens
          </div>

          <div className="text-zinc-500">GPU Layers</div>
          <div className="text-right text-zinc-300">
            {serverInfo.gpu_layers}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-300">System</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">CPU Usage</span>
            <span className="text-zinc-300">
              {serverInfo.cpu_usage ? serverInfo.cpu_usage.toFixed(1) : "N/A"}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">RAM Usage</span>
            <span className="text-zinc-300">
              {serverInfo.ram_usage ? serverInfo.ram_usage.toFixed(1) : "N/A"}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">VRAM Usage</span>
            <span className="text-zinc-300">
              {serverInfo.vram_usage ? serverInfo.vram_usage.toFixed(1) : "N/A"}
              %
            </span>
          </div>
        </div>
      </div>

      <SlotsComponent />

      <div className="pt-2 text-xs text-zinc-600 text-center">
        Last updated:{" "}
        {serverInfo.timestamp
          ? new Date(serverInfo.timestamp).toLocaleTimeString()
          : "N/A"}
      </div>
    </div>
  );
}
