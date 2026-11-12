import asyncio,pathlib,re
from playwright.async_api import async_playwright
root=pathlib.Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="./styles.css">','<style>'+(root/'styles.css').read_text()+'</style>')
parts=[]
for name in ('model.js','render.js','main.js'):
 s=(root/'src'/name).read_text()
 s=re.sub(r'^import[^\n]*\n','',s,flags=re.M)
 s=re.sub(r'\bexport\s+(?=(?:const|class|function))','',s)
 parts.append(s)
html=html.replace('<script type="module" src="./src/main.js"></script>','<script>'+'\n'.join(parts)+'</script>')
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1365,'height':820})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html)
  await page.locator('#mobileOrders').click()
  b=page.locator('#expandCoast');assert await b.count()==1 and await b.is_disabled()
  await page.evaluate('''() => {game.completed=2;game.resources.coin=500;game.resources.wood=50;changed()}''')
  assert await b.is_enabled();assert await page.evaluate('terrain(9,22,game)')=='water'
  await b.click()
  r=await page.evaluate('''() => ({ok:game.coastExpanded,coin:game.resources.coin,wood:game.resources.wood})''')
  assert r=={'ok':True,'coin':320,'wood':42},r
  assert await page.locator('#ordersPanel').is_hidden()
  s=await page.evaluate('''() => {const x=place(game,'road',9,22);const y=hydrate(JSON.parse(JSON.stringify(game)));return {placed:x.ok,linked:x.linked,restored:y.coastExpanded&&y.roads.some(r=>r.x===9&&r.y===22)}}''')
  assert all(s.values()),s
  for width,height in ((390,844),(360,740)):
   await page.set_viewport_size({'width':width,'height':height})
   await page.locator('#mobileOrders').click()
   box=await page.locator('#expandCoast').bounding_box()
   assert box['x']>=0 and box['x']+box['width']<=width+1,box
   await page.locator('#closeOrders').click()
  assert not errors,errors
  await browser.close()
  print('coast chromium checks passed')
asyncio.run(run())
