import React, { useCallback, useEffect, useRef } from "react";
import { use$ } from "@legendapp/state/react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { ParagraphPlugin } from "platejs/react";
import { MentionKit } from "./mention-kit";
import {
  getAllDocuments,
  chatStore$,
  setCurrentUserMessage,
} from "~/lib/state";
import { addDocumentToCurrentMessage } from "~/lib/state/ui";
import { getMentionOnSelectItem } from "@platejs/mention";
import type { TElement } from "platejs";

// Create the plugins
const plugins = [ParagraphPlugin, ...MentionKit];

interface PlateEditorProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function PlateEditor({ onSend, disabled }: PlateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Get current user message from state
  const { currentUserMessage } = use$(chatStore$);

  // Create the editor
  const editor = usePlateEditor({
    id: "chat-editor",
    plugins,
    value: [{ type: "p", children: [{ text: currentUserMessage || "" }] }],
  });

  console.log("[PlateEditor] Editor initialized");

  // Handle editor changes
  const handleEditorChange = (value: any) => {
    if (!editor) return;

    // Extract text content from editor children
    const children = editor.children;
    let content = "";

    if (children && children.length > 0) {
      content = children
        .map((node: any) => {
          if (node.type === "p" && node.children) {
            return node.children.map((child: any) => child.text || "").join("");
          }
          return "";
        })
        .join("\n");
    }

    console.log("[PlateEditor] Content extracted:", {
      content,
      length: content.length,
    });
    setCurrentUserMessage(content);
  };

  // Update editor when currentUserMessage changes externally (only if editor is empty)
  useEffect(() => {
    if (
      editor &&
      !editor.children?.[0]?.children?.[0]?.text &&
      currentUserMessage
    ) {
      console.log("[PlateEditor] Syncing observable to empty editor");
      editor.tf.insertText(currentUserMessage, { at: [0, 0] });
    }
  }, [currentUserMessage, editor]);

  // Custom onSelectItem function to handle document mentions
  const onSelectItem = getMentionOnSelectItem();

  // Custom function to handle document selection
  const handleDocumentSelect = (document: any) => {
    // Add document to current message links when mentioned
    addDocumentToCurrentMessage(document.key);

    // Use the editor's onSelectItem function
    if (editor) {
      onSelectItem(editor, document);
    }
  };

  const handleSend = useCallback(() => {
    if (editor) {
      // Extract text content from editor children (same method as handleEditorChange)
      const children = editor.children;
      let content = "";

      if (children && children.length > 0) {
        content = children
          .map((node: any) => {
            if (node.type === "p" && node.children) {
              return node.children
                .map((child: any) => child.text || "")
                .join("");
            }
            return "";
          })
          .join("\n");
      }

      if (content.trim()) {
        onSend(content);
        // Clear the editor and state
        editor.tf.reset();
        setCurrentUserMessage("");
      }
    }
  }, [editor, onSend]);

  // Handle global key events for sending message
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to send
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        handleSend();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSend]);

  return (
    <Plate editor={editor} onChange={handleEditorChange}>
      <PlateContent
        className="w-full p-3 border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 min-h-[60px] max-h-32 overflow-y-auto"
        placeholder="Type your message... Type @ to reference documents"
      />
    </Plate>
  );
}
