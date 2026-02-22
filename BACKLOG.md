# Backlog

## Bugfixes

- Fix custom block editing behavior:
  - Make custom blocks reliably selectable.
  - Allow adding a new line after an AI segment.
  - Fix cursor navigation around custom blocks.
- Fix document sync so AI segments are preserved and do not convert to plain text.
- Fix NER:
  - Consider using a better model.
  - Global NER doesn't work, paragraph-level NER does.
  - If a mark ends within a word, we should automatically extend it to the full word (until whitespace).

## Improvements

- Improve NER:
  - Make entity highlights more visible.
  - Load the NER model automatically.
  - Add functionality to manually move the boundaries of an entity.
  - Add a full card for each NER entity, which shows up on click. It should contain either a preview of the corresponding document, or a button to quickly create and link a new document (or to delete the NER highlight and return to regular text).
  - Make it possible to create an NER-linked entity manually through mention syntax (e.g. `@Ardelia`). Show a dropdown for existing documents? 
  - NER is not persisted! Consider how NER entities should be stored in markdown. Links, maybe?
- Redesign settings:
  - [x] Reduce sidebar clutter. Move all but the most important settings to the modal.
  - [x] Redesign the modal to be wider, with a standard two-level structure.
  - [x] Rework the `AI Runtime` selector into API backend enable/disable, with browser pipeline used for simple tasks.
  - [x] Add model testing/debug tools for both the in-browser and API backends.
  - [x] Add reusable presets.
  - [x] Add a global "debug mode" and gate verbose logging behind it.
  - [x] Remove the separate `Server` sidebar tab and fold server controls into settings.
  - [x] Collapse sidebar model picker to a dropdown and add quick preset switching in the sidebar.
  - [ ] Add individual feature toggles (global AI master switch removed).
- Refresh overall UI visual design.
- Evaluate moving heavy work to web workers (some setTimeout handlers currently take too long, ~100ms)
- Implement document linking and a document index.
- Decide whether to remove or fully integrate PlateJS AI features (including assistant features).
- Expand keyboard coverage so all key actions are accessible without a mouse.
- Add a command palette.
- Build out a proper set of document types (person, location, organization, ).
- Add more custom document types (e.g. stat blocks) with custom rendering, special functionality, or both.
- Add AI features to the AI Segment - regenerate, token view, regenerate-from-token (i.e. regenerate with a prefill), add metadata to the component (which model was used, tokens per second, etc) 
