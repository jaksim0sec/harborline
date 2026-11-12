# Village Square Landmark Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans, superpowers:test-driven-development and verification-before-completion.

**Goal:** Make an existing road junction read as a village landmark without changing gameplay rules.
**Architecture:** Select a single harbor-connected 3-way road; paint a low decorative fountain once into the shared atlas and cached depth-sorted prop layer.
**Tech Stack:** JS ES modules, Node test runner, canvas 2D, Playwright Chromium.
**Spec:** docs/superpowers/specs/2026-11-12-village-square-landmark-design.md

## Constraints
AGENTS.md governs. No changed save keys, economy, terrain, controls, map bounds, projection, or per-frame prop drawing.

## Review Focus
Disconnected junction, removed/reconnected road, multiple crossroads, static cache reuse, mobile controls.

## Tasks
- [x] Confirm latest remote head/AGENTS.md and baseline 37 Node tests.
- [x] Write failing model selection tests; implement deterministic junction selection; pass new tests.
- [x] Write failing browser atlas/cache test; add static fountain and citizen occlusion support.
- [x] Run 40 Node checks, existing browser E2E, new PC and mobile e2e; inspect screenshot and cache sizes.
- [x] Compare changed renderer blob with locally verified file; publish in one GitHub commit and verify Vercel SHA.
