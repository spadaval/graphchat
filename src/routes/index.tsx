import { use$ } from "@legendapp/state/react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChatArea,
  ChatThreadsSidebar,
  MainLayout,
  ModelServerSidebar,
} from "~/components/LayoutComponents";
import { SmartMessageInput } from "~/components/SmartMessageInput";
import {
  chatStore$,
  createNewThread,
  deleteAllThreads,
  deleteThread,
  duplicateThread,
  editThreadTitle,
  sendMessage,
  setActiveTab,
  switchThread,
  uiPreferences$,
} from "~/lib/state";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { currentThreadId } = use$(chatStore$);
  const { activeTab } = use$(uiPreferences$);

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
      <SmartMessageInput onSend={sendMessage} />
    </MainLayout>
  );
}
