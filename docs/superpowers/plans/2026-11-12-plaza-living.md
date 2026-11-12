# Plaza Living Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task with test-driven-development and verification-before-completion. Commit once after all tasks as AGENTS.md requires.

**Goal:** 주민들이 기존 분수 광장에서 산책하고 배달을 축하하는 생활 피드백을 만들어 플레이어가 자신의 마을을 살아 있는 곳으로 느끼게 한다.

**Architecture:** Pure road path computation and route sampling in `src/render.js`; only recalc the path during `Scene.buildCache`. Reuse existing citizen sprites, `Scene.sendDelivery`, static atlas and label cache. Keep model and UI unchanged.

**Tech Stack:** Native JavaScript ES modules, Canvas 2D isometric renderer, Node test runner, Chromium/Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-plaza-living-design.md`

## Global Constraints
- Follow `AGENTS.md` including a single verified commit and clear unverified items.
- Keep version 1 save schema/key, economy, roads/buildings, 24×24 terrain, mobile input, and projection unchanged.
- No per-frame pathfinding or new object-by-object vector drawing. No new permanent UI components.

## Review Focus
1. Disconnected road removes fountain visit without exceptions.
2. Reconnected road restores path, not save fields.
3. Paused game does not advance visitor or thank-you animation.
4. Delivery focuses existing producer and still departs by boat.
5. No workplace routes still permits square visitor if the fountain is reachable.

## Tasks
- [x] Inspect main + AGENTS; verify rendering API and baseline tests.
- [x] Add `tests/plaza-living.test.mjs` first, verify failing then green `routeToVillageSquare` and `plazaVisitSample`.
- [x] Reuse `Scene.buildCache` to cache plaza route; draw visitor via existing sprite/occlusion and thank-you through existing delivery callback.
- [x] Add Chromium regression test first; verify missing workplace path failure, fix and retest.
- [x] Run fresh complete Node suite, Chromium E2E PC+390+360, review screenshots and memory footprint.
- [x] Compare remote SHA with work and publish one reviewed commit; verify Vercel Production SHA.
