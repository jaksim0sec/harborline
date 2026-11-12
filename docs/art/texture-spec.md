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
