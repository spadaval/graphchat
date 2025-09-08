import { use$ } from "@legendapp/state/react";
import { createFileRoute } from "@tanstack/react-router";
import { DocumentReferencePanel } from "~/components/DocumentReference";
import {
  ChatArea,
  ChatThreadsSidebar,
  MainLayout,
  ModelServerSidebar,
} from "~/components/LayoutComponents";
import { SmartMessageInput } from "~/components/SmartMessageInput";
import type { Document } from "~/lib/state";
import {
  chatStore$,
  createNewThread,
  deleteAllThreads,
  deleteThread,
  duplicateThread,
  editThreadTitle,
  sendMessage,
  switchThread,
  uiPreferences$,
  setActiveTab,
  setShowDocumentPanel,
} from "~/lib/state";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { currentThreadId } = use$(chatStore$);
  const { activeTab, showDocumentPanel } = use$(uiPreferences$);

  const handleInsertDocument = (document: Document) => {
    // Insert document reference into the message input
    const documentReference = `[@${document.title}]`;
    // We'll need to update this to work with the new editor
    setShowDocumentPanel(false);
  };

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
        <>
          {showDocumentPanel ? (
            <DocumentReferencePanel onInsertDocument={handleInsertDocument} />
          ) : (
            <ModelServerSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
          <div className="border-t border-zinc-800 p-2 bg-zinc-900">
            <button
              type="button"
              className={`w-full py-2 text-sm rounded-lg ${
                showDocumentPanel
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
              onClick={() => setShowDocumentPanel(!showDocumentPanel)}
            >
              {showDocumentPanel ? "Close Documents" : "Documents"}
            </button>
          </div>
        </>
      }
    >
      <ChatArea currentThreadId={currentThreadId} sendMessage={sendMessage} />
      <SmartMessageInput onSend={sendMessage} />
    </MainLayout>
  );
}
