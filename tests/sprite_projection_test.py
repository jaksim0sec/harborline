"""Geometry checks for painterly sprites, measured at the visible alpha silhouette."""
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "textures"


def bounds(name, threshold=100):
    pixels = np.asarray(Image.open(ASSETS / f"{name}.png").convert("RGBA"))
    assert pixels.shape == (148, 144, 4)
    ys, xs = np.where(pixels[..., 3] > threshold)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


class ProjectionAlignment(unittest.TestCase):
    def test_workshop_roof_rises_without_moving_its_footprint_sideways(self):
        # Existing roof starts at y=28, whereas the home reference begins at 17.
        left, top, right, bottom = bounds("sawmill")
        self.assertEqual((left, right), (22, 120))
        self.assertGreaterEqual(top, 19)
        self.assertLessEqual(top, 23)
        self.assertEqual(bottom, 102)

    def test_farm_fence_rest_on_the_same_ground_contact_line(self):
        left, top, right, bottom = bounds("farm")
        self.assertEqual((left, right), (29, 116))
        self.assertEqual(top, 36)
        self.assertEqual(bottom, 102)

    def test_other_perspectives_are_left_intact(self):
        self.assertEqual(bounds("home"), (28, 17, 115, 102))
        self.assertEqual(bounds("bakery"), (26, 12, 117, 102))
        self.assertEqual(bounds("harbor"), (22, 38, 120, 102))

    def test_transparency_and_ground_anchor_remain_safe(self):
        for name in ("sawmill", "farm", "home", "bakery", "harbor"):
            with self.subTest(name=name):
                p = np.asarray(Image.open(ASSETS / f"{name}.png").convert("RGBA"))
                a = p[..., 3]
                self.assertTrue(np.any(a == 0))
                self.assertGreater(int((a > 100).sum()), 3400)
                self.assertLessEqual(np.where(a > 0)[0].max(), 103)

if __name__ == "__main__":
    unittest.main()

