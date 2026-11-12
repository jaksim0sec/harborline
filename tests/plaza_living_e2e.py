"""Chromium tests of social square visits, thank-you feedback, and existing controls."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from streetscape_depth_e2e import page_html

ROOT = Path(__file__).resolve().parents[1]

async def run():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for width,height in ((1365,820),(390,844),(360,780)):
                page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                await page.set_content(page_html(ROOT),wait_until='domcontentloaded')
                await page.wait_for_timeout(200)
                result=await page.evaluate('''() => {
                  if(!scene.squareRoute||scene.squareRoute.length!==4)throw new Error('Expected connected fountain visit route');
                  const previousCache=scene.cache;
                  const before=JSON.stringify(game);
                  let drawn=[];
                  const sprite=scene.sprite;
                  scene.sprite=function(ctx,name,x,y){if(name==='neighbor2')drawn.push({x,y});return sprite.call(this,ctx,name,x,y)};
                  scene.animationTime=4500;
                  scene.render(performance.now()+16);
                  scene.sprite=sprite;
                  if(drawn.length!==1)throw new Error('Expected one plaza visitor, got '+drawn.length);
                  const square=scene.squareTile;
                  const wantX=(square.x-square.y)*72/2, wantY=(square.x+square.y)*36/2-(SIZE-1)*36/2;
                  if(Math.abs(drawn[0].x-wantX)>1||Math.abs(drawn[0].y-wantY)>3)throw new Error('Resident did not stop at fountain '+JSON.stringify({drawn,wantX,wantY}));
                  if(scene.cache!==previousCache)throw new Error('Visiting invalidated static cache');
                  if(JSON.stringify(game)!==before)throw new Error('Visit changed save data');
                  return {square,visitor:drawn[0],cacheBytes:scene.cache.width*scene.cache.height*4,atlasBytes:scene.atlas.canvas.width*scene.atlas.canvas.height*4};
                }''')
                assert result['cacheBytes']==1968*1134*4
                # A decorated square can remain connected even if every workplace is gone.
                retained=await page.evaluate('''() => {
                  const prev=scene.walkPaths;scene.walkPaths=[];
                  let names=[];const draw=scene.sprite;
                  scene.sprite=function(ctx,name,x,y){if(name==='neighbor2')names.push(name);return draw.call(this,ctx,name,x,y)};
                  scene.render(performance.now()+20);
                  scene.walkPaths=prev;scene.sprite=draw;
                  return names;
                }''')
                assert retained==['neighbor2'],('connected road should allow a square visitor even without workplaces',retained)
                assert not errors,errors
                await page.screenshot(path=f'/mnt/data/harborline-v13-{width}.png',full_page=True)
                # A real delivery click triggers existing boat and *new* transient town greeting.
                await page.evaluate('game.resources.grain=50;changed();')
                await page.locator('#mobileOrders').click()
                await page.locator('[data-order="0"]').click()
                greeting=await page.evaluate('''() => {
                  const started=scene.plazaMessageSince;
                  let labels=[];const original=scene.labelSprite;
                  scene.labelSprite=function(text){labels.push(text);return original.call(this,text);};
                  scene.render(performance.now()+20);scene.labelSprite=original;
                  return {greeting:labels.includes('배달 고마워요!'),hasVoyage:!!scene.voyage,started,completed:game.completed};
                }''')
                assert greeting['hasVoyage'] and greeting['greeting'] and greeting['completed']>0,greeting
                await page.locator('#closeOrders').click()
                await page.evaluate('scene.render(performance.now()+25)')
                await page.screenshot(path=f'/mnt/data/harborline-v13-delivery-{width}.png',full_page=True)
                # No repeated greeting if the fountain has been disconnected.
                recovered=await page.evaluate('''() => {
                  remove(game,9,19);scene.invalidate();scene.render(performance.now()+32);
                  const off=!scene.squareRoute&&!scene.squareTile;
                  place(game,'road',9,19);scene.invalidate();scene.render(performance.now()+48);
                  const on=!!scene.squareRoute&&scene.squareTile?.x===9;
                  return {off,on};
                }''')
                assert recovered=={'off':True,'on':True},recovered
                await page.locator('#pauseBtn').click()
                paused=await page.evaluate('''() => {const before=scene.animationTime;scene.render(performance.now()+200);return [before,scene.animationTime]}''')
                assert paused[0]==paused[1],paused
                await page.locator('#pauseBtn').click()
                assert not errors,errors
                print('PC/mobile plaza life',width,result,'greeting',greeting,'road',recovered)
                await page.close()
        finally:
            await browser.close()

if __name__=='__main__': asyncio.run(run())
