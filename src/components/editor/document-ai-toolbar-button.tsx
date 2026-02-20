"use client";

import { AIChatPlugin } from "@platejs/ai/react";
import { useEditorPlugin } from "platejs/react";
import * as React from "react";
import { useEditor } from "~/components/editor/editor-kit";
import { ToolbarButton } from "~/components/editor/toolbar";

interface DocumentAIToolbarButtonProps
  extends React.ComponentProps<typeof ToolbarButton> {
  tooltip?: string;
}

export function DocumentAIToolbarButton({
  tooltip = "AI Assistant (Ctrl+J / Cmd+J)",
  ...props
}: DocumentAIToolbarButtonProps) {
  const { api } = useEditorPlugin(AIChatPlugin);
  const _editor = useEditor();

  // Handle keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+J or Cmd+J
      if ((event.ctrlKey || event.metaKey) && event.key === "j") {
        event.preventDefault();
        api.aiChat.show();
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [api]);

  return (
    <ToolbarButton
      {...props}
      onClick={() => {
        api.aiChat.show();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      title={tooltip}
    >
      {props.children}
    </ToolbarButton>
  );
}
