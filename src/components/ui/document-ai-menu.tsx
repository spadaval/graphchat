"use client";

import { AIChatPlugin, AIPlugin, useEditorChat } from "@platejs/ai/react";
import { BlockSelectionPlugin, useIsSelecting } from "@platejs/selection/react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Check,
  CornerUpLeft,
  FeatherIcon,
  ListEnd,
  ListMinus,
  ListPlus,
  PauseIcon,
  PenLine,
  SmileIcon,
  Wand,
  X,
} from "lucide-react";
import { NodeApi } from "platejs";
import {
  useEditorPlugin,
  useEditorRef,
  useFocusedLast,
  useHotkeys,
  usePluginOption,
} from "platejs/react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "~/components/ui/popover";
import { useChat } from "~/components/use-chat";
import { cn } from "~/lib/utils";

import { AIChatEditor } from "./ai-chat-editor";

export function DocumentAIMenu() {
  const { api, editor } = useEditorPlugin(AIChatPlugin);
  const mode = usePluginOption(AIChatPlugin, "mode");
  const streaming = usePluginOption(AIChatPlugin, "streaming");
  const isSelecting = useIsSelecting();
  const isFocusedLast = useFocusedLast();
  const open = usePluginOption(AIChatPlugin, "open") && isFocusedLast;
  const [value, setValue] = React.useState("");

  const chat = useChat();

  const { input, messages, setInput, status } = chat;
  const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(
    null,
  );

  const content = messages
    .filter((m) => m.role === "assistant")
    .at(-1)?.content;

  React.useEffect(() => {
    if (streaming) {
      const anchor = api.aiChat.node({ anchor: true });
      setTimeout(() => {
        if (anchor && anchor.length > 0) {
          const anchorDom = editor.api.toDOMNode(anchor[0]);
          if (anchorDom) {
            setAnchorElement(anchorDom);
          }
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, api.aiChat.node, editor.api.toDOMNode]);

  const setOpen = (open: boolean) => {
    if (open) {
      api.aiChat.show();
    } else {
      api.aiChat.hide();
    }
  };

  const show = (anchorElement: HTMLElement) => {
    setAnchorElement(anchorElement);
    setOpen(true);
  };

  useEditorChat({
    chat,
    onOpenBlockSelection: (blocks) => {
      const node = blocks.at(-1);
      if (node) {
        const domNode = editor.api.toDOMNode(node[0]);
        if (domNode) {
          show(domNode);
        }
      }
    },
    onOpenChange: (open) => {
      if (!open) {
        setAnchorElement(null);
        setInput("");
      }
    },
    onOpenCursor: () => {
      const ancestorNodes = editor.api.block({ highest: true });
      if (ancestorNodes && ancestorNodes.length > 0) {
        const ancestor = ancestorNodes[0];

        if (!editor.api.isAt({ end: true }) && !editor.api.isEmpty(ancestor)) {
          editor
            .getApi(BlockSelectionPlugin)
            .blockSelection.set(ancestor.id as string);
        }

        const domNode = editor.api.toDOMNode(ancestor);
        if (domNode) {
          show(domNode);
        }
      }
    },
    onOpenSelection: () => {
      const blocks = editor.api.blocks();
      const lastBlock = blocks.at(-1);
      if (lastBlock) {
        const domNode = editor.api.toDOMNode(lastBlock[0]);
        if (domNode) {
          show(domNode);
        }
      }
    },
  });

  useHotkeys("esc", () => {
    api.aiChat.stop();
  });

  const isLoading = status === "streaming" || status === "submitted";

  if (isLoading && mode === "insert") {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor virtualRef={{ current: anchorElement || null }} />

      <PopoverContent
        className="border-none bg-transparent p-0 shadow-none"
        style={{
          width: anchorElement?.offsetWidth,
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          api.aiChat.hide();
        }}
        align="center"
        side="bottom"
      >
        <Command
          className="w-full rounded-lg border shadow-md"
          value={value}
          onValueChange={setValue}
        >
          {mode === "chat" && isSelecting && content && (
            <AIChatEditor content={content} />
          )}

          {isLoading ? (
            <div className="flex grow items-center gap-2 p-2 text-sm text-muted-foreground select-none">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              {messages.length > 1 ? "Editing..." : "Thinking..."}
            </div>
          ) : (
            <CommandPrimitive.Input
              className={cn(
                "flex h-9 w-full min-w-0 border-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30",
                "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                "border-b focus-visible:ring-transparent",
              )}
              value={input}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && input.length === 0) {
                  e.preventDefault();
                  api.aiChat.hide();
                }
                if (e.key === "Enter" && !e.shiftKey && !value) {
                  e.preventDefault();
                  void api.aiChat.submit();
                }
              }}
              onValueChange={setInput}
              placeholder="Ask AI anything about your document..."
              data-plate-focus
              autoFocus
            />
          )}

          {!isLoading && (
            <CommandList>
              <DocumentAIMenuItems setValue={setValue} />
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type EditorChatState =
  | "cursorCommand"
  | "cursorSuggestion"
  | "selectionCommand"
  | "selectionSuggestion";

const aiChatItems = {
  accept: {
    icon: <Check />,
    label: "Accept",
    value: "accept",
    onSelect: ({ editor }: { editor: any }) => {
      editor.getTransforms(AIChatPlugin).aiChat.accept();
      editor.tf.focus({ edge: "end" });
    },
  },
  continueWrite: {
    icon: <PenLine />,
    label: "Continue writing",
    value: "continueWrite",
    onSelect: ({ editor }: { editor: any }) => {
      const ancestorNode = editor.api.block({ highest: true });

      if (!ancestorNode) return;

      const isEmpty = NodeApi.string(ancestorNode[0]).trim().length === 0;

      void editor.getApi(AIChatPlugin).aiChat.submit({
        mode: "insert",
        prompt: isEmpty
          ? `<Document>
{editor}
</Document>
Start writing a new paragraph AFTER <Document> ONLY ONE SENTENCE`
          : "Continue writing AFTER <Block> ONLY ONE SENTENCE. DONT REPEAT THE TEXT.",
      });
    },
  },
  discard: {
    icon: <X />,
    label: "Discard",
    shortcut: "Escape",
    value: "discard",
    onSelect: ({ editor }: { editor: any }) => {
      editor.getTransforms(AIPlugin).ai.undo();
      editor.getApi(AIChatPlugin).aiChat.hide();
    },
  },
  emojify: {
    icon: <SmileIcon />,
    label: "Emojify",
    value: "emojify",
    onSelect: ({ editor }: { editor: any }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: "Emojify",
      });
    },
  },
  fixSpelling: {
    icon: <Check />,
    label: "Fix spelling & grammar",
    value: "fixSpelling",
    onSelect: ({ editor }: { editor: any }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: "Fix spelling and grammar",
      });
    },
  },
  improveWriting: {
    icon: <Wand />,
    label: "Improve writing",
    value: "improveWriting",
    onSelect: ({ editor }: { editor: any }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: "Improve the writing",
      });
    },
  },
  insertBelow: {
    icon: <ListEnd />,
    label: "Insert below",
    value: "insertBelow",
    onSelect: ({ aiEditor, editor }: { aiEditor: any; editor: any }) => {
      /** Format: 'none' Fix insert table */
      void editor
        .getTransforms(AIChatPlugin)
        .aiChat.insertBelow(aiEditor, { format: "none" });
    },
  },
  makeLonger: {
    icon: <ListPlus />,
    label: "Make longer",
    value: "makeLonger",
    onSelect: ({ editor }: { editor: any }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: "Make longer",
      });
    },
  },
  makeShorter: {
    icon: <ListMinus />,
    label: "Make shorter",
    value: "makeShorter",
    onSelect: ({ editor }: { editor: any }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: "Make shorter",
      });
    },
  },
  replace: {
    icon: <Check />,
    label: "Replace selection",
    value: "replace",
    onSelect: ({ aiEditor, editor }: { aiEditor: any; editor: any }) => {
      void editor.getTransforms(AIChatPlugin).aiChat.replaceSelection(aiEditor);
    },
  },
  simplifyLanguage: {
    icon: <FeatherIcon />,
    label: "Simplify language",
    value: "simplifyLanguage",
    onSelect: ({ editor }: { editor: any }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: "Simplify the language",
      });
    },
  },
  tryAgain: {
    icon: <CornerUpLeft />,
    label: "Try again",
    value: "tryAgain",
    onSelect: ({ editor }: { editor: any }) => {
      void editor.getApi(AIChatPlugin).aiChat.reload();
    },
  },
};

const menuStateItems: Record<
  EditorChatState,
  {
    items: (typeof aiChatItems)[keyof typeof aiChatItems][];
    heading?: string;
  }[]
> = {
  cursorCommand: [
    {
      items: [aiChatItems.continueWrite],
    },
  ],
  cursorSuggestion: [
    {
      items: [aiChatItems.accept, aiChatItems.discard, aiChatItems.tryAgain],
    },
  ],
  selectionCommand: [
    {
      items: [
        aiChatItems.improveWriting,
        aiChatItems.makeLonger,
        aiChatItems.makeShorter,
        aiChatItems.fixSpelling,
        aiChatItems.simplifyLanguage,
        aiChatItems.emojify,
      ],
    },
  ],
  selectionSuggestion: [
    {
      items: [
        aiChatItems.replace,
        aiChatItems.insertBelow,
        aiChatItems.discard,
        aiChatItems.tryAgain,
      ],
    },
  ],
};

export const DocumentAIMenuItems = ({
  setValue,
}: {
  setValue: (value: string) => void;
}) => {
  const editor = useEditorRef();
  const { messages } = usePluginOption(AIChatPlugin, "chat");
  const aiEditor = usePluginOption(AIChatPlugin, "aiEditor");
  const isSelecting = useIsSelecting();

  const menuState = (() => {
    if (messages && messages.length > 0) {
      return isSelecting ? "selectionSuggestion" : "cursorSuggestion";
    }

    return isSelecting ? "selectionCommand" : "cursorCommand";
  })();

  const menuGroups = (() => {
    const items = menuStateItems[menuState];

    return items;
  })();

  React.useEffect(() => {
    if (menuGroups.length > 0 && menuGroups[0].items.length > 0) {
      setValue(menuGroups[0].items[0].value);
    }
  }, [menuGroups, setValue]);

  return (
    <>
      {menuGroups.map((group, index) => (
        <CommandGroup key={`group-${index}`} heading={group.heading}>
          {group.items.map((menuItem) => (
            <CommandItem
              key={menuItem.value}
              className="[&_svg]:text-muted-foreground"
              value={menuItem.value}
              onSelect={() => {
                menuItem.onSelect?.({
                  aiEditor,
                  editor: editor,
                });
              }}
            >
              {menuItem.icon}
              <span>{menuItem.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </>
  );
};

export function AILoadingBar() {
  const chat = usePluginOption(AIChatPlugin, "chat");
  const mode = usePluginOption(AIChatPlugin, "mode");

  const { status } = chat;

  const { api } = useEditorPlugin(AIChatPlugin);

  const isLoading = status === "streaming" || status === "submitted";

  const visible = isLoading && mode === "insert";

  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground shadow-md transition-all duration-300",
      )}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      <span>{status === "submitted" ? "Thinking..." : "Writing..."}</span>
      <Button
        size="sm"
        variant="ghost"
        className="flex items-center gap-1 text-xs"
        onClick={() => api.aiChat.stop()}
      >
        <PauseIcon className="h-4 w-4" />
        Stop
        <kbd className="ml-1 rounded bg-border px-1 font-mono text-[10px] text-muted-foreground shadow-sm">
          Esc
        </kbd>
      </Button>
    </div>
  );
}
