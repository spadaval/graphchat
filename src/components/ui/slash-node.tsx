"use client";

import { SparklesIcon, TextCursorInput } from "lucide-react";
import type { TComboboxInputElement } from "platejs";
import type { PlateEditor, PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import type * as React from "react";
import {
  GENERATE_NEXT_SLASH_EVENT,
  type GenerateNextSlashEventDetail,
} from "~/components/editor/generate-next-events";
import { PLACEHOLDER_TYPE } from "~/components/editor/plugins/placeholder-kit";
import { insertBlock } from "~/components/editor/transforms";

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "./inline-combobox";

type Group = {
  group: string;
  items: {
    icon: React.ReactNode;
    value: string;
    onSelect: (editor: PlateEditor, value: string) => void;
    className?: string;
    focusEditor?: boolean;
    keywords?: string[];
    label?: string;
  }[];
};

const groups: Group[] = [
  {
    group: "AI",
    items: [
      {
        focusEditor: false,
        icon: <SparklesIcon />,
        label: "Generate next",
        value: "action_generate_next",
        onSelect: (editor) => {
          window.dispatchEvent(
            new CustomEvent<GenerateNextSlashEventDetail>(
              GENERATE_NEXT_SLASH_EVENT,
              {
                detail: {
                  editorId: editor.id,
                },
              },
            ),
          );
        },
      },
    ],
  },
  {
    group: "Basic blocks",
    items: [
      {
        icon: <TextCursorInput />,
        keywords: ["template", "stub", "token"],
        label: "Placeholder",
        value: PLACEHOLDER_TYPE,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
];

export function SlashInputElement(
  props: PlateElementProps<TComboboxInputElement>,
) {
  const { editor, element } = props;

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox element={element} trigger="/">
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>No results</InlineComboboxEmpty>

          {groups.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(
                ({ focusEditor, icon, keywords, label, value, onSelect }) => (
                  <InlineComboboxItem
                    key={value}
                    value={value}
                    onClick={() => onSelect(editor, value)}
                    label={label}
                    focusEditor={focusEditor}
                    group={group}
                    keywords={keywords}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-cyan-200/25 bg-cyan-400/10 text-cyan-100">
                      {icon}
                    </div>
                    <span className="font-medium text-sm text-slate-100 leading-none">
                      {label ?? value}
                    </span>
                  </InlineComboboxItem>
                ),
              )}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}
