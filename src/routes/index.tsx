import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MainLayout } from "~/components/LayoutComponents";
import { StorybookEditor } from "~/components/StorybookEditor";
import { StorybookSidebar } from "~/components/StorybookSidebar";
import type { DocumentId } from "~/lib/state/types";

export const Route = createFileRoute("/")({
  component: StorybookPage,
});

function StorybookPage() {
  const [openDocumentIds, setOpenDocumentIds] = useState<DocumentId[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<DocumentId | undefined>(
    undefined,
  );

  const handleSelectDocument = (id: DocumentId) => {
    if (!openDocumentIds.includes(id)) {
      setOpenDocumentIds([...openDocumentIds, id]);
    }
    setActiveDocumentId(id);
  };

  const handleCloseDocument = (id: DocumentId) => {
    const newOpenIds = openDocumentIds.filter((docId) => docId !== id);
    setOpenDocumentIds(newOpenIds);

    if (activeDocumentId === id) {
      // If we closed the active tab, switch to the last one, or undefined if none left
      setActiveDocumentId(newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : undefined);
    }
  };

  return (
    <MainLayout
      sidebar={
        <StorybookSidebar
          activeDocumentId={activeDocumentId}
          onSelectDocument={handleSelectDocument}
        />
      }
    >
      <StorybookEditor
        openDocumentIds={openDocumentIds}
        activeDocumentId={activeDocumentId}
        onSelectDocument={setActiveDocumentId}
        onCloseDocument={handleCloseDocument}
      />
    </MainLayout>
  );
}
