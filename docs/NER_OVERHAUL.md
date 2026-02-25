# Entity Candidate Overhaul Plan

## 1. Goals

This overhaul separates probabilistic entity candidates from committed author intent.

- Keep entity detection fast and editable as an in-editor suggestion layer.
- Keep links as durable document content in the editor `contentModel`.
- Prevent entity-detection reruns from corrupting or overwriting committed links.
- Add safe boundary-adjust controls for entity candidates.

## 2. Non-Goals

- No drag-handle boundary editing in this phase.
- No large rewrite to replace links with a fully custom reference node.

## 3. Current Problem Summary

Entity candidates and links are strongly related but currently represented differently:

- Entity candidates are modeled as Slate text-leaf marks in editor content (`entity`, `entityId`, `entityType`, etc.).
- Internal and external links are regular link elements in `contentModel`; markdown is mainly for export and AI context.

This leads to lifecycle tension:

- Entity candidates are probabilistic and should be revisable or dismissible.
- Links are committed author intent and should be durable.
- Rerunning entity detection can conflict with existing links if boundaries overlap.

## 4. Proposed Domain Model

Use two related but distinct entities.

## 4.1 EntityCandidate (candidate layer)

Represents a suggestion that may become an internal link later.

Recommended shape:

```ts
type EntityType = "person" | "organization" | "location";

type CandidateState = "active" | "dismissed";

interface EntityCandidateMark {
  entity: true;
  entityId: string;
  entityType: EntityType;
  entitySource: "model" | "manual";
  entityConfidence?: number;
  entityCanonicalName?: string;
  candidateState?: CandidateState;
  candidateRevision?: number;
}
```

Notes:

- `candidateState` is new; default `active` for existing marks.
- `dismissed` means user explicitly rejected suggestion.
- `candidateRevision` is optional bookkeeping for debugging and conflict handling.

## 4.2 ReferenceLink (content layer)

Represents committed link intent in document content.

Recommended shape:

```ts
type ReferenceKind = "internal" | "external";

interface InternalReferenceMeta {
  refKind: "internal";
  refTargetCanonical: string;
  refSource?: "candidate" | "manual";
  refFromCandidateId?: string;
}

interface ExternalReferenceMeta {
  refKind: "external";
  refUrl: string;
}
```

Storage approach:

- Keep standard link node (`type: "a"`) for rendering and model compatibility.
- Add metadata fields for internal links in editor model.
- Export markdown links using existing canonical URL convention where possible; lossy export is acceptable for editor-only metadata.

## 5. Relationship Between Candidate and Link

State machine:

1. Entity detection creates `EntityCandidate(active)`.
2. User adjusts boundary/type or dismisses.
3. User accepts by converting to internal link:
   - candidate mark removed
   - internal link node created
   - link metadata may retain `refFromCandidateId`
4. If user removes link later, no automatic candidate resurrection.

Key rule:

- Candidates are suggestions; links are final document semantics.

## 6. UX Plan

## 6.1 Candidate Popover (entity leaf)

Add sections:

- Entity type chips (`person`, `organization`, `location`) [existing].
- Boundary controls:
  - Expand Left
  - Contract Left
  - Contract Right
  - Expand Right
- Linking actions:
  - Link to existing document
  - Create associated document and link
- Candidate actions:
  - Dismiss suggestion
  - Remove mark (keep as fallback)

Behavior:

- Boundary actions operate one word at a time.
- Disabled states should explain why (`edge`, `overlap`, `single-word minimum`).
- Any manual boundary/type change sets `entitySource: "manual"`.

## 6.2 Link UX

Internal links:

- Use entity-candidate conversion path or standard link flow with document picker.
- Render with existing link visuals; optional indicator for internal references.

External links:

- Continue using standard URL-based link flow.
- Never represented as entity candidates.

## 6.3 Rerun Entity Detection UX

- Document/paragraph rerun should skip text already inside link nodes by default.
- Existing internal links are preserved.
- Optionally add advanced setting in future: "Allow entity detection over linked text" (off by default).

## 7. Core Logic Changes

## 7.1 Entity application safeguards

When applying spans to a paragraph:

- Clear only candidate fields, not link nodes.
- Skip spans intersecting existing link ranges.
- Respect dismissed candidates where feasible:
  - If span exactly matches dismissed range/type, do not re-add.
  - For v1, minimal approach is best-effort skip by same text window in current paragraph.

## 7.2 Boundary adjustment engine

Add `/src/lib/entity-boundary.ts`:

- `computeAdjustedOffsets(...)` pure function
- `adjustEntityBoundary(editor, entityId, edge, direction)` transform helper
- Word segmentation:
  - prefer `Intl.Segmenter(..., { granularity: "word" })`
  - fallback to unicode regex
- Reject invalid transitions with typed errors:
  - `NoAdjacentWord`
  - `OverlapConflict`
  - `MinimumSpanViolation`
  - `OutOfBounds`

## 7.3 Transform API extensions

Extend `editor.tf.entity`:

- `adjustBoundary(entityId, edge, direction)`
- `dismiss(entityId)`
- keep existing `setType`, `remove`, `convertToLink`

Type updates needed in `plate-types.ts`.

## 7.4 Internal link metadata

Extend link creation helpers to write metadata for internal links:

- `refKind: "internal"`
- `refTargetCanonical`
- optional provenance fields

External links keep URL-only metadata.

## 8. Markdown and Persistence Strategy

Principle:

- `contentModel` is the canonical persistence format for editor behavior.
- Markdown is a derived format used for export and AI prompt/context flows.
- Entity candidates are editor-only suggestion state.

Decisions:

- Entity candidate data does not require full-fidelity markdown serialization.
- It is acceptable to lose candidate-only metadata in markdown export/import flows.
- Candidate state is not promoted to durable document semantics until converted to a link.

Optional future:

- Sidecar suggestion storage keyed by document + block hash to survive markdown-only flows.

## 9. Migration Plan

## 9.1 Candidate mark migration

On editor normalization:

- Existing marks missing `candidateState` become `active`.
- Existing marks missing `entityId` continue using `normalizeLegacyEntityIds`.
- No requirement to recover candidate-only state from markdown-only imports.

## 9.2 Link metadata migration

- Existing links without `refKind`:
  - if URL matches internal canonical convention, mark as `internal`
  - else mark as `external`
- Keep migration idempotent.

## 10. Implementation Phases

## Phase 1: Safety + boundary controls

- Add boundary engine (`entity-boundary.ts`) with tests.
- Add `tf.entity.adjustBoundary`.
- Add popover boundary buttons and disabled-state UX.
- Add overlap/link intersection guards.

## Phase 2: Candidate lifecycle

- Add `candidateState` and `dismiss` transform.
- Update entity-detection rerun logic to avoid reintroducing dismissed matches where possible.

## Phase 3: Internal/external link formalization

- Add explicit link metadata (`refKind` + target fields).
- Ensure serialization/deserialize paths preserve metadata.
- Add lightweight migration for existing links.

## Phase 4: Polish and telemetry

- Add debug logs for boundary failures and auto-link decisions.
- Add optional UX affordances for internal link indicators.

## 11. Testing Plan

## 11.1 Unit tests

- Boundary stepping with punctuation, apostrophes, hyphenation, unicode letters.
- Contraction minimum-span behavior.
- Overlap rejection with adjacent entities.
- Link-intersection skip behavior.
- Candidate state transitions (`active -> dismissed`, convert-to-link).

## 11.2 Integration tests

- Paragraph rerun preserves existing links.
- Document rerun preserves links and applies candidates elsewhere.
- Convert candidate to internal link preserves canonical target.
- Editor reload retains expected candidate/link state.

## 11.3 Regression tests

- Legacy documents with missing `entityId`.
- Mixed content with mentions, links, and entity spans in same paragraph.
- Markdown export/import remains acceptable with lossy candidate metadata.

## 12. Key Risks and Concerns

1. Boundary math on split text leaves:
- Must always compute in paragraph offsets, then map back to Slate range.

2. Overlap policy:
- Rejecting overlap is safest; auto-merging/splitting entities is error-prone.

3. Link export ambiguity:
- Internal-link export encoding should be documented, but editor-only metadata loss in markdown is acceptable.

4. Entity rerun churn:
- Aggressive reruns can frustrate users if manual edits are repeatedly undone.

5. Performance:
- Document-wide rerun with link intersection checks should remain linear per paragraph.

## 13. Design Decisions to Lock Before Coding

1. Internal link model contract:
- Confirm canonical `contentModel` fields for internal vs external links.

2. Candidate persistence scope:
- Keep candidate data editor-only; no markdown durability requirement.

3. Overlap behavior:
- Confirm strict rejection for v1.

4. Rerun policy:
- Confirm default skip over linked text and dismissed candidates.

## 14. Success Criteria

- Users can correct boundary errors in one or two clicks without breaking marks.
- Internal links remain stable across entity-detection reruns and `contentModel` persistence.
- Entity candidates remain useful but clearly non-authoritative.
- No recurrence of disjoint/fractured `entityId` behavior under normal operations.
