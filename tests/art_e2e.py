"""Sprite coverage and art QA in real Chromium. Run from repository root."""
import asyncio, pathlib, re
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]

def document():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    css=(ROOT/'styles.css').read_text(encoding='utf-8')
    script=[]
    for name in ('model.js','render.js','main.js'):
        s=(ROOT/'src'/name).read_text(encoding='utf-8')
        s=re.sub(r'^import[^\n]*\n','',s,flags=re.MULTILINE)
        s=re.sub(r'\bexport\s+(?=(?:const|class|function))','',s)
        script.append(s)
    return html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+css+'</style>').replace('<script type="module" src="./src/main.js"></script>','<script>'+'\n'.join(script)+'</script>')

async def check():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for width,height in [(1365,820),(390,844),(360,780)]:
                page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                errors=[]
                page.on('pageerror',lambda e: errors.append(str(e)))
                await page.set_content(document(),wait_until='domcontentloaded')
                await page.wait_for_timeout(250)
                result=await page.evaluate('''() => {
                    const atlas=scene.atlas;const c=atlas.canvas.getContext('2d');
                    const count=name=>{const p=atlas.cells.get(name);if(!p)return -1;const d=c.getImageData(p.sx,p.sy,144,148).data;
                        let count=0;for(let i=3;i<d.length;i+=4)if(d[i]>20)count++;return count;};
                    return Object.fromEntries(['tree','bush','flowerpatch','rock','lighthouse','dockpost','neighbor','neighbor2','cat','grass','meadow','clover'].map(n=>[n,count(n)]));
                }''')
                assert all(result[name]>60 for name in ['flowerpatch','rock','lighthouse','dockpost']), result
                assert all(result[name]>160 for name in ['neighbor','neighbor2','cat','tree','bush']),result
                assert all(result[name]>1000 for name in ['grass','meadow','clover']),result
                assert not errors, errors
                cached=await page.evaluate('''() => {
                    const before=scene.cache;
                    if(!before||scene.cacheDirty)return false;
                    scene.render(performance.now()+16);
                    return before===scene.cache && scene.cacheDirty===false;
                }''')
                assert cached, 'static world cache must be reused from frame to frame'
                await page.screenshot(path=f'/mnt/data/harborline-v07-{width}.png')
                await page.close()
                print(f'Art atlas + {width}px chromium: OK ({result})')
        finally:
            await browser.close()

asyncio.run(check())
