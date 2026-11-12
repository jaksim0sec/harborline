# Neighbors help with deliveries · design

## Goal
Turn the current passive production + delivery wait into one low-pressure meaningful choice. Players can select exactly one visible letter to ask neighbors to help produce its requested goods; a walking neighbor routes to the appropriate working building. The choice improves timing without requiring management of every worker.

## Product constraints
- Existing zero-focus play produces **exactly** the same resources on each day as v0.4.0.
- Focus is optional, reversible, one order at a time, free to change. Focus is not a new inventory or currency.
- No new building type, full-screen panel or art source. Reuse same 2.5D atlas and connected path network.
- Preserve `SAVE_KEY` and `version:1` and old saves. Store optional `focusOrderId`, validate it on hydration, clear focus on successful delivery of that order.
- Korean easy-to-read cues. One small action per existing order and subtle map feedback only while focus is productive.

## Design / trade-offs
Considered (1) staffing per building (complex, punitive and UI-heavy); (2) shipping delay (passive wait without meaningful resource choice); and (3) one letter to focus (selected). We choose (3) because the player sees a target, a helper, and a faster outcome with minimal surface area.

A focused letter can give the first **connected** producer of its resource +2 units per day (grain or wood). Focused bread production is +2 bread at the first connected bakery only if there are at least 3 grains after regular production; pay 3 extra grain (no free goods). Default production and delivery rewards are unchanged. A focus on a disconnected/missing producer has no effect and no fake work animation.

## Observable results
- Orders panel offers `도움 요청` and `✓ 돕는 중` states with aria-pressed.
- Collapsed `배달` control shows a tiny indicator while focused. Buildings and resident movement visually point to the relevant workplace. Day-end production label shows boosted amount, not overlapping duplicates.
- Help dialog explains the single optional mechanic. Existing UI remains legible in 1365px, 390px and 360px.
- Saving/loading v1 without focus yields none; new saves carry valid focus only.

## Non-goals
No auto-delivery, delivery timer, remote account, notification system, additional population mechanics or texture generation.

## Verification
Red/green unit tests for focus selection, grain/wood/bread boost, connected producer requirements, hydration, order completion and baseline economy. Full existing Node suite, Chromium desktop/mobile browser workflow, focus highlight and NPC route verification. One GitHub commit after verification and Vercel Production state check.
