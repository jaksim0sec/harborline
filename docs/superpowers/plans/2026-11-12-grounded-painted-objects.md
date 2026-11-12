# Grounded Painted Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to run the test-driven plan and superpowers:verification-before-completion before one combined commit.

**Goal:** Keep painted buildings and trees visually grounded using a cached contact-shadow texture, and restore the remote asset-integrity regression test.

**Architecture:** A pure footprint selector in `src/render.js` controls what is shadowed. The Scene builds one transparent shadow canvas and places it before painted props on the cached map only. Tests lock down old save/logic behavior and assert cache reuse.

**Tech Stack:** ES module JavaScript, Node built-in test runner, Playwright Chromium, Python 3.

**Spec:** `docs/superpowers/specs/2026-11-12-grounded-painted-objects-design.md`

## Global Constraints
- Follow `AGENTS.md`. Exactly one reviewed commit after validation.
- No extra atlas cells, gameplay state, PNG modification, or per-frame vector shadow drawing.
- Keep existing placement and occlusion semantics.

## Tasks
- [x] Record remote SHA and reconstruct runtime baseline from official `main.js`, `model.js`, `render.js`, `styles.css` to exact Git hashes.
- [x] Reproduce the stale `texture-integrity.test.mjs` failure and update old SHA assertions only to current PNG blob values.
- [x] Write failing `tests/ground-contact.test.mjs` for pure contact anchor and eligibility.
- [x] Add one transparent reusable ellipse shadow texture and paint it only before loaded PNG sprites when building static cache.
- [x] Write browser test checking loaded/fallback conditions, painted contact texture, dimensions and cache reuse; inspect PC and mobile screenshots.
- [x] Run `npm run check` plus all relevant Chromium E2E and asset checks. Review Git diff to ensure no model/save mutations.
- [x] Create one Git commit with compare-and-swap remote HEAD; confirm Vercel Production SHA matches.
