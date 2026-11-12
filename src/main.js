import { createGame, hydrate, DAY_MS, SAVE_KEY, ITEMS, connections, place, remove, advanceDay, deliver, population, occupied, evaluatePlacement, setFocusOrder, workplaceForOrder } from './model.js';
import { Scene } from './render.js';

const $=s=>document.querySelector(s), canvas=$('#world');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game;
try {game=hydrate(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));} catch {game=createGame();}
const scene=new Scene(canvas,game);
let selected='inspect', inspectAt=null, toastTimer=0, lastTime=0, lastFrame=0, lastUI=0;
const pointers=new Map();let dragDistance=0, pinch=0;
const fmt=n=>new Intl.NumberFormat('ko-KR').format(n);
const resources={grain:{name:'햇밀',icon:'🌾'},wood:{name:'목재',icon:'🪵'},bread:{name:'빵',icon:'🥐'}};
function save(){try {localStorage.setItem(SAVE_KEY,JSON.stringify(game));}catch{}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2500);}
function showPlacementHint(tile=null){
 const hint=$('#toolHint');hint.classList.toggle('building',selected!=='inspect');
 if(selected==='inspect'){hint.dataset.placement='inspect';hint.textContent='건물을 누르면 정보를 볼 수 있어요';return;}
 const preview=tile?evaluatePlacement(game,selected,tile.x,tile.y):null;
 if(!preview){hint.dataset.placement='idle';hint.textContent=`${ITEMS[selected].name} · 빈 땅을 고르세요`;return;}
 hint.dataset.placement=preview.ok?(preview.linked?'linked':'unlinked'):'blocked';
 hint.textContent=preview.ok?(preview.linked?'✓ 항구 연결 가능 · 설치할 수 있어요':'산책길 연결 필요 · 설치할 수 있어요'):preview.message;
}
function setTool(name){selected=name;scene.tool=name;scene.hover=null;inspectAt=null;$('#inspectCard').hidden=true;canvas.classList.toggle('building',name!=='inspect');renderTools();showPlacementHint();}
function renderTools(){const tools=[['inspect',{name:'둘러보기',icon:'⌕',coin:null,wood:0}],...Object.entries(ITEMS)];
 $('#buildTools').innerHTML=tools.map(([key,item],i)=>`<button class="tool ${selected===key?'selected':''}" data-tool="${key}" type="button" title="${esc(item.description||'지도를 이동하고 건물을 살펴봐요')}" aria-pressed="${selected===key}"><span class="tool-art" aria-hidden="true">${key==='inspect'?'<span class="inspect-icon">⌕</span>':`<img src="${scene.toolPreview(key)}" alt="" width="48" height="48">`}</span><span class="tool-name">${item.name}</span><span class="tool-cost">${item.coin===null?'이동 · 정보':`${item.coin}코인${item.wood?` · 목재${item.wood}`:''}`}</span></button>`).join('');
}
function renderHUD(){
 for(const k of ['coin','wood','grain','bread'])$('#'+k).textContent=fmt(game.resources[k]);
 $('#population').textContent=`주민 ${fmt(population(game))}명`;
 $('#happiness').textContent=`마을 온기 ${fmt(game.resources.stars)}`;
 $('#dayBadge').textContent=`☀ ${game.day}일차`;
 $('#pauseBtn').textContent=game.paused?'▶':'Ⅱ';$('#pauseBtn').setAttribute('aria-label',game.paused?'시간 재개':'시간 멈추기');
 $('#speedBtn').textContent=`×${game.speed}`;
 const ready=game.orders.filter(o=>game.resources[o.resource]>=o.amount).length;
 $('#readyCount').textContent=ready;
 const focused=game.orders.find(o=>o.id===game.focusOrderId);
 const helpAvailable=Boolean(focused&&workplaceForOrder(game));
 $('#focusIndicator').textContent=focused?` · ${resources[focused.resource].icon}`:'';
 $('#mobileOrders').setAttribute('aria-label',focused?`배달 목록 · ${resources[focused.resource].name} 집중 중`:'배달 목록');
 $('#orderList').innerHTML=game.orders.map(o=>{
  const r=resources[o.resource],have=game.resources[o.resource],enough=have>=o.amount;
  return `<article class="order ${game.focusOrderId===o.id?'order-focused':''}"><div class="order-top"><div><div class="order-name">${esc(o.title)}</div><div class="order-description">${esc(o.detail)}</div></div><span class="order-tag">온기 +${o.stars}</span></div><div class="order-bottom"><div class="order-need">${r.icon} ${r.name} <strong class="${enough?'enough':''}">${fmt(have)} / ${fmt(o.amount)}</strong></div><div class="order-actions"><button class="order-focus" type="button" data-focus="${o.id}" aria-pressed="${game.focusOrderId===o.id}" aria-label="${esc(o.title)} 집중 작업 ${game.focusOrderId===o.id?'해제':'선택'}">${game.focusOrderId===o.id?(helpAvailable?'✓ 돕는 중':'길 먼저 연결'):'도움 요청'}</button><button class="order-send" type="button" data-order="${o.id}" ${enough?'':'disabled'}>${enough?'배달하기':'모으는 중'}</button></div></div></article>`;
 }).join('');
 const count=Math.min(6,game.completed);
 $('#festivalLabel').textContent=game.celebrated?'축제 개최!':`${count} / 6`;
 $('#festivalFill').style.width=`${count/6*100}%`;
 $('#festivalHint').textContent=game.celebrated?'축제를 열었어요! 원하는 만큼 마을을 더 가꿔요':'배달 6번을 마치면 마을에 축제가 열려요';
 $('#guideText').innerHTML=game.completed===0?'아래에서 건물을 고르고 빈 땅을 톡!<br>산책길로 항구에 연결하면 일을 시작해요':game.completed<6?`지금까지 배달 ${game.completed}번 성공!<br>조금씩 커지는 마을을 즐겨보세요`:'첫 축제를 열었어요!<br>이제 당신만의 마을을 더 가꿔봐요';
}
function changed(){scene.invalidate();renderHUD();save();showPlacementHint(scene.hover);if(inspectAt)showInspect(inspectAt.x,inspectAt.y);}
function showInspect(x,y){
 const panel=$('#inspectCard');const building=game.buildings.find(b=>b.x===x&&b.y===y);const road=game.roads.find(r=>r.x===x&&r.y===y);
 if(!building&&!road){panel.hidden=true;inspectAt=null;return;}
 inspectAt={x,y};const type=building?.type||'road',item=ITEMS[type];const name=item?.name||'작은 항구',desc=item?.description||'우리 마을의 시작이 되는 항구예요';
 const connected=building?connections(game).buildings.has(`${x},${y}`):connections(game).roads.has(`${x},${y}`);
 panel.innerHTML=`<div class="inspect-name">${esc(name)}</div><p class="inspect-desc">${esc(desc)}</p><div class="inspect-status ${connected?'':'off'}">${connected?'● 항구와 연결됨':'● 산책길 연결 필요'}</div><div class="inspect-actions"><button type="button" id="inspectClose">닫기</button>${type!=='harbor'?'<button type="button" id="inspectRemove">철거 · 일부 환급</button>':''}</div>`;
 panel.hidden=false;
 const pos=scene.worldToScreen(x,y);
 panel.style.left=`${Math.max(12,Math.min(scene.width-240,pos.x+20))}px`;
 panel.style.top=`${Math.max(100,Math.min(scene.height-190,pos.y-120))}px`;
 $('#inspectClose').addEventListener('click',()=>{panel.hidden=true;inspectAt=null;});
 $('#inspectRemove')?.addEventListener('click',()=>{
   const b=game.buildings.find(it=>it.x===x&&it.y===y);
   if(b?.type==='harbor')return;
   const r=remove(game,x,y);inspectAt=null;panel.hidden=true;toast(r.message);changed();
 });
}
function onTile(x,y){
 if(selected==='inspect'){showInspect(x,y);return;}
 const result=place(game,selected,x,y);
 toast(result.message);
 if(result.ok){changed();}
}
function canvasCoords(event){const r=canvas.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0&&e.pointerType==='mouse')return;
 canvas.setPointerCapture(e.pointerId);const p=canvasCoords(e);pointers.set(e.pointerId,p);dragDistance=0;
 if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}
});
canvas.addEventListener('pointermove',e=>{
 const p=canvasCoords(e),prev=pointers.get(e.pointerId);
 if(prev){
  if(pointers.size===1){const dx=p.x-prev.x,dy=p.y-prev.y;dragDistance+=Math.hypot(dx,dy);if(dragDistance>5){scene.pan.x+=dx;scene.pan.y+=dy;canvas.classList.add('dragging');scene.hover=null;}}
  else if(pointers.size===2){pointers.set(e.pointerId,p);const[a,b]=[...pointers.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)scene.zoomAt(d/pinch,(a.x+b.x)/2,(a.y+b.y)/2);pinch=d;dragDistance=100;}
  pointers.set(e.pointerId,p);
 }
 if(!pointers.size||dragDistance<=5){scene.hover=scene.screenToTile(p.x,p.y);showPlacementHint(scene.hover);}
});
function endPointer(e){const p=canvasCoords(e);const was=dragDistance;pointers.delete(e.pointerId);canvas.classList.remove('dragging');pinch=0;if(!was&&pointers.size===0){const tile=scene.screenToTile(p.x,p.y);if(tile)onTile(tile.x,tile.y);}if(pointers.size===0)dragDistance=0;}
canvas.addEventListener('pointerup',endPointer);
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);canvas.classList.remove('dragging');dragDistance=0;});
canvas.addEventListener('pointerleave',()=>{if(!pointers.size){scene.hover=null;showPlacementHint();}});
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=canvasCoords(e);scene.zoomAt(Math.exp(-e.deltaY*.001),p.x,p.y);if(inspectAt)showInspect(inspectAt.x,inspectAt.y);},{passive:false});
$('#buildTools').addEventListener('click',e=>{const button=e.target.closest('[data-tool]');if(button)setTool(button.dataset.tool);});
$('#orderList').addEventListener('click',e=>{
 const focus=e.target.closest('[data-focus]');
 if(focus){const result=setFocusOrder(game,Number(focus.dataset.focus));if(result.ok){changed();}toast(result.ok&&game.focusOrderId!==null&&!workplaceForOrder(game)?'산책길로 생산시설을 항구에 연결해 주세요':result.message);return;}
 const b=e.target.closest('[data-order]');if(!b)return;const id=Number(b.dataset.order),order=game.orders.find(o=>o.id===id);const result=deliver(game,id);toast(result.message);if(result.ok){scene.sendDelivery(order);changed();if(result.festival)$('#helpBtn').classList.add('celebrated');}});
$('#zoomIn').addEventListener('click',()=>scene.zoomAt(1.18));
$('#zoomOut').addEventListener('click',()=>scene.zoomAt(.84));
$('#centerMap').addEventListener('click',()=>{scene.resetView();});
$('#pauseBtn').addEventListener('click',()=>{game.paused=!game.paused;renderHUD();save();toast(game.paused?'마을의 시간이 잠시 멈췄어요':'다시 하루가 흘러가요');});
$('#speedBtn').addEventListener('click',()=>{game.speed=game.speed===1?2:1;renderHUD();save();});
$('#hideGuide').addEventListener('click',()=>{$('.note-card').hidden=true;try{sessionStorage.setItem('harborline.guide.dismissed','1');}catch{}});
const help=$('#helpDialog');
$('#helpBtn').addEventListener('click',()=>help.showModal());
$('#closeHelp').addEventListener('click',()=>help.close());
$('#helpOkay').addEventListener('click',()=>help.close());
$('#resetBtn').addEventListener('click',()=>{
 if(!confirm('지금 마을의 모든 진행을 지우고 처음부터 시작할까요?'))return;
 game=createGame();scene.game=game;scene.resetView();scene.invalidate();setTool('inspect');changed();help.close();toast('새로운 파도마을이 열렸어요');
});
const panel=$('#ordersPanel');
const toggleOrders=open=>{panel.classList.toggle('open',open);$('#mobileOrders').setAttribute('aria-expanded',String(open));};
$('#mobileOrders').addEventListener('click',()=>toggleOrders(!panel.classList.contains('open')));
$('#closeOrders').addEventListener('click',()=>toggleOrders(false));
document.addEventListener('keydown',e=>{
 if(help.open){if(e.key==='Escape')help.close();return;}
 if(e.target?.tagName==='INPUT')return;
 const names=['inspect',...Object.keys(ITEMS)];
 if(/^[1-7]$/.test(e.key)){setTool(names[Number(e.key)-1]);return;}
 if(e.code==='Space'){e.preventDefault();$('#pauseBtn').click();}
 if(e.key==='Escape'){if(panel.classList.contains('open'))toggleOrders(false);else setTool('inspect');}
 if(e.key==='+')scene.zoomAt(1.18);
 if(e.key==='-')scene.zoomAt(.84);
});
window.addEventListener('resize',()=>{scene.resize();if(inspectAt)showInspect(inspectAt.x,inspectAt.y);});
function loop(t){
 requestAnimationFrame(loop);
 const dt=Math.min(1000,lastTime?t-lastTime:0);lastTime=t;
 if(document.hidden)return;
 if(!game.paused){game.elapsed+=dt*game.speed;while(game.elapsed>=DAY_MS){game.elapsed-=DAY_MS;const report=advanceDay(game);scene.showProduction(report.activity);renderHUD();save();}}
 if(t-lastUI>250){$('#dayProgress').style.width=`${game.elapsed/DAY_MS*100}%`;lastUI=t;}
 if(t-lastFrame>=1000/30){scene.render(t);lastFrame=t;}
}
try{if(sessionStorage.getItem('harborline.guide.dismissed')==='1')$('.note-card').hidden=true;}catch{}
renderTools();renderHUD();requestAnimationFrame(loop);
