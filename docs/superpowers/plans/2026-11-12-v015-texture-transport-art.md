# v0.15 PNG Transport and Art Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans, superpowers:test-driven-development and verification-before-completion. AGENTS.md overrides intermediate-commit guidance.

**Goal:** Ship the previously tested v0.15 image atlas safely, with farm/sawmill clearly recognizable in-game.
**Architecture:** Preserve existing Scene atlas/fallback. Transfer actual PNG bytes as Git `encoding: base64` blobs, validate their SHA, and commit only verified source/assets.
**Tech Stack:** Canvas2D JavaScript, Node test runner, Pillow asset-edit verification, Playwright Chromium, GitHub Git database, Vercel.
**Spec:** `docs/superpowers/specs/2026-11-12-v015-texture-transport-art-design.md`

## Review Focus
1. PNG upload SHA mismatch must stop commit.
2. Every PNG remains 144×148 transparent RGBA with unchanged foot contact.
3. Buildable tiles never change when grass image overlays load or fail.
4. Existing v1 saved models and untouched remote files must remain unchanged.
5. PC and mobile use the same image set, no extra drawImage calls per frame.

## Tasks
- [x] Inspect remote main, AGENTS.md, art specification, and exact local assets.
- [x] Reproduce bad transfer and verify Git base64 blob mechanism using a known-good control payload.
- [x] Upload initial 7 source blobs and verify exact local `git hash-object` values.
- [x] Select minimal visual identity corrections for wheat field and lumber workshop.
- [x] Add regression test that fails against pre-retouch art and passes against selected reviewed art.
- [ ] Run complete model and Chromium PC/390/360 art and gameplay regression on final source.
- [ ] Compare changed files against remote base, upload revised PNGs with SHA checks, commit once.
- [ ] Verify Vercel Production READY SHA and report remaining unverified items.
