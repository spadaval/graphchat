import { ResultAsync } from "neverthrow";
import { getProps } from "../client";
import { createNetworkError, toAppError } from "./errors";

export interface ServerInfo {
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

/** 
 * Fetches server information from the API
 */
export async function fetchServerInfo(): Promise<ServerInfo | null> {
  // Call getProps without throwOnError so we can handle errors gracefully
  const apiCallResult = await ResultAsync.fromPromise(getProps(), (error) =>
    toAppError(error),
  );

  if (apiCallResult.isErr()) {
    throw new Error(apiCallResult.error.message);
  }

  const response = apiCallResult.value;

  // Check if response has an error property with the correct structure
  if (response && typeof response === 'object' && 'error' in response && response.error) {
    const errorObj = response.error as { error?: { message?: string } } | null;
    const errorMessage = errorObj?.error?.message || "Unknown error";
    const apiError = createNetworkError(
      `Failed to fetch server info: ${errorMessage}`,
      "http://localhost:8080/props",
    );
    throw new Error(apiError.message);
  }

  // The generated client returns data directly when successful
  return response.data as ServerInfo;
}
