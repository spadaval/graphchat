import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { useEffect } from 'react';
import { MentionList } from './MentionList';
import type { Document } from '~/lib/state';
import { getAllDocuments } from '~/lib/state';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

interface SmartMessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function SmartMessageInput({ onSend, disabled }: SmartMessageInputProps) {
  // Create suggestion configuration using Tiptap's recommended approach
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
      let component: ReactRenderer;
      let popup: any;
      
      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'top-start',
            maxWidth: '24rem',
          });
        },
        
        onUpdate: (props: any) => {
          component.updateProps(props);
          
          if (!props.clientRect) {
            return;
          }
          
          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },
        
        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }
          
          return component.ref?.onKeyDown(props);
        },
        
        onExit: () => {
          popup[0].destroy();
          component.destroy();
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
            label: props.title,
          },
        })
        .run();
    },
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Mention.extend({
        addAttributes() {
          return {
            id: {
              default: null,
              parseHTML: element => element.getAttribute('data-id'),
              renderHTML: attributes => {
                return {
                  'data-id': attributes.id,
                }
              },
            },
            label: {
              default: null,
              parseHTML: element => element.getAttribute('data-label'),
              renderHTML: attributes => {
                return {
                  'data-label': attributes.label,
                }
              },
            },
          }
        },
      }).configure({
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

  return (
    <div className="p-4 border-t border-zinc-800 relative">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <EditorContent editor={editor} />
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