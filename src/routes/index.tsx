import { createFileRoute } from "@tanstack/react-router";
import chatStore$, {
  ChatThread,
  setCurrentUserMessage,
  nextVariant,
  regenerateMessage,
  sendMessage,
  getCurrentThread,
  switchThread,
  createNewThread,
} from "~/lib/state/chat";
import { use$ } from "@legendapp/state/react";
import { useEffect, useState } from "react";
import { ModelProperties } from "~/components/ModelProperties";
import { ChatMessage } from "~/components/ChatMessage";
import { ServerInfo } from "~/components/ServerInfo";
import { ChatMessage as ChatMessageType } from "~/lib/state/llm";

// Types
interface SamplePrompt {
  id: string;
  text: string;
}

// Constants
const SAMPLE_PROMPTS: SamplePrompt[] = [
  { id: "1", text: "Explain quantum computing in simple terms" },
  { id: "2", text: "How do I make a HTTP request in JavaScript?" },
  { id: "3", text: "What's the difference between React and Vue?" },
  { id: "4", text: "Suggest a good book about machine learning" },
];

export const Route = createFileRoute("/")({
  component: Home,
});

function SidebarHeader() {
  return (
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-lg font-semibold text-gray-100">Chat Threads</h2>
    </div>
  );
}

function SidebarContent({
  createNewThread,
  threads,
  currentThreadId,
  switchThread,
}: {
  createNewThread: () => void;
  threads: ChatThread[];
  currentThreadId: string | undefined;
  switchThread: (threadId: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
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
        <div className="px-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => switchThread(thread.id)}
              className={`w-full p-3 mb-1 text-left rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                thread.id === currentThreadId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-200"
              }`}
            >
              <div className="truncate text-sm">{thread.title}</div>
              <div className="text-xs opacity-70 mt-1">
                {thread.messages.length} messages
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatThreadsSidebar({
  createNewThread,
  threads,
  currentThreadId,
  switchThread,
}: {
  createNewThread: () => void;
  threads: ChatThread[];
  currentThreadId: string | undefined;
  switchThread: (threadId: string) => void;
}) {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <SidebarHeader />
      <SidebarContent
        createNewThread={createNewThread}
        threads={threads}
        currentThreadId={currentThreadId}
        switchThread={switchThread}
      />
    </div>
  );
}

function ChatHeader({ title }: { title: string }) {
  return (
    <div className="p-4 border-b border-gray-800 bg-gray-900">
      <h1 className="text-xl font-semibold text-gray-100">{title}</h1>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
      <h2 className="text-2xl font-semibold text-gray-100 mb-6">
        How can I help you today?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {SAMPLE_PROMPTS.map((prompt) => (
          <button
            type="button"
            key={prompt.id}
            onClick={(e) => {
              e.preventDefault();
              sendMessage(prompt.text);
            }}
            className="p-4 text-left rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-colors duration-200 text-gray-200"
          >
            {prompt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessagesList({ messages }: { messages: ChatMessageType[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} isStreaming={false} />
      ))}
      {messages.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No messages yet. Start a conversation!
        </div>
      )}
    </div>
  );
}

function ChatArea({
  currentThread,
  messages,
}: {
  currentThread: ChatThread | undefined;
  messages: ChatMessageType[];
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0 relative min-h-0 overflow-hidden">
      <ChatHeader title={currentThread?.title || "Chat"} />

      {!currentThread ? <EmptyState /> : <MessagesList messages={messages} />}
    </div>
  );
}

function MessageInput({
  currentUserMessage,
  setCurrentUserMessage,
  sendMessage,
}: {
  currentUserMessage: string;
  setCurrentUserMessage: (message: string) => void;
  sendMessage: (message: string) => void;
}) {
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

function TabNavigation({
  activeTab,
  setActiveTab,
}: {
  activeTab: "model" | "server";
  setActiveTab: (tab: "model" | "server") => void;
}) {
  return (
    <div className="border-b border-gray-800 flex">
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "model"
            ? "text-blue-400 border-b-2 border-blue-500"
            : "text-gray-400 hover:text-gray-200"
        }`}
        onClick={() => setActiveTab("model")}
      >
        Model
      </button>
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "server"
            ? "text-blue-400 border-b-2 border-blue-500"
            : "text-gray-400 hover:text-gray-200"
        }`}
        onClick={() => setActiveTab("server")}
      >
        Server
      </button>
    </div>
  );
}

function TabContent({ activeTab }: { activeTab: "model" | "server" }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {activeTab === "model" ? (
        <div className="p-4">
          <ModelProperties />
        </div>
      ) : (
        <ServerInfo />
      )}
    </div>
  );
}

function ModelServerSidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: "model" | "server";
  setActiveTab: (tab: "model" | "server") => void;
}) {
  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <TabContent activeTab={activeTab} />
    </div>
  );
}

function MainLayout({
  children,
  sidebar,
  modelServer,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  modelServer: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-950">
      {sidebar}
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      {modelServer}
    </div>
  );
}

function Home() {
  const [activeTab, setActiveTab] = useState<"model" | "server">("model");
  const { currentUserMessage, threads, currentThreadId } = use$(chatStore$);

  const currentThread = getCurrentThread();
  const messages = currentThread?.messages || [];
  const threadsArray = Array.from(threads.values());

  return (
    <MainLayout
      sidebar={
        <ChatThreadsSidebar
          createNewThread={() => createNewThread()}
          threads={threadsArray}
          currentThreadId={currentThreadId}
          switchThread={switchThread}
        />
      }
      modelServer={
        <ModelServerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      }
    >
      <ChatArea currentThread={currentThread} messages={messages} />
      <MessageInput
        currentUserMessage={currentUserMessage}
        setCurrentUserMessage={setCurrentUserMessage}
        sendMessage={sendMessage}
      />
    </MainLayout>
  );
}
