# Village Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich 2.5D coastal village without expanding the gameplay model.
**Architecture:** Add connected road atlas variants and deterministic village-edge scenery to the existing static render cache. Preserve grid, economy, save v1 and camera.
**Tech Stack:** Vanilla JS Canvas2D, node:test, Chromium.
**Spec:** docs/superpowers/specs/2026-11-12-village-composition-design.md

## Global Constraints
- AGENTS.md, same sprite projection and light direction.
- No new gameplay building or state field; no per-frame object drawing.
- One verified remote commit.

## Review Focus
- Existing harbor road needs correct direction mask and plaza type.
- Deletion/replacement of roads invalidates their own and neighbors' cached textures.
- Isolated roads remain visibly tiled and buildable.
- Decorative props cannot overlay placed buildings/roads.
- Legacy v1 and expanded-coast saves remain unchanged.

## Task 1 · Visual road logic
- [ ] Write `tests/village-composition.test.mjs` with missing roadMask and plaza expectations.
- [ ] Observe RED with `npm test`.
- [ ] Implement roadMask; 16 cached road atlas sprites using one shared isometric tile coordinate space.
- [ ] `npm test`, check ROAD junction at 9,18.

## Task 2 · Landscape coherence
- [ ] Write failing sceneryAt test for occupied, village-adjacent, and sea tiles.
- [ ] Observe RED.
- [ ] Implement sceneryAt and naturally clustered props; adjust roof palette/wood accents in same atlas.
- [ ] `npm test` and JS syntax check.

## Task 3 · Browser and delivery
- [ ] Run Chromium at 1365x900 / 390x844 / 360x780, capture renders.
- [ ] Check existing build/delete/road/expansion/delivery functionality, save roundtrip and no console errors.
- [ ] Compare art and FPS/static cache size, report measurements with limits.
- [ ] Inspect diff, verify remote parent, publish one commit and verify Vercel SHA and domain.
