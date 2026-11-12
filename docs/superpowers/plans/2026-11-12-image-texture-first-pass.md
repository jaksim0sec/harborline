# PNG Art Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans, superpowers:test-driven-development, verification-before-completion.

**Goal:** Replace three procedural props with transparent painted PNG texture atlas cells, reduce character screen scale without changing saved or simulated behavior.

**Architecture:** Preserve the canvas texture atlas. Preload transparent PNGs, update fixed atlas cells once, invalidate cache and preview. Pass scalar scale to atlas sprite rendering at the same foot anchor.

**Tech Stack:** Vanilla ES modules, PNG, Canvas2D, Node test runner, Playwright Chromium.

**Spec:** docs/superpowers/specs/2026-11-12-image-texture-first-pass-design.md

## Constraints
Maintain AGENTS.md, 2:1 projection, old save data, economic rules, actor position and movement, all touch inputs, graceful fallbacks, and one verified remote commit.

## Tasks
- [x] Verify latest main and source parity; baseline `npm run check`.
- [x] Create failing Node tests for PNG format/anchors/manifest and actor scale.
- [x] Process and optimize 3 painterly PNG images and integrate into one atlas update with fallback.
- [x] Build browser E2E tests of actual HTTP asset loads, cache reuse, PC/390/360 layout, placement and mobile click.
- [x] Inspect image/character size and perspective screenshots, fix visible issues.
- [x] Run all checks; compare changed remote blobs, commit once, confirm Vercel production SHA and report unverified.
