"""Reproject ONLY the two measured sprite inconsistencies from reviewed v0.17 art.

This is an offline, one-shot source edit. Run against the original v0.17 PNGs.
Do not run twice: input blob SHA is checked to prevent repeated warping.
"""
from __future__ import annotations
from pathlib import Path
import argparse
import hashlib

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHAS = {
    "sawmill": "3da5666146ce8ba3be5e89b7c9a99da5853bb7f8",
    "farm": "38a62992f91c2fd348d9445f5e552395cd40dabe",
}


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def reproject(name: str, origin: Path, dest: Path) -> None:
    raw = origin.read_bytes()
    if blob_sha(raw) != SOURCE_SHAS[name]:
        raise ValueError(f"{origin}: expected a clean v0.17 original; refusing a repeat transform")

    a = np.asarray(Image.open(origin).convert("RGBA"), dtype=np.float32) / 255.0
    if a.shape != (148, 144, 4):
        raise ValueError("Source must be a 144 x 148 RGBA texture")

    h, w = a.shape[:2]
    y, x = np.mgrid[:h, :w].astype(np.float32)
    original_rows = np.arange(h, dtype=np.float32)

    if name == "sawmill":
        # Lift the gable/chimney by up to 9 pixels while leaving wall geometry
        # below y=60 intact. The original visible ground contact y=100 lands at 102.
        roof_pull = 9 * np.clip((60 - original_rows) / (60 - 27), 0, 1)
        new_rows = original_rows + 2 - roof_pull
    else:
        # The fence and wheat are already 2:1. Only their ground contact is 3 px high.
        new_rows = original_rows + 3

    from_y = np.interp(y.ravel(), new_rows, original_rows, left=-20, right=h + 20).reshape((h, w))
    # Sample premultiplied RGB to avoid white/gray outlines around transparent edges.
    premult = a.copy()
    premult[..., :3] *= a[..., 3, None]
    sampled = np.stack([
        map_coordinates(premult[..., channel], [from_y, x], order=1,
                        mode="constant", cval=0)
        for channel in range(4)
    ], axis=-1)
    sampled[..., 3] = np.where(sampled[..., 3] * 255 < 5, 0, sampled[..., 3])
    rgb = np.divide(sampled[..., :3], sampled[..., 3, None],
                    out=np.zeros_like(sampled[..., :3]),
                    where=sampled[..., 3, None] > 0.001)
    rgba = np.concatenate([rgb, sampled[..., 3, None]], axis=-1)
    result = np.clip(rgba * 255 + 0.5, 0, 255).astype(np.uint8)
    result[104:, :, :] = 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(result, "RGBA").save(dest)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--source-dir", type=Path, default=ROOT / "assets" / "textures")
    p.add_argument("--output-dir", type=Path, default=ROOT / "assets" / "textures")
    options = p.parse_args()
    for name in SOURCE_SHAS:
        reproject(name, options.source_dir / f"{name}.png",
                  options.output_dir / f"{name}.png")


if __name__ == "__main__":
    main()

