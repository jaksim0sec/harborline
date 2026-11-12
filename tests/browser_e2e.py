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
  tile=await page.evaluate('''() => ({screen:scene.worldToScreen(12,17), tile:scene.screenToTile(scene.worldToScreen(12,17).x,scene.worldToScreen(12,17).y), coin:game.resources.coin })''')
  assert tile['tile']=={'x':12,'y':17},tile
  await page.locator('[data-tool="farm"]').click()
  box=await page.locator('#world').bounding_box(); target=tile['screen']
  await page.mouse.click(box['x']+target['x'],box['y']+target['y'])
  assert await page.locator('#coin').inner_text()=='315',await page.locator('#coin').inner_text()
  assert (await page.locator('#toast').inner_text()).startswith('햇살 밭 완성')
  count=await page.evaluate('game.buildings.length')
  assert count==6,count
  await page.locator('[data-tool="inspect"]').click()
  await page.mouse.click(box['x']+target['x'],box['y']+target['y'])
  assert await page.locator('#inspectCard').is_visible()
  await page.locator('#inspectRemove').click()
  assert await page.evaluate('game.buildings.length')==5
  await page.evaluate('''() => {game.resources.grain=12;renderHUD()}''')
  await page.locator('[data-order="0"]').click()
  assert await page.evaluate('game.completed')==1
  assert await page.locator('#festivalLabel').inner_text()=='1 / 6'
  duration=await page.evaluate('''() => {let t=performance.now();for(let i=0;i<80;i++) scene.render(t+i*32);return (performance.now()-t)/80;}''')
  print('desktop e2e: OK, avg render ms/frame=',round(duration,2),'errors=',errors)
  await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(350)
  village=await page.evaluate('''() => ({harbor:scene.worldToScreen(9,21), bakery:scene.worldToScreen(11,17), width:scene.width})''')
  assert village['harbor']['x']>55, 'mobile harbor clipped: '+str(village)
  assert village['bakery']['x']<village['width']-40, 'mobile bakery clipped: '+str(village)
  previews=await page.locator('.tool-art img').count()
  assert previews==6, 'six matching atlas tool previews expected: '+str(previews)
  assert await page.locator('#mobileOrders').is_visible()
  previewOk=await page.locator('.tool-art img').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth>0)')
  assert previewOk,'tool atlas preview image failed to load'
  await page.locator('#mobileOrders').click()
  assert await page.locator('#ordersPanel').is_visible()
  print('mobile layout: OK, panel visible')
  await page.set_viewport_size({'width':360,'height':740})
  await page.wait_for_timeout(150)
  assert (await page.locator('.buildbar').bounding_box())['x']>=0
  assert await page.locator('#mobileOrders').is_visible()
  print('narrow mobile 360px: OK')
  assert not errors,errors
  await browser.close()
asyncio.run(check())
