import {
  ChatHeader,
  EmptyState,
  MessagesList,
} from "~/components/ChatAreaComponents";
import { TabContent, TabNavigation } from "~/components/ModelServerComponents";
import { SidebarContent, SidebarHeader } from "~/components/Sidebar";
import type { ChatId } from "~/lib/state/types";
import { useThread } from "~/lib/state/hooks";

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
  // Fetch the current thread using our new hook
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

// Message Input Component
interface MessageInputProps {
  currentUserMessage: string;
  setCurrentUserMessage: (message: string) => void;
  sendMessage: (message: string) => void;
}

export function MessageInput({
  currentUserMessage,
  setCurrentUserMessage,
  sendMessage,
}: MessageInputProps) {
  return (
    <div className="p-4 border-t border-zinc-800 bg-zinc-900">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (currentUserMessage.trim()) {
            sendMessage(currentUserMessage);
            setCurrentUserMessage("");
          }
        }}
        className="flex space-x-2"
      >
        <input
          type="text"
          value={currentUserMessage}
          onChange={(e) => setCurrentUserMessage(e.target.value)}
          className="flex-1 p-3 border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent text-sm"
          placeholder="Type a message..."
          aria-label="Type your message"
        />
        <button
          type="submit"
          disabled={!currentUserMessage?.trim()}
          className="px-5 py-3 bg-gradient-to-br from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 disabled:from-zinc-800 disabled:to-zinc-850 disabled:cursor-not-allowed text-zinc-200 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 text-sm"
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// Model Server Sidebar Component
interface ModelServerSidebarProps {
  activeTab: "model" | "server";
  setActiveTab: (tab: "model" | "server") => void;
}

export function ModelServerSidebar({
  activeTab,
  setActiveTab,
}: ModelServerSidebarProps) {
  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col">
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <TabContent activeTab={activeTab} />
    </div>
  );
}

// Main Layout Component
interface MainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  modelServer: React.ReactNode;
}

export function MainLayout({
  children,
  sidebar,
  modelServer,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-950">
      {sidebar}
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      {modelServer}
    </div>
  );
}
