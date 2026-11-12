# Meadow and Chibi Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** More vivid green island and readable chibi residents without gameplay or save changes.

**Architecture:** Render-only deterministic atlas variants and existing static world cache. No model/API changes outside sprite selection in renderer. Sprite origin is consistently (72,100).

**Tech Stack:** JS Canvas2D, Node test runner, Chromium Playwright.

**Spec:** docs/superpowers/specs/2026-11-12-meadow-and-chibi-art-design.md

## Global Constraints
- Keep `SIZE=24`, save key/version, economy, controls and HUD untouched.
- Maintain fixed sprite origin and 2:1 isometric tile proportions.
- Draw environment objects into atlas/cache only, never vector paint each animation frame.
- One verified GitHub commit, verify Vercel deployment SHA.

## Task 1 · More varied green ground
- [ ] Write Node test for deterministic coordinate texture selection, no sea/sand changes, and 4 green variants across map.
- [ ] Run failing test (RED).
- [ ] Implement texture variants and consistent brighter green/grass details in `src/render.js`.
- [ ] Run tests (GREEN).

## Task 2 · Natural props and chibi faces
- [ ] Add Chromium atlas regression script checking nontransparent intended props, face/head vs body proportions, ground/contact points, and canvas draws.
- [ ] Run failing browser test (RED).
- [ ] Render missing props and redraw trees/bushes and characters in the texture atlas.
- [ ] Run browser test and `npm run check` (GREEN).

## Task 3 · Visual QA and release
- [ ] Run existing `tests/browser_e2e.py`, compare desktop/390/360 screenshots, adjust only confirmed defects.
- [ ] Run full tests again and compare changed files with spec, ensure no economy/save changes.
- [ ] Create 1 GitHub commit via exact base SHA/tree; verify new GitHub main SHA.
- [ ] Verify Vercel Production latest deployment has matching SHA, domain remains assigned. If unavailable, do not claim deployed.

## Review Focus
- Same atlas anchor for tall trees and smaller sprites.
- Empty sprite cells, especially previously unpainted decor.
- Contrast at mobile 0.94 zoom and small resident heads.
- Natural tiles should not conceal buildable road placement previews.
- Cached map redraw and frame rate remain acceptable at 24x24.
