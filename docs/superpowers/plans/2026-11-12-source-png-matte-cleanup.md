# Original RGBA cleanup implementation plan

> For agentic workers: Use superpowers:executing-plans, test-driven-development, systematic-debugging, and verification-before-completion. Only one verified commit per AGENTS.md.

**Goal:** Remove opaque white silhouettes and paper-floor extraction from PNG originals without touching game mechanics.
**Architecture:** Offline pixel operation in `tools/repair_texture_edges.py`; six original source PNG replacements; existing atlas/fallback intact.
**Tech:** Python Pillow + NumPy + SciPy for editing, Node for core tests, Chromium for image/use regression.
**Spec:** `docs/superpowers/specs/2026-11-12-source-png-matte-cleanup-design.md`

## Tasks
- [x] Read latest main + AGENTS, reproduce white pixels on RGBA silhouette.
- [x] Add `tests/texture_fringe_test.py` and confirm failed regression on original harbor/farm/sawmill/tree.
- [x] Trial cleanup on green/sea background. Preserve protected interior and original frame/anchor.
- [x] Implement optional offline tool, regenerate 6 assets, verify regression passes.
- [x] Run `npm run check`, PC/390/360 Chromium, and E2E gameplay checks.
- [ ] Verify only intended files change, upload new assets byte-identically to GitHub blobs.
- [ ] One atomic branch update and Vercel Production SHA verification.

## Rollback
Revert this single commit to restore original PNGs. No persisted state or schema migration.
