import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DocumentEditor } from "~/components/DocumentEditor";
import { createDocument } from "~/lib/state";

export const Route = createFileRoute("/documents/new")({
  component: NewDocument,
});

function NewDocument() {
  const navigate = useNavigate();

  const handleSave = (title: string, content: string, tags: string[]) => {
    const id = createDocument(title, content, tags);
    navigate({ to: "/documents/$id", params: { id } });
  };

  const handleCancel = () => {
    navigate({ to: "/documents" });
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      <div className="flex-1 flex flex-col">
        <DocumentEditor onSave={handleSave} onCancel={handleCancel} />
      </div>
    </div>
  );
}
