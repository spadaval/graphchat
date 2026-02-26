# ENTITY_RECOGNITION_IMPROVEMENTS.md

## Title
Incremental + Mostly Idempotent Entity Recognition Redesign

## Summary
Redesign entity recognition so normal execution is incremental (recently changed paragraphs only), with a configurable periodic full-document sweep (default every 10 seconds).
Stop clearing entity marks before detection. Instead, apply only additive marks and skip any candidate that overlaps existing reserved ranges.
Prevent re-creation of user-removed candidates via a sidecar suppression store (outside the editor model), persisted per document.

## Status
Implemented in code with the following concrete changes:

1. Incremental scheduling on changed paragraphs remains in place and is now exposed via `entity.runDirtyParagraphs()`.
2. Periodic full-document pass added in the document editor, controlled by `entityAutoRunOnIdle` and configurable `entityFullPassIntervalSeconds` (default `10`).
3. Entity detection no longer clears all existing marks before applying new results.
4. New marks are skipped when they overlap existing entity/link reserved ranges.
5. Removed/dismissed candidates are persisted in a local sidecar suppression store (`localStorage`) and skipped on subsequent detection runs.
6. Settings UI now exposes full-pass interval configuration.
7. Added unit tests for suppression-store persistence, invalidation, prune, and size cap behavior.
