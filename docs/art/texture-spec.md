# HARBORLINE image asset specification · v0.14

- Cell: transparent RGBA PNG, 144×148 pixels.
- Anchor: `(72, 103)` in cell, corresponding to terrain tile center/ground level.
- Projection: fixed 2:1 isometric, light from upper-left, roofs show both adjacent faces.
- Export footprint: houses 88–94 pixels wide by 86–91 high; trees 76×83.
- Source: artwork crops from a single custom AI-generated illustrative moodboard, manually background-masked, aligned, and resized. This is a **first image texture pass**, not a finished canonical asset master.
- Do not assume transparent white backgrounds are already clean. Inspect halos and foot contact after compositing.
- Runtime: `src/render.js` loads 3 PNGs into existing atlas once. On missing/failed images, the corresponding procedural cell is retained. No separate per-frame image drawing.
- Mobile size: neighbors drawn at 0.68×; cat at 0.75× using original fixed foot anchor. World positions, collisions and save files are unchanged.
- Next pass: independently authored matching 2.5D props for harbor/farm/sawmill, consistent house and roof variants, grass edges, and village road texture; validate all subjects in a 2:1 grid before adding them.


## v0.15 PNG expansion

- New 144×148 RGBA PNG cells: harbor, farm, sawmill, grass, grass2, meadow, clover.
- Harbor/farm/sawmill are isolated from a coordinated custom painted illustration study. Their crops are masked, cleaned, and aligned to pixel `(72,103)` for grounded placement; no UI screenshot or text remains in the finished sprites.
- The three props are not canonical master art yet. The orchard-like field and forge-like shop need wheat/wood-specific future treatment. Preserve the prior procedural sprites as fallbacks.
- Terrain PNGs are manually authored raster watercolor details with transparent margins. They are **blended above**, not substituted for, procedural grass tile planes to avoid cracks at diamond edges. Each retains 2:1 projection and top-left illumination.
- The 10 texture URLs load once into existing atlas cells. Background-side PNG decoding does not add new draw calls per frame. The image decode failure fallback is per-cell.
- No additional atlas cells, new map areas, state or save keys. Existing mobile resident scale 0.68 and cat 0.75 remain until actual scene-scale comparison warrants a change. 
- Release acceptance includes all test assets loaded at 1365/390/360px; ship only a reviewed one-commit change.

## v0.15.2 · source-side matte correction

The six hand-cut props (harbor, farm, sawmill, home, bakery, tree) had a real **opaque paper-white border**, not just a Canvas sampling issue. Do not confuse it with white architectural details.

- Correct the **source PNG alpha**: contour whiteness is measured only close to transparent pixels, then partial pixels borrow hue from nearby colored interiors. Colored roof/window details away from the contour remain untouched.
- Harbor/farm/sawmill also contain broader pale paper-floor cutouts below the subject; remove these selectively by a bottom-region profile instead of painting the paper grass-green.
- Fixed export: **144×148 RGBA PNG** with the existing ground anchor `(72,103)`, shared 2:1 perspective, top-left light, and no white opaque contour.
- Reproducible edit: `python3 tools/repair_texture_edges.py --input-dir <original-assets> --output-dir assets/textures`. Requires Pillow, NumPy, SciPy **for art production only**, not at game runtime. The input must be an uncorrected checkout, never feed cleaned files into the tool again.
- Release gate: `python3 -m unittest discover -s tests -p texture_fringe_test.py -v` checks source alpha, plus `npm run check` and `python3 tests/painted_assets_e2e.py`.
- Keep the existing runtime `dematteOutline` and procedural fallback for older or broken texture inputs; the cleaned source now provides the primary fix. No extra raster work is performed per frame.
- Grounding improvement: removing the artificially solid white bottom slab lets the real terrain/water show beneath structures. It does **not** add simulated height, physics, or new buildings.

## v0.18.0 · roof and footprint geometry

- All five building PNGs compared at the fixed 2:1 isometric plane and anchor (72,103). Only sawmill and farm needed correction.
- Sawmill: local roof profile lift while wall edges remain intact, visible ground contact y=100 to 102. Farm: shift entire fence/wheat illustration by 3px, ground contact y=99 to 102.
- Home, bakery and harbor remain unchanged because reorientation without a true 3D redraw would destroy their original details.
- Repeatable one-shot edit: tools/reproject_building_assets.py, SHA-locked to the original v0.17 source; never run on its own outputs.
- Preserve save schema, economy, 144x148 transparent RGBA, 72,103 anchor, procedural fallback, atlas/static cache size and mobile input.
