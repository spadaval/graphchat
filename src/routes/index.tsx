import { use$ } from "@legendapp/state/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { StorybookEditor } from "~/components/editor/StorybookEditor";
import { MainLayout, ModelServerSidebar } from "~/components/LayoutComponents";
import { StorybookSidebar } from "~/components/StorybookSidebar";
import {
  closeDocument,
  documentStore$,
  setCurrentDocument,
} from "~/lib/state/documents";
import type { DocumentId } from "~/lib/state/types";
import { setActiveTab, uiPreferences$ } from "~/lib/state/ui";

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
  const { openDocumentIds, currentDocumentId: activeDocumentId } =
    use$(documentStore$);

  const handleSelectDocument = useCallback((id: DocumentId) => {
    setCurrentDocument(id);
  }, []);

  const handleCloseDocument = useCallback((id: DocumentId) => {
    closeDocument(id);
  }, []);

  // Sync active document with search param
  useEffect(() => {
    if (searchId && searchId !== activeDocumentId) {
      handleSelectDocument(searchId);
    }
  }, [searchId, activeDocumentId, handleSelectDocument]);

  return (
    <MainLayout
      sidebar={
        <StorybookSidebar
          activeDocumentId={activeDocumentId}
          onSelectDocument={handleSelectDocument}
        />
      }
      modelServer={
        <ModelServerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
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
