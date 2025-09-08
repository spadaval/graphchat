import { useEffect, useRef } from 'react';
import type { Document } from '~/lib/state';
import { getAllDocuments } from '~/lib/state';

interface MentionListProps {
  items: Document[];
  command: (document: Document) => void;
  selectedIndex: number;
}

export function MentionList({ items, command, selectedIndex }: MentionListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div
      ref={listRef}
      className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto z-50"
    >
      {items.length ? (
        items.map((document, index) => (
          <div
            key={document.id}
            onClick={() => command(document)}
            className={`p-2 cursor-pointer text-zinc-100 text-sm border-b border-zinc-700 last:border-b-0 ${
              index === selectedIndex ? 'bg-zinc-700' : 'hover:bg-zinc-750'
            }`}
          >
            <div className="font-medium truncate">@{document.title}</div>
            <div className="text-xs text-zinc-400 truncate">
              {document.content.substring(0, 50)}
              {document.content.length > 50 ? '...' : ''}
            </div>
          </div>
        ))
      ) : (
        <div className="p-2 text-zinc-500 text-sm">No documents found</div>
      )}
    </div>
  );
}