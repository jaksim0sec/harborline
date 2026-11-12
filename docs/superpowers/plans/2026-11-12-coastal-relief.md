# Coastal Relief v0.11.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Keep test-first evidence and one verified final commit.

**Goal:** Add an optically raised, grounded coastline within the same 24×24 map.

**Architecture:** Reuse coastEdgeMask() and canvas static cache. Pure tile-local geometry; no change to game model or dynamic renderer.

**Tech Stack:** JavaScript ESM, Node.js test runner, Canvas 2D, Python Playwright Chromium.

**Spec:** docs/superpowers/specs/2026-11-12-coastal-relief-design.md

## Global Constraints
- Preserve save key, map size, terrain/builder path logic, spritesheet projection, UI and mobile gestures.
- No per-frame cliff rendering, new state, dependencies or map chunking.
- One final GitHub commit.

## Review Focus
- Coast edge bits 1,2,4,8 align to 2:1 edges.
- Backside edges do not hide foreground structures.
- Expansion invalidates and recomputes shoreline cache.
- Atlas and cache allocation size unchanged.

## Steps
- [x] Baseline: Node 36/36; Chromium at 1365, 390 and 360.
- [x] Test-first pure geometry test: verified red, then green.
- [x] Add 13px seaward cliff face in static post-terrain pass.
- [x] Node full suite 37/37; browser, art, expansion, composition and depth checks.
- [x] Check cached geometry + map and save preservation across expansion.
- [ ] Atomic remote commit with SHA lease, Production SHA verification.
