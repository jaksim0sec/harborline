import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame, remove, place, SAVE_KEY} from '../src/model.js';
import * as visual from '../src/render.js';
const {routeToVillageSquare,plazaVisitSample}=visual;

test('village square visit route follows harbor-connected roads to the landmark', () => {
  const game=createGame();
  const before=structuredClone(game);
  assert.deepEqual(routeToVillageSquare(game),[
    {x:9,y:21},{x:9,y:20},{x:9,y:19},{x:9,y:18}
  ]);
  assert.deepEqual(game,before,'visual route must not mutate saved data');
  assert.equal(SAVE_KEY,'harborline.save.v1');
});

test('square route disappears on road disconnect and recovers after rebuilding', () => {
  const game=createGame();
  assert.equal(remove(game,9,19).ok,true);
  assert.equal(routeToVillageSquare(game),null);
  assert.equal(place(game,'road',9,19).ok,true);
  assert.equal(routeToVillageSquare(game)?.at(-1)?.y,18);
});

test('plaza walkers arrive, rest on the square, and return without teleporting', () => {
  const path=[{x:9,y:21},{x:9,y:20},{x:9,y:19},{x:9,y:18}];
  assert.deepEqual(plazaVisitSample(0,path,1000,2000),{x:9,y:21,resting:false});
  assert.deepEqual(plazaVisitSample(1500,path,1000,2000),{x:9,y:19.5,resting:false});
  assert.deepEqual(plazaVisitSample(3000,path,1000,2000),{x:9,y:18,resting:true});
  assert.deepEqual(plazaVisitSample(4900,path,1000,2000),{x:9,y:18,resting:true});
  assert.deepEqual(plazaVisitSample(5500,path,1000,2000),{x:9,y:18.5,resting:false});
  assert.deepEqual(plazaVisitSample(8000,path,1000,2000),{x:9,y:21,resting:false});
  assert.deepEqual(plazaVisitSample(16000,path,1000,2000),{x:9,y:21,resting:false});
  assert.deepEqual(plazaVisitSample(10,[],1000,2000),null);
  assert.deepEqual(path[3],{x:9,y:18});
});

test('stationary one-tile routes do not drift or divide by zero',()=>{
  assert.deepEqual(plazaVisitSample(9999,[{x:3,y:4}]),{x:3,y:4,resting:true});
});
