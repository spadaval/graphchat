"use client";

import type { PlateElementProps } from "platejs/react";
import { PlateElement, useReadOnly } from "platejs/react";

import { cn } from "~/lib/utils";

export function PlaceholderElement(props: PlateElementProps) {
  const { editor, element } = props;
  const readOnly = useReadOnly();

  return (
    <PlateElement
      {...props}
      className={cn(
        "m-0 cursor-pointer px-0 py-1 text-muted-foreground/80",
        "selection:bg-zinc-600/30",
      )}
      attributes={{
        ...props.attributes,
        contentEditable: false,
      }}
      onMouseDown={(event) => {
        if (readOnly) return;

        event.preventDefault();
        event.stopPropagation();
        editor.tf.select(element);
      }}
    >
      {props.children}
    </PlateElement>
  );
}
