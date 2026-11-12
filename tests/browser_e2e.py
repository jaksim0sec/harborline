import asyncio, pathlib, re
from playwright.async_api import async_playwright
b=pathlib.Path(__file__).resolve().parents[1]; html=(b/'index.html').read_text()
css=(b/'styles.css').read_text(); script=[]
for n in ('model.js','render.js','main.js'):
 s=(b/'src'/n).read_text();s=re.sub(r'^import[^\n]*\n','',s,flags=re.MULTILINE);s=re.sub(r'\bexport\s+(?=(?:const|class|function))','',s);script.append(s)
html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+css+'</style>');html=html.replace('<script type="module" src="./src/main.js"></script>','<script>'+'\n'.join(script)+'</script>')
async def check():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1365,'height':820})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html)
  # A first-time player gets a real next action and can open the same existing letter panel.
  assert await page.locator('[data-order="0"]').count()==1, 'guide action must not reuse delivery-button selector'
  assert '첫 배달' in await page.locator('#guideTitle').inner_text()
  assert '2일' in await page.locator('#guideText').inner_text()
  assert await page.locator('#guideAction').is_visible()
  assert await page.locator('#guideAction').inner_text()=='편지 열기'
  await page.locator('#guideAction').click()
  assert await page.locator('#ordersPanel').is_visible()
  assert '4일' in await page.locator('[data-forecast="0"]').inner_text()
  assert '2일' in await page.locator('[data-forecast="0"]').inner_text()
  await page.locator('#closeOrders').click()
  # The map must extend behind separate small HUD islands, not begin under a full-width header.
  layout=await page.evaluate('''() => {const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {stage:box('.stage'),top:box('.topbar'),identity:box('.identity'),actions:box('.header-actions'),resources:box('.left-hud'),orders:box('.mobile-orders'),bg:getComputedStyle(document.querySelector('.topbar')).backgroundColor};}''')
  assert layout['stage']['y']==0 and layout['stage']['height']>=819,layout
  assert layout['bg'] in ('rgba(0, 0, 0, 0)','transparent'),layout
  assert layout['resources']['y']>=layout['identity']['bottom']+6,layout
  assert layout['orders']['y']>=layout['actions']['bottom']+6,layout
  # Header controls remain functional after the header becomes an overlay.
  await page.locator('#pauseBtn').click()
  assert await page.locator('#pauseBtn').get_attribute('aria-label')=='시간 재개'
  await page.locator('#speedBtn').click()
  assert await page.locator('#speedBtn').inner_text()=='×2'
  await page.locator('#helpBtn').click()
  assert await page.locator('#helpDialog').is_visible()
  await page.locator('#helpOkay').click()
  await page.locator('#pauseBtn').click()
  await page.locator('#speedBtn').click()
  # The map stays unobscured until players explicitly open deliveries.
  assert not await page.locator('#ordersPanel').is_visible(), 'desktop delivery panel must start collapsed'
  assert await page.locator('#mobileOrders').is_visible(), 'delivery toggle should always be accessible'
  bar=await page.locator('.buildbar').bounding_box()
  assert bar['height']<=115, 'build bar unnecessarily covers the map: '+str(bar)
  await page.locator('#mobileOrders').click()
  assert await page.locator('#ordersPanel').is_visible()
  assert await page.locator('#mobileOrders').get_attribute('aria-expanded')=='true'
  # One optional letter focus should improve productivity and assign a visible neighbor.
  assert await page.locator('[data-focus]').count()==3,'each letter needs one clear help choice'
  await page.locator('[data-focus="0"]').click()
  assert await page.locator('[data-focus="0"]').get_attribute('aria-pressed')=='true'
  assert await page.evaluate('game.focusOrderId')==0
  assert '2일' in await page.locator('[data-forecast="0"]').inner_text()
  assert '돕는 중' in await page.locator('#guideTitle').inner_text()
  assert await page.locator('#guideAction').inner_text()=='진행 확인'
  assert '🌾' in await page.locator('#focusIndicator').inner_text()
  await page.evaluate('''() => {
    window.__focusSnapshot=JSON.stringify(game);
    remove(game,9,20);changed();
  }''')
  assert '길 먼저 연결' in await page.locator('[data-focus="0"]').inner_text()
  await page.evaluate('''() => {game=hydrate(JSON.parse(window.__focusSnapshot));scene.game=game;changed();}''')
  focus=await page.evaluate('''() => {
    scene.buildCache();const p=scene.focusRoute;
    const before=game.resources.grain;
    const report=advanceDay(game);
    return {route:p?.length,first:p?.[0],gain:game.resources.grain-before,boost:report.activity.find(a=>a.focused)?.amount};
  }''')
  assert focus['route']>=2 and focus['first']=={'x':9,'y':21},focus
  assert focus['gain']==3 and focus['boost']==6,focus
  await page.screenshot(path='/mnt/data/harborline-v06-desktop.png')
  await page.locator('[data-focus="0"]').click()
  assert await page.evaluate('game.focusOrderId') is None
  assert await page.locator('[data-focus="0"]').get_attribute('aria-pressed')=='false'
  await page.locator('#closeOrders').click()
  assert not await page.locator('#ordersPanel').is_visible()
  tile=await page.evaluate('''() => ({screen:scene.worldToScreen(12,17), tile:scene.screenToTile(scene.worldToScreen(12,17).x,scene.worldToScreen(12,17).y), coin:game.resources.coin })''')
  assert tile['tile']=={'x':12,'y':17},tile
  await page.locator('[data-tool="farm"]').click()
  box=await page.locator('#world').bounding_box(); target=tile['screen']
  await page.mouse.move(box['x']+target['x'],box['y']+target['y'])
  assert await page.locator('#toolHint').get_attribute('data-placement')=='linked','connected placement should preview link'
  assert '항구 연결' in await page.locator('#toolHint').inner_text()
  far=await page.evaluate('scene.worldToScreen(16,10)')
  await page.mouse.move(box['x']+far['x'],box['y']+far['y'])
  assert await page.locator('#toolHint').get_attribute('data-placement')=='unlinked','isolated placement should warn before building'
  await page.mouse.move(box['x']+target['x'],box['y']+target['y'])
  await page.mouse.click(box['x']+target['x'],box['y']+target['y'])
  assert await page.locator('#coin').inner_text()==str(tile['coin']-65),await page.locator('#coin').inner_text()
  assert (await page.locator('#toast').inner_text()).startswith('햇살 밭 완성')
  count=await page.evaluate('game.buildings.length')
  assert count==6,count
  await page.locator('[data-tool="inspect"]').click()
  await page.mouse.click(box['x']+target['x'],box['y']+target['y'])
  assert await page.locator('#inspectCard').is_visible()
  await page.locator('#inspectRemove').click()
  assert await page.evaluate('game.buildings.length')==5
  await page.evaluate('''() => {game.resources.grain=12;renderHUD()}''')
  await page.locator('#mobileOrders').click()
  assert await page.locator('#guideAction').inner_text()=='바로 배달'
  await page.locator('[data-order="0"]').click()
  assert await page.evaluate('game.completed')==1
  assert '첫 배달' not in await page.locator('#guideTitle').inner_text() or '첫 배달' in await page.locator('#guideText').inner_text()
  assert await page.locator('#festivalLabel').inner_text()=='1 / 6'
  await page.keyboard.press('Escape')
  assert not await page.locator('#ordersPanel').is_visible(), 'Escape should return to the map'
  # Gameplay feedback should be visible, not just state math.
  lives=await page.evaluate('''() => {
    const ctx=scene.atlas.canvas.getContext('2d');
    return ['neighbor','neighbor2','cat'].map(n=>{
      const {sx,sy}=scene.atlas.cells.get(n), data=ctx.getImageData(sx,sy,144,148).data;
      let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)pixels++;
      return {n,pixels};
    });
  }''')
  assert all(row['pixels']>65 for row in lives),lives
  alive=await page.evaluate('''() => {
    scene.invalidate();scene.buildCache();
    const result=advanceDay(game);scene.showProduction(result.activity);
    return {routes:scene.walkPaths.map(p=>p.length),flashes:scene.flashes?.length,activity:result.activity.length};
  }''')
  assert alive['routes'] and all(n>=2 for n in alive['routes']),alive
  assert alive['flashes']>0 and alive['activity']>0,alive
  assert await page.evaluate('scene.voyage') is not None,'successful delivery should animate boat'
  paused=await page.evaluate('''() => {
    const base=scene.t || performance.now();
    scene.render(base+100);
    const start=scene.animationTime;
    game.paused=true;scene.render(base+320);
    const frozen=scene.animationTime;
    game.paused=false;scene.render(base+520);
    const resumed=scene.animationTime;
    const restored=hydrate(JSON.parse(JSON.stringify(game)));
    return {start,frozen,resumed,version:restored.version,day:restored.day,
      snapshot:JSON.stringify(restored.resources)===JSON.stringify(game.resources)};
  }''')
  assert paused['frozen']==paused['start'] and paused['resumed']>paused['frozen'],paused
  assert paused['version']==1 and paused['snapshot'] and paused['day']>=2,paused
  duration=await page.evaluate('''() => {let t=performance.now();for(let i=0;i<80;i++) scene.render(t+i*32);return (performance.now()-t)/80;}''')
  print('desktop e2e: OK, avg render ms/frame=',round(duration,2),'errors=',errors)
  await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(350)
  village=await page.evaluate('''() => ({harbor:scene.worldToScreen(9,21), bakery:scene.worldToScreen(11,17), width:scene.width})''')
  mobileLayout=await page.evaluate('''() => {const b=s=>{const r=document.querySelector(s).getBoundingClientRect();return {y:r.y,bottom:r.bottom,right:r.right,x:r.x,height:r.height}};return {stage:b('.stage'),identity:b('.identity'),actions:b('.header-actions'),resources:b('.left-hud'),orders:b('.mobile-orders')}}''')
  assert mobileLayout['stage']['y']==0,mobileLayout
  assert mobileLayout['resources']['y']>=mobileLayout['identity']['bottom']+6,mobileLayout
  assert mobileLayout['orders']['y']>=mobileLayout['resources']['bottom']+4,mobileLayout
  assert village['harbor']['x']>55, 'mobile harbor clipped: '+str(village)
  assert village['bakery']['x']<village['width']-40, 'mobile bakery clipped: '+str(village)
  previews=await page.locator('.tool-art img').count()
  assert previews==6, 'six matching atlas tool previews expected: '+str(previews)
  assert await page.locator('#mobileOrders').is_visible()
  assert await page.locator('.note-card').is_visible(), 'a mobile player also needs the first-goal hint'
  assert (await page.locator('.note-card').bounding_box())['width']<260, 'mobile hint should not cover the map'
  goal=await page.locator('.note-card').bounding_box(); letterButton=await page.locator('#mobileOrders').bounding_box()
  assert goal['x']+goal['width']+4<letterButton['x'], (goal,letterButton)
  previewOk=await page.locator('.tool-art img').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth>0)')
  assert previewOk,'tool atlas preview image failed to load'
  await page.locator('#mobileOrders').click()
  assert await page.locator('#ordersPanel').is_visible()
  print('mobile layout: OK, panel visible')
  before_scroll=await page.evaluate('''() => {let e=document.querySelector('#orderList');e.scrollTop=45;return e.scrollTop;}''')
  assert before_scroll>0,'mobile orders should remain scrollable'
  await page.locator('[data-focus="1"]').click()
  after_scroll=await page.evaluate('document.querySelector("#orderList").scrollTop')
  assert abs(after_scroll-before_scroll)<=1,(before_scroll,after_scroll)
  assert await page.evaluate('game.focusOrderId')==1
  assert '🪵' in await page.locator('#focusIndicator').inner_text()
  hint=await page.locator('#toast').bounding_box()
  resourcesBox=await page.locator('.resource-row').bounding_box()
  assert hint['y']>=resourcesBox['y']+resourcesBox['height']+6,(hint,resourcesBox)
  for i in range(3):
   card=await page.locator('.order').nth(i).bounding_box()
   actions=await page.locator('.order-actions').nth(i).bounding_box()
   assert actions['x']+actions['width']<=card['x']+card['width']-3,(card,actions)
  await page.screenshot(path='/mnt/data/harborline-v06-mobile-panel.png')
  await page.locator('#closeOrders').click()
  await page.screenshot(path='/mnt/data/harborline-v06-mobile-map.png')
  await page.set_viewport_size({'width':360,'height':740})
  await page.wait_for_timeout(150)
  assert (await page.locator('.buildbar').bounding_box())['x']>=0
  assert await page.locator('#mobileOrders').is_visible()
  await page.locator('[data-tool="farm"]').click()
  assert await page.locator('#toolHint').is_visible(),'mobile construction must show a compact instruction'
  print('narrow mobile 360px: OK')
  assert not errors,errors
  await browser.close()
asyncio.run(check())
