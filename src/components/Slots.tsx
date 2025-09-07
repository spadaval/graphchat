import { useQuery } from "@tanstack/react-query";
import { getSlots } from "../client";
import type { Slot } from "../client/types.gen";

export function SlotsComponent() {
  const { data: slots, isLoading, error } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const response = await getSlots();
      if (response.error) {
        // Use type assertion to access the message property
        const errorMessage = (response.error as any).error?.message || "Failed to fetch slots";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading slots information...
      </div>
    );
  }

  if (error) {
    // Bypass TypeScript error by using any
    const errorAny: any = error;
    let errorMessage = 'Failed to fetch slots';
    
    if (errorAny instanceof Error) {
      errorMessage = errorAny.message;
    } else if (typeof errorAny === 'string') {
      errorMessage = errorAny;
    } else if (errorAny && typeof errorAny === 'object') {
      // Try to extract message from the _Error type
      if (errorAny.error && typeof errorAny.error === 'object' && errorAny.error !== null) {
        if (typeof errorAny.error.message === 'string') {
          errorMessage = errorAny.error.message;
        } else {
          errorMessage = JSON.stringify(errorAny.error);
        }
      } else {
        errorMessage = JSON.stringify(errorAny);
      }
    }
    return <div className="p-4 text-center text-red-500">Error: {errorMessage}</div>;
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No slots information available
      </div>
    );
  }

  // Calculate statistics
  const totalSlots = slots.length;
  const processingSlots = slots.filter(slot => slot.is_processing).length;
  const idleSlots = slots.filter(slot => !slot.is_processing && !slot.id_task).length;
  const pendingSlots = slots.filter(slot => !slot.is_processing && slot.id_task).length;

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium text-gray-200">Slots Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400">Total Slots</div>
          <div className="text-xl font-semibold text-gray-100">{totalSlots}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400">Processing</div>
          <div className="text-xl font-semibold text-green-400">{processingSlots}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400">Idle</div>
          <div className="text-xl font-semibold text-blue-400">{idleSlots}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400">Pending</div>
          <div className="text-xl font-semibold text-yellow-400">{pendingSlots}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Slot Details</h4>
        {slots.map((slot) => (
          <div 
            key={slot.id} 
            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-100">Slot {slot.id}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Task ID: {slot.id_task || "None"}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium flex items-center ${
                slot.is_processing 
                  ? "bg-green-900 text-green-300" 
                  : slot.id_task 
                    ? "bg-yellow-900 text-yellow-300" 
                    : "bg-blue-900 text-blue-300"
              }`}>
                {slot.is_processing && (
                  <span className="flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                )}
                {slot.is_processing ? "Processing" : slot.id_task ? "Pending" : "Idle"}
              </div>
            </div>
            
            {slot.is_processing && slot.next_token && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-gray-400">Remaining Tokens</div>
                  <div className="text-green-400 font-medium">{slot.next_token.n_remain}</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-gray-400">Decoded Tokens</div>
                  <div className="text-green-400 font-medium">{slot.next_token.n_decoded}</div>
                </div>
              </div>
            )}
            
            {slot.prompt && (
              <div className="mt-2">
                <div className="text-xs text-gray-400">Prompt Preview</div>
                <div className="text-xs text-gray-300 truncate mt-1">
                  {slot.prompt.substring(0, 60)}{slot.prompt.length > 60 ? "..." : ""}
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