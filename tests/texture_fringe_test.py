"""Pixel-level release gate for opaque white halos in source RGBA art.
Run: python3 -m unittest discover -s tests -p 'texture_fringe_test.py' -v
Requires Pillow only, and never edits release images.
"""
import unittest
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SUBJECTS = ('harbor', 'farm', 'sawmill', 'home', 'bakery', 'tree')


def pale_outer_pixels(image):
    """Count near-white opaque pixels within three pixels of transparency."""
    w, h = image.size
    pixels = image.load()
    count = 0
    near = [(dx, dy) for dx in range(-3, 4) for dy in range(-3, 4) if dx * dx + dy * dy <= 9]
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 200 or min(r, g, b) <= 185 or max(r, g, b) - min(r, g, b) >= 68:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and pixels[x + dx, y + dy][3] <= 4 for dx, dy in near):
                count += 1
    return count


class TextureFringeTest(unittest.TestCase):
    def test_source_texture_edges_are_clean(self):
        for name in SUBJECTS:
            with self.subTest(name=name):
                im = Image.open(ROOT / 'assets' / 'textures' / (name + '.png'))
                self.assertEqual(im.mode, 'RGBA')
                self.assertEqual(im.size, (144, 148))
                self.assertLessEqual(pale_outer_pixels(im), 25,
                                     'opaque white border remains in original PNG')
                self.assertGreater(sum(im.load()[x, y][3] > 180
                                       for y in range(im.height) for x in range(im.width)), 2500,
                                   'interior artwork must not be erased')


if __name__ == '__main__':
    unittest.main()
