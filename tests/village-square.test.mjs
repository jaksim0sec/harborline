import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame, remove, place, SAVE_KEY} from '../src/model.js';
import {isVillagePlaza, roadMask} from '../src/render.js';
import * as visual from '../src/render.js';
const selectVillageSquare = (...args) => visual.selectVillageSquare(...args);

test('an existing connected road junction becomes the one village square',()=>{
  const game=createGame();
  const before=structuredClone(game);
  const keys=new Set(game.roads.map(p=>`${p.x},${p.y}`));
  assert.equal(roadMask(keys,9,18),14);
  assert.equal(isVillagePlaza(keys,9,18),true);
  assert.deepEqual(selectVillageSquare(game),{x:9,y:18});
  assert.deepEqual(selectVillageSquare(game),{x:9,y:18});
  assert.deepEqual(game,before,'render selection must not mutate save state');
  assert.equal(SAVE_KEY,'harborline.save.v1');
});

test('landmark vanishes if its route is disconnected, then returns on reconnection',()=>{
  const game=createGame();
  assert.equal(remove(game,9,19).ok,true);
  assert.equal(selectVillageSquare(game),null);
  assert.equal(place(game,'road',9,19).ok,true);
  assert.deepEqual(selectVillageSquare(game),{x:9,y:18});
});

test('new unconnected crossroads do not become a village landmark',()=>{
  const game=createGame();
  game.roads.push({x:16,y:9},{x:15,y:9},{x:17,y:9},{x:16,y:8});
  assert.deepEqual(selectVillageSquare(game),{x:9,y:18});
});
