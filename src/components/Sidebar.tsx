import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { ChatThread } from "~/lib/state";
import { useCurrentThreadId, useThreadsArray } from "~/lib/state/hooks";
import type { ChatId } from "~/lib/state/types";

// Sidebar Header Component
export function SidebarHeader() {
  return (
    <div className="p-5 border-b border-zinc-800/50">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
        History
      </div>
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
      className={`relative mb-1 rounded-md px-3 py-2.5 transition-all duration-200 flex items-center group ${
        isActive
          ? "bg-emerald-500/5 text-emerald-400"
          : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-emerald-500" />
      )}
      <button
        type="button"
        onClick={() => onSwitch(thread.id)}
        className={`flex-1 text-left focus:outline-none min-w-0 text-[13px] truncate flex items-center gap-2 ${isActive ? "font-bold" : "font-medium"}`}
      >
        {isActive && (
          <div className="h-1 w-1 shrink-0 animate-pulse rounded-full bg-emerald-500" />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="truncate pr-6">{thread.title}</div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="max-w-xs break-words bg-[#0d0d0d] border-zinc-800 text-zinc-300"
          >
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
          className={`p-1 rounded transition-colors duration-200 focus:outline-none opacity-0 group-hover:opacity-100 ${
            isActive ? "hover:bg-white/5" : "hover:bg-white/10"
          }`}
          title="More options"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
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
      className="absolute right-0 top-6 mt-1 w-44 bg-popover border border-border rounded shadow-xl z-20 p-1"
    >
      <button
        type="button"
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="block w-full text-left px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-white/5 hover:text-foreground rounded"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          onDuplicate(threadId);
          onClose();
        }}
        className="block w-full text-left px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-white/5 hover:text-foreground rounded"
      >
        Duplicate
      </button>
      <button
        type="button"
        onClick={() => {
          onDelete(threadId);
          onClose();
        }}
        className="block w-full text-left px-3 py-1.5 text-xs font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive rounded"
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] rounded-xl p-6 w-full max-w-sm border border-zinc-800 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500 mb-6">
          Rename Session
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full h-10 px-3 border border-zinc-800 rounded-md bg-zinc-900/50 text-[13px] text-emerald-400 placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/50 transition-colors font-medium"
            placeholder="New designation..."
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-emerald-500/30 transition-all"
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
    <div className="flex items-center px-1">
      <button
        type="button"
        onClick={onClick}
        onBlur={onBlur}
        className={`w-full py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-md transition-all duration-300 focus:outline-none border ${
          confirmation
            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
            : "text-zinc-700 hover:text-rose-400/60 border-transparent"
        }`}
        title={
          confirmation
            ? "Confirm delete all sessions"
            : "Delete all history"
        }
      >
        {confirmation ? "Confirm Delete" : "Clear History"}
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
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#0d0d0d]">
        <div className="p-4">
          <button
            type="button"
            onClick={() => createNewThread()}
            className="group relative w-full overflow-hidden rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-left transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Plus size={12} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                New Session
              </span>
            </div>
          </button>
        </div>

        {threads.length === 0 ? (
          <div className="p-6 text-muted-foreground/40 text-center text-xs font-medium">
            No history
          </div>
        ) : (
          <div className="px-2 flex-1 scrollbar-hide">
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

        <div className="p-3 mt-auto border-t border-border/40">
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
