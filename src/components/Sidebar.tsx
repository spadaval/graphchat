import { useState } from "react";
import { useThreadsArray, useCurrentThreadId } from "~/lib/state/hooks";
import type { ChatThread } from "~/lib/state";

// Sidebar Header Component
export function SidebarHeader() {
  return (
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-lg font-semibold text-gray-100">Chat Threads</h2>
    </div>
  );
}

// Sidebar Content Component
interface SidebarContentProps {
  createNewThread: () => void;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  deleteAllThreads: () => void;
}

export function SidebarContent({
  createNewThread,
  switchThread,
  deleteThread,
  deleteAllThreads,
}: SidebarContentProps) {
  const threads = useThreadsArray();
  const currentThreadId = useCurrentThreadId();
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<Record<string, boolean>>({});
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState(false);
  
  const handleDeleteClick = (threadId: string) => {
    setDeleteConfirmation(prev => ({
      ...prev,
      [threadId]: !prev[threadId]
    }));
  };
  
  const handleDeleteConfirm = (threadId: string) => {
    deleteThread(threadId);
    setDeleteConfirmation(prev => {
      const newState = { ...prev };
      delete newState[threadId];
      return newState;
    });
  };
  
  const handleFocusLoss = (threadId: string) => {
    // Reset delete confirmation when focus is lost
    setDeleteConfirmation(prev => {
      const newState = { ...prev };
      delete newState[threadId];
      return newState;
    });
  };

  const handleDeleteAllClick = () => {
    setDeleteAllConfirmation(true);
  };

  const handleDeleteAllConfirm = () => {
    deleteAllThreads();
    setDeleteAllConfirmation(false);
  };

  const handleDeleteAllFocusLoss = () => {
    setDeleteAllConfirmation(false);
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="p-2">
        <button
          type="button"
          onClick={() => createNewThread()}
          className="w-full p-3 mb-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          + New Chat
        </button>
      </div>

      {threads.length === 0 ? (
        <div className="p-4 text-gray-400 text-center">
          Start a new chat to begin
        </div>
      ) : (
        <div className="px-2 flex-1">
          {threads.map((thread) => (
            <div 
              key={thread.id} 
              className="flex items-center mb-1 w-full"
              onBlur={() => handleFocusLoss(thread.id)}
              tabIndex={-1}
            >
              <button
                type="button"
                onClick={() => switchThread(thread.id)}
                className={`flex-1 p-3 text-left rounded-l-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 min-w-0 ${
                  thread.id === currentThreadId
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                }`}
              >
                <div className="truncate text-sm pr-2">{thread.title}</div>
                <div className="text-xs opacity-70 mt-1 truncate">
                  {thread.messages.length} messages
                </div>
              </button>
              <button
                type="button"
                onClick={() => deleteConfirmation[thread.id] 
                  ? handleDeleteConfirm(thread.id) 
                  : handleDeleteClick(thread.id)}
                className={`p-3 rounded-r-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 w-8 flex-shrink-0 ${
                  deleteConfirmation[thread.id]
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                }`}
                title={deleteConfirmation[thread.id] ? "Confirm deletion" : "Delete chat"}
              >
                {deleteConfirmation[thread.id] ? "✓" : "×"}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Delete All Button */}
      <div className="p-2 mt-auto">
        <div 
          className="flex items-center"
          onBlur={handleDeleteAllFocusLoss}
          tabIndex={-1}
        >
          <button
            type="button"
            onClick={deleteAllConfirmation ? handleDeleteAllConfirm : handleDeleteAllClick}
            className={`w-full p-2 text-sm rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 ${
              deleteAllConfirmation
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200"
            }`}
            title={deleteAllConfirmation ? "Confirm deletion of all chats" : "Delete all chats"}
          >
            {deleteAllConfirmation ? "Confirm Delete All" : "Delete All Chats"}
          </button>
        </div>
      </div>
    </div>
  );
}