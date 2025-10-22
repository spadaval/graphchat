"use client";

import { MentionInputPlugin, MentionPlugin } from "@platejs/mention/react";
import {
  MentionElement,
  MentionInputElement,
} from "~/components/ui/mention-node";
import { getAllDocuments } from "~/lib/state";

export const MentionKit = [
  MentionPlugin.configure({
    options: {
      triggerPreviousCharPattern: /^$|^[\s"']$/,
    },
  }).withComponent(MentionElement),
  MentionInputPlugin.withComponent(MentionInputElement),
];
