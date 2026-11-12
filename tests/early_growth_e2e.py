"""Chromium: turn real early deliveries into visible coastal growth, without new state."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from streetscape_depth_e2e import page_html

ROOT=Path(__file__).resolve().parents[1]

async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   for width,height in ((1365,820),(390,844),(360,780)):
    page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    await page.set_content(page_html(ROOT),wait_until='domcontentloaded')
    await page.locator('#mobileOrders').click()
    await page.locator('[data-focus="0"]').click()
    await page.evaluate('''() => {advanceDay(game);advanceDay(game);changed()}''')
    assert await page.locator('[data-order="0"]').is_enabled(), 'focus should accelerate grain delivery'
    assert await page.locator('[data-order="1"]').is_enabled(), 'wood should be ready after two days'
    await page.locator('[data-order="0"]').click()
    await page.locator('[data-order="1"]').click()
    assert await page.evaluate('game.completed')==2
    # Wood may be temporarily low after delivering. One more real production day unlocks growth.
    await page.evaluate('''() => {advanceDay(game);changed()}''')
    assert await page.evaluate('canExpandCoast(game).ok') is True
    await page.locator('#closeOrders').click()
    assert await page.evaluate('nextStep(game).action')=='expand'
    assert '해안' in await page.locator('#guideTitle').inner_text()
    original=await page.evaluate('''() => ({coin:game.resources.coin,wood:game.resources.wood})''')
    if width>930:
     assert await page.locator('#guideAction').is_visible()
     assert await page.locator('#guideAction').inner_text()=='해안 넓히기'
     await page.locator('#guideAction').click()
    else:
     assert await page.locator('#mobileOrdersLabel').inner_text()=='🌿 해안 개간'
     assert await page.locator('#readyCount').is_hidden()
     await page.locator('#mobileOrders').click()
     assert await page.locator('#expandCoast').is_visible()
     await page.locator('#expandCoast').click()
    after=await page.evaluate('''() => ({
     coastExpanded:game.coastExpanded,coin:game.resources.coin,wood:game.resources.wood,
     action:nextStep(game).action,
     hydrated:hydrate(JSON.parse(JSON.stringify(game))).coastExpanded,
     cacheBytes:scene.cache.width*scene.cache.height*4,
     atlasBytes:scene.atlas.canvas.width*scene.atlas.canvas.height*4
    })''')
    assert after['coastExpanded'] is True
    assert after['coin']==original['coin']-180 and after['wood']==original['wood']-8,(original,after)
    assert after['action']!='expand',after
    assert after['hydrated'],after
    assert after['cacheBytes']==8926848 and after['atlasBytes']==3409920,after
    assert await page.locator('#mobileOrdersLabel').inner_text()=='✉ 배달'
    assert await page.locator('#ordersPanel').is_hidden()
    await page.locator('#mobileOrders').click()
    assert await page.locator('#ordersPanel').is_visible()
    await page.locator('#closeOrders').click()
    assert not errors,errors
    print('GROWTH PLAY PASS',width,original,after)
    await page.close()
  finally: await browser.close()

if __name__=='__main__': asyncio.run(run())
