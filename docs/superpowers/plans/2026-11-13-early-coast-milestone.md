# HARBORLINE v0.19.0 · Growth milestone visibility plan

> Single validated commit only, per AGENTS.md.

1. Read main, AGENTS, time/production/order/expansion guides. Simulate first five minutes to identify dominant missed milestone.
2. Write Node failing test for expansion priority and edge cases. Red→green in pure `nextStep`, no save changes.
3. Write Chromium failing test on desktop/mobile expansion affordance. Reuse existing guide/button/order panel and expansion click handler. Avoid new UI surfaces.
4. Update help text only if necessary; preserve 24x24, economy, static art, existing touch controls.
5. Run `npm run check` and entire Chromium E2E suite on the exact GitHub SHA checkout. Compare cache bytes and screenshot.
6. `git diff --check`; upload exact verified blobs to GitHub as one commit, with expected main SHA lease. Confirm Vercel Production READY and SHA match.
