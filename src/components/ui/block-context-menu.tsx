"use client";

import { AIChatPlugin } from "@platejs/ai/react";
import {
  BLOCK_CONTEXT_MENU_ID,
  BlockMenuPlugin,
  BlockSelectionPlugin,
} from "@platejs/selection/react";
import { KEYS } from "platejs";
import { useEditorPlugin, usePlateState, usePluginOption } from "platejs/react";
import * as React from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { useIsTouchDevice } from "~/hooks/use-is-touch-device";

type Value = "askAI" | null;

const menuItemClass =
  "min-h-10 rounded-lg px-2.5 py-2 font-medium text-slate-100 data-[highlighted]:bg-cyan-500/18 data-[highlighted]:text-cyan-100 data-[highlighted]:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]";
const menuSubTriggerClass =
  "min-h-10 rounded-lg px-2.5 py-2 font-medium text-slate-100 data-[state=open]:bg-cyan-500/18 data-[state=open]:text-cyan-100 data-[state=open]:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)] data-[highlighted]:bg-cyan-500/18 data-[highlighted]:text-cyan-100 data-[highlighted]:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]";
const menuSubContentClass =
  "w-52 overflow-hidden rounded-xl border border-cyan-200/20 bg-slate-950/95 p-1.5 text-slate-100 shadow-[0_20px_70px_-24px_rgba(8,145,178,0.62)] backdrop-blur-xl";

export function BlockContextMenu({ children }: { children: React.ReactNode }) {
  const { api, editor } = useEditorPlugin(BlockMenuPlugin);
  const [value, setValue] = React.useState<Value>(null);
  const isTouch = useIsTouchDevice();
  const [readOnly] = usePlateState("readOnly");
  const openId = usePluginOption(BlockMenuPlugin, "openId");
  const isOpen = openId === BLOCK_CONTEXT_MENU_ID;

  const handleTurnInto = React.useCallback(
    (type: string) => {
      editor
        .getApi(BlockSelectionPlugin)
        .blockSelection.getNodes()
        .forEach(([node, path]) => {
          if (node[KEYS.listType]) {
            editor.tf.unsetNodes([KEYS.listType, "indent"], {
              at: path,
            });
          }

          editor.tf.toggleBlock(type, { at: path });
        });
    },
    [editor],
  );

  const handleAlign = React.useCallback(
    (align: "center" | "left" | "right") => {
      editor
        .getTransforms(BlockSelectionPlugin)
        .blockSelection.setNodes({ align });
    },
    [editor],
  );

  if (isTouch) {
    return children;
  }

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) {
          api.blockMenu.hide();
        }
      }}
      modal={false}
    >
      <ContextMenuTrigger
        asChild
        onContextMenu={(event) => {
          const dataset = (event.target as HTMLElement).dataset;
          const disabled =
            dataset?.slateEditor === "true" ||
            readOnly ||
            dataset?.plateOpenContextMenu === "false";

          if (disabled) return event.preventDefault();

          setTimeout(() => {
            api.blockMenu.show(BLOCK_CONTEXT_MENU_ID, {
              x: event.clientX,
              y: event.clientY,
            });
          }, 0);
        }}
      >
        <div className="w-full">{children}</div>
      </ContextMenuTrigger>
      {isOpen && (
        <ContextMenuContent
          className="w-72 overflow-hidden rounded-xl border border-cyan-200/20 bg-slate-950/95 p-1.5 text-slate-100 shadow-[0_20px_70px_-24px_rgba(8,145,178,0.62)] backdrop-blur-xl"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            editor.getApi(BlockSelectionPlugin).blockSelection.focus();

            if (value === "askAI") {
              editor.getApi(AIChatPlugin).aiChat.show();
            }

            setValue(null);
          }}
        >
          <ContextMenuLabel className="mb-1 px-2.5 pt-1 font-semibold text-[11px] text-cyan-100/75 tracking-[0.14em] uppercase">
            Actions
          </ContextMenuLabel>
          <ContextMenuGroup className="space-y-0.5">
            <ContextMenuItem
              className={menuItemClass}
              onClick={() => {
                setValue("askAI");
              }}
            >
              Ask AI
            </ContextMenuItem>
            <ContextMenuItem
              className={menuItemClass}
              onClick={() => {
                editor
                  .getTransforms(BlockSelectionPlugin)
                  .blockSelection.removeNodes();
                editor.tf.focus();
              }}
            >
              Delete
            </ContextMenuItem>
            <ContextMenuItem
              className={menuItemClass}
              onClick={() => {
                editor
                  .getTransforms(BlockSelectionPlugin)
                  .blockSelection.duplicate();
              }}
            >
              Duplicate
              {/* <ContextMenuShortcut>⌘ + D</ContextMenuShortcut> */}
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger className={menuSubTriggerClass}>
                Turn into
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className={menuSubContentClass}>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleTurnInto(KEYS.p)}
                >
                  Paragraph
                </ContextMenuItem>

                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleTurnInto(KEYS.h1)}
                >
                  Heading 1
                </ContextMenuItem>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleTurnInto(KEYS.h2)}
                >
                  Heading 2
                </ContextMenuItem>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleTurnInto(KEYS.h3)}
                >
                  Heading 3
                </ContextMenuItem>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleTurnInto(KEYS.blockquote)}
                >
                  Blockquote
                </ContextMenuItem>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleTurnInto(KEYS.codeDrawing)}
                >
                  Code Drawing
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>

          <ContextMenuSeparator className="my-1.5 bg-white/10" />
          <ContextMenuLabel className="mb-1 px-2.5 pt-0.5 font-semibold text-[11px] text-cyan-100/75 tracking-[0.14em] uppercase">
            Layout
          </ContextMenuLabel>
          <ContextMenuGroup className="space-y-0.5">
            <ContextMenuItem
              className={menuItemClass}
              onClick={() =>
                editor
                  .getTransforms(BlockSelectionPlugin)
                  .blockSelection.setIndent(1)
              }
            >
              Indent
            </ContextMenuItem>
            <ContextMenuItem
              className={menuItemClass}
              onClick={() =>
                editor
                  .getTransforms(BlockSelectionPlugin)
                  .blockSelection.setIndent(-1)
              }
            >
              Outdent
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger className={menuSubTriggerClass}>
                Align
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className={menuSubContentClass}>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleAlign("left")}
                >
                  Left
                </ContextMenuItem>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleAlign("center")}
                >
                  Center
                </ContextMenuItem>
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={() => handleAlign("right")}
                >
                  Right
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
