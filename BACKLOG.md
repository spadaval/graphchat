# Backlog

## 🚨 Critical Bugfixes

### Custom Block Editing
- Make custom blocks reliably selectable
- Allow adding new lines after AI segments
- Fix cursor navigation around custom blocks

### Document Sync
- Preserve AI segments during sync
- Prevent conversion to plain text

### NER (Named Entity Recognition)
- Fix global NER functionality (paragraph-level works)
- Consider better NER model
- Auto-extend entity marks to full words (whitespace boundaries)

## ✨ Improvements

### Placeholder Block Completion (Do First)
- Complete placeholder block implementation before other document-overhaul features.
- Ensure dedicated block type behavior is production-ready (insert, transform to paragraph, bulk replace).
- Add acceptance tests for template-driven placeholder insertion and editing flows.

### Document Overhaul Prerequisites (Phase A)

#### 1) Document Model V2 + Type/Template Registries
- Add `DocumentTypeDefinitionV2`, `TemplateDefinition`, and migration path from `document.type` to `baseTypeId/templateId`.
- Extend document schema to: `id, canonicalName, title, baseTypeId, templateId, tags[], frontmatter, content, worldId, createdAt, updatedAt`.
- Usage intent:
  - Template-aware document creation.
  - Stable typed grouping (base type/template) for collections and validation.
  - Name-based IDs/canonical names improve portability for export/import.
- Acceptance checks:
  - Creating a `religion` template document auto-maps to base type `organization`.
  - Existing docs with `type` migrate without data loss.
  - Every document has a unique canonical name derived from title canonicalization.

#### 2) Universal Document References (Canonical Syntax)
- Implement parser + serializer support for markdown internal links: `[Label](canonical-name)`.
- Interpret markdown links with no base URL as internal document links.
- Update targets when canonical names change on title rename.
- Usage intent:
  - Durable cross-document links in markdown and editor navigation.
- Acceptance checks:
  - Reference round-trips through editor/markdown unchanged.
  - Clicking reference navigates to target document.
  - Renaming target updates canonical link target and preserves link validity.

#### 3) Typed Relation Model (Replace Generic Edges)
- Replace `graphStore$.edges` generic `{ source, target, type }` with typed relation records + metadata:
  - `status`, `startDate`, `endDate`, `notes`, `strength`, `provenance`, `confidence`
- Add domain/range validation from relation definitions.
- Usage intent:
  - Canonical world-knowledge graph usable by UI filters and AI context.
- Acceptance checks:
  - Valid chain works (person -> organization -> place).
  - Invalid relation is rejected (e.g., `natural_law belongs_to person`).

#### 4) Foundational Indexes + Collection Selectors
- Add in-memory indexes/selectors for:
  - docs by `baseTypeId`
  - docs by `templateId`
  - docs by `tag`
  - outgoing/incoming relations by document
  - referenced docs from markdown links
- Usage intent:
  - Power future collection sidebar and fast filter/search flows.
- Acceptance checks:
  - Filtering by base type/template/tag/relation returns correct sets.
  - Selector updates reactively on document/reference/relation changes.

#### 5) Tag Normalization + Reuse Contract
- Define normalized tag storage contract (canonical casing/format) and autocomplete source from existing tags.
- Usage intent:
  - Replace folder-only organization with consistent tag-based grouping.
- Acceptance checks:
  - Same logical tag entered with different casing resolves to one canonical tag.
  - Tag picker suggests existing tags during editing.

#### Public API / Interface Changes to Record
- `Document` shape changes (`type` deprecated, `baseTypeId/templateId/frontmatter` introduced).
- `Document` includes `canonicalName`; IDs are name-based for portable export/import flows.
- New registries: `DocumentTypeDefinitionV2`, `TemplateDefinition`, `RelationTypeDefinition`.
- Relation record contract replaces generic edge contract.
- Markdown internal-link grammar support for `[label](canonical-name)` with internal resolution when no base URL exists.

#### Test Scenarios to Attach
- Template creation -> base type enforcement.
- Markdown reference creation, rename propagation, and click-through navigation.
- Valid/invalid relation creation with domain/range checks.
- Collection filter correctness across base type/template/tag/relation.
- Migration regression: legacy docs still open/edit/save correctly after model changes.

#### Assumptions and Defaults
- Scope locked to Foundation (Phase A) only.
- Built-in type/template catalog only in v1 (no user-defined types yet).
- Markdown remains canonical persistence format.
- Folder removal/navigation rewrite is deferred to later phases, but indexes/selectors are added now.
- Frontmatter-heavy authoring UX and placeholder block UX are deferred to later phases.

### NER Enhancements
- Make entity highlights more visible
- Auto-load NER model
- Add manual boundary adjustment for entities
- Create entity cards with document previews/links
- Add mention syntax (@Ardelia) with dropdown for existing documents
- Implement NER persistence (consider markdown links)

### Settings Redesign (Completed)
- [x] Reduce sidebar clutter
- [x] Redesign modal with wider two-level structure
- [x] Rework AI Runtime selector to API backend enable/disable
- [x] Add model testing/debug tools
- [x] Add reusable presets
- [x] Add global debug mode with gated verbose logging
- [x] Remove separate Server tab, fold into settings
- [x] Collapse sidebar model picker to dropdown with quick preset switching
- [ ] Add individual feature toggles (global AI master switch removed)

### General Improvements
- Refresh overall UI visual design
- Move heavy work to web workers (reduce ~100ms setTimeout handlers)
- Evaluate PlateJS AI features integration
- Expand keyboard coverage for all actions
- Add command palette
- Add custom document types (stat blocks) with custom rendering
- Add AI features to AI Segments (regenerate, token view, regenerate-from-token, metadata display)
