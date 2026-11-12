export const SIZE = 24;
export const DAY_MS = 15000;
export const SAVE_KEY = 'harborline.save.v1';

export const COAST_EXPANSION=Object.freeze({
  name:'바람꽃 해안',requiredDeliveries:2,coin:180,wood:8,
  tiles:Object.freeze([[4,19],[4,20],[5,20],[5,21],[6,21],[7,21],[6,22],[7,22],[8,22],[9,22],[10,22],[11,22]].map(([x,y])=>Object.freeze({x,y})))
});
const coastTiles=new Set(COAST_EXPANSION.tiles.map(({x,y})=>x+','+y));
export function canExpandCoast(game){
 if(game.coastExpanded)return {ok:false,message:'이미 바람꽃 해안이 열렸어요'};
 if(game.completed<COAST_EXPANSION.requiredDeliveries)return {ok:false,message:'배달 2번을 마치면 열려요'};
 if(game.resources.coin<COAST_EXPANSION.coin||game.resources.wood<COAST_EXPANSION.wood)return {ok:false,message:'개간할 코인이나 목재가 부족해요'};
 return {ok:true,message:'해안을 넓힐 준비가 됐어요'};
}
export function expandCoast(game){
 const check=canExpandCoast(game);if(!check.ok)return check;
 game.resources.coin-=COAST_EXPANSION.coin;game.resources.wood-=COAST_EXPANSION.wood;
 game.coastExpanded=true;
 return {ok:true,message:'바람꽃 해안이 열렸어요! 새 땅에 건물을 지어 보세요'};
}


export const ITEMS = Object.freeze({
  road: { name: '산책길', icon: '◌', coin: 8, wood: 0, description: '건물을 항구와 이어주는 길' },
  farm: { name: '햇살 밭', icon: '🌾', coin: 65, wood: 2, description: '하루에 햇밀 4개' },
  sawmill: { name: '나무 공방', icon: '🪵', coin: 120, wood: 3, description: '하루에 목재 4개' },
  bakery: { name: '동네 빵집', icon: '🥐', coin: 145, wood: 5, description: '햇밀 3개로 빵 2개' },
  home: { name: '작은 집', icon: '🏠', coin: 110, wood: 4, description: '주민 3명, 하루에 5코인' },
  garden: { name: '꽃마당', icon: '🌷', coin: 70, wood: 2, description: '하루에 마을 온기 1개' }
});

const initialBuildings = [
  { x: 9, y: 21, type: 'harbor' },
  { x: 8, y: 16, type: 'farm' },
  { x: 10, y: 17, type: 'sawmill' },
  { x: 11, y: 17, type: 'bakery' },
  { x: 8, y: 18, type: 'home' }
];
const initialRoads = [[9, 20], [9, 19], [9, 18], [9, 17], [9, 16], [10, 18], [11, 18], [12, 18]];
const ORDER_TEMPLATES = [
  { title: '옆섬 식탁에 햇밀을', detail: '따뜻한 아침을 위한 곡물', resource: 'grain', amount: 12, coin: 110, stars: 1 },
  { title: '목수 아저씨의 부탁', detail: '다음 마을 배에 실을 목재', resource: 'wood', amount: 15, coin: 125, stars: 1 },
  { title: '주말 빵 나눔', detail: '골목마다 퍼지는 고소한 향', resource: 'bread', amount: 6, coin: 170, stars: 2 },
  { title: '바다 건너 작은 장터', detail: '햇밀을 기다리는 이웃', resource: 'grain', amount: 22, coin: 155, stars: 1 },
  { title: '새집 짓는 날', detail: '튼튼한 나무가 필요해요', resource: 'wood', amount: 22, coin: 165, stars: 2 },
  { title: '등대 아래 티타임', detail: '갓 구운 빵을 나눠요', resource: 'bread', amount: 10, coin: 225, stars: 2 }
];
const key = (x, y) => `${x},${y}`;
export const inBounds = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < SIZE && y < SIZE;
function shoreValue(x, y) {
  const dx = (x - 11.4) / 10.3, dy = (y - 11.5) / 10.65;
  return dx * dx + dy * dy + Math.sin(x * 1.3 + y * .9) * .033 + Math.sin(y * 1.8 - x * .6) * .023;
}
export function isLand(x, y, game=null) { return inBounds(x, y) && (shoreValue(x, y) < .995 || (game?.coastExpanded === true && coastTiles.has(key(x,y)))); }
export function terrain(x, y, game=null) {
  if (!isLand(x, y, game)) return 'water';
  if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => !isLand(x + dx, y + dy, game))) return 'sand';
  const v = ((x * 73 + y * 43 + x * y * 13) % 11);
  return v < 3 ? 'grass2' : 'grass';
}
function order(i) {
  const template = ORDER_TEMPLATES[i % ORDER_TEMPLATES.length];
  const lap = Math.floor(i / ORDER_TEMPLATES.length);
  return { ...template, id: i, amount: template.amount + lap * (template.resource === 'bread' ? 3 : 5), coin: template.coin + lap * 35 };
}
export function createGame() {
  return {
    version: 1, day: 1, elapsed: 0, paused: false, speed: 1,
    resources: { coin: 380, wood: 12, grain: 8, bread: 1, stars: 0 },
    buildings: structuredClone(initialBuildings), roads: initialRoads.map(([x, y]) => ({ x, y })),
    orders: [order(0), order(1), order(2)], nextOrder: 3, completed: 0, celebrated: false, coastExpanded: false, focusOrderId: null
  };
}
export function occupied(game, x, y) { return game.buildings.some(b => b.x === x && b.y === y) || game.roads.some(r => r.x === x && r.y === y); }
export function connections(game) {
  const roads = new Set(game.roads.map(r => key(r.x, r.y)));
  const reachable = new Set();
  const harbor = game.buildings.find(b => b.type === 'harbor');
  if (!harbor) return { roads: reachable, buildings: new Set() };
  const queue = [[harbor.x, harbor.y]];
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (roads.has(k) && !reachable.has(k)) { reachable.add(k); queue.push([nx, ny]); }
    }
  }
  const buildings = new Set();
  game.buildings.forEach(b => {
    if (b.type === 'harbor' || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reachable.has(key(b.x + dx, b.y + dy)))) buildings.add(key(b.x, b.y));
  });
  return { roads: reachable, buildings };
}
/** The player chooses exactly one existing letter to help with. No cost to change plans. */
export function setFocusOrder(game,id){
  if(!game.orders.some(o=>o.id===id))return {ok:false,message:'이미 지나간 편지예요'};
  game.focusOrderId=game.focusOrderId===id?null:id;
  return {ok:true,message:game.focusOrderId===null?'평소대로 일하기로 했어요':'주민이 이 배달을 도와줄 거예요'};
}
/** The first harbor-connected producer of the focused good, if available. */
export function workplaceForOrder(game){
  const letter=game.orders.find(o=>o.id===game.focusOrderId);
  if(!letter)return null;
  const type={grain:'farm',wood:'sawmill',bread:'bakery'}[letter.resource];
  if(!type)return null;
  const linked=connections(game).buildings;
  const b=game.buildings.find(b=>b.type===type&&linked.has(key(b.x,b.y)));
  return b?{x:b.x,y:b.y,type:b.type}:null;
}

/** Shortest harbor-to-workplace path using the placed road network.
 * Returns harbor and road tiles (ending beside the building), never mutates state.
 */
export function routeToBuilding(game, x, y) {
  const building = game.buildings.find(b => b.x === x && b.y === y && b.type !== 'harbor');
  const harbor = game.buildings.find(b => b.type === 'harbor');
  if (!building || !harbor) return null;
  const roads = new Set(game.roads.map(r => key(r.x, r.y)));
  const goals = new Set([[1,0],[-1,0],[0,1],[0,-1]]
    .map(([dx,dy]) => key(x+dx,y+dy)).filter(k=>roads.has(k)));
  if(!goals.size)return null;
  const queue=[{x:harbor.x,y:harbor.y}], start=key(harbor.x,harbor.y);
  const cameFrom=new Map([[start,null]]);
  for(let head=0;head<queue.length;head++){
    const current=queue[head], here=key(current.x,current.y);
    if(goals.has(here)){
      const result=[];
      for(let step=here;step!==null;step=cameFrom.get(step)){
        const [rx,ry]=step.split(',').map(Number);result.push({x:rx,y:ry});
      }
      return result.reverse();
    }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=current.x+dx,ny=current.y+dy,nk=key(nx,ny);
      if(roads.has(nk) && !cameFrom.has(nk)){
        cameFrom.set(nk,here);queue.push({x:nx,y:ny});
      }
    }
  }
  return null;
}

const neighbors = (x,y) => [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>key(x+dx,y+dy));

/** Placement feedback only. Does not charge resources or mutate the game. */
export function evaluatePlacement(game,type,x,y){
  if (!ITEMS[type]) return {ok:false,linked:false,message:'알 수 없는 건물이에요'};
  if (!isLand(x,y,game)) return {ok:false,linked:false,message:'바다 위에는 지을 수 없어요'};
  if (occupied(game,x,y)) return {ok:false,linked:false,message:'이미 사용 중인 자리예요'};
  const item=ITEMS[type];
  if (game.resources.coin < item.coin || game.resources.wood < item.wood)
    return {ok:false,linked:false,message:'코인이나 목재가 부족해요'};
  const nearby=neighbors(x,y),network=connections(game);
  const linked=type==='road'
    ? nearby.some(k=>network.roads.has(k) || game.buildings.some(b=>b.type==='harbor'&&key(b.x,b.y)===k))
    : nearby.some(k=>network.roads.has(k));
  return {ok:true,linked,message:linked?`${item.name} 완성!`:`${item.name} 완성! 산책길로 항구와 이어주세요`};
}

export function place(game, type, x, y) {
  const preview=evaluatePlacement(game,type,x,y);
  if(!preview.ok)return {ok:false,message:preview.message};
  const item=ITEMS[type];
  game.resources.coin-=item.coin;
  game.resources.wood-=item.wood;
  if(type==='road')game.roads.push({x,y}); else game.buildings.push({type,x,y});
  return preview;
}
export function remove(game, x, y) {
  const index = game.buildings.findIndex(b => b.x === x && b.y === y && b.type !== 'harbor');
  if (index !== -1) {
    const [b] = game.buildings.splice(index, 1), item = ITEMS[b.type];
    game.resources.coin += Math.floor(item.coin * .6);
    game.resources.wood += Math.floor(item.wood * .5);
    return { ok: true, message: `${item.name}을 정리하고 일부 재료를 돌려받았어요` };
  }
  const ri = game.roads.findIndex(r => r.x === x && r.y === y);
  if (ri !== -1) { game.roads.splice(ri, 1); game.resources.coin += 4; return { ok: true, message: '산책길을 정리했어요' }; }
  return { ok: false, message: '정리할 건물이 없어요' };
}
export function advanceDay(game) {
  game.day++;
  const linked = connections(game).buildings;
  const active = type => game.buildings.filter(b => b.type === type && linked.has(key(b.x, b.y)));
  const farms = active('farm'), mills = active('sawmill');
  const bakeries = active('bakery'), homes = active('home'), gardens = active('garden');
  const workplace = workplaceForOrder(game);
  const helped = b => Boolean(workplace && b.x === workplace.x && b.y === workplace.y);
  const activity = [];
  const record = (buildings, resource, amount) => {
    for (const b of buildings) {
      const n=typeof amount==='function'?amount(b):amount;
      const bonus=resource==='grain'?grainHelp:resource==='wood'?woodHelp:resource==='bread'?breadHelp:0;
      activity.push({x:b.x,y:b.y,type:b.type,resource,amount:n,...(helped(b)&&bonus?{focused:true}:{})});
    }
  };
  const grainHelp=workplace?.type==='farm'?2:0;
  const woodHelp=workplace?.type==='sawmill'?2:0;
  game.resources.grain += farms.length * 4 + grainHelp;
  game.resources.wood += mills.length * 4 + woodHelp;
  record(farms, 'grain', b => 4+(helped(b)?grainHelp:0));
  record(mills, 'wood', b => 4+(helped(b)?woodHelp:0));
  const batches = Math.min(bakeries.length, Math.floor(game.resources.grain / 3));
  game.resources.grain -= batches * 3;
  game.resources.bread += batches * 2;
  const breadHelp=(workplace?.type==='bakery' && batches>0 && game.resources.grain>=3)?2:0;
  if(breadHelp){game.resources.grain-=3;game.resources.bread+=breadHelp;}
  record(bakeries.slice(0, batches), 'bread', b => 2+(helped(b)?breadHelp:0));
  game.resources.coin += homes.length * 5;
  game.resources.stars += gardens.length;
  record(homes, 'coin', 5);
  record(gardens, 'stars', 1);
  return {
    grain: farms.length * 4 + grainHelp - batches * 3 - (breadHelp?3:0),
    wood: mills.length * 4 + woodHelp,
    bread: batches * 2 + breadHelp,
    coin: homes.length * 5,
    activity
  };
}
export function deliver(game, id) {
  const index = game.orders.findIndex(o => o.id === id);
  if (index === -1) return { ok: false, message: '이미 완료된 배달이에요' };
  const o = game.orders[index];
  if (game.resources[o.resource] < o.amount) return { ok: false, message: '필요한 물자가 아직 부족해요' };
  game.resources[o.resource] -= o.amount;
  game.resources.coin += o.coin;
  game.resources.stars += o.stars;
  game.completed++;
  if(game.focusOrderId===id)game.focusOrderId=null;
  game.orders.splice(index, 1, order(game.nextOrder++));
  let festival = false;
  if (game.completed >= 6 && !game.celebrated) {
    game.celebrated = true; game.resources.coin += 300; game.resources.stars += 5; festival = true;
  }
  return { ok: true, festival, message: festival ? '바다 축제 시작! 마을에 300코인과 온기 5개가 도착했어요 🎊' : '배달 성공! 이웃에게 따뜻한 마음이 전해졌어요' };
}
/** Predict when an existing letter will be ready, using exactly the normal daily production rules.
 * `focusId` is an optional hypothetical choice. This never mutates the player's village.
 * null means no forecastable production within the horizon, not an exact time promise.
 */
export function forecastOrder(game, id, focusId=game.focusOrderId, maxDays=30) {
  const letter=game.orders.find(o=>o.id===id);
  if(!letter)return null;
  if(game.resources[letter.resource]>=letter.amount)return 0;
  const simulated=structuredClone(game);
  simulated.focusOrderId=simulated.orders.some(o=>o.id===focusId)?focusId:null;
  const horizon=Math.max(0,Math.min(30,Math.floor(Number(maxDays)||0)));
  for(let day=1;day<=horizon;day++){
    advanceDay(simulated);
    if(simulated.resources[letter.resource]>=letter.amount)return day;
  }
  return null;
}

/** A compact, optional next step. Pure derivation; no new tutorial/save state. */
export function nextStep(game) {
  if(canExpandCoast(game).ok)return {action:'expand',title:'바람꽃 해안 개간 준비!',message:'배달 2회 달성 · 180코인과 목재 8로 새 땅 12칸을 열어요',orderId:null};
  if(game.celebrated)return {action:'decorate',title:'첫 축제 달성!',message:'우리만의 바닷마을을 자유롭게 꾸며 보세요',orderId:null};
  const ready=game.orders.find(o=>game.resources[o.resource]>=o.amount);
  if(ready)return {action:'deliver',title:'배달 준비 완료',message:`${ready.title} · ${ready.coin}코인과 온기 +${ready.stars}`,orderId:ready.id};
  const focused=game.orders.find(o=>o.id===game.focusOrderId);
  if(focused){
    if(!workplaceForOrder(game))return {action:'connect',title:'일터에 가는 길이 없어요',message:'산책길로 항구와 생산시설을 이어주세요',orderId:focused.id};
    const days=forecastOrder(game,focused.id,focused.id);
    return {action:'wait',title:'이웃이 배달을 돕는 중',message:days===null?'재료가 더 필요해요 · 건물과 재고를 살펴보세요':`${focused.title} · 약 ${days}일 뒤 준비`,orderId:focused.id};
  }
  const options=game.orders.map(o=>{
    const usual=forecastOrder(game,o.id,null);
    const helped=forecastOrder(game,o.id,o.id);
    return {o,usual,helped,benefit:usual!==null&&helped!==null?usual-helped:0};
  }).filter(r=>r.helped!==null);
  options.sort((a,b)=>b.benefit-a.benefit||a.helped-b.helped||a.o.id-b.o.id);
  const best=options[0];
  if(!best){
    const linked=connections(game).buildings;
    const producers={grain:'farm',wood:'sawmill',bread:'bakery'};
    const working=game.orders.some(o=>game.buildings.some(b=>b.type===producers[o.resource]&&linked.has(key(b.x,b.y))));
    return working
      ?{action:'wait',title:'조금 더 만들어 볼까요?',message:'생산시설을 늘리면 배달이 더 빨라져요',orderId:null}
      :{action:'connect',title:'생산시설을 연결해 주세요',message:'산책길을 항구와 이어야 배달 재료를 만들어요',orderId:null};
  }
  const saving=best.benefit>0?` · 도움 요청 시 ${best.benefit}일 단축`:'';
  return {action:'focus',title:game.completed===0?'첫 배달을 준비해 볼까요?':'다음 배달을 골라볼까요?',message:`${best.o.title} · 약 ${best.helped}일${saving}`,orderId:best.o.id};
}

export function population(game) { return 2 + game.buildings.filter(b => b.type === 'home').length * 3; }
export function hydrate(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.buildings) || !Array.isArray(value.roads) || !Array.isArray(value.orders)) return createGame();
  const game = createGame();
  game.day = Math.max(1, Math.floor(Number(value.day) || 1));
  game.completed = Math.max(0, Math.floor(Number(value.completed) || 0));
  game.nextOrder = Math.max(3, Math.floor(Number(value.nextOrder) || 3));
  game.celebrated = Boolean(value.celebrated);
  game.coastExpanded = value.coastExpanded === true;
  for (const k of ['coin','wood','grain','bread','stars']) game.resources[k] = Math.max(0, Math.min(1e8, Math.floor(Number(value.resources?.[k]) || 0)));
  const known = new Set(['harbor', ...Object.keys(ITEMS).filter(x => x !== 'road')]);
  game.buildings = value.buildings.filter(b => inBounds(b.x,b.y) && isLand(b.x,b.y,game) && known.has(b.type)).slice(0, SIZE*SIZE).map(b=>({x:b.x,y:b.y,type:b.type}));
  if (!game.buildings.some(b=>b.type==='harbor')) game.buildings.unshift({x:9,y:21,type:'harbor'});
  const buildingKeys = new Set(game.buildings.map(b => key(b.x,b.y)));
  game.roads = value.roads.filter(r=>inBounds(r.x,r.y) && isLand(r.x,r.y,game) && !buildingKeys.has(key(r.x,r.y))).slice(0,SIZE*SIZE).map(r=>({x:r.x,y:r.y}));
  game.orders = value.orders.filter(o=>Number.isInteger(o.id) && ['grain','wood','bread'].includes(o.resource) && Number.isFinite(o.amount) && o.amount>0 && Number.isFinite(o.coin)).slice(0,3).map(o=>({...o,amount:Math.floor(o.amount),coin:Math.floor(o.coin),stars:Math.max(0,Math.floor(o.stars||0))}));
  while (game.orders.length < 3) game.orders.push(order(game.nextOrder++));
  game.focusOrderId=game.orders.some(o=>o.id===value.focusOrderId)?value.focusOrderId:null;
  return game;
}
