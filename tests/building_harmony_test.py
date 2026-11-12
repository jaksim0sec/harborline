"""Review locks for the offline five-building art harmonization pass."""
from pathlib import Path
from PIL import Image
import unittest
import hashlib
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
    'sawmill':('536dfc0b961f6959c33270232fdd8a8640c1bd98','1de9d4e9be6fde0e'),
    'harbor':('efe456f66744ee622ce3fda5e462b2dbb1ffb78e','402422bc830374c5'),
    'bakery':('afce09dbb2029e744a156249949effd352b1c340','4f4961022d5499af'),
    'home':('779fd90f0cc830decebe0b13f6072811e7ce7da4','84fa7d0ef49fd961'),
    'farm':('fc985ecda6ff8c83407c0b03ddb544996ac7b87f','7c61c591c1f2dc33'),
}

class BuildingHarmonyTest(unittest.TestCase):
    def test_expected_source_art_and_alpha_contact_are_preserved(self):
        for name,(expected_sha, expected_alpha_prefix) in EXPECTED.items():
            with self.subTest(name=name):
                data=(ROOT/'assets/textures'/f'{name}.png').read_bytes()
                sha=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
                self.assertEqual(sha,expected_sha)
                a=np.asarray(Image.open(ROOT/'assets/textures'/f'{name}.png').convert('RGBA'))
                self.assertEqual(a.shape,(148,144,4))
                self.assertEqual(hashlib.sha256(a[...,3].tobytes()).hexdigest()[:16],expected_alpha_prefix)
                ys,xs=np.where(a[...,3]>0)
                self.assertEqual(ys.max(),102,'ground anchor must not move')
                self.assertTrue(np.any(a[...,3]==0),'transparent texture required')

if __name__=='__main__': unittest.main()
