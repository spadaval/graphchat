import { useEffect } from "react";
import { useServerInfo } from "~/lib/state/hooks";
import { setError, setLoading, setServerInfo, setServerUrl, serverStore$ } from "~/lib/state/server";
import { fetchServerInfo } from "../lib/server";
import { SlotsComponent } from "./Slots";
import { Link2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { use$ } from "@legendapp/state/react";

export function ServerInfoComponent() {
  const { serverInfo, loading, error, serverUrl } = use$(serverStore$);

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

  useEffect(() => {
    loadServerInfo();
    const interval = setInterval(loadServerInfo, 10000); // 10s refresh instead of 5s
    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = () => {
    loadServerInfo();
  };

  return (
    <div className="space-y-6 p-4 overflow-y-auto h-full bg-zinc-900/30">
      {/* Server Configuration */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Link2 size={16} className="text-blue-400" />
          Server Configuration
        </h3>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
            Base URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="flex-1 px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button
              size="sm"
              onClick={handleTestConnection}
              disabled={loading}
              className="h-8 px-3"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : "Test"}
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-800/30 border border-zinc-700/50">
          {error ? (
            <XCircle size={14} className="text-red-500" />
          ) : serverInfo ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : (
            <RefreshCw size={14} className="text-zinc-500" />
          )}
          <span className={`text-[11px] font-medium ${error ? "text-red-400" : "text-zinc-400"}`}>
            {error ? "Connection Failed" : serverInfo ? "Connected" : "Not Connected"}
          </span>
        </div>

        {error && (
          <div className="text-[10px] text-red-500/80 bg-red-950/20 p-2 rounded border border-red-900/30">
            {error}
          </div>
        )}
      </div>

      <div className="h-px bg-zinc-800" />

      {serverInfo ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-100">Model Details</h3>
            <div className="bg-zinc-800/20 p-3 rounded-lg border border-zinc-700/30 space-y-3">
              <div>
                <div className="text-xs font-medium text-zinc-200">{serverInfo.model_name}</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-1 break-all">
                  {serverInfo.model_path}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Architecture</div>
                  <div className="text-xs text-zinc-300">{serverInfo.model_type}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Context</div>
                  <div className="text-xs text-zinc-300">
                    {serverInfo.context_size ? serverInfo.context_size.toLocaleString() : "N/A"}
                  </div>
                </div>
              </div>
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
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8 text-center text-zinc-500">
          <RefreshCw size={32} className="text-zinc-700 animate-pulse" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-400">No server connected</p>
            <p className="text-xs text-zinc-600">Enter a valid URL and click Test to begin</p>
          </div>
        </div>
      )}
    </div>
  );
}
