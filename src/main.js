import { createGame, hydrate, DAY_MS, SAVE_KEY, ITEMS, connections, place, remove, advanceDay, deliver, population, occupied, evaluatePlacement, canExpandCoast, expandCoast, setFocusOrder, workplaceForOrder, forecastOrder, nextStep } from './model.js';
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
// Refresh thumbnails once painted texture atlas cells are ready.
canvas.addEventListener('harborline:art-ready',()=>renderTools());
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
  const focusedThis=game.focusOrderId===o.id;
  const usual=forecastOrder(game,o.id,game.focusOrderId), helped=forecastOrder(game,o.id,o.id);
  const saved=usual!==null&&helped!==null?usual-helped:0;
  const forecast=enough?'지금 배달 가능':focusedThis&&usual!==null?`주민 도움 중 · 약 ${usual}일 뒤`:usual===null?'30일 안에 준비 어려움 · 생산 상태 확인':`약 ${usual}일 뒤${saved>0?` · 도움 시 ${saved}일 단축`:''}`;
  return `<article class="order ${focusedThis?'order-focused':''}" data-letter="${o.id}"><div class="order-top"><div><div class="order-name">${esc(o.title)}</div><div class="order-description">${esc(o.detail)}</div></div><span class="order-tag">온기 +${o.stars}</span></div><div class="order-forecast ${enough?'forecast-ready':''}" data-forecast="${o.id}">${esc(forecast)}</div><div class="order-bottom"><div class="order-need">${r.icon} ${r.name} <strong class="${enough?'enough':''}">${fmt(have)} / ${fmt(o.amount)}</strong></div><div class="order-actions"><button class="order-focus" type="button" data-focus="${o.id}" aria-pressed="${focusedThis}" aria-label="${esc(o.title)} 집중 작업 ${focusedThis?'해제':'선택'}">${focusedThis?(helpAvailable?'✓ 돕는 중':'길 먼저 연결'):'도움 요청'}</button><button class="order-send" type="button" data-order="${o.id}" ${enough?'':'disabled'}>${enough?'배달하기':'모으는 중'}</button></div></div></article>`;
 }).join('');
 const count=Math.min(6,game.completed);
 $('#festivalLabel').textContent=game.celebrated?'축제 개최!':`${count} / 6`;
 $('#festivalFill').style.width=`${count/6*100}%`;
 $('#festivalHint').textContent=game.celebrated?'축제를 열었어요! 원하는 만큼 마을을 더 가꿔요':'배달 6번을 마치면 마을에 축제가 열려요';
 const check=canExpandCoast(game),done=game.coastExpanded;
 $('#mobileOrdersLabel').textContent=check.ok?'🌿 해안 개간':'✉ 배달';
 $('#mobileOrders').classList.toggle('coast-ready',check.ok);
 if(check.ok)$('#mobileOrders').setAttribute('aria-label','바람꽃 해안 개간하기');
 $('#coastState').textContent=done?'확장 완료':'배달 '+Math.min(game.completed,2)+'/2';
 $('#coastHint').textContent=done?'새로운 건설 공간 12칸이 열렸어요':game.completed<2?'배달 2회 달성 후 개간 가능':check.ok?'코인 180 · 목재 8로 바닷가를 넓혀 보세요':check.message;
 $('#expandCoast').disabled=!check.ok;
 $('#expandCoast').hidden=game.completed<2&&!done;
 $('#expandCoast').textContent=done?'🌿 바람꽃 해안 개간 완료':'해안 개간 · 180코인 · 목재 8';
 const guide=nextStep(game);$('#guideTitle').textContent=guide.title;$('#guideText').textContent=guide.message;
 $('#guideAction').textContent=({connect:'산책길 선택',decorate:'꾸미기 도구',deliver:'바로 배달',focus:'편지 열기',wait:'진행 확인',expand:'해안 넓히기'})[guide.action] || '편지 보기';
 $('#guideAction').dataset.action=guide.action;
 $('#guideAction').dataset.guideOrder=guide.orderId===null?'':String(guide.orderId);
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
$('#expandCoast').addEventListener('click',()=>{
 const result=expandCoast(game);toast(result.message);if(!result.ok)return;
 changed();toggleOrders(false);
 const p=scene.worldToScreen(8,21);
 scene.pan.x+=scene.width*.51-p.x;scene.pan.y+=scene.height*.55-p.y;
});
$('#guideAction').addEventListener('click',()=>{
 const action=$('#guideAction').dataset.action,orderId=$('#guideAction').dataset.guideOrder;
 if(action==='connect'){toggleOrders(false);setTool('road');return;}
 if(action==='decorate'){setTool('garden');return;}
 if(action==='expand'){$('#expandCoast').click();return;}
 setTool('inspect');toggleOrders(true);
 if(orderId!=='')$('#orderList').querySelector(`[data-letter="${orderId}"]`)?.scrollIntoView({block:'nearest'});
});

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
