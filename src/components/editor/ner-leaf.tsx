"use client";

import type { TText } from "platejs";
import type { PlateLeafProps } from "platejs/react";
import { PlateLeaf } from "platejs/react";
import type { NerEntityType } from "~/lib/ner";
import { cn } from "~/lib/utils";

type NerLeafText = TText & {
  ner?: boolean;
  nerType?: NerEntityType;
};

const typeStyles: Record<NerEntityType, string> = {
  location: "underline decoration-cyan-500/80",
  organization: "underline decoration-amber-500/80",
  person: "underline decoration-emerald-500/80",
};

const typeLabels: Record<NerEntityType, string> = {
  location: "Location",
  organization: "Organization",
  person: "Person",
};

export function NerLeaf(props: PlateLeafProps<NerLeafText>) {
  const { leaf } = props;
  const nerType = leaf.nerType;
  const hasNer = leaf.ner && !!nerType;

  return (
    <PlateLeaf
      {...props}
      className={cn(
        hasNer && "underline decoration-2 underline-offset-2",
        hasNer && nerType && typeStyles[nerType],
      )}
      data-ner-type={hasNer ? nerType : undefined}
      data-ner-label={hasNer && nerType ? typeLabels[nerType] : undefined}
    >
      {props.children}
    </PlateLeaf>
  );
}
