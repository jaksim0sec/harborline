# Source PNG silhouette restoration · v0.15.2

## Context
The 10-texture runtime loader used `dematteOutline` to reduce translucent fringes, but the v0.15.1 artwork still includes fully opaque white pixels on the outside. Those are source pixels and cannot be reliably fixed by a light per-asset render filter.

## Design choice
Fix the 6 object PNGs offline, preserving 144×148 RGBA cells and anchor (72,103). Near-white/neutral pixels no more than a few pixels inside the alpha contour lose matte opacity; surviving feathered pixels borrow color from nearby solid chromatic paint. Three newer assets also have pale extraction floors on their lower region and get a deliberately restricted cleanup profile. Do not touch tile overlays or interior highlights.

## Scope
No change to JS game rules, collision, economy, map or save v1. No further content. Retain existing runtime dematte fallback and texture load fallback. The focus of this art pass is a coherent silhouette and natural foot contact against both water and grass.

## Failure conditions
- Bright exterior white border visible on dark sea or green land.
- Chimney, windows or golden wheat deleted along with the matte.
- PNG dimension, RGBA format or anchor changed.
- PC or mobile renders missing assets or changed UI/navigation.
- Game tests fail, the PNG hashes do not match uploaded blobs, or Production SHA differs.

## Verification
Red-green pixel regression, Node full suite, Chromium 1365/390/360, gameplay E2E, fallback E2E, source PNG bytes compared with GitHub SHA.
