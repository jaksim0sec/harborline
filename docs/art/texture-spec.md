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


## v0.15 final release and transport validation

- Seven second-pass image cells are committed as **actual binary PNG files**, not UTF-8 strings or screenshots. A GitHub Git-blob SHA is computed over `blob <byte length>\0<original bytes>` and checked before inserting each image into the target tree.
- Never pass decoded arbitrary PNG bytes to the UTF-8 GitHub blob API. Use `encoding: base64` and compare each returned SHA with `git hash-object <asset>.png`. Abort the `main` ref update on any mismatch.
- Farm first-pass resembled a flower garden; the release-grade candidate retains the existing fence and brush texture but warms foliage into golden wheat heads. Sawmill first-pass resembled a forge; the release-grade candidate adds a muted circular saw and stacked timber while preserving its original exterior.
- Both revisions preserve 144×148 RGBA, 2:1 perspective and ground anchor `(72,103)`. They intentionally do not add collider, build cost, resource type, or saved fields.
- Existing procedural fallback on failed image loads is unchanged. Rendering still composites ten PNGs once into existing atlas cells, and static game map cache sizes must be measured in Chromium.
- Tradeoff: retouched sprites still reuse first-pass art sources, and the harbor's relative perspective and the field's stylization require a later true master-art production pass.
