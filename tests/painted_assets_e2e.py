"""Actual HTTP/Chromium tests of real transparent PNG texture assets and grounded chibi scale."""
import asyncio, base64, functools, http.server, threading, urllib.request, re
from pathlib import Path
from playwright.async_api import async_playwright
def game_document():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    css=(ROOT/'styles.css').read_text(encoding='utf-8')
    scripts=[]
    for name in ('model.js','render.js','main.js'):
        js=(ROOT/'src'/name).read_text(encoding='utf-8')
        js=re.sub(r'^import[^\n]*\n','',js,flags=re.MULTILINE)
        js=re.sub(r'\bexport\s+(?=(?:const|class|function))','',js)
        scripts.append(js)
    return html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+css+'</style>').replace('<script type="module" src="./src/main.js"></script>','<script>'+'\n'.join(scripts)+'</script>')

ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

async def check():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
    worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
    url=f'http://127.0.0.1:{server.server_port}/'
    # Chromium in the model sandbox blocks all navigations, including loopback.
    # Verify the real HTTP server in Python, then inject the exact PNG bytes into the
    # same inline Chromium renderer as data URLs. Production still uses real file paths.
    for name in ['home','bakery','tree','harbor','farm','sawmill','grass','grass2','meadow','clover']:
        with urllib.request.urlopen(url+'assets/textures/'+name+'.png') as response:
            assert response.status==200 and response.headers.get_content_type()=='image/png'
    html=game_document()
    for name in ['home','bakery','tree','harbor','farm','sawmill','grass','grass2','meadow','clover']:
        uri='data:image/png;base64,'+base64.b64encode((ROOT/'assets/textures'/f'{name}.png').read_bytes()).decode()
        html=html.replace("'/assets/textures/"+name+".png'","'"+uri+"'")
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                for w,h in [(1365,820),(390,844),(360,780)]:
                    page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=w<700,is_mobile=w<700)
                    errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    await page.set_content(html,wait_until='domcontentloaded')
                    await page.wait_for_timeout(180)
                    result=await page.evaluate('''async () => {
                      const initial=Object.keys(PAINTED_TEXTURES);
                      const loaded=await scene.artReady;
                      const cells=scene.atlas.cells;
                      const c=scene.atlas.canvas.getContext('2d');
                      const painted={};
                      for(const name of loaded){
                        const {sx,sy}=cells.get(name);
                        let n=0;const data=c.getImageData(sx,sy,144,148).data;
                        for(let i=3;i<data.length;i+=4)if(data[i]>80)n++;
                        painted[name]=n;
                      }
                      scene.render(performance.now()+30);
                      const cache=scene.cache;
                      let actors=[]; const original=scene.sprite;
                      scene.sprite=function(c,name,x,y,scale){if(['neighbor','neighbor2','cat'].includes(name))actors.push({name,scale});return original.call(this,c,name,x,y,scale)};
                      scene.render(performance.now()+34);
                      scene.sprite=original;
                      const thumb=document.querySelector('[data-tool="home"] img')?.src||'';
                      let saved=null;try{saved=localStorage.getItem('harborline.save.v1')}catch{}
                      return {loaded,initial,painted,actors,cacheExists:!!cache,cacheBytes:cache?.width*cache?.height*4,preview:thumb.startsWith('data:image/png'),saved:!!saved};
                    }''')
                    assert sorted(result['loaded'])==sorted(['bakery','home','tree','harbor','farm','sawmill','grass','grass2','meadow','clover']),result
                    assert min(result['painted'].values())>700,result
                    assert result['cacheExists'] and result['cacheBytes']==1968*1134*4,result
                    assert result['preview'],result
                    assert any(c['name']=='neighbor' and c['scale']==.68 for c in result['actors']),result
                    assert any(c['name']=='neighbor2' and c['scale']==.68 for c in result['actors']),result
                    assert any(c['name']=='cat' and c['scale']==.75 for c in result['actors']),result
                    assert not errors,errors
                    await page.screenshot(path=f'/mnt/data/harborline-v14-{w}.png',full_page=True)
                    # Existing controls remain interactive.
                    await page.locator('#pauseBtn').click()
                    assert await page.locator('#pauseBtn').get_attribute('aria-label')=='시간 재개'
                    await page.locator('#pauseBtn').click()
                    if w<700:
                      await page.locator('#mobileOrders').click()
                      assert await page.locator('#ordersPanel').is_visible()
                      await page.locator('#closeOrders').click()
                    assert not errors,errors
                    print('CHROMIUM PASS',w,result['loaded'],'solid_pixels',result['painted'],'citizens',result['actors'])
                    await page.close()
                # If an image is blocked, keep the procedural fallback with no crash.
                page=await browser.new_page(viewport={'width':390,'height':844})
                tree_uri='data:image/png;base64,'+base64.b64encode((ROOT/'assets/textures/tree.png').read_bytes()).decode()
                broken=html.replace(tree_uri,'data:image/png;base64,broken')
                await page.set_content(broken,wait_until='domcontentloaded')
                degraded=await page.evaluate('''async()=>{
                  const names=await scene.artReady;
                  const tree=scene.atlas.cells.get('tree'),c=scene.atlas.canvas.getContext('2d');
                  const p=c.getImageData(tree.sx+72,tree.sy+79,1,1).data;
                  return {names,pixel:Array.from(p),dirty:scene.cacheDirty};
                }''')
                assert sorted(degraded['names'])==sorted([n for n in ['bakery','home','harbor','farm','sawmill','grass','grass2','meadow','clover']]),degraded
                assert not degraded['pixel']==[0,0,0,0],degraded
                print('FALLBACK PASS',degraded)
                await page.close()
            finally:
                await browser.close()
    finally:
        server.shutdown();server.server_close();worker.join(timeout=3)

if __name__=='__main__':asyncio.run(check())
