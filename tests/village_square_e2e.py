"""Real Chromium verification of the cached village-square landmark and mobile layout."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from streetscape_depth_e2e import page_html

ROOT = Path(__file__).resolve().parents[1]

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
        try:
            for width, height in [(1365,820), (390,844), (360,780)]:
                page = await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                errors=[]
                page.on('pageerror',lambda e: errors.append(str(e)))
                await page.set_content(page_html(ROOT),wait_until='domcontentloaded')
                await page.wait_for_timeout(450)
                measurements=await page.evaluate('''() => {
                  if(!scene.atlas.cells.has('squareFountain'))throw new Error('Fountain missing from texture atlas');
                  const firstSquare=selectVillageSquare(game);
                  if(!firstSquare||firstSquare.x!==9||firstSquare.y!==18)throw new Error('Village heart should start on the connected junction');
                  const events=[];
                  const originalSprite=scene.sprite;
                  scene.sprite=function(ctx,name,x,y){if(name==='squareFountain')events.push({x,y});return originalSprite.call(this,ctx,name,x,y);};
                  scene.invalidate();scene.buildCache();
                  const initialCount=events.length;
                  const cache=scene.cache;
                  scene.render(performance.now()+16);
                  const afterNormalFrame=events.length;
                  const cacheReused=scene.cache===cache;
                  remove(game,9,19);scene.invalidate();scene.buildCache();
                  const afterDisconnect=events.length;
                  place(game,'road',9,19);scene.invalidate();scene.buildCache();
                  const afterReconnect=events.length;
                  scene.sprite=originalSprite;
                  if(initialCount!==1||afterNormalFrame!==1||!cacheReused||afterDisconnect!==1||afterReconnect!==2)
                    throw new Error('Unexpected cache painting counts '+JSON.stringify({initialCount,afterNormalFrame,cacheReused,afterDisconnect,afterReconnect}));
                  return {initialCount,afterNormalFrame,cacheReused,afterDisconnect,afterReconnect,cacheBytes:scene.cache.width*scene.cache.height*4,atlasBytes:scene.atlas.canvas.width*scene.atlas.canvas.height*4,square:firstSquare};
                }''')
                assert measurements['cacheBytes']==1968*1134*4, measurements
                assert not errors, errors
                await page.evaluate('scene.render(performance.now()+100)')
                await page.screenshot(path=f'/mnt/data/harborline-v12-{width}.png',full_page=True)
                assert await page.locator('#pauseBtn').is_visible()
                await page.locator('#pauseBtn').click()
                assert await page.locator('#pauseBtn').get_attribute('aria-label')=='시간 재개'
                await page.locator('#pauseBtn').click()
                if width<690:
                    assert await page.locator('#mobileOrders').is_visible()
                    await page.locator('#mobileOrders').click()
                    assert await page.locator('#ordersPanel').is_visible()
                    await page.locator('#closeOrders').click()
                assert not errors,errors
                print('Chromium village square',width,measurements)
                await page.close()
        finally:
            await browser.close()

if __name__=='__main__': asyncio.run(run())
