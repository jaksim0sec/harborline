# Living Harbor Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans with test-driven-development; locally stage in isolated copy and publish only one verified commit.

**Goal:** Make existing production and delivery visible and resident travel tied to actual roads without changing saved state.

**Architecture:** The model computes routes and daily activity receipts. Scene generates a cached sprite atlas and short-lived activity overlays / boat trip; main only forwards existing model events into Scene.

**Tech Stack:** Vanilla ES modules, Canvas 2D, Node test runner, Chromium/Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-living-harbor-design.md`

## Global Constraints
- Keep `SAVE_KEY='harborline.save.v1'` and `version:1`.
- No dependencies and no additional persistent UI panels.
- One remote GitHub commit after tests, and verify Vercel READY before reporting.

## Review Focus
- Dead-end roads and disconnected buildings must not get workers.
- No grain must mean no bread activity.
- Boat trip must not start for a failed delivery and should freeze on pause.
- Canvas sprites must have opaque pixels rather than empty slots.
- Mobile HUD must remain usable at 360px.

### Task 1: Network and production receipts
- [x] RED tests: `routeToBuilding` finds valid paths and returns null for unconnected; receipts match real deltas and bakery shortages.
- [x] GREEN: implement deterministic route BFS and activity in `advanceDay`; run `npm test`.

### Task 2: Scene life and deliveries
- [x] RED tests: boat positions at 0/half/full; browser test detects atlas sprite pixels, route selection, production label and ship motion.
- [x] GREEN: draw atlas residents and cat, use model routes, event-label cache, timed cargo-boat motion and wire to `main.js`.
- [x] Run unit and browser checks, inspect PC/mobile screenshots and fix root defects only.

### Task 3: Release
- [x] Update README scope and verify v1 hydration.
- [ ] Compare changed paths to current GitHub main, create a single atomic commit with GitHub API and lease-protected branch update.
- [ ] Verify production Vercel deployment, inspect public HTTP if possible; report limits honestly.
