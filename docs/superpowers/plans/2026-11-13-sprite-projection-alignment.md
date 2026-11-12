# v0.18.0 Plan · Sprite Projection Alignment

## Scope
Source SHA-locked offline raster geometry edit. Do not expand features or modify runtime renderer.

## Tasks
- [x] Read main and AGENTS.md; inspect actual sprites on alpha-guide reference.
- [x] Create tests/sprite_projection_test.py; reproduce sawmill and farm failures on original main.
- [x] Add tools/reproject_building_assets.py with immutable source SHA locks and premultiplied interpolation.
- [x] Correct sawmill roof pitch/profile and farm contact. Preserve home, bakery and harbor.
- [x] Update package version, Node PNG SHA locks and Python alpha locks.
- [x] Run npm run check + Python art tests.
- [ ] Verify all Chromium regression tests and PC/mobile screenshots.
- [ ] Review exact Git blob hashes, create one commit, and verify Production SHA.

## Observed geometry
sawmill alpha>100 top 28 -> 21, bottom 100 -> 102; farm top 33 -> 36, bottom 99 -> 102. All x extents fixed.

## Risks
Localized roof vertical stretch adds limited interpolation to the original art. If it looks visibly smeared or inconsistent in the game screenshot, revert and omit it rather than hiding the issue with filters.
