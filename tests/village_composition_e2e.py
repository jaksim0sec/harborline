"""Visually verify deterministic road paving and inhabited streets. Run from repository root."""
import asyncio
import pathlib
import re
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]

def page_html(root=ROOT):
    html=(root/'index.html').read_text(encoding='utf-8')
    css=(root/'styles.css').read_text(encoding='utf-8')
    script=[]
    for name in ('model.js','render.js','main.js'):
        s=(root/'src'/name).read_text(encoding='utf-8')
        s=re.sub(r'^import[^\n]*\n','',s,flags=re.MULTILINE)
        s=re.sub(r'\bexport\s+(?=(?:const|class|function))','',s)
        script.append(s)
    return html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+css+'</style>').replace('<script type="module" src="./src/main.js"></script>','<script>'+'\n'.join(script)+'</script>')

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for w,h in ((1365,820),(390,844),(360,780)):
                page=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
                errors=[]
                page.on('pageerror',lambda err:errors.append(str(err)))
                await page.set_content(page_html(),wait_until='domcontentloaded')
                await page.wait_for_timeout(400)
                check=await page.evaluate('''() => {
                  const paths=new Set(game.roads.map(r=>`${r.x},${r.y}`));
                  const junction=roadMask(paths,9,18);
                  const atl=scene.atlas;
                  const roadSprites=[...Array(16)].map((_,i)=>`road-${i}`).filter(n=>atl.cells.has(n)).length;
                  return {junction,plaza:isVillagePlaza(paths,9,18),roadSprites,saveKey:SAVE_KEY,
                    cache:[scene.cache.width,scene.cache.height],atlas:[atl.canvas.width,atl.canvas.height],
                    buildings:game.buildings.length,roads:game.roads.length};
                }''')
                assert check['junction']==14,check
                assert check['plaza'],check
                assert check['roadSprites']==16,check
                assert check['saveKey']=='harborline.save.v1',check
                assert check['buildings']==5 and check['roads']==8,check
                assert not errors,errors
                assert await page.locator('[data-tool="road"]').count()==1
                # The same saved road network must change its decorative plaza as players build/remove tiles.
                toggled=await page.evaluate('''() => {
                  const state=JSON.stringify(game),before=roadMask(new Set(game.roads.map(r=>`${r.x},${r.y}`)),9,18);
                  const testGame=hydrate(JSON.parse(state));
                  remove(testGame,10,18);
                  const after=roadMask(new Set(testGame.roads.map(r=>`${r.x},${r.y}`)),9,18);
                  return {before,after,preserved:JSON.stringify(game)===state};
                }''')
                assert toggled=={'before':14,'after':12,'preserved':True},toggled
                await page.screenshot(path=f'/mnt/data/harborline-v09-{w}.png',full_page=True)
                print(f'Chromium {w}px village visuals: OK | {check}')
                await page.close()
        finally:
            await b.close()

asyncio.run(main())
