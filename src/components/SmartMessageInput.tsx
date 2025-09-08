import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { useEffect, useRef, useState } from 'react';
import { MentionList } from './MentionList';
import type { Document } from '~/lib/state';
import { getAllDocuments } from '~/lib/state';

interface SmartMessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function SmartMessageInput({ onSend, disabled }: SmartMessageInputProps) {
  const [suggestions, setSuggestions] = useState<Document[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const suggestionContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Create suggestion configuration
  const suggestion = {
    items: ({ query }: { query: string }) => {
      const allDocs = getAllDocuments();
      return query
        ? allDocs
            .filter((doc) =>
              doc.title.toLowerCase().includes(query.toLowerCase()) ||
              doc.content.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 5)
        : allDocs.slice(0, 5);
    },

    render: () => {
      let component: any;
      let popup: any;
      
      return {
        onStart: (props: any) => {
          setShowSuggestions(true);
          setSuggestions(props.items);
          setSelectedIndex(0);
          
          // Calculate position - show above the editor
          if (props.clientRect) {
            const rect = props.clientRect();
            if (rect) {
              // Get the height of the suggestion list to position it correctly above
              const suggestionHeight = 200; // Approximate height of the suggestion list
              setSuggestionPosition({ 
                top: rect.top + window.scrollY - suggestionHeight, 
                left: rect.left + window.scrollX 
              });
            }
          }
        },
        
        onUpdate: (props: any) => {
          setSuggestions(props.items);
          setSelectedIndex(Math.min(selectedIndex, props.items.length - 1));
        },
        
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
          if (event.key === 'Escape') {
            setShowSuggestions(false);
            return true;
          }
          
          if (!showSuggestions) {
            return false;
          }
          
          if (event.key === 'ArrowUp') {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
            return true;
          }
          
          if (event.key === 'ArrowDown') {
            setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
            return true;
          }
          
          if (event.key === 'Enter' || event.key === 'Tab') {
            if (suggestions.length > 0) {
              // Select the currently highlighted item
              const selectedDocument = suggestions[selectedIndex];
              if (selectedDocument) {
                // Use the command function from the suggestion config
                suggestion.command({ 
                  editor: editor, 
                  range: editor?.state.selection, 
                  props: selectedDocument 
                });
                return true;
              }
            }
            return true;
          }
          
          return false;
        },
        
        onExit: () => {
          setShowSuggestions(false);
          setSelectedIndex(0);
        },
      };
    },

    command: ({ editor, range, props }: { editor: any; range: any; props: Document }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'mention',
          attrs: {
            id: props.id,
            label: props.title
          }
        })
        .run();
    },
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion,
        char: '@',
        renderHTML({ node }) {
          return [
            'span',
            {
              class: 'mention',
              'data-id': node.attrs.id,
              'data-label': node.attrs.label,
            },
            `@${node.attrs.label}`,
          ];
        },
        renderText({ node }) {
          return `@${node.attrs.label}`;
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'w-full p-3 border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 min-h-[60px] max-h-32 overflow-y-auto',
      },
    },
  });

  const handleSend = () => {
    if (editor) {
      const content = editor.getText().trim();
      if (content) {
        onSend(content);
        editor.commands.clearContent();
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

  // Handle clicks outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionContainerRef.current && 
          !suggestionContainerRef.current.contains(event.target as Node) &&
          editorRef.current && 
          !editorRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="p-4 border-t border-zinc-800 relative">
      <div className="flex space-x-2">
        <div className="flex-1 relative" ref={editorRef}>
          <EditorContent editor={editor} />
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionContainerRef}
              className="fixed z-50"
              style={{
                top: `${suggestionPosition.top}px`,
                left: `${suggestionPosition.left}px`,
              }}
            >
              <MentionList
                items={suggestions}
                selectedIndex={selectedIndex}
                command={(document) => {
                  editor?.commands.insertContent({
                    type: 'mention',
                    attrs: {
                      id: document.id,
                      label: document.title
                    }
                  });
                  setShowSuggestions(false);
                  editor?.commands.focus();
                }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !editor?.getText().trim()}
          className="px-5 py-3 bg-gradient-to-br from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 disabled:from-zinc-800 disabled:to-zinc-850 disabled:cursor-not-allowed text-zinc-200 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 text-sm"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        Type @ to reference documents
      </div>
    </div>
  );
}