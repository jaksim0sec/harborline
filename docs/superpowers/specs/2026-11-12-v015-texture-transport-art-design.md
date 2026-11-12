# HARBORLINE · v0.15 PNG release and art identity pass

## Goal
Restore and safely release the existing v0.15 PNG atlas expansion while addressing the most visible identity mismatch of its farm and sawmill assets.

## Verified starting state
- Remote `main` remains at v0.14.0, Git object SHA `249863c3d4716861e48d04e523b9d8b3307fdd54`.
- Prior work produced 7 transparent 144×148 PNGs. The previous failure was transferring binary payloads through an unverified representation, not a broken GitHub `create_blob(base64)` endpoint.
- Local renderer still uses one atlas, one static map cache, per-cell failure fallback, v1 save key and existing resident scale 0.68.

## Alternatives and selection
1. **Restore exact PNG bytes with Git-blob SHA verification, then lightly retouch farm/sawmill (selected).** Preserves first-pass art investment and existing code.
2. Replace images with SVG or procedural shapes. Evades binary transport but regresses the committed PNG requirement. Rejected.
3. Generate a new whole-world texture atlas or add extra renderer layers. Unnecessary, riskier, and inconsistent perspective. Rejected.

## Design
- Keep 144×148 RGBA sprite cells and `(72,103)` image-ground contact. Reuse existing 2:1 isometric light direction.
- Add existing v0.15 files for harbor, farm, sawmill, grass, grass2, meadow, clover; keep home, bakery and tree unchanged.
- Retouch farm hues to visibly indicate golden wheat while preserving its wooden fence; retouch sawmill's central opening into a saw-workshop and add subtle timber outside. No new game interactions.
- Keep 0.68 residents and 0.75 cat; do not change economy, model, building coordinates, map size, or save schema.
- Check local and uploaded binary Git-blob SHA before constructing the single commit. Compare every text source with `main` and include only intended changes.

## Acceptance & limitations
- Model tests and explicit binary-integrity regression, Chromium actual-image load at PC/390/360, crop and alpha checks, image failure fallback, existing building/delivery/expansion.
- Single commit after verification, Vercel Production READY and exact GitHub SHA.
- Device long-run memory/FPS and live-production browser interaction remain separately identified if inaccessible.
