"""Source-only harmonization pass for the five original building sprites.

Run after harmonize_building_pngs.py on a clean remote v0.16.0 checkout.
Input must be first-pass PNGs, never re-apply to already exported v2 files.
Uses Pillow and NumPy for offline authoring; no runtime dependencies are added.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import argparse
import hashlib
import numpy as np

BUILDINGS = ('sawmill', 'harbor', 'bakery', 'home', 'farm')
FIRST_PASS_SHA = {
 'harbor': '72d41e88f92cb8abe4c5d5bca3acd8695253993a',
 'farm': 'eeb90b6f7fe1beadee9b785a5989e3f7b6b00ff4',
 'sawmill': 'fcb3d7bcd6f1b1aa1a93148579c5ffe66aca1db7',
 'home': '142b135d400f7877408f31301c83ce6107d5377b',
 'bakery': '40b2b80d78ed91859eb7cacc3624c2a53e4371b9',
}

def git_blob_sha(payload: bytes) -> str:
    return hashlib.sha1(f'blob {len(payload)}\0'.encode() + payload).hexdigest()

# Deliberately subtle: artwork should remain recognizable at 1x game size.
PARAMETERS = {
    'sawmill': (0.14, 0.12, 0.12, 0.08, 0.015),
    'harbor':  (0.04, 0.05, 0.08, 0.10, 0.000),
    'bakery':  (0.09, 0.09, 0.08, 0.08, 0.030),
    'home':    (0.07, 0.07, 0.07, 0.06, 0.014),
    'farm':    (0.10, 0.11, 0.08, 0.09, 0.010),
}

def adjust_sprite(original: Image.Image, name: str) -> Image.Image:
    if name not in PARAMETERS:
        raise ValueError(name)
    img = original.convert('RGBA')
    if img.size != (144, 148):
        raise ValueError(f'{name}: expected 144x148, got {img.size}')
    roof_blend, roof_desat, wall_blend, texture_blend, base_lift = PARAMETERS[name]
    data = np.asarray(img, dtype=np.float32) / 255.0
    alpha = data[..., 3].copy()
    original_rgb = data[..., :3].copy()
    # Blur premultiplied colors, not opaque white outside the silhouette.
    premultiplied = np.dstack([original_rgb * alpha[..., None], alpha])
    blurred = np.asarray(Image.fromarray(np.uint8(np.clip(premultiplied * 255, 0, 255) + .5), 'RGBA').filter(
        ImageFilter.GaussianBlur(radius=0.56)), dtype=np.float32) / 255.0
    spread = np.divide(blurred[..., :3], np.maximum(blurred[..., 3:4], 1e-4))
    rgb = original_rgb * (1 - texture_blend) + spread * texture_blend
    rgb = np.clip(rgb, 0, 1)
    hsv = np.asarray(Image.fromarray(np.uint8(rgb * 255 + .5), 'RGB').convert('HSV'), dtype=np.float32) / 255
    # Warm-red roof and tile bands only. Do not recolor blue bakery awnings or farm grain.
    warm_roof = (alpha > .35) & (hsv[..., 0] < .13) & (hsv[..., 1] > .23) & (hsv[..., 2] > .25)
    if name not in ('farm','harbor'):
        target_hue = .063
        hsv[...,0] = np.where(warm_roof, hsv[...,0]*(1-roof_blend) + target_hue*roof_blend, hsv[...,0])
    hsv[...,1] = np.where(warm_roof, hsv[...,1]*(1-roof_desat), hsv[...,1])
    # Farm's crop yellows stay distinct, but less fluorescent than house roofs.
    if name == 'farm':
        crop = (alpha > .30) & (hsv[...,0] > .105) & (hsv[...,0] < .19) & (hsv[...,1] > .27)
        hsv[...,1] = np.where(crop, hsv[...,1] * .94, hsv[...,1])
    # Keep blue bakery awning hue, soften its contrast only.
    if name == 'bakery':
        blue = (alpha > .30) & (hsv[...,0] > .48) & (hsv[...,0] < .65) & (hsv[...,1] > .2)
        hsv[...,1] = np.where(blue, hsv[...,1] * .97, hsv[...,1])
    adjusted = np.asarray(Image.fromarray(np.uint8(np.clip(hsv, 0, 1) * 255 + .5), 'HSV').convert('RGB'), dtype=np.float32) / 255
    # A shared creamy stone and timber palette. Leave bright windows and dark beams recognizable.
    neutral = (alpha > .40) & (hsv[...,1] < .33) & (hsv[...,2] > .24) & (hsv[...,2] < .88)
    stone = np.array([.69,.60,.49], dtype=np.float32)
    adjusted = np.where(neutral[...,None], adjusted*(1-wall_blend) + stone*wall_blend, adjusted)
    # Correct excess darkening from pass 1 only near the actual anchor, never draw new shadows.
    ys, xs = np.where(alpha > .20)
    y_top, y_bottom = int(ys.min()), int(ys.max())
    y_grid = np.arange(alpha.shape[0], dtype=np.float32)[:,None]
    y_normalized = (y_grid-y_top) / max(1, y_bottom-y_top)
    lift = base_lift * np.clip((y_normalized-.70)/.30,0,1)[...,None]
    adjusted = np.clip(adjusted * (1 + lift), 0, 1)
    # Do not modify alpha, silhouette, size or the established ground contact anchor.
    result = np.dstack([adjusted, alpha])
    output = np.uint8(np.clip(result * 255 + .5,0,255))
    original_bytes = np.asarray(img, dtype=np.uint8)
    output[...,3] = original_bytes[...,3]
    output[original_bytes[...,3] == 0,:3] = original_bytes[original_bytes[...,3]==0,:3]
    return Image.fromarray(output, 'RGBA')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir',type=Path,default=Path('assets/textures'))
    parser.add_argument('--output-dir',type=Path,default=Path('assets/textures'))
    opts = parser.parse_args()
    opts.output_dir.mkdir(parents=True, exist_ok=True)
    for name in BUILDINGS:
        source = opts.source_dir/f'{name}.png'
        if git_blob_sha(source.read_bytes()) != FIRST_PASS_SHA[name]:
            raise ValueError(f'{name}: expected first-pass PNG; refusing to double-apply correction')
        original = Image.open(source).convert('RGBA')
        adjusted = adjust_sprite(original,name)
        adjusted.save(opts.output_dir/f'{name}.png', optimize=True)
        print(f'Updated: {name} {adjusted.size}, alpha preserved')

if __name__ == '__main__':
    main()
