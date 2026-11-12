# v0.18.0 Sprite Projection Alignment

## Evidence
Reviewed actual 144x148 RGBA sprite alpha (>100) extents under the shared isometric 2:1 anchor (72,103).

| Sprite | Original visible bounds x / y | Decision |
|---|---|---|
| sawmill | 22–120 / 28–100 | Raise upper gable and restore ground contact |
| home | 28–115 / 17–102 | Retain original painterly art |
| bakery | 26–117 / 12–102 | Retain taller shop sign and chimney |
| harbor | 22–120 / 38–102 | Retain dock overhang appropriate to shore |
| farm | 29–116 / 33–99 | Move intact fence and wheat down three pixels |

## Geometry
- Sawmill: move source roof pixels above y=60 upward by up to 9px with a linear falloff over source y=27–60. All lower walls retain exactly their geometry except a +2px vertical offset. X never warped.
- Farm: pure +3px vertical translation, no horizontal changes or rescaling.
- Images resampled with premultiplied alpha and alpha < 5 removed. Limit visible footprint to <= y=103. Keep original canvas dimensions and upper-left lighting.
- Do not mirror the sawmill, home or bakery; different gable orientations are valid 90-degree architecture choices, not evidence of an incorrect camera.

## Non-goals
Do not change model, economy, save key, collision tiles, renderer, UI, or resident scaling. No automatic rework of bakery/home/harbor, no style-only color edits.

## Acceptance
Measured geometry test fails on source and passes on outputs; existing immutable PNG locks updated; Node 53, Python asset tests, Chromium 1365/390/360 plus all existing E2E tests; single commit after comparison with remote main; Production SHA match.
