# 파도마을 v0.4 · 보이는 생활과 배달

## Purpose
Currently resource totals change each day without a visible cause. Decorative residents have blank sprites and hard-coded paths that do not respond to construction. A delivery button changes inventory without making the harbor feel active. Preserve the relaxed, accessible Korean seaside village mood and existing save game.

## Approaches evaluated
- A. Add an activity log panel: easiest, but covers the map and repeats resource HUD.
- B. Replace daily production with per-trip logistics: richer mechanics, but substantial economy/save/learning-curve regression.
- **C. Connect existing economic events to movement and nonpersistent feedback:** keep rules stable while making activity visible. Chosen autonomously by project owner role.

## Intended design
1. Compute deterministic connected walking paths from the actual harbor through placed roads to working buildings; no hard-coded pedestrian routes. Unconnected buildings generate no work paths.
2. Render two residents and a cat as properly painted reusable atlas sprites. Resident animation travels on actual paths; cat stays on available harbor roads. Roads may be edited without stale paths.
3. `advanceDay` returns precise per-building `activity` describing actual output. Positive rewards only, no output from disconnected producers; bread events only if grain was consumed. Nonpersistent toastlike floating labels appear over corresponding buildings for a short duration without extra persistent HUD panels.
4. `deliver` on success triggers a temporary voyage animation. The boat visibly departs/returns, a small cargo label is shown. Invalid delivery does not trigger. Gameplay still receives rewards immediately; changing order timing is out of scope.
5. No new libraries, accounts, resources or save schema. All assets share the same 2:1 projection, are rasterized once into the canvas atlas, and drawn via `drawImage` per frame. Produced label surfaces are cached once per event.

## Acceptance / anti-goals
- Desktop and 390px/360px mobile retain fullscreen map, compact header, build, inspect, remove and order flows.
- Pausing freezes scene animation. Existing localStorage save key/version unchanged; hydration from v1 works.
- Unit tests cover dynamic road path, disconnected workers, production event accounting and empty bakery; browser tests cover rendered sprite pixel content, production feedback and successful/failed delivery response.
- Do not add a new fixed panel, dynamic per-frame vector object creation, or a complex logistics backend.
