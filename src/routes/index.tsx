import { use$ } from "@legendapp/state/react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StorybookEditor } from "~/components/editor/StorybookEditor";
import { MainLayout, ModelServerSidebar } from "~/components/LayoutComponents";
import { StorybookSidebar } from "~/components/StorybookSidebar";
import { Button } from "~/components/ui/button";
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
  const [isModelServerOpen, setIsModelServerOpen] = useState(true);

  const handleSelectDocument = useCallback((id: DocumentId) => {
    setCurrentDocument(id);
  }, []);

  const handleCloseDocument = useCallback((id: DocumentId) => {
    closeDocument(id);
  }, []);

  const handleToggleModelServer = useCallback(() => {
    setIsModelServerOpen((isOpen) => !isOpen);
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
        isModelServerOpen ? (
          <ModelServerSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onToggle={handleToggleModelServer}
          />
        ) : undefined
      }
    >
      <StorybookEditor
        openDocumentIds={openDocumentIds}
        activeDocumentId={activeDocumentId}
        onSelectDocument={handleSelectDocument}
        onCloseDocument={handleCloseDocument}
        topbarRight={
          !isModelServerOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggleModelServer}
              className="rounded-none border-l border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Open model server sidebar"
              title="Open sidebar"
            >
              <Settings className="size-4" />
            </Button>
          ) : undefined
        }
      />
    </MainLayout>
  );
}
