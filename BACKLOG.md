# Backlog

## 🚨 Critical Bugfixes

### Custom Block Editing
- Make custom blocks reliably selectable
- Allow adding new lines after AI segments
- Fix cursor navigation around custom blocks

### Document Sync
- Preserve AI segments during sync
- Prevent conversion to plain text

## ✨ Improvements

### Placeholder Block Completion
- [x] Complete placeholder block implementation before other document-overhaul features.
- [x] Ensure dedicated block type behavior is production-ready (insert via slash menu, click-to-select, transform to paragraph on type).
- [ ] Validate placeholder blocks - create and test out a template using them
- [ ] Add acceptance tests for template-driven placeholder insertion and editing flows.
- [ ] Add bulk-replace flow for template placeholders.

### Testing overhaul

Identify key complex areas, write tests. ld

Add unit tests, add some integration tests.

### Document Overhaul Prerequisites (Phase A)
Status: Foundation implementation complete in code. Formal acceptance tests and regression coverage still pending.

#### 1) Document Model V2 + Type/Template Registries
- [x] Add `DocumentTypeDefinitionV2`, `TemplateDefinition`, and migration path from `document.type` to `baseTypeId/templateId`.
- [x] Extend document schema to: `id, canonicalName, title, baseTypeId, templateId, tags[], frontmatter, content, worldId, createdAt, updatedAt`.
- Usage intent:
  - Template-aware document creation.
  - Stable typed grouping (base type/template) for collections and validation.
  - Name-based IDs/canonical names improve portability for export/import.
- Acceptance checks:
  - [ ] Creating a `religion` template document auto-maps to base type `organization`.
  - [ ] Existing docs with `type` migrate without data loss.
  - [ ] Every document has a unique canonical name derived from title canonicalization.

#### 2) Universal Document References (Canonical Syntax)
- [x] Implement parser + serializer support for markdown internal links: `[Label](canonical-name)`.
- [x] Interpret markdown links with no base URL as internal document links.
- [x] Update targets when canonical names change on title rename.
- Usage intent:
  - Durable cross-document links in markdown and editor navigation.
- Acceptance checks:
  - [ ] Reference round-trips through editor/markdown unchanged.
  - [ ] Clicking reference navigates to target document.
  - [ ] Renaming target updates canonical link target and preserves link validity.

#### 3) Typed Relation Model (Replace Generic Edges)
- [x] Replace `graphStore$.edges` generic `{ source, target, type }` with typed relation records + metadata:
  - `status`, `startDate`, `endDate`, `notes`, `strength`, `provenance`, `confidence`
- [x] Add domain/range validation from relation definitions.
- Usage intent:
  - Canonical world-knowledge graph usable by UI filters and AI context.
- Acceptance checks:
  - [ ] Valid chain works (person -> organization -> place).
  - [ ] Invalid relation is rejected (e.g., `natural_law belongs_to person`).

#### 4) Foundational Indexes + Collection Selectors
- [x] Add in-memory indexes/selectors for:
  - docs by `baseTypeId`
  - docs by `templateId`
  - docs by `tag`
  - outgoing/incoming relations by document
  - referenced docs from markdown links
- Usage intent:
  - Power future collection sidebar and fast filter/search flows.
- Acceptance checks:
  - [ ] Filtering by base type/template/tag/relation returns correct sets.
  - [ ] Selector updates reactively on document/reference/relation changes.

#### 5) Tag Normalization + Reuse Contract
- [x] Define normalized tag storage contract (canonical casing/format) and autocomplete source from existing tags.
- Usage intent:
  - Replace folder-only organization with consistent tag-based grouping.
- Acceptance checks:
  - [ ] Same logical tag entered with different casing resolves to one canonical tag.
  - [ ] Tag picker suggests existing tags during editing.

#### Public API / Interface Changes to Record
- [x] `Document` shape changes (`type` deprecated, `baseTypeId/templateId/frontmatter` introduced).
- [x] `Document` includes `canonicalName`; IDs are name-based for portable export/import flows.
- [x] New registries: `DocumentTypeDefinitionV2`, `TemplateDefinition`, `RelationTypeDefinition`.
- [x] Relation record contract replaces generic edge contract.
- [x] Markdown internal-link grammar support for `[label](canonical-name)` with internal resolution when no base URL exists.

#### Test Scenarios to Attach
- [ ] Template creation -> base type enforcement.
- [ ] Markdown reference creation, rename propagation, and click-through navigation.
- [ ] Valid/invalid relation creation with domain/range checks.
- [ ] Collection filter correctness across base type/template/tag/relation.
- [ ] Migration regression: legacy docs still open/edit/save correctly after model changes.

#### Assumptions and Defaults
- Scope locked to Foundation (Phase A) only.
- Built-in type/template catalog only in v1 (no user-defined types yet).
- Editor `contentModel` is canonical persistence; markdown is primarily for export and AI context.
- Markdown export/import may be lossy for editor-only metadata.
- Assume external links are absolute URLs for now (backlog item to relax later if needed).
- Folder removal/navigation rewrite is deferred to later phases, but indexes/selectors are added now.
- Frontmatter-heavy authoring UX and placeholder block UX are deferred to later phases.

### Entity UX Enhancements
- [ ] Make entity highlights more visible.
- [ ] Differentiate linked vs unlinked entity candidates visually (clear styling/state distinction when `href` exists).
- [ ] Auto-load entity model.
- [ ] Add mention syntax (`@Ardelia`) with dropdown for existing documents.
- [ ] Evaluate optional sidecar persistence for editor-only candidate state (not required for current overhaul).

### Settings/UI Follow-ups
- [ ] Fix OpenRouter/local model selector UX: control appears cut off and page scrolling is difficult while configuring models.
- [ ] Fully redesign or remove the quick settings sidebar (current UX is really bad).
- [ ] Make the OpenRouter model picker better - combobox, filters, better defaults, load limit?
- [ ] Add profiles (`model + preset`) so model-specific settings can be switched as cohesive bundles.
- [ ] Explore higher-order setting hierarchies beyond profiles for complex model/runtime configuration sets.

### AI Authoring Features
- [ ] Fix `Generate Next` inserting an unexpected `<callout>` tag at the start of generated output.
- [ ] Add advanced regenerate flow: modal to edit history + generation settings before regenerating a block.
- [ ] Add text-selection context menu actions, including AI regenerate for selected text via fill-in-the-middle.
- [ ] Add "Generate document from entity candidate" flow.
- [ ] Add "Chat with your document" feature.
- [ ] Add advanced semantic search across documents, potentially with LLM augmentation.

### General Improvements
- Refresh overall UI visual design
- Move heavy work to web workers (reduce ~100ms setTimeout handlers)
- Evaluate PlateJS AI features integration
- Expand keyboard coverage for all actions
- Add command palette
- Add custom document types (stat blocks) with custom rendering
- Add AI features to AI Segments (regenerate, token view, regenerate-from-token, metadata display)
