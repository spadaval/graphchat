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
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
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
    <div className="relative w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        className="absolute right-1 top-1 z-10 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        aria-label="Close model server sidebar"
        title="Close sidebar"
      >
        <PanelRightClose className="size-4" />
      </Button>
      <SettingsPanelContent />
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
    <div className="flex h-full bg-zinc-950">
      {sidebar}
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      {modelServer}
    </div>
  );
}
