"""Regenerate HARBORLINE's corrected RGBA art from an *uncorrected* asset checkout.

One-off artist-side tool, never run at game load or per frame.

    python3 -m pip install Pillow numpy scipy
    python3 tools/repair_texture_edges.py --input-dir /path/to/v0.15.1/assets/textures --output-dir ./assets/textures

Input and output must differ; rerunning on already-corrected pixels degrades the art.
The settings are tuned to the six current hand-cut sprites and should not be
blindly reused for new illustrations.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

SUBJECTS = ('harbor', 'farm', 'sawmill', 'home', 'bakery', 'tree')


def clean_rgba(image: Image.Image, name: str) -> Image.Image:
    original = np.array(image.convert('RGBA'), dtype=np.uint8)
    out = original.copy()
    rgb = original[:, :, :3].astype(np.float32)
    alpha = original[:, :, 3].astype(np.float32)
    distance = distance_transform_edt(alpha > 4)
    low = rgb.min(axis=2)
    span = rgb.max(axis=2) - low
    yy, _ = np.indices(alpha.shape)

    # Paper-white extraction contaminates colors at the silhouette outline.
    whiteness = np.clip((low - 160) / 60, 0, 1) * np.clip((80 - span) / 60, 0, 1)
    rim = np.clip((4.5 - distance) / 3.3, 0, 1)
    removal = np.minimum(1, 1.42 * whiteness * rim)

    # The three new sprites additionally contain a broad pale *paper floor*
    # under their real feet. Restrict cleanup to those lower regions only.
    base = np.zeros(alpha.shape, dtype=bool)
    if name == 'harbor':
        base = ((yy >= 80) & (rgb[:, :, 2] >= rgb[:, :, 0] * .88)
                & (rgb[:, :, 2] >= rgb[:, :, 1] * .91) & (low >= 128)
                & (distance <= 8))
    elif name == 'farm':
        base = (yy >= 86) & (low >= 183) & (span < 85) & (distance <= 6.5)
    elif name == 'sawmill':
        base = (yy >= 89) & (low >= 155) & (span < 75) & (distance <= 7)
    base &= alpha > 0
    base_removal = np.clip((9 - distance) / 7, 0, 1) * base * .97
    removal = np.maximum(removal, base_removal * 1.4)

    # Borrow color from a neighboring solid, chromatic interior pixel;
    # this avoids light/bluish halos even when a feathered alpha remains.
    chromatic = (alpha > 220) & ((low < 170) | (span > 75))
    _, nearest_idx = distance_transform_edt(~chromatic, return_indices=True)
    nearby_color = rgb[nearest_idx[0], nearest_idx[1]]
    correction = np.clip(whiteness * rim * .9 + base_removal * .8, 0, 1)
    out[:, :, :3] = np.rint(rgb * (1 - correction[..., None]) +
                             nearby_color * correction[..., None]).clip(0, 255).astype(np.uint8)
    out[:, :, 3] = np.rint(alpha * (1 - removal)).clip(0, 255).astype(np.uint8)
    out[out[:, :, 3] == 0, :3] = 0
    return Image.fromarray(out, 'RGBA')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    if args.input_dir.resolve() == args.output_dir.resolve():
        parser.error('input and output directories must differ: do not process art twice')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name in SUBJECTS:
        original = Image.open(args.input_dir / f'{name}.png')
        if original.size != (144, 148):
            raise ValueError(f'{name}: expected 144x148 sprite')
        cleaned = clean_rgba(original, name)
        cleaned.save(args.output_dir / f'{name}.png', optimize=True)
        print(f'Cleaned {name}')


if __name__ == '__main__':
    main()
