import { PanelRightClose } from "lucide-react";
import { EmptyState, MessagesList } from "~/components/ChatAreaComponents";
import { SettingsPanelContent } from "~/components/ModelServerComponents";
import { SidebarContent, SidebarHeader } from "~/components/Sidebar";
import { Button } from "~/components/ui/button";
import { useThread } from "~/lib/state/hooks";
import type { ChatId } from "~/lib/state/types";

// Chat Threads Sidebar Component
interface ChatThreadsSidebarProps {
  createNewThread: () => void;
  switchThread: (threadId: ChatId) => void;
  deleteThread: (threadId: ChatId) => void;
  duplicateThread: (threadId: ChatId) => void;
  editThreadTitle: (threadId: ChatId, newTitle: string) => void;
  deleteAllThreads: () => void;
}

export function ChatThreadsSidebar({
  createNewThread,
  switchThread,
  deleteThread,
  duplicateThread,
  editThreadTitle,
  deleteAllThreads,
}: ChatThreadsSidebarProps) {
  return (
    <div className="flex w-72 flex-col border-r border-zinc-800/50 bg-[#0d0d0d] transition-all duration-300">
      <SidebarHeader />
      <SidebarContent
        createNewThread={createNewThread}
        switchThread={switchThread}
        deleteThread={deleteThread}
        duplicateThread={duplicateThread}
        editThreadTitle={editThreadTitle}
        deleteAllThreads={deleteAllThreads}
      />
    </div>
  );
}

// Chat Area Component
interface ChatAreaProps {
  currentThreadId: ChatId | undefined;
  sendMessage: (message: string) => void;
}

export function ChatArea({ currentThreadId, sendMessage }: ChatAreaProps) {
  const currentThread = useThread(currentThreadId);

  if (!currentThreadId) {
    return <EmptyState sendMessage={sendMessage} />;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 relative min-h-0 overflow-hidden">
      {!currentThread ? (
        <EmptyState sendMessage={sendMessage} />
      ) : (
        <MessagesList threadId={currentThreadId} />
      )}
    </div>
  );
}

// Model Server Sidebar Component
interface ModelServerSidebarProps {
  onToggle: () => void;
}

export function ModelServerSidebar({ onToggle }: ModelServerSidebarProps) {
  return (
    <div className="wc-panel relative flex h-full w-[22rem] max-w-[42vw] flex-col border-l border-zinc-800/50 bg-[#0d0d0d]">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        className="absolute right-4 top-4 z-20 rounded-md border border-zinc-800 bg-[#0a0a0a] text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400 transition-all shadow-xl"
        aria-label="Close model server sidebar"
        title="Close sidebar"
      >
        <PanelRightClose className="size-4" />
      </Button>
      <div className="flex-1 overflow-hidden">
        <SettingsPanelContent />
      </div>
    </div>
  );
}

// Main Layout Component
interface MainLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  modelServer?: React.ReactNode;
}

export function MainLayout({
  children,
  sidebar,
  modelServer,
}: MainLayoutProps) {
  return (
    <div className="wc-shell flex h-full min-h-0 min-w-0 overflow-x-auto bg-transparent">
      {sidebar}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {modelServer}
    </div>
  );
}
