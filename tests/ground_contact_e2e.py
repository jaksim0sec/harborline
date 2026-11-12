"""Visual and cache regression against the reconstructed GitHub runtime + original PNG bytes."""
import asyncio, base64
from pathlib import Path
from playwright.async_api import async_playwright
from painted_assets_e2e import game_document

ROOT = Path(__file__).resolve().parents[1]
TEXTURES = ['home','bakery','tree','harbor','farm','sawmill','grass','grass2','meadow','clover']

def game_html(broken=None):
    html=game_document()
    for name in TEXTURES:
        uri='data:image/png;base64,'+base64.b64encode((ROOT/'assets/textures'/f'{name}.png').read_bytes()).decode()
        if name==broken:uri='data:image/png;base64,broken'
        html=html.replace("'/assets/textures/"+name+".png'", "'"+uri+"'")
    return html

async def run():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for w,h in [(1365,820),(390,844),(360,780)]:
                page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=w<700,is_mobile=w<700)
                errors=[]
                page.on('pageerror',lambda e: errors.append(str(e)))
                await page.set_content(game_html(),wait_until='domcontentloaded')
                metrics=await page.evaluate('''async()=>{
                    await scene.artReady;
                    const old=CanvasRenderingContext2D.prototype.drawImage;
                    let draws=0;
                    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
                      if(image===scene.contactShadow)draws++;
                      return old.call(this,image,...args);
                    };
                    try{
                      scene.invalidate();scene.buildCache();const afterBuild=draws;
                      const cache=scene.cache;
                      scene.render(performance.now()+60);
                      const afterRender=draws;
                      // Disable one painted item: fallback already has a shadow, so there is exactly
                      // one fewer draw for every corresponding object in the map.
                      scene.paintedNames.delete('farm');scene.invalidate();scene.buildCache();
                      const difference=afterBuild-(draws-afterRender);
                      scene.paintedNames.add('farm');scene.invalidate();scene.buildCache();
                      return {
                         loaded:[...scene.paintedNames],shadowDraws:afterBuild,
                         cacheReused:scene.cache!==null&&afterBuild===afterRender&&cache!==null,
                         fallbackDifference:difference,
                         textureSize:[scene.contactShadow.width,scene.contactShadow.height],
                         cacheBytes:scene.cache.width*scene.cache.height*4,
                         atlasBytes:scene.atlas.canvas.width*scene.atlas.canvas.height*4,
                         saveKey:SAVE_KEY
                      };
                    }finally{CanvasRenderingContext2D.prototype.drawImage=old;}
                }''')
                assert metrics['shadowDraws']>=6,metrics
                assert metrics['fallbackDifference']>=1,metrics
                assert metrics['cacheReused'],metrics
                assert metrics['textureSize']==[112,48],metrics
                assert metrics['saveKey']=='harborline.save.v1'
                assert metrics['cacheBytes']==1968*1134*4,metrics
                assert not errors,errors
                await page.screenshot(path=f'/mnt/data/harborline-v016-{w}.png',full_page=True)
                await page.locator('#pauseBtn').click()
                assert await page.locator('#pauseBtn').get_attribute('aria-label')=='시간 재개'
                await page.locator('#pauseBtn').click()
                if w<700:
                    await page.locator('#mobileOrders').click()
                    assert await page.locator('#ordersPanel').is_visible()
                    await page.locator('#closeOrders').click()
                assert not errors,errors
                print('GROUND CONTACT PASS',w,metrics)
                await page.close()
            fallback=await browser.new_page(viewport={'width':390,'height':844})
            await fallback.set_content(game_html(broken='tree'),wait_until='domcontentloaded')
            val=await fallback.evaluate('''async()=>{await scene.artReady;return {treeLoaded:scene.paintedNames.has('tree'),shadowForTree:paintedGroundContact('tree',scene.paintedNames,10,10),cache:!!scene.cache}}''')
            assert not val['treeLoaded'] and val['shadowForTree'] is None, val
            print('IMAGE FAILURE FALLBACK PASS',val)
            await fallback.close()
        finally:
            await browser.close()

if __name__=='__main__':asyncio.run(run())
