import React, { useEffect, useRef } from 'react';
import {
  Plate,
  PlateContent,
  PlateProvider,
  usePlateEditor,
} from '@udecode/plate-common/react';
import { createParagraphPlugin } from '@udecode/plate-paragraph';
import { createBoldPlugin } from '@udecode/plate-basic-marks';
import { createItalicPlugin } from '@udecode/plate-basic-marks';
import { createUnderlinePlugin } from '@udecode/plate-basic-marks';
import { createHeadingPlugin } from '@udecode/plate-heading';
import { createListPlugin } from '@udecode/plate-list';
import { createBlockquotePlugin } from '@udecode/plate-block-quote';
import { createCodeBlockPlugin } from '@udecode/plate-code-block';
import { use$ } from '@legendapp/state/react';
import type { Observable } from '@legendapp/state';
import { Button } from '~/components/ui/button';
import { QuickInlineEdit } from '~/components/ui/quick-inline-edit';
import type { Document } from '~/lib/state';
import type { DocumentId } from '~/lib/state/types';

// Create the plugins
const plugins = [
  createParagraphPlugin(),
  createBoldPlugin(),
  createItalicPlugin(),
  createUnderlinePlugin(),
  createHeadingPlugin(),
  createListPlugin(),
  createBlockquotePlugin(),
  createCodeBlockPlugin(),
];

interface PlateDocumentEditorProps {
  document$: Observable<Document>;
  onSave: (title: string, content: string, tags: string[]) => void;
  onCancel: () => void;
  onDelete?: (id: DocumentId) => void;
}

export function PlateDocumentEditor({
  document$,
  onSave,
  onCancel,
  onDelete,
}: PlateDocumentEditorProps) {
  // Always use use$ hook to avoid conditional hook usage
  const document = use$(document$);
  
  // Create the editor
  const editor = usePlateEditor({
    id: 'document-editor',
    plugins,
    value: [{ type: 'p', children: [{ text: document.content }] }],
  });

  const handleSave = () => {
    if (!document.title.trim()) return;
    // Get the editor content as a string
    const content = editor.api.get().children[0]?.children[0]?.text || '';
    // Pass empty array for tags since we're removing the tagging system
    onSave(document.title, content, []);
  };

  return (
    <PlateProvider editor={editor}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <QuickInlineEdit
            value$={document$.title}
            placeholder="Document title"
            className="flex-1"
          />
          <div className="flex items-center space-x-2 ml-4">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(document.id)}
                className="px-3 py-1 bg-red-700 hover:bg-red-600 text-zinc-200 rounded text-sm"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4">
          <PlateContent
            className="flex-1 resize-none bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 border border-zinc-700 focus:ring-zinc-600 rounded-md p-3 min-h-[300px]"
            placeholder="Start writing your document..."
          />
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end space-x-2">
          <Button type="button" onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={!document.title?.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </PlateProvider>
  );
}