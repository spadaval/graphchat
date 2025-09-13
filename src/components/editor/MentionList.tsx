import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import type { Document } from "~/lib/state";

interface MentionListProps {
  items: Document[];
  command: (document: Document) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const { items, command } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as
      | HTMLElement
      | undefined;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const selectItem = (index: number) => {
    const item = items[index];

    if (item) {
      command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  return (
    <div
      ref={listRef}
      className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto z-50"
    >
      {items.length ? (
        items.map((document, index) => (
          <div
            key={document.id}
            onClick={() => selectItem(index)}
            className={`p-2 cursor-pointer text-zinc-100 text-sm border-b border-zinc-700 last:border-b-0 ${
              index === selectedIndex ? "bg-zinc-700" : "hover:bg-zinc-750"
            }`}
          >
            <div className="font-medium truncate">@{document.title}</div>
            <div className="text-xs text-zinc-400 truncate">
              {document.content.substring(0, 50)}
              {document.content.length > 50 ? "..." : ""}
            </div>
          </div>
        ))
      ) : (
        <div className="p-2 text-zinc-500 text-sm">No documents found</div>
      )}
    </div>
  );
});

MentionList.displayName = "MentionList";
