"use client";

import { createPlatePlugin } from "platejs/react";
import { NerLeaf } from "~/components/editor/ner-leaf";

export const nerPlugin = createPlatePlugin({
  key: "ner",
  node: {
    isLeaf: true,
  },
}).configure({
  node: { component: NerLeaf },
});

export const NerKit = [nerPlugin];
