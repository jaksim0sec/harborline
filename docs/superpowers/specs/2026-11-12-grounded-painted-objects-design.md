# HARBORLINE v0.16.0 · Painted Object Grounding

## Problem and source of truth
The remote v0.15.2 renderer is already byte-identical to the local copy, but the previous test checkout used locally modified `main.js`, `model.js`, and `styles.css`. Those three files have now been reconstructed to match their remote Git blob SHA values exactly. The remote `texture-integrity.test.mjs` still asserts the *previous* PNG hashes, making the remote Node test suite fail after the v0.15.2 PNG cleanup. Correct this regression without changing any reviewed PNG.

Existing painted home, bakery, farm, sawmill, harbor, and tree images replace their procedural sprite cells in the atlas. The original procedural sprites had built-in contact shadows; their replacement PNGs do not consistently include these. Buildings consequently appear to hover, particularly against bright lawn or sand.

## Decision
Create a single small premade soft elliptical contact-shadow **texture** in memory, then draw it behind eligible painted props **only in the existing static cache rebuild**. The shadow belongs to the object footprint and shares the existing 2:1 isometric ground plane. Ground texture tiles, roads, water, and decorative props receive no new shadows. Do not add a new atlas row or modify PNGs. Procedural fallback sprites already contain their own shadows and must not be doubled; ground only the textures whose PNG loaded successfully.

## Constraints
- No new gameplay, economy, save fields, input state, map tiles or permissions.
- Keep 24×24 map, `harborline.save.v1`, atlas dimensions, existing static cache dimensions, pause, occlusion, and mobile controls.
- Contact-shadow sprite is created once per scene and reused for all static props, never recreated or redrawn with vector primitives per animation frame.
- Do not infer performance improvement; verify allocated bytes and cache rebuild frequency.
- Update the remote PNG integrity test to the **actual current SHA**; source images unchanged.

## Verification
- Reproduce failing remote integrity test before fixing.
- Node test for footprint anchoring, PNG-only shadow eligibility, unsupported objects, immutable configuration.
- Chromium 1365/390/360px: verify the shadow texture is used for painted house/farm/sawmill/tree/harbor while static cache is rebuilt; no contact shadows for procedural fallback, and normal rendering reuses the cache.
- Run all prior Node tests and mobile/desktop browser scripts with the matching remote runtime files.
- Commit one complete verified change and check Vercel Production SHA, report any remaining live-site or device verification gaps.
