# Building PNG Harmony Pass 2 Implementation Plan

> For agentic workers: Use Superpowers systematic-debugging, test-driven-development, executing-plans, and verification-before-completion. Publish one verified commit only, in accordance with AGENTS.md.

**Goal:** Apply the combined first+second source PNG color/texture correction while leaving runtime behavior alone.
**Architecture:** Offline Pillow/NumPy scripts generate the five fixed-size PNGs. Production renderer and model files are unchanged.
**Tech Stack:** Python Pillow/NumPy for asset authoring, Node test runner, Playwright Chromium for E2E.
**Spec:** `docs/superpowers/specs/2026-11-12-building-png-harmony-v2-design.md`

## Tasks
- [x] Read remote main and AGENTS; compare original 5 Git blob hashes, inspect before image montage.
- [x] Regenerate pass 1 against verified remote assets; check it gives reviewed pass-1 SHA.
- [x] Add pass-2 script with input-SHA guard. Recolor small roof/wall masks, soften texture through premultiplied blur, lift lower foundation very slightly. Retain byte-identical alpha.
- [x] Lock output PNG and alpha hashes in automated tests, confirm they reject unprocessed PNGs, and run all model tests.
- [x] Run Chromium at 1365, 390 and 360, test assets, controls and fallback. Compare before/after sprites and game screens.
- [ ] Push five PNGs, two offline scripts, tests, package version, and these docs in ONE main commit. Verify blob hashes and Vercel Production commit SHA.

## Review focus
Rescaling/anchor shift, alpha fringe, painted bright windows being darkened, color casts, asset-loading fallback, stale PNG SHA tests, unintended runtime draw calls.
