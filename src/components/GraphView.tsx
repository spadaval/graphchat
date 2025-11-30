import { useObservable } from "@legendapp/state/react";
import { documentStore$ } from "../lib/state/documents";
import { graphStore$ } from "../lib/state/graph";
import { Link } from "@tanstack/react-router";

export function GraphView() {
  const documents = useObservable(documentStore$.documents);
  const edges = useObservable(graphStore$.edges);

  const docsList = Object.values(documents.get());

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">World Graph</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docsList.map((doc) => (
          <Link
            key={doc.id}
            to="/documents/$documentId"
            params={{ documentId: doc.id }}
            className="block p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all bg-white"
          >
            <h3 className="text-xl font-semibold mb-2">{doc.title}</h3>
            <div className="text-sm text-gray-500">
              {doc.blocks.length} blocks
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {doc.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {docsList.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No documents yet. Create one to get started!
        </div>
      )}
    </div>
  );
}
