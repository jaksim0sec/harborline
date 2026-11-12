# HARBORLINE · Building PNG Harmony Pass 2

## Goal
Finish a conservative color, brush and base-shadow cohesion pass for the five existing 144×148 RGBA building sprites. Preserve all project rules, the atlas, camera, anchor (72,103), transparency, and procedural fallbacks. This is an offline asset correction, not a new rendering feature.

## Diagnosis
The first-pass five PNG corrections were not committed. Original assets differ in bright red sawmill tiles, contrasting harbor wood, saturated farm wheat, and bakery blue awning. Applying a second, uniform global darkening would degrade clarity and make the previous ground-contact work too dark.

## Decision
Produce one reviewed combined export from remote v0.16 original assets. Run pass 1 once, then pass 2 once. Add input Git-blob guards to prevent accidentally correcting twice. Within pass 2, mask roof terracotta and wall materials separately, reduce edge-safe interior microcontrast with premultiplied filtering, and provide a modest base-brightness correction. Preserve the blue bakery awning and the farm's golden wheat. Source silhouettes/alpha stay bit-identical. Reuse the v0.16 ground-contact runtime unmodified.

## Rejected alternatives
- More painted meshes or extra gameplay systems: unnecessary and risk perspective and state behavior.
- More runtime shading: costly, creates per-frame work and cannot correct original asset hue mismatch.
- Global desaturation or Gaussian blur: damages legibility of already small game textures.

## Release gates
- Five 144×148 RGBA PNG assets: sawmill, harbor, bakery, home, farm.
- Alpha SHA-256 fingerprints unchanged from remote v0.16.0.
- Exact PNG Git blob SHA and static anchor remain fixed.
- `npm run check`, Python alpha check, PC 1365 and mobile 390/360 Chromium visual and operation checks.
- Source-only changes. No edits to `src/*`, `styles.css`, or save/economy.
- One main commit after verifying expected branch head and blob equality. Vercel deployment SHA must equal the same commit.
