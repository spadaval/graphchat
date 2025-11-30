import { useObservable } from "@legendapp/state/react";
import { blocks$, createBlock } from "../lib/state/block";
import { documentStore$, updateDocument } from "../lib/state/documents";
import type { BlockId, DocumentId } from "../lib/state/types";
import { cn } from "../lib/utils";
import { useEffect, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";

interface DocumentEditorProps {
  documentId: DocumentId;
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
  const document = useObservable(documentStore$.documents[documentId]);
  const blocks = useObservable(blocks$);

  if (!document.get()) {
    return <div className="p-8 text-center text-gray-500">Document not found</div>;
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDocument(documentId, { title: e.target.value });
  };

  const addBlock = (afterBlockId?: BlockId) => {
    const newBlock = createBlock("", "user", "paragraph");
    blocks$.assign({ [newBlock.id]: newBlock });
    
    const currentBlocks = document.blocks.get() || [];
    const index = afterBlockId ? currentBlocks.indexOf(afterBlockId) + 1 : currentBlocks.length;
    
    const newBlocks = [...currentBlocks];
    newBlocks.splice(index, 0, newBlock.id);
    
    document.blocks.set(newBlocks);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <input
        type="text"
        value={document.title.get()}
        onChange={handleTitleChange}
        className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-8 placeholder-gray-400"
        placeholder="Untitled Document"
      />

      <div className="space-y-4">
        {document.blocks.get()?.map((blockId) => (
          <BlockEditor key={blockId} blockId={blockId} />
        ))}
      </div>

      <button
        onClick={() => addBlock()}
        className="mt-8 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
      >
        + Add Block
      </button>
    </div>
  );
}

function BlockEditor({ blockId }: { blockId: BlockId }) {
  const block = useObservable(blocks$[blockId]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!block.get()) return null;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    block.text.set(e.target.value);
  };

  return (
    <div className={cn(
      "group relative p-4 rounded-lg border border-transparent hover:border-gray-200 transition-colors",
      block.role.get() === "assistant" ? "bg-blue-50/50" : "bg-white"
    )}>
      <div className="absolute left-0 top-4 opacity-0 group-hover:opacity-100 -translate-x-full pr-2 flex gap-1">
        <div className="text-xs text-gray-400 uppercase tracking-wider font-medium py-1">
          {block.role.get()}
        </div>
      </div>
      
      <TextareaAutosize
        ref={textareaRef}
        value={block.text.get()}
        onChange={handleChange}
        className="w-full bg-transparent resize-none outline-none text-lg leading-relaxed"
        placeholder="Type something..."
      />
    </div>
  );
}
