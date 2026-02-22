# Editor Internals (Current Architecture)

This document summarizes the current editor stack across:
- Legend State stores (`src/lib/state/*`)
- Plate editor model (`src/components/editor/*`)
- LLM generation/state (`src/lib/state/llm.ts`)

Primary active editor path:
- `src/routes/index.tsx` -> `StorybookEditor` -> `PlateDocumentEditor`

Legacy/parallel path still present in code:
- `DocumentEditor` + `BlockCard` + `blocks$`/`chatStore$`

## 1. Legend State Data Structures

## 1.1 `documentStore$` (document-centric editor state)
Defined in `src/lib/state/documents.ts`.

Top-level shape:
- `documents: Record<DocumentId, Document>`
- `folders: Record<FolderId, Folder>`
- `documentTypes: Record<string, DocumentTypeDefinition>`
- `currentDocumentId: DocumentId | undefined`
- `openDocumentIds: DocumentId[]`

`Document` fields relevant to editor internals:
- `id`, `title`, `createdAt`, `updatedAt`, `tags`, `type`, `parentId`, `worldId`
- `content: string`
- `editorVersion?: number` (v2 is Plate-first content)
- `blocks: BlockId[]` (legacy compatibility)
- `migrationError?: boolean`

Important change:
- `Document.aiSegments` no longer exists.
- AI segment provenance/branch metadata has been removed from document state.

Persistence:
- `documentStore$` is persisted via Legend localStorage sync (`name: "documentStore"`).

## 1.2 `modelProps$` (LLM generation parameters)
Defined in `src/lib/state/llm.ts`.

Shape is `ModelProperties`, including:
- sampling controls (`temperature`, `top_k`, `top_p`, `mirostat*`)
- output controls (`n_predict`, `stream`, `stop`)
- penalties (`repeat_penalty`, `presence_penalty`, `frequency_penalty`)
- extras (`n_probs`, `cache_prompt`, `return_tokens`, `seed`)

Persistence:
- persisted as `modelPropsStore`.

## 1.3 `uiPreferences$` (AI feature switches + rendering prefs)
Defined in `src/lib/state/ui.ts`.

Fields used directly by editor/LLM behavior:
- `aiEnabled`
- `aiProvider: "browser" | "server"`
- `inlineCompletion`
- `enableTokenProbabilities`
- `serverModelId`
- `documentWidth`

Also persisted via localStorage.

## 1.4 `serverStore$` (LLM server connection state)
Defined in `src/lib/state/server.ts`.

Fields:
- `serverUrl`, `serverInfo`, `loading`, `error`, `timestamp`

Behavior:
- on `serverUrl` change, generated API client base URL is updated.

## 1.5 Legacy stores still in code (`blocks$`, `chatStore$`)
Used by older block/chat flows and some shared utilities.

`blocks$` (`src/lib/state/block.ts`):
- `Record<BlockId, Block>`
- `Block` includes `text`, `role`, `viewMode`, `linkedDocuments`, `metadata` (legacy)

`chatStore$` (`src/lib/state/chat.ts`):
- chat threads referencing block IDs
- streaming assistant generation via `callLLMStreaming`

These stores are still persisted and used in legacy UI paths and migration compatibility, but not the main `PlateDocumentEditor` authoring loop.

## 2. Plate Editor Internal Model

Typed in `src/components/editor/plate-types.ts`.

Core model:
- Plate value is `MyValue` = array of block elements (`p`, headings, tables, media, etc.)
- Text leaves are `RichText` with marks (bold/italic/etc.) plus app-specific marks:
  - `ner?: boolean`
  - `nerType?: "person" | "organization" | "location"`
  - AI/suggestion/comment marks from plugins

AI segment node model:
- Dedicated element node type: `ai_segment`
- Node identity for streamed updates: `id?: string`
- No `aiNodeKind` metadata
- No `aiSegmentId` metadata

Markdown bridge:
- `MarkdownPlugin` in `MarkdownKit`
- editor state is serialized/deserialized via `editor.api.markdown.serialize()/deserialize()`
- persisted document content is canonical markdown string (`Document.content`)
- `ai_segment` round-trip uses HTML comment payload markers:
  - `<!--wc:ai-segment { ... }-->`

AI leaf rendering:
- `AILeaf` still highlights transient streamed AI text from Plate AI plugin state.

NER leaf rendering:
- `NerLeaf` underlines ranges and styles by entity type.

## 3. Key Sync + AI Flows

## 3.1 Editor mount and content bootstrap
In `PlateDocumentEditor`:
1. Reads `document$` observable (title/content).
2. Creates Plate editor with `UnifiedEditorKitWithAI`.
3. If `document.content` exists, deserializes markdown into Plate nodes.
4. Tracks `lastPersistedContentRef` to avoid unnecessary reset loops.

## 3.2 State -> editor synchronization (external changes)
`PlateDocumentEditor` effect on `content`:
- if incoming `document.content` differs from last persisted and differs from current serialized editor value:
  - sets `suppressOnChangeRef`
  - `editor.tf.setValue(deserialize(content))`
  - clears suppression

This prevents feedback loops when store updates originate outside local typing.

## 3.3 Editor -> state synchronization (local typing)
`handleContentChange` in `PlateDocumentEditor` triggers two debounced persist calls:
- quick persist (~200ms)
- deep persist (~900ms)

Current behavior:
- both paths serialize markdown and call `updateDocumentContent(docId, serialized)`
- no AI segment metadata reconciliation is performed

## 3.4 “Generate Next” document flow (main AI generation path)
Triggered by footer controls in `PlateDocumentEditor`.

Sequence:
1. Build prompt messages from current serialized document + optional user instruction.
2. Allocate `nodeId`; insert empty `ai_segment` node at end.
3. Start `callLLMStreaming(messages, modelProps$.get())`.
4. Accumulate chunk text.
5. Flush accumulated text into the `ai_segment` node (throttled) by replacing node text via `nodeId` match.
6. Persist editor content.

Important:
- No `aiSegments` state writes.
- No branch/token provenance persistence.

## 3.5 LLM request pipeline (`llm.ts`)
`callLLMStreaming` and `callLLM` are provider-agnostic wrappers.

Provider selection:
- from `uiPreferences$.aiProvider`
- `browser`: local transformers.js pipeline (Qwen ONNX)
- `server`: llama.cpp-compatible chat completions via SSE

Common behavior:
- Build request-scoped `LLMRequest` with source messages + timing + success/error fields.
- Inject linked document context into first user/system message (`formatDocumentsForContext`) when using block-based message inputs.

Streaming:
- Browser provider: generate full text then emit synthetic chunks.
- Server provider: consume SSE events and yield deltas + optional probabilities.
- Both yield `done` terminal chunk carrying final request metadata.

## 3.6 Plate AI menu/chat plugin flow (separate from Generate Next)
The Plate `AIChatPlugin`/menu stack (`ai-kit.tsx`, `ai-menu.tsx`, `use-chat.ts`) is a separate AI interaction system:
- slash/menu actions call `aiChat.submit(...)`
- `use-chat.ts` can adapt chat transport to `callLLMStreaming`
- chunk deltas are converted to AI SDK stream events for Plate suggestion/insert UX

## 3.7 NER flow inside editor
Two entry points:
- per-paragraph NER button (`ParagraphElement`)
- full-document NER action in `PlateDocumentEditor`

Both:
- run `detectNamedEntities(text)`
- clear old `ner`/`nerType` marks
- map text offsets to Slate ranges
- set leaf marks
- persist editor state after document-wide pass

## 4. Current Architectural Picture

The app currently has two overlapping paradigms:
1. Document-v2 paradigm (active):
- canonical markdown in `documentStore$.documents[docId].content`
- Plate node model includes dedicated `ai_segment` element nodes
- no parallel AI segment metadata store

2. Legacy block/chat paradigm (still present):
- `blocks$` + `chatStore$` for threaded chat and block cards
- still used by some LLM/document-context helper paths and migration compatibility

Current highest-leverage boundary for future editor changes:
- Plate node schema + markdown serialization contract (`Document.content`)
