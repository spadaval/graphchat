import React, { useEffect, useRef } from 'react';
import {
  Plate,
  PlateContent,
  PlateProvider,
  usePlateEditor,
} from '@udecode/plate-common/react';
import { createParagraphPlugin } from '@udecode/plate-paragraph';
import { MentionKit } from './mention-kit';
import { getAllDocuments } from '~/lib/state';
import { addDocumentToCurrentMessage } from '~/lib/state/ui';
import { getMentionOnSelectItem } from '@platejs/mention';
import type { TElement } from 'platejs';
import { usePlateStore } from '@udecode/plate-core/react';

// Create the plugins
const plugins = [
  createParagraphPlugin(),
  ...MentionKit,
];

interface PlateEditorProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function PlateEditor({ onSend, disabled }: PlateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Create the editor
  const editor = usePlateEditor({
    id: 'chat-editor',
    plugins,
    value: [{ type: 'p', children: [{ text: '' }] }],
  });

  // Custom onSelectItem function to handle document mentions
  const onSelectItem = getMentionOnSelectItem({
    insertSpaceAfterMention: true,
  });

  // Custom function to handle document selection
  const handleDocumentSelect = (document: any) => {
    // Add document to current message links when mentioned
    addDocumentToCurrentMessage(document.key);
    
    // Use the editor's onSelectItem function
    if (editor) {
      onSelectItem(editor, {
        key: document.key,
        text: document.text,
      });
    }
  };

  const handleSend = () => {
    if (editor) {
      // Get the editor content as plain text
      const content = editor.api.get().children[0]?.children[0]?.text?.trim() || '';
      if (content) {
        onSend(content);
        editor.api.get().reset();
      }
    }
  };

  // Handle global key events for sending message
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to send
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        handleSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

  return (
    <PlateProvider editor={editor}>
      <PlateContent
        className="w-full p-3 border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 min-h-[60px] max-h-32 overflow-y-auto"
        placeholder="Type your message... Type @ to reference documents"
      />
    </PlateProvider>
  );
}