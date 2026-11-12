import * as gameRules from "../src/model.js";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, connections, place, remove, advanceDay, deliver, hydrate, isLand, terrain, population, evaluatePlacement } from '../src/model.js';

test('starter village is connected and has a production loop', () => {
 const g=createGame(); const c=connections(g);
 assert.equal(g.buildings.filter(b=>c.buildings.has(`${b.x},${b.y}`)).length,5);
 const before={...g.resources};
 const prod=advanceDay(g);
 assert.equal(g.day,2); assert.equal(g.resources.wood,before.wood+4);
 assert.equal(g.resources.grain,before.grain+4-3); assert.equal(g.resources.bread,before.bread+2);
 assert.equal(prod.coin,5); assert.equal(population(g),5);
});

test('resources and connected paths gate building placement', () => {
 const g=createGame();
 assert.equal(place(g,'farm',9,21).ok,false);
 assert.equal(place(g,'farm',0,0).ok,false);
 assert.equal(place(g,'field',10,10).ok,false);
 const x=12,y=17; assert.equal(isLand(x,y),true);
 const result=place(g,'farm',x,y);
 assert.equal(result.ok,true); assert.equal(result.linked,true);
 assert.equal(place(g,'farm',x,y).ok,false);
 assert.equal(remove(g,x,y).ok,true);
 assert.equal(g.buildings.some(b=>b.x===x&&b.y===y),false);
});

test('disconnected buildings do not produce until the road links them', () => {
 const g=createGame();
 const target=[16,10]; assert.equal(isLand(...target),true);
 const p=place(g,'farm',...target); assert.equal(p.ok,true); assert.equal(p.linked,false);
 const before=g.resources.grain;
 advanceDay(g);
 assert.equal(g.resources.grain,before+1); // initial farm 4, bakery spends 3
});

test('delivery spends inventory, grants reward, and replenishes an order', () => {
 const g=createGame(); const o=g.orders[0];
 assert.equal(deliver(g,o.id).ok,false);
 g.resources.grain=30;
 const old=g.resources.coin;
 const r=deliver(g,o.id);
 assert.equal(r.ok,true); assert.equal(g.resources.coin,old+o.coin);
 assert.equal(g.resources.grain,30-o.amount);
 assert.equal(g.orders.length,3);
 assert.equal(g.completed,1);
 assert.equal(deliver(g,o.id).ok,false);
});

test('festival is awarded only once even after later orders',()=>{
 const g=createGame();let won=0;
 for(let i=0;i<9;i++) { const o=g.orders[0]; g.resources[o.resource]=1000; if(deliver(g,o.id).festival)won++; }
 assert.equal(won,1); assert.equal(g.completed,9);
});

test('save hydration ignores incompatible saves and preserves normal game data',()=>{
 const g=createGame(); advanceDay(g);
 const restored=hydrate(JSON.parse(JSON.stringify(g)));
 assert.equal(restored.day,2); assert.deepEqual(restored.resources,g.resources);
 assert.equal(hydrate({version:2}).day,1); assert.equal(terrain(0,0),'water');
});


test('placement preview is pure and matches actual placement and road connection', () => {
 const g=createGame();
 const before=JSON.stringify(g);
 const adjacent=evaluatePlacement(g,'farm',12,17);
 assert.equal(adjacent.ok,true);
 assert.equal(adjacent.linked,true);
 const isolated=evaluatePlacement(g,'farm',16,10);
 assert.equal(isolated.ok,true);
 assert.equal(isolated.linked,false);
 const nextRoad=evaluatePlacement(g,'road',13,18);
 assert.equal(nextRoad.ok,true);
 assert.equal(nextRoad.linked,true);
 assert.equal(JSON.stringify(g),before,'preview must never deduct resources or create a structure');
 assert.equal(place(g,'farm',12,17).linked,adjacent.linked);
});

test('placement preview distinguishes sea, occupied and insufficient material',()=>{
 const g=createGame();
 assert.match(evaluatePlacement(g,'home',0,0).message,/바다/);
 assert.match(evaluatePlacement(g,'home',9,21).message,/사용 중/);
 g.resources.wood=0;
 const result=evaluatePlacement(g,'home',12,17);
 assert.equal(result.ok,false);
 assert.match(result.message,/부족/);
});


test('residents can reach each working building by its currently connected roads', () => {
 const g=createGame(); const before=JSON.stringify(g);
 assert.equal(typeof gameRules.routeToBuilding, 'function');
 for (const b of g.buildings.filter(b=>b.type!=='harbor')) {
  const route=gameRules.routeToBuilding(g,b.x,b.y);
  assert.ok(route && route.length>=2, `${b.type} missing route`);
  assert.deepEqual(route[0],{x:9,y:21});
  const end=route.at(-1);
  assert.equal(Math.abs(end.x-b.x)+Math.abs(end.y-b.y),1);
  for(let i=1;i<route.length;i++) {
   assert.equal(Math.abs(route[i].x-route[i-1].x)+Math.abs(route[i].y-route[i-1].y),1);
   assert.ok(g.roads.some(r=>r.x===route[i].x&&r.y===route[i].y));
  }
 }
 assert.equal(JSON.stringify(g),before, 'planning must not mutate saved world');
});

test('no route is assigned to a disconnected building, and a removed harbor link clears routes', () => {
 const g=createGame();
 assert.equal(typeof gameRules.routeToBuilding, 'function');
 assert.equal(place(g,'farm',16,10).ok,true);
 assert.equal(gameRules.routeToBuilding(g,16,10),null);
 assert.ok(gameRules.routeToBuilding(g,8,16));
 remove(g,9,20);
 assert.equal(gameRules.routeToBuilding(g,8,16),null);
});

test('daily activity records actual connected building output, without changing resource accounting',()=>{
 const g=createGame(), original={...g.resources};
 const report=advanceDay(g);
 assert.ok(Array.isArray(report.activity), 'day report requires activity events');
 const sum=resource=>report.activity.filter(e=>e.resource===resource).reduce((n,e)=>n+e.amount,0);
 assert.equal(sum('grain'),4);
 assert.equal(sum('wood'),4);
 assert.equal(sum('bread'),2);
 assert.equal(sum('coin'),5);
 assert.equal(report.activity.some(e=>e.type==='farm'&&e.x===8&&e.y===16),true);
 assert.equal(g.resources.grain,original.grain+4-3);
 assert.equal(g.resources.bread,original.bread+2);
 assert.ok(report.activity.every(e=>e.amount>0&&Number.isInteger(e.x)&&Number.isInteger(e.y)));
});

test('a bakery without grain and a disconnected farm have no production receipt',()=>{
 const g=createGame();remove(g,8,16);g.resources.grain=0;
 assert.equal(place(g,'farm',16,10).ok,true);
 const report=advanceDay(g);
 assert.ok(Array.isArray(report.activity));
 assert.ok(!report.activity.some(e=>e.resource==='grain'||e.resource==='bread'));
 assert.equal(report.bread,0);
 assert.equal(g.resources.bread,1);
});

test('a visible letter can be focused, unfocused, and only one letter is active',()=>{
 const g=createGame(); const before=JSON.stringify(g);
 assert.equal(typeof gameRules.setFocusOrder,'function','focus selection API missing');
 assert.deepEqual(gameRules.setFocusOrder(g,999).ok,false);
 assert.equal(JSON.stringify(g),before,'invalid ID must not mutate state');
 assert.equal(gameRules.setFocusOrder(g,0).ok,true);
 assert.equal(g.focusOrderId,0);
 assert.equal(gameRules.setFocusOrder(g,1).ok,true);
 assert.equal(g.focusOrderId,1,'new focus replaces old focus');
 assert.equal(gameRules.setFocusOrder(g,1).ok,true);
 assert.equal(g.focusOrderId,null,'selecting same order again clears focus');
});

test('focused grain and wood letters each give +2 only from the connected first workplace',()=>{
 const g=createGame();
 gameRules.setFocusOrder(g,0);
 const before={...g.resources};
 const activity=advanceDay(g).activity;
 assert.equal(g.resources.grain,before.grain+4+2-3);
 assert.equal(activity.filter(a=>a.resource==='grain').reduce((s,a)=>s+a.amount,0),6);
 assert.ok(activity.some(a=>a.resource==='grain'&&a.focused&&a.amount===6));
 gameRules.setFocusOrder(g,1);
 const old=g.resources.wood;
 const second=advanceDay(g);
 assert.equal(g.resources.wood,old+6);
 assert.ok(second.activity.some(a=>a.resource==='wood'&&a.focused&&a.amount===6));
});

test('bread focus consumes actual extra grain, and has no effect without spare grain',()=>{
 const g=createGame(); g.resources.grain=20;
 gameRules.setFocusOrder(g,2);
 const report=advanceDay(g);
 assert.equal(g.resources.grain,18,'4 produced, 3 base + 3 focused grain consumed');
 assert.equal(g.resources.bread,5,'1 initial, 2 base + 2 focused');
 assert.equal(report.bread,4);
 assert.ok(report.activity.some(a=>a.resource==='bread'&&a.focused&&a.amount===4));
 const poor=createGame(); poor.resources.grain=0;
 gameRules.setFocusOrder(poor,2);
 const poorReport=advanceDay(poor);
 assert.equal(poor.resources.bread,3);
 assert.equal(poor.resources.grain,1);
 assert.equal(poorReport.bread,2);
 assert.equal(poorReport.activity.some(a=>a.focused),false);
});

test('no focused bonus or fake workplace if a productive building is disconnected',()=>{
 const g=createGame(); gameRules.setFocusOrder(g,1);
 assert.deepEqual(gameRules.workplaceForOrder(g),{x:10,y:17,type:'sawmill'});
 remove(g,9,20);
 assert.equal(gameRules.workplaceForOrder(g),null);
 const before=g.resources.wood, report=advanceDay(g);
 assert.equal(g.resources.wood,before);
 assert.equal(report.activity.length,0);
});

test('delivery clears focus only for its focused letter; hydration accepts optional valid focus',()=>{
 const g=createGame();gameRules.setFocusOrder(g,0);
 const previous=JSON.parse(JSON.stringify(g));
 assert.equal(hydrate(previous).focusOrderId,0);
 const legacy={...previous};delete legacy.focusOrderId;
 assert.equal(hydrate(legacy).focusOrderId,null);
 assert.equal(hydrate({...previous,focusOrderId:20000}).focusOrderId,null);
 const other=g.orders[1];g.resources[other.resource]=1000;
 assert.equal(deliver(g,other.id).ok,true);
 assert.equal(g.focusOrderId,0,'delivery of another letter does not remove focus');
 const target=g.orders.find(o=>o.id===0);g.resources[target.resource]=1000;
 assert.equal(deliver(g,target.id).ok,true);
 assert.equal(g.focusOrderId,null);
});


test('early delivery forecast is pure and shows tangible focused time savings',()=>{
 const g=createGame(), before=JSON.stringify(g);
 assert.equal(typeof gameRules.forecastOrder,'function');
 assert.equal(gameRules.forecastOrder(g,0,null),4);
 assert.equal(gameRules.forecastOrder(g,0,0),2);
 assert.equal(gameRules.forecastOrder(g,1,null),1);
 assert.equal(gameRules.forecastOrder(g,1,1),1);
 assert.equal(gameRules.forecastOrder(g,2,null),3);
 assert.equal(gameRules.forecastOrder(g,2,2),2);
 assert.equal(JSON.stringify(g),before,'forecast cannot change saved data');
});

test('forecast handles readiness, bad orders, disconnected production and a finite horizon',()=>{
 const g=createGame();g.resources.grain=12;
 assert.equal(gameRules.forecastOrder(g,0,null),0);
 assert.equal(gameRules.forecastOrder(g,777,null),null);
 g.resources.grain=0;remove(g,9,20);
 assert.equal(gameRules.forecastOrder(g,0,null),null);
 assert.equal(gameRules.forecastOrder(g,0,0),null);
 assert.equal(gameRules.forecastOrder(g,0,null,1),null);
});

test('next step first explains help, then waiting, then a ready delivery',()=>{
 const g=createGame();
 assert.equal(typeof gameRules.nextStep,'function');
 let step=gameRules.nextStep(g);
 assert.equal(step.action,'focus');assert.equal(step.orderId,0);
 assert.ok(step.message.includes('2일'));
 gameRules.setFocusOrder(g,0);step=gameRules.nextStep(g);
 assert.equal(step.action,'wait');assert.equal(step.orderId,0);
 g.resources.grain=12;step=gameRules.nextStep(g);
 assert.equal(step.action,'deliver');assert.equal(step.orderId,0);
 assert.match(step.message,/코인/);
});

test('next step warns about broken producer links and congratulates a celebrated town',()=>{
 const g=createGame();gameRules.setFocusOrder(g,0);remove(g,9,20);
 assert.equal(gameRules.nextStep(g).action,'connect');
 const old=JSON.stringify(g);
 assert.deepEqual(gameRules.nextStep(g),gameRules.nextStep(g));
 assert.equal(JSON.stringify(g),old);
 g.celebrated=true;
 assert.equal(gameRules.nextStep(g).action,'decorate');
});

test('large pending orders are not misdiagnosed as a disconnected production road',()=>{
 const g=createGame();g.orders.forEach(o=>o.amount=999);
 assert.equal(gameRules.forecastOrder(g,g.orders[0].id,null),null);
 const suggestion=gameRules.nextStep(g);
 assert.equal(suggestion.action,'wait','active factories need production guidance, not a road warning');
 assert.match(suggestion.message,/생산/);
});

test('after the first delivery the prompt calls it the next delivery',()=>{
 const g=createGame();g.resources.grain=12;
 assert.equal(deliver(g,0).ok,true);
 const s=gameRules.nextStep(g);
 assert.notEqual(s.title,'첫 배달을 준비해 볼까요?');
 assert.ok(s.title.includes('다음') || s.action==='deliver');
});

test('coastal expansion unlocks exactly twelve previously submerged tiles',()=>{
 const g=createGame(),tiles=gameRules.COAST_EXPANSION.tiles;
 assert.equal(gameRules.SIZE,24);assert.equal(tiles.length,12);
 assert.ok(tiles.every(p=>!gameRules.isLand(p.x,p.y,g)));
 g.completed=2;g.resources.coin=500;g.resources.wood=20;
 assert.ok(gameRules.expandCoast(g).ok);
 assert.ok(tiles.every(p=>gameRules.isLand(p.x,p.y,g)));
 assert.equal(gameRules.isLand(0,0,g),false);
});
test('coastal expansion requires deliveries and resources and charges once',()=>{
 const g=createGame(),snapshot=JSON.stringify(g);
 assert.equal(gameRules.expandCoast(g).ok,false);assert.equal(JSON.stringify(g),snapshot);
 g.completed=2;g.resources.coin=179;assert.equal(gameRules.expandCoast(g).ok,false);
 g.resources.coin=180;g.resources.wood=7;assert.equal(gameRules.expandCoast(g).ok,false);
 g.resources.wood=8;assert.ok(gameRules.expandCoast(g).ok);
 assert.equal(g.resources.coin,0);assert.equal(g.resources.wood,0);
 assert.equal(gameRules.expandCoast(g).ok,false);assert.equal(g.resources.coin,0);
});
test('coastal expansion retains legacy saves and connected coast buildings',()=>{
 const old=createGame();delete old.coastExpanded;
 assert.equal(hydrate(old).coastExpanded,false);
 const g=createGame();g.completed=2;assert.ok(gameRules.expandCoast(g).ok);
 g.resources.coin=1000;g.resources.wood=100;
 assert.ok(place(g,'road',9,22).ok);assert.ok(place(g,'farm',8,22).ok);
 const restored=hydrate(JSON.parse(JSON.stringify(g)));
 assert.equal(restored.version,1);assert.equal(restored.coastExpanded,true);
 assert.ok(restored.roads.some(r=>r.x===9&&r.y===22));
 assert.ok(restored.buildings.some(b=>b.x===8&&b.y===22));
 assert.ok(gameRules.routeToBuilding(restored,8,22)?.length>=2);
});
