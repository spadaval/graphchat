# Document Overhaul: Simplified Product and Technical Plan

## 1. Objective

Rebuild document handling around three core primitives:

- Universal markdown-style document references
- Frontmatter for structured metadata
- Placeholder blocks for guided authoring

At the same time, remove explicit document structure (folders/tree) and replace it with:

- Tags
- Implicit collections derived from document type and template

This plan assumes pre-production data and allows direct model replacement.

## Motives and High-Level Objectives

### Motives

- Current document management creates friction during writing and discovery.
- Folder-based structure forces a single hierarchy, while worldbuilding data is naturally many-to-many.
- Important metadata is hard to model and keep consistent in free-form-only content.
- Cross-document references are not yet universal or robust enough for large worlds.
- Template guidance is weak without first-class placeholder authoring flows.

### High-level objectives

1. Reduce creation and management friction for worldbuilders.
2. Shift from rigid structure to flexible organization via tags and implicit collections.
3. Make references and relationships first-class so world entities are deeply connected.
4. Introduce structured metadata through frontmatter without sacrificing markdown flexibility.
5. Provide guided authoring with placeholder blocks to improve template usability and completion rates.
6. Align editor, state, and navigation architecture around one coherent document model.

## 2. Product Direction

### What changes

1. No folder/document hierarchy.
2. Documents are organized by:
   - `baseTypeId`
   - `templateId`
   - tags
3. Navigation is collection-first:
   - “People”, “Places”, “Organizations”, etc.
   - Dynamic filtered views (for example: `tag:empire`, `template:religion`).

### Why this is better

- Less structural overhead for users.
- Better fit for worldbuilding workflows where entities belong to multiple contexts.
- Stronger discovery via tags + typed relationships.

## 3. v1 Scope (Must Ship Together)

v1 includes product features and code migration in the same release scope.

1. New document reference syntax (markdown-link based).
2. Frontmatter model and rendering.
3. Placeholder block type.
4. Type/template system with curated built-ins.
5. Typed relation model and relation UI.
6. Folder removal and replacement with tag/collection navigation.
7. Code migration across state, editor, sidebar/navigation, and graph/relations.

## 4. Document Model (v1)

Each document uses:

- `id`
- `title`
- `baseTypeId`
- `templateId`
- `tags: string[]`
- `frontmatter: Record<string, unknown>`
- `content` (markdown body)
- `worldId`
- `createdAt`
- `updatedAt`

### Base types

- `general`
- `person`
- `place`
- `organization`
- `culture`
- `magic_system`
- `technology`
- `natural_law`
- `species`

### Required specialization templates

- `organization`: religion, guild, corporation, military_order, government_agency, rebel_faction
- `place`: city, nation_state, region, planet, station_ship, landmark
- `person`: ruler, hero, antagonist, deity, historical_figure
- `culture`: religion_tradition_set, ethnic_culture, diaspora_culture
- `magic_system`: hard_rule, soft_mythic, ritual, artifact_driven
- `technology`: transport, weapon_system, communication, biotech, ai_synthetic
- `natural_law`: physics_variant, metaphysical_rule, cosmological_constraint, afterlife_rule
- `species`: biological, synthetic, uplifted, hybrid_lineage

## 5. Reference, Frontmatter, and Placeholder Features

## 5.1 Universal document references

Use markdown-link-compatible syntax as canonical references:

- `[[doc:doc-123|The Iron Covenant]]` (internal canonical form)
- Rendered/editor-friendly as markdown links where possible.

Requirements:

- Stable ID-based targeting.
- Human-readable label support.
- Automatic relabel when title changes.
- Click-through navigation.
- Parser support in editor and markdown serialization.

## 5.2 Frontmatter

Frontmatter appears at document top and stores structured metadata for the current template.

Example:

```yaml
---
baseTypeId: person
templateId: ruler
tags: [empire, nobility]
traits:
  height: "193 cm"
  eyeColor: "Amber"
primaryAffiliation: "doc:org-empire-court"
---
```

Requirements:

- Typed frontmatter schema from template definitions.
- Form-based editing + raw YAML editing.
- Custom content blocks for frontmatter rendering (for example: stat card block).
- Validation with inline errors.

## 5.3 Placeholder blocks

Placeholder blocks are gray, visually distinct blocks used as guided writing prompts.

Requirements:

- Dedicated block type, not plain paragraph styling.
- One-click “convert to paragraph” and normal editing behavior.
- Template-driven insertion in new documents.
- Optional bulk replace workflow for unresolved placeholders.

## 6. Tags and Implicit Collections

## 6.1 Tags

- Freeform tags with normalization rules.
- Tag autocomplete from existing tags.
- Multi-tag filtering (`AND` first; optional `OR` later).

## 6.2 Implicit collections

Collections are computed, not manually managed:

- By base type: all `person` docs
- By template: all `religion` docs
- By tag: all `tag:desert`
- By relation adjacency: for a selected doc, show connected docs by relation type

No folder CRUD in v1.

## 7. Linking and Relations

### Relation catalog (v1)

- `belongs_to` (person -> organization)
- `member_of` (person/species -> organization)
- `affiliated_with` (organization <-> organization)
- `governs` (organization/person -> place)
- `located_in` (place/organization -> place)
- `part_of` (place/organization/species -> place/organization/species)
- `originated_in` (culture/species/technology -> place or culture)
- `practices` (person/organization/culture -> magic_system/religion)
- `uses` (person/organization/species -> technology/magic_system)
- `follows_law` (any -> natural_law)
- `constrained_by` (any -> natural_law)
- `conflicts_with` (person/org/species/culture <-> person/org/species/culture)
- `allied_with` (org/species/culture <-> org/species/culture)

### General requirements

- Typed domain/range validation.
- Directed and symmetric support.
- Relation metadata (`status`, `startDate`, `endDate`, `notes`, `strength`, `provenance`, `confidence`).
- Inline reference creation flow and relations panel flow both create canonical relation records.

## 8. Technical Implementation Plan (v1)

## 8.1 State and type changes

- Replace folder-centric state with collection-centric selectors.
- Introduce registries:
  - `DocumentTypeDefinitionV2`
  - `TemplateDefinition`
  - `RelationTypeDefinition`
- Extend document record with `baseTypeId`, `templateId`, `tags`, `frontmatter`.
- Replace simple edge list with relation records using stable IDs and metadata.

## 8.2 Editor changes

- Add parser/serializer support for canonical doc references.
- Add frontmatter parsing and editing pipeline.
- Add dedicated placeholder block node with UI treatment.
- Ensure markdown round-trip consistency.

## 8.3 Navigation/UI changes

- Remove folder tree and all folder actions.
- Add collection sidebar:
  - base type sections
  - template filters
  - tag filters
- Add relation panel on document view.

## 8.4 Search and indexing

Add in-memory indexes for:

- docs by base type
- docs by template
- docs by tag
- outgoing/incoming relations by doc
- docs referenced in markdown links

## 8.5 AI context integration

Prompt context builder should include:

- frontmatter summary
- selected relation neighborhood
- resolved internal references
- placeholder state (optional prompt hinting)

## 9. Code Migration Work (In Scope for v1)

This is required work, not deferred work.

1. Remove folder state and folder UI paths.
2. Replace `document.type` usage with `baseTypeId/templateId`.
3. Update document creation flows to require template selection.
4. Implement frontmatter parse/render + validation pipeline.
5. Implement placeholder block node and transforms.
6. Implement universal reference syntax support in editor and utilities.
7. Replace `graphStore$` edge model with typed relation records.
8. Update search/filter logic to tags + implicit collections.
9. Update sidebar and related components to collection-based navigation.
10. Update tests and fixtures for new document shape and relation model.

## 10. Test Scenarios and Acceptance Criteria

## 10.1 Critical test scenarios

1. Create a `religion` template document and verify base type `organization`.
2. Create frontmatter through form UI and verify markdown/frontmatter round-trip.
3. Insert placeholder blocks from template and convert them to normal paragraphs.
4. Create internal references and verify stable ID navigation and label rendering.
5. Create relation chain: person `belongs_to` organization `located_in` nation.
6. Reject invalid relation: `natural_law belongs_to person`.
7. Filter documents by base type, template, tag, and relation adjacency.
8. Verify no folder actions remain in UI and all docs are discoverable via collections.

## 10.2 v1 acceptance criteria

- Folder-based organization is fully removed.
- Tags and implicit collections are the primary organization model.
- Frontmatter is supported, validated, and renderable with custom blocks.
- Placeholder blocks are first-class and template-integrated.
- Universal document references are stable and round-trip safely.
- Typed relations are canonical for semantic linking.
- Code migration is complete across state, editor, and navigation.

## 11. Rollout Phases (Simplified)

### Phase A: Foundation

- Registries, document model updates, relation model updates.
- Canonical reference syntax parser/serializer.

### Phase B: Authoring

- Frontmatter UI + validation.
- Placeholder block implementation.
- Type/template-driven creation flow.

### Phase C: Navigation and linking

- Folder removal.
- Tag and implicit collection navigation.
- Relations panel and graph/list updates.

### Phase D: Hardening

- End-to-end migration of code paths.
- Test stabilization, performance checks, UX polish.

## 12. Defaults and Assumptions

- Built-in type/template catalog only for v1.
- Local-first persistence remains acceptable for v1.
- AI relation suggestions remain optional and non-blocking.
- Markdown remains canonical narrative body with frontmatter + structured relation layer.
