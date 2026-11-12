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
