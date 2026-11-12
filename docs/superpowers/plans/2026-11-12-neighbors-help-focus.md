# Neighbors Help With Deliveries Implementation Plan

> For agentic workers: follow superpowers:test-driven-development and superpowers:verification-before-completion in isolated workspace.

**Goal:** Add one optional, understandable, productive choice linked to existing orders and residents.

**Architecture:** `model.js` owns focus selection, daily boost, save validation. `main.js` renders one focus action per order and text indicator. `render.js` derives and draws the resident work path and cache-backed bubble. CSS only styles the existing order card and tiny indicator.

**Tech Stack:** Vanilla JS modules, Node built-in test runner, Canvas2D atlas, Python Playwright Chromium.

**Spec:** `docs/superpowers/specs/2026-11-12-neighbors-help-focus-design.md`

## Global Constraints
- No new stored game version or save key.
- No new dependencies or graphics assets. Preserve all existing buildings, costs, deliveries, festival and controls.
- Only one validated, atomic remote commit.

## Tasks
### Task 1 · model RED/GREEN
- [ ] Write model tests for focus toggle, invalid selection, resource bonuses, connected building, bread grain consumption, delivery reset and hydration.
- [ ] Verify new tests fail against baseline for missing feature.
- [ ] Add focus state and API to model, adjust advanceDay and delivery, preserve old defaults.
- [ ] Run `npm test`; confirm all green and all existing tests unchanged.
### Task 2 · UI + route RED/GREEN
- [ ] Add browser assertions for focus button, toggle, save/reload and map helper route.
- [ ] Confirm new assertion fails on baseline.
- [ ] Implement order control with delegation, small HUD cue, `Scene` focus route and at-work label. Help copy and CSS only as needed.
- [ ] Run browser E2E at desktop and 390/360px mobile, inspect screenshots and console errors.
### Task 3 · verify & release
- [ ] Run `npm run check`, Chromium E2E, inspect `git diff --check` and screenshot.
- [ ] Compare remote expected parent, make one atomic commit through GitHub API; no force push.
- [ ] Inspect matching Vercel Production commit and alias; report unresolved external requests honestly.
