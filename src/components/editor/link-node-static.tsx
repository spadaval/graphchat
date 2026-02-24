import { getLinkAttributes } from "@platejs/link";

import type { TLinkElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { isInternalCanonicalLinkTarget } from "~/lib/state/document-model";
import {
  resolveDocumentIdByCanonicalName,
  setCurrentDocument,
} from "~/lib/state/documents";
import { worldStore$ } from "~/lib/state/worlds";

export function LinkElementStatic(props: SlateElementProps<TLinkElement>) {
  const rawUrl = String(props.element.url || "");
  const normalizedUrl = rawUrl.trim();

  return (
    <SlateElement
      {...props}
      as="a"
      className="font-medium text-primary underline decoration-primary underline-offset-4"
      attributes={{
        ...props.attributes,
        ...getLinkAttributes(props.editor, props.element),
        onClick: (event) => {
          if (!isInternalCanonicalLinkTarget(normalizedUrl)) {
            return;
          }

          const worldId = worldStore$.currentWorldId.get();
          const targetDocumentId = resolveDocumentIdByCanonicalName(
            normalizedUrl,
            worldId,
          );
          if (!targetDocumentId) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          setCurrentDocument(targetDocumentId);
        },
      }}
    >
      {props.children}
    </SlateElement>
  );
}
