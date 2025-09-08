import { use$ } from "@legendapp/state/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChatArea,
  ChatThreadsSidebar,
  MainLayout,
  MessageInput,
  ModelServerSidebar,
} from "~/components/LayoutComponents";
import {
  chatStore$,
  createNewThread,
  deleteAllThreads,
  deleteThread,
  duplicateThread,
  editThreadTitle,
  sendMessage,
  setCurrentUserMessage,
  switchThread,
} from "~/lib/state";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [activeTab, setActiveTab] = useState<"model" | "server">("model");
  const { currentUserMessage, currentThreadId } = use$(chatStore$);

  return (
    <MainLayout
      sidebar={
        <ChatThreadsSidebar
          createNewThread={createNewThread}
          switchThread={switchThread}
          deleteThread={deleteThread}
          duplicateThread={duplicateThread}
          editThreadTitle={editThreadTitle}
          deleteAllThreads={deleteAllThreads}
        />
      }
      modelServer={
        <ModelServerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      }
    >
      <ChatArea currentThreadId={currentThreadId} sendMessage={sendMessage} />
      <MessageInput
        currentUserMessage={currentUserMessage}
        setCurrentUserMessage={setCurrentUserMessage}
        sendMessage={sendMessage}
      />
    </MainLayout>
  );
}
