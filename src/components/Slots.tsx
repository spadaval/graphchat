import { useQuery } from "@tanstack/react-query";
import { getSlots } from "../llamacpp-client";
import type { _Error } from "../llamacpp-client/types.gen";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const maybeError = error as _Error;
    if (
      maybeError.error &&
      typeof maybeError.error === "object" &&
      maybeError.error !== null
    ) {
      if (typeof maybeError.error.message === "string") {
        return maybeError.error.message;
      }
      return JSON.stringify(maybeError.error);
    }
    return JSON.stringify(error);
  }
  return "An unknown error occurred";
}

export function SlotsComponent() {
  const {
    data: slots,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const response = await getSlots();
      if (response.error) {
        const errorMessage =
          response.error.error?.message || "Failed to fetch slots";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-zinc-500">
        Loading slots information...
      </div>
    );
  }

  if (error) {
    const errorMessage = extractErrorMessage(error);
    return (
      <div className="p-4 text-center text-red-500">Error: {errorMessage}</div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500">
        No slots information available
      </div>
    );
  }

  // Calculate statistics
  const totalSlots = slots.length;
  const processingSlots = slots.filter((slot) => slot.is_processing).length;
  const idleSlots = slots.filter(
    (slot) => !slot.is_processing && !slot.id_task,
  ).length;
  const pendingSlots = slots.filter(
    (slot) => !slot.is_processing && slot.id_task,
  ).length;

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium text-zinc-300">Slots Information</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-850 rounded-lg p-3 border border-zinc-700">
          <div className="text-xs text-zinc-500">Total Slots</div>
          <div className="text-lg font-semibold text-zinc-200">
            {totalSlots}
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-800 to-zinc-850 rounded-lg p-3 border border-zinc-700">
          <div className="text-xs text-zinc-500">Processing</div>
          <div className="text-lg font-semibold text-green-400">
            {processingSlots}
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-800 to-zinc-850 rounded-lg p-3 border border-zinc-700">
          <div className="text-xs text-zinc-500">Idle</div>
          <div className="text-lg font-semibold text-blue-400">{idleSlots}</div>
        </div>

        <div className="bg-gradient-to-br from-zinc-800 to-zinc-850 rounded-lg p-3 border border-zinc-700">
          <div className="text-xs text-zinc-500">Pending</div>
          <div className="text-lg font-semibold text-yellow-400">
            {pendingSlots}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-zinc-300">Slot Details</h4>
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="bg-gradient-to-br from-zinc-800 to-zinc-850 rounded-lg p-3 border border-zinc-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-zinc-200">Slot {slot.id}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Task ID: {slot.id_task || "None"}
                </div>
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-medium flex items-center ${
                  slot.is_processing
                    ? "bg-green-900/30 text-green-400"
                    : slot.id_task
                      ? "bg-yellow-900/30 text-yellow-400"
                      : "bg-blue-900/30 text-blue-400"
                }`}
              >
                {slot.is_processing && (
                  <span className="flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                )}
                {slot.is_processing
                  ? "Processing"
                  : slot.id_task
                    ? "Pending"
                    : "Idle"}
              </div>
            </div>

            {slot.is_processing && slot.next_token && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-700/50 rounded p-2">
                  <div className="text-zinc-500">Remaining Tokens</div>
                  <div className="text-green-400 font-medium">
                    {slot.next_token.n_remain}
                  </div>
                </div>
                <div className="bg-zinc-700/50 rounded p-2">
                  <div className="text-zinc-500">Decoded Tokens</div>
                  <div className="text-green-400 font-medium">
                    {slot.next_token.n_decoded}
                  </div>
                </div>
              </div>
            )}

            {slot.prompt && (
              <div className="mt-2">
                <div className="text-xs text-zinc-500">Prompt Preview</div>
                <div className="text-xs text-zinc-300 truncate mt-1">
                  {slot.prompt.substring(0, 60)}
                  {slot.prompt.length > 60 ? "..." : ""}
                </div>
              </div>
            )}

            {!slot.is_processing && slot.id_task && (
              <div className="mt-2 text-xs text-yellow-400">
                Waiting to be processed
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
