"""Depth art, cached ground and real HUD checks at PC and small mobile viewports."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import re

def page_html(root):
    html=(root/'index.html').read_text(encoding='utf-8')
    css=(root/'styles.css').read_text(encoding='utf-8')
    src=[]
    for name in ('model.js','render.js','main.js'):
        data=(root/'src'/name).read_text(encoding='utf-8')
        data=re.sub(r'^import[^\n]*\n','',data,flags=re.MULTILINE)
        data=re.sub(r'\bexport\s+(?=(?:const|class|function))','',data)
        src.append(data)
    return html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+css+'</style>').replace('<script type="module" src="./src/main.js"></script>','<script>'+'\n'.join(src)+'</script>')

ROOT=Path(__file__).resolve().parents[1]
async def run():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for width,height in [(1365,820),(390,844),(360,780)]:
                page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                errors=[]
                page.on('pageerror',lambda err:errors.append(str(err)))
                await page.set_content(page_html(ROOT),wait_until='domcontentloaded')
                await page.wait_for_timeout(500)
                measurements=await page.evaluate('''() => {
                  const shore=[];
                  for(let x=0;x<SIZE;x++) for(let y=0;y<SIZE;y++){
                    if(coastEdgeMask(game,x,y))shore.push([x,y]);
                  }
                  if(!shore.length)throw new Error('No coastline contour');
                  const initialCache=scene.cache;
                  scene.render(performance.now()+16);
                  if(scene.cache!==initialCache)throw new Error('Static map was rebuilt without changes');
                  if(!scene.occluders.length)throw new Error('Missing cached occluder entries');
                  const oldPath=scene.walkPaths,oldFocus=scene.focusRoute,oldProps=scene.occluders;
                  scene.walkPaths=[[{x:8,y:15}]];
                  scene.focusRoute=null;
                  scene.occluders=[{x:9,y:16,type:'tree'}];
                  let covers=0;
                  const draw=scene.sprite;
                  scene.sprite=function(ctx,name,x,y){if(name==='tree')covers++;return draw.call(this,ctx,name,x,y);};
                  scene.render(performance.now()+32);
                  scene.sprite=draw;
                  scene.walkPaths=oldPath;scene.focusRoute=oldFocus;scene.occluders=oldProps;
                  if(covers<1)throw new Error('Front tree not restored on moving actor');
                  return {width:scene.width,shoreTiles:shore.length,occluders:oldProps.length,
                     covers,cacheBytes:scene.cache.width*scene.cache.height*4,
                     atlasBytes:scene.atlas.canvas.width*scene.atlas.canvas.height*4,
                     saveKey:SAVE_KEY};
                }''')
                assert measurements['saveKey']=='harborline.save.v1', measurements
                assert measurements['cacheBytes']==1968*1134*4
                assert await page.locator('canvas').count()>=1
                assert not errors, errors
                # Re-render with normal paths and capture the actual playable first screen.
                await page.evaluate('scene.render(performance.now()+48)')
                await page.screenshot(path=f'/mnt/data/harborline-v10-{width}.png',full_page=True)
                print('Chromium depth',width,measurements)
                await page.close()
        finally: await browser.close()

if __name__=='__main__': asyncio.run(run())
