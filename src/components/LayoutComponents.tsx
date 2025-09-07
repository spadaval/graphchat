import { SidebarContent, SidebarHeader } from "~/components/Sidebar";
import { ChatHeader, EmptyState } from "~/components/ChatAreaComponents";
import { MessagesList } from "~/components/ChatAreaComponents";
import { TabContent, TabNavigation } from "~/components/ModelServerComponents";
import { useThread } from "~/lib/state/hooks";
import type { ChatThread } from "~/lib/state";
import type { ChatThreadWithMessages } from "~/lib/state/chat";

// Chat Threads Sidebar Component
interface ChatThreadsSidebarProps {
  createNewThread: () => void;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  deleteAllThreads: () => void;
}

export function ChatThreadsSidebar({
  createNewThread,
  switchThread,
  deleteThread,
  deleteAllThreads,
}: ChatThreadsSidebarProps) {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <SidebarHeader />
      <SidebarContent
        createNewThread={createNewThread}
        switchThread={switchThread}
        deleteThread={deleteThread}
        deleteAllThreads={deleteAllThreads}
      />
    </div>
  );
}

// Chat Area Component
interface ChatAreaProps {
  currentThreadId: string | undefined;
  sendMessage: (message: string) => void;
}

export function ChatArea({
  currentThreadId,
  sendMessage,
}: ChatAreaProps) {
  // Fetch the current thread using our new hook
  const currentThread = useThread(currentThreadId || "");
  
  return (
    <div className="flex-1 flex flex-col min-w-0 relative min-h-0 overflow-hidden">
      <ChatHeader title={currentThread?.title || "Chat"} />
      {!currentThread ? <EmptyState sendMessage={sendMessage} /> : <MessagesList threadId={currentThreadId || ""} />}
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
    <div className="p-4 border-t border-gray-800 bg-gray-900">
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
          className="flex-1 p-3 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          placeholder="Type a message..."
          aria-label="Type your message"
        />
        <button
          type="submit"
          disabled={!currentUserMessage?.trim()}
          className="px-6 py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
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
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
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
    <div className="flex h-screen bg-gray-950">
      {sidebar}
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      {modelServer}
    </div>
  );
}