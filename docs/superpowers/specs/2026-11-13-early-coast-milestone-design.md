# HARBORLINE v0.19.0 · From delivery to coastal growth

## Playtest evidence
Fresh v0.18.0 model, `DAY_MS=15000`. At idle day 2 wood delivery becomes ready; day 4 bread; day 5 grain. By the first ~60 seconds, two or three deliveries can be available. Coastal expansion already exists and requires two deliveries, 180 coins, and eight wood. `nextStep()` only considers delivery/focus/festival, never the available expansion. On mobile `#guideAction` is hidden below 930px and the only prominent CTA remains the generic `#mobileOrders` button. As a result the first land-growth milestone can be missed.

## Alternatives considered
- New quest/upgrade system: out of scope, adds persistence and systems.
- Big animated celebration: visual noise, weak interaction.
- Reuse the existing guide and delivery entry point to direct players to **already unlocked** coast expansion: chosen, no new state or panels.

## Behavior
- Whenever `canExpandCoast(game).ok` becomes true, `nextStep` prioritizes the existing expansion over ready delivery and the festival description. Message states the existing cost and twelve new land tiles, action is `expand`.
- Desktop guide CTA clicks the existing `#expandCoast` action exactly once, preserving its existing costs and camera centering.
- Mobile 390px/360px: the existing top-right order button temporarily reads `🌿 해안 개간`; tapping it opens the existing order panel with the expansion button visible. After expansion it reverts to the usual delivery button without introducing permanent controls or saved flags.
- If the player cannot afford expansion, show ordinary productive/delivery guidance, never a disabled CTA. A voluntarily dismissed note stays dismissed.
- Existing `harborline.save.v1`, item values, order behavior, production, fallback, atlas/cache, and camera/touch interactions remain unchanged.

## Verification
- Test red: unlocked expansion was not prioritized.
- Node test: readiness, non-affordability, post-expansion, saved data purity.
- Browser: real two-delivery flow, PC direct guide click, mobile button and panel action, exactly-once charge, automatic return to normal behavior, v1 hydration.
- All existing Node and Chromium suites (1365 / 390 / 360).
