import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MainLayout, ModelServerSidebar } from "~/components/LayoutComponents";
import { StorybookEditor } from "~/components/StorybookEditor";
import { StorybookSidebar } from "~/components/StorybookSidebar";
import { uiPreferences$, setActiveTab } from "~/lib/state/ui";
import { use$ } from "@legendapp/state/react";
import { documentStore$, setCurrentDocument, closeDocument } from "~/lib/state/documents";
import type { DocumentId } from "~/lib/state/types";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { id?: DocumentId } => {
    return {
      id: search.id as DocumentId | undefined,
    };
  },
  component: StorybookPage,
});

function StorybookPage() {
  const { id: searchId } = Route.useSearch();
  const { activeTab } = use$(uiPreferences$);
  const { openDocumentIds, currentDocumentId: activeDocumentId } = use$(documentStore$);

  const handleSelectDocument = (id: DocumentId) => {
    setCurrentDocument(id);
  };

  // Sync active document with search param
  useEffect(() => {
    if (searchId && searchId !== activeDocumentId) {
      handleSelectDocument(searchId);
    }
  }, [searchId]);

  const handleCloseDocument = (id: DocumentId) => {
    closeDocument(id);
  };

  return (
    <MainLayout
      sidebar={
        <StorybookSidebar
          activeDocumentId={activeDocumentId}
          onSelectDocument={handleSelectDocument}
        />
      }
      modelServer={
        <ModelServerSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      }
    >
      <StorybookEditor
        openDocumentIds={openDocumentIds}
        activeDocumentId={activeDocumentId}
        onSelectDocument={handleSelectDocument}
        onCloseDocument={handleCloseDocument}
      />
    </MainLayout>
  );
}
