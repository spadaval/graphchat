# Document Overhaul

## Objective

Rebuild document handling around three core primitives:

1. **Universal markdown-style references** - Canonical-name-based internal linking
2. **Frontmatter metadata** - Structured, typed metadata at document top
3. **Placeholder blocks** - Guided authoring prompts

Replace folder-based organization with:

- **Tags** - Freeform labels for flexible categorization
- **Implicit collections** - Auto-generated views by type, template, or tag

## Rationale

| Problem | Solution |
|---------|----------|
| Folder hierarchy forces single classification | Tags enable many-to-many organization |
| Metadata is inconsistent in free-form content | Frontmatter provides typed, validated fields |
| Cross-document references are fragile | Universal markdown links resolved to canonical document names |
| Template guidance is weak | Placeholder blocks as first-class authoring prompts |

## Scope and Phasing

This document describes the end-state v1 model, implemented in phases.

- **Phase A (current planning scope):** model/registry foundations, references, typed relations, indexes/selectors, tag normalization contract.
- **Phases B-D (later):** frontmatter UI depth, placeholder authoring UX, folder removal + collection-first navigation, final migration hardening.

Note: folder removal is not a Phase A deliverable.

## Document Model

### Document fields

```
id, canonicalName, title, baseTypeId, templateId, tags[], frontmatter, content, worldId, createdAt, updatedAt
```

Field constraints:
- `id`: name-based canonical identifier. Defaults to `canonicalName` and is used in exports/imports.
- `canonicalName`: required slug derived from title canonicalization, unique per world.
- `baseTypeId`: required, one of the base types below.
- `templateId`: optional, but when present it must belong to the selected `baseTypeId`.
- `tags[]`: normalized canonical slugs (lowercase, trimmed, spaces/underscores converted to `-`).
- `createdAt`, `updatedAt`: ISO-8601 UTC timestamps.

Canonicalization rules for `canonicalName`:
- lowercase
- trim surrounding whitespace
- replace spaces/underscores with `-`
- remove punctuation except `-`
- collapse repeated `-`

Rename behavior:
- Renaming a title recomputes `canonicalName`.
- Internal markdown links targeting the previous canonical name are rewritten.
- Previous canonical names are retained as aliases for import/backward compatibility.

### Base types

`general` | `person` | `place` | `organization` | `culture` | `magic_system` | `technology` | `natural_law` | `species`

### Templates (specializations)

| Base Type | Templates |
|-----------|-----------|
| organization | religion, guild, corporation, military_order, government_agency, rebel_faction |
| place | city, nation_state, region, planet, station_ship, landmark |
| person | ruler, hero, antagonist, deity, historical_figure |
| culture | religion_tradition_set, ethnic_culture, diaspora_culture |
| magic_system | hard_rule, soft_mythic, ritual, artifact_driven |
| technology | transport, weapon_system, communication, biotech, ai_synthetic |
| natural_law | physics_variant, metaphysical_rule, cosmological_constraint, afterlife_rule |
| species | biological, synthetic, uplifted, hybrid_lineage |

## Core Features

### Document references

**Syntax:** `[Display Label](canonical-name)`

Examples:
- `[Ardelia](ardelia)`
- `[Iron Covenant](iron-covenant)`

Requirements:
- Markdown-native syntax only for internal links (no custom `[[...]]` grammar)
- Name-based targeting via canonical document names
- Label text is user-controlled markdown link text
- Click-through navigation
- Parser/serializer resolves links with no base URL to internal documents
- On title rename (canonical name change), internal links are rewritten to new canonical target

### Frontmatter

**Example:**

```yaml
---
baseTypeId: person
templateId: ruler
tags: [empire, nobility]
traits:
  height: "193 cm"
  eyeColor: "Amber"
primaryAffiliationId: "empire-court"
---
```

Requirements:
- Schema defined by template
- Form-based and raw YAML editing
- Custom content blocks for rendering (e.g., stat cards)
- Inline validation errors
- Reference-valued fields in frontmatter store canonical names unless a field explicitly opts into markdown link text.

### Placeholder blocks

Gray, visually distinct blocks for guided writing:

- Dedicated block type (not styled paragraphs)
- One-click conversion to normal paragraph
- Template-driven insertion
- Optional bulk replacement workflow

### Tags

- Freeform input, normalized on write to canonical slug
- Autocomplete from existing canonical tags
- Multi-tag filtering (AND logic; OR later)

### Implicit collections

Auto-generated, no manual management:

- By base type: all `person` documents
- By template: all `religion` documents  
- By tag: all `tag:desert` documents
- By relation: connected documents for a selected document

No folder CRUD in v1 (deferred until Phase C).

### Relations

Relation identifiers and allowed endpoints use canonical base type IDs only.

| Relation | From | To | Symmetric |
|----------|------|-----|-----------|
| belongs_to | person | organization | no |
| member_of | person/species | organization | no |
| affiliated_with | organization | organization | yes |
| governs | organization/person | place | no |
| located_in | place/organization | place | no |
| part_of | place/organization/species | place/organization/species | no |
| originated_in | culture/species/technology | place/culture | no |
| practices | person/organization/culture | magic_system | no |
| uses | person/organization/species | technology/magic_system | no |
| follows_law | * | natural_law | no |
| constrained_by | * | natural_law | no |
| conflicts_with | person/organization/species/culture | person/organization/species/culture | yes |
| allied_with | organization/species/culture | organization/species/culture | yes |

`*` means any base type.

**Relation metadata:** `status`, `startDate`, `endDate`, `notes`, `strength`, `provenance`, `confidence`

**Requirements:**
- Typed domain/range validation
- Canonical record storage supports both directed and symmetric relations
- Inline creation and relations panel flows both create canonical records

## Technical Implementation

### State changes

- Replace folder-centric state with collection selectors
- Add registries: `DocumentTypeDefinitionV2`, `TemplateDefinition`, `RelationTypeDefinition`
- Extend document record with `baseTypeId`, `templateId`, `tags`, `frontmatter`
- Replace edge list with typed relation records

### Editor changes

- Parser/serializer for markdown internal links (`[label](canonical-name)`)
- Frontmatter parsing and editing pipeline
- Placeholder block node with UI treatment
- Markdown round-trip consistency

### Navigation changes

- Remove folder tree and actions (Phase C)
- Add collection sidebar (base type sections, template filters, tag filters)
- Add relation panel on document view

### Search and indexing

In-memory indexes for:
- Documents by base type, template, tag
- Outgoing/incoming relations by document
- Documents referenced in markdown links

### AI context integration

Prompt context includes: frontmatter summary, relation neighborhood, resolved references, placeholder state

## Migration Checklist

1. Replace `document.type` with `baseTypeId/templateId`
2. Update document creation for template selection
3. Implement canonical name generation and alias handling
4. Implement markdown internal-link resolution (`[label](canonical-name)`)
5. Replace edge model with typed relation records
6. Add indexes/selectors for type/template/tag/relation/reference
7. Define and enforce tag normalization contract
8. Implement frontmatter parse/render/validation
9. Implement placeholder block node and transforms
10. Update sidebar to collection-based navigation
11. Remove folder state and UI paths
12. Update tests and fixtures

## Testing

### Phase A critical scenarios

1. Create `religion` template -> verify base type `organization`
2. Create markdown internal link `[Ardelia](ardelia)` -> verify navigation resolution
3. Create relation chain: person -> organization -> place
4. Reject invalid relation: `natural_law belongs_to person`
5. Filter by base type, template, tag, relation
6. Rename title -> verify canonical name updates and existing internal links are rewritten/resolved via alias
7. Legacy `document.type` migrates without data loss

### Full rollout acceptance criteria (Phases A-D)

- [ ] Folder-based organization removed
- [ ] Tags and collections are primary organization
- [ ] Frontmatter validated and renderable
- [ ] Placeholders are first-class blocks
- [ ] Universal references round-trip safely
- [ ] Typed relations are canonical
- [ ] Code migration complete

## Rollout

| Phase | Focus |
|-------|-------|
| A: Foundation | Registries, document model, relation model, reference parser, indexes/selectors, tag normalization |
| B: Authoring | Frontmatter UI, placeholder blocks, template-driven creation |
| C: Navigation | Folder removal, collection navigation, relations panel |
| D: Hardening | Migration completion, tests, performance, polish |

## Assumptions

- Built-in type/template catalog only (no custom definitions in v1)
- Local-first persistence acceptable
- AI relation suggestions optional and non-blocking
- Markdown remains canonical for document content and frontmatter; relation records persist in the structured graph store
