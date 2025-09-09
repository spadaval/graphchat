'use client';

import { MentionInputPlugin, MentionPlugin } from '@platejs/mention/react';
import { getAllDocuments } from '~/lib/state';

import {
  MentionElement,
  MentionInputElement,
} from '~/components/ui/mention-node';

// Get documents and convert to mentionable format
const getMentionables = () => {
  const documents = getAllDocuments();
  return documents.map((doc) => ({
    key: doc.id,
    text: doc.title,
  }));
};

export const MentionKit = [
  MentionPlugin.configure({
    options: { 
      triggerPreviousCharPattern: /^$|^[\s"']$/,
      getMentionables,
    },
  }).withComponent(MentionElement),
  MentionInputPlugin.withComponent(MentionInputElement),
];
