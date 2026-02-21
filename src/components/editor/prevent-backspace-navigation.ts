import type React from "react";

const EDITABLE_SELECTOR =
  "input, textarea, [contenteditable='true'], [role='textbox']";

export function preventBackspaceNavigation(
  event: React.KeyboardEvent<HTMLElement>,
) {
  if (event.key !== "Backspace" || event.defaultPrevented) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const editableTarget = target.closest(EDITABLE_SELECTOR);
  if (!editableTarget) {
    event.preventDefault();
  }
}
