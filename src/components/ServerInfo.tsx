import { useEffect, useState } from "react";
import { getProps } from "../client";
import { createNetworkError } from "../lib/errors";
import { logError, safePromise } from "../lib/neverthrow-utils";

interface ServerInfo {
  model_name: string;
  model_path: string;
  model_type: string;
  model_size: string;
  model_params: number;
  context_size: number;
  gpu_layers: number;
  slots_idle: number;
  slots_processing: number;
  slots_pending: number;
  slots_idle_percent: number;
  slots_processing_percent: number;
  slots_pending_percent: number;
  cpu_usage: number;
  ram_usage: number;
  vram_usage: number;
  system_info: string;
  timestamp: number;
}

export function ServerInfo() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServerInfo = async () => {
      const apiCallResult = await safePromise(
        getProps(),
        "Failed to fetch server info",
      );

      if (apiCallResult.isErr()) {
        logError(apiCallResult, "ServerInfo fetch");
        setError(apiCallResult.error.message);
        setLoading(false);
        return;
      }

      const response = apiCallResult.value;

      if (response.error) {
        const apiError = createNetworkError(
          `Failed to fetch server info: ${response.error.message}`,
          "http://localhost:8080/props",
        );
        setError(apiError.message);
        setLoading(false);
        return;
      }

      // The generated client returns data directly when successful
      setServerInfo(response.data);
      setError(null);
      setLoading(false);
    };

    fetchServerInfo();
    const interval = setInterval(fetchServerInfo, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading server info...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!serverInfo) {
    return (
      <div className="p-4 text-center text-gray-400">
        No server information available
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-200">Model</h3>
        <div className="text-sm text-gray-300">{serverInfo.model_name}</div>
        <div className="text-xs text-gray-400 truncate">
          {serverInfo.model_path}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-200">Model Info</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-400">Type</div>
          <div className="text-right text-gray-300">
            {serverInfo.model_type}
          </div>

          <div className="text-gray-400">Size</div>
          <div className="text-right text-gray-300">
            {serverInfo.model_size} (
            {serverInfo.model_params
              ? serverInfo.model_params.toLocaleString()
              : "N/A"}{" "}
            params)
          </div>

          <div className="text-gray-400">Context</div>
          <div className="text-right text-gray-300">
            {serverInfo.context_size
              ? serverInfo.context_size.toLocaleString()
              : "N/A"}{" "}
            tokens
          </div>

          <div className="text-gray-400">GPU Layers</div>
          <div className="text-right text-gray-300">
            {serverInfo.gpu_layers}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-200">System</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">CPU Usage</span>
            <span className="text-gray-300">
              {serverInfo.cpu_usage ? serverInfo.cpu_usage.toFixed(1) : "N/A"}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">RAM Usage</span>
            <span className="text-gray-300">
              {serverInfo.ram_usage ? serverInfo.ram_usage.toFixed(1) : "N/A"}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">VRAM Usage</span>
            <span className="text-gray-300">
              {serverInfo.vram_usage ? serverInfo.vram_usage.toFixed(1) : "N/A"}
              %
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-200">Slots</h3>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Idle</span>
              <span className="text-gray-300">{serverInfo.slots_idle}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${serverInfo.slots_idle_percent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Processing</span>
              <span className="text-gray-300">
                {serverInfo.slots_processing}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${serverInfo.slots_processing_percent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Pending</span>
              <span className="text-gray-300">{serverInfo.slots_pending}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${serverInfo.slots_pending_percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 text-xs text-gray-500 text-center">
        Last updated:{" "}
        {serverInfo.timestamp
          ? new Date(serverInfo.timestamp).toLocaleTimeString()
          : "N/A"}
      </div>
    </div>
  );
}
