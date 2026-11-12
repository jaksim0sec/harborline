# PNG Atlas Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development before each code change; verify before one final commit.

**Goal:** Grow the coherent texture pass from 3 to 10 real PNG atlas assets while preserving game logic.

**Architecture:** Map new images to existing named atlas cells, blend terrain details over original grass tiles, keep per-cell procedural fallback.

**Tech Stack:** Canvas2D + ES modules + PIL for asset cleaning/authoring + Node tests + Chromium/Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-png-atlas-expansion-design.md`

## Global constraints
Follow AGENTS.md. Keep world coordinate grid, 2:1 projection, 24×24 map, economy/state/save version 1, existing controls, 144×148 cells, and static atlas/cache.

## Steps
- [x] Inspect latest main SHA and AGENTS.md; compare locally mounted baseline art to actual PC screenshot.
- [x] Check v0.14 baseline (46 tests); add and execute failing new PNG tests.
- [x] Clean/align 3 PNG objects from a single illustration study, build 4 painterly RGBA grass overlays, verify on contact sheet.
- [x] Connect asset names to existing atlas and retain old per-cell fallback.
- [x] Observe excessive terrain seams in Chromium; replace hard tile overlays with subtle alpha-only details over original procedural tile. Rerun PNG test.
- [x] Node full suite, Chromium art tests on PC/390/360, all 7 existing browser regression scenarios, visual screenshot review.
- [ ] Confirm remote source blobs and apply one atomic tree commit to main, validate Vercel Production SHA and domain.

## Review focus
1. Garbage card background in object alpha masks.
2. Terrain edge cracks when replacing whole tile surfaces.
3. 0.68 resident anchor position compared with house scale.
4. Save v1 and economics not mutated, including fallback code path.
5. No duplicate commits or silent overwrites of remote changes.
