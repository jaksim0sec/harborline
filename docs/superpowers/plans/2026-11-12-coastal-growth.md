# Coastal Growth Implementation Plan
> **For agentic workers:** superpowers:executing-plans with test-driven-development and verification-before-completion.
**Goal:** Add small connected coastal expansion.
**Architecture:** Model coast mask, optional v1 flag, renderer terrain(game), compact letter-panel unlock.
**Tech Stack:** JavaScript / Canvas2D / Node / Chromium.
**Spec:** docs/superpowers/specs/2026-11-12-coastal-growth-design.md
## Constraints
- Keep 24x24 bounds and all original object coordinates.
- Single verified GitHub commit, no force push.
## Review focus
- Legacy saves, repeated purchase, new roads, narrow viewport scrolling, unchanged cache memory.
## Steps
- [x] Write failing Node/model tests, implement and run full suite.
- [x] Write failing browser check, add UI, verify desktop and mobile.
- [x] Run art regressions and benchmark atlas cache.
- [x] Publish only verified files, verify Production SHA separately.