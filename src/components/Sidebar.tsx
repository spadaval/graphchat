import { useEffect, useRef, useState } from "react";
import type { ChatThread } from "~/lib/state";
import type { ChatId } from "~/lib/state/types";
import { useCurrentThreadId, useThreadsArray } from "~/lib/state/hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// Sidebar Header Component
export function SidebarHeader() {
  return (
    <div className="p-4 border-b border-zinc-700">
      <h2 className="text-base font-semibold text-zinc-100">Chat Threads</h2>
    </div>
  );
}

// Thread Item Component
interface ThreadItemProps {
  thread: ChatThread;
  isActive: boolean;
  onSwitch: (threadId: ChatId) => void;
  onEdit: (thread: ChatThread) => void;
  onDelete: (threadId: ChatId) => void;
  onDuplicate: (threadId: ChatId) => void;
  isOpenMenu: boolean;
  onToggleMenu: (threadId: ChatId) => void;
}

function ThreadItem({
  thread,
  isActive,
  onSwitch,
  onEdit,
  onDelete,
  onDuplicate,
  isOpenMenu,
  onToggleMenu,
}: ThreadItemProps) {
  return (
    <div
      key={thread.id}
      className={`relative mb-1 rounded-md p-2 transition-all duration-200 flex items-center group ${
        isActive
          ? "bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-100 ring-2 ring-zinc-600"
          : "text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      <button
        type="button"
        onClick={() => onSwitch(thread.id)}
        className="flex-1 text-left font-medium focus:outline-none min-w-0 text-sm truncate"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="truncate pr-6">{thread.title}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs break-words">
            {thread.title}
          </TooltipContent>
        </Tooltip>
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(thread.id);
          }}
          className="p-1 rounded hover:bg-zinc-700 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 opacity-0 group-hover:opacity-100"
          title="More options"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="More options"
          >
            <title>More options</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
        <OverflowMenu
          threadId={thread.id}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onEdit={() => onEdit(thread)}
          isOpen={isOpenMenu}
          onClose={() => onToggleMenu("" as ChatId)}
        />
      </div>
    </div>
  );
}

// Overflow Menu Component
interface OverflowMenuProps {
  threadId: ChatId;
  onDelete: (threadId: ChatId) => void;
  onDuplicate: (threadId: ChatId) => void;
  onEdit: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function OverflowMenu({
  threadId,
  onDelete,
  onDuplicate,
  onEdit,
  isOpen,
  onClose,
}: OverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-6 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-10"
    >
      <button
        type="button"
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="block w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
      >
        Edit Name
      </button>
      <button
        type="button"
        onClick={() => {
          onDuplicate(threadId);
          onClose();
        }}
        className="block w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
      >
        Duplicate
      </button>
      <button
        type="button"
        onClick={() => {
          onDelete(threadId);
          onClose();
        }}
        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300"
      >
        Delete
      </button>
    </div>
  );
}

// Edit Name Modal Component
interface EditableThreadTitleProps {
  thread: ChatThread;
  threadId: ChatId;
  initialTitle: string;
  onSave: (threadId: ChatId, newTitle: string) => void;
  onCancel: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function EditNameModal({
  thread,
  isOpen,
  onClose,
  onSave,
}: EditableThreadTitleProps) {
  const [newTitle, setNewTitle] = useState(thread.title);

  // Reset the input when the modal opens
  useEffect(() => {
    if (isOpen) {
      setNewTitle(thread.title);
    }
  }, [isOpen, thread.title]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newTitle !== thread.title) {
      onSave(thread.id, newTitle.trim());
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-md border border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">
          Rename Thread
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full p-2 border border-zinc-600 rounded bg-zinc-700 text-zinc-100 mb-4 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            placeholder="Enter new title"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-300 hover:text-zinc-100 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete All Button Component
interface DeleteAllButtonProps {
  confirmation: boolean;
  onClick: () => void;
  onBlur: () => void;
}

function DeleteAllButton({
  confirmation,
  onClick,
  onBlur,
}: DeleteAllButtonProps) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onClick}
        onBlur={onBlur}
        className={`w-full p-2 text-sm rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 ${
          confirmation
            ? "bg-gradient-to-br from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-zinc-100"
            : "bg-gradient-to-br from-zinc-800 to-zinc-850 hover:from-zinc-700 hover:to-zinc-800 text-zinc-300"
        }`}
        title={
          confirmation ? "Confirm deletion of all chats" : "Delete all chats"
        }
      >
        {confirmation ? "Confirm Delete All" : "Delete All Chats"}
      </button>
    </div>
  );
}

// Sidebar Content Component
interface SidebarContentProps {
  createNewThread: () => void;
  switchThread: (threadId: ChatId) => void;
  deleteThread: (threadId: ChatId) => void;
  duplicateThread: (threadId: ChatId) => void;
  editThreadTitle: (threadId: ChatId, newTitle: string) => void;
  deleteAllThreads: () => void;
}

export function SidebarContent({
  createNewThread,
  switchThread,
  deleteThread,
  duplicateThread,
  editThreadTitle,
  deleteAllThreads,
}: SidebarContentProps) {
  const threads = useThreadsArray();
  const currentThreadId = useCurrentThreadId();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<ChatThread | null>(null);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState(false);

  const handleEditThread = (thread: ChatThread) => {
    setEditingThread(thread);
    setEditModalOpen(true);
  };

  const handleSaveTitle = (threadId: ChatId, newTitle: string) => {
    editThreadTitle(threadId, newTitle);
  };

  return (
    <TooltipProvider>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-2">
          <button
            type="button"
            onClick={() => createNewThread()}
            className="w-full p-3 mb-2 bg-gradient-to-br from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-zinc-100 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 text-sm"
          >
            + New Chat
          </button>
        </div>

        {threads.length === 0 ? (
          <div className="p-4 text-zinc-500 text-center text-sm">
            Start a new chat to begin
          </div>
        ) : (
          <div className="px-2 flex-1">
            {threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === currentThreadId}
                onSwitch={switchThread}
                onEdit={handleEditThread}
                onDelete={deleteThread}
                onDuplicate={duplicateThread}
                isOpenMenu={openMenuId === thread.id}
                onToggleMenu={(id) =>
                  setOpenMenuId(id === openMenuId ? null : id)
                }
              />
            ))}
          </div>
        )}

        {/* Delete All Button */}
        <div className="p-2 mt-auto">
          <DeleteAllButton
            confirmation={deleteAllConfirmation}
            onClick={() => {
              if (deleteAllConfirmation) {
                deleteAllThreads();
                setDeleteAllConfirmation(false);
              } else {
                setDeleteAllConfirmation(true);
              }
            }}
            onBlur={() => setDeleteAllConfirmation(false)}
          />
        </div>

        {/* Edit Name Modal */}
        {editingThread && (
          <EditNameModal
            thread={editingThread}
            threadId={editingThread.id}
            initialTitle={editingThread.title}
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setEditingThread(null);
            }}
            onSave={handleSaveTitle}
            onCancel={() => {
              setEditModalOpen(false);
              setEditingThread(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
