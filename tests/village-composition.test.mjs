import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as visuals from '../src/render.js';
import { createGame, isLand, COAST_EXPANSION } from '../src/model.js';

const toKeys = points => new Set(points.map(p => `${p.x},${p.y}`));

test('connected road mask follows isometric grid directions and exposes a plaza at a junction', () => {
  assert.equal(typeof visuals.roadMask, 'function');
  assert.equal(typeof visuals.isVillagePlaza, 'function');
  const game = createGame();
  const roads = toKeys(game.roads);
  assert.equal(visuals.roadMask(roads,9,18), 2|4|8);
  assert.equal(visuals.isVillagePlaza(roads,9,18), true);
  assert.equal(visuals.isVillagePlaza(roads,9,20), false);
  const cut=new Set(roads);cut.delete('10,18');
  assert.equal(visuals.isVillagePlaza(cut,9,18), false);
  assert.equal(visuals.roadMask(new Set(),4,4),0);
});

test('village-edge scenery is deterministic and never occupies roads or buildings', () => {
  assert.equal(typeof visuals.sceneryAt, 'function');
  const game=createGame();
  const used=toKeys([...game.roads,...game.buildings]);
  assert.equal(visuals.sceneryAt(game,9,18,used),null);
  assert.equal(visuals.sceneryAt(game,8,18,used),null);
  assert.equal(visuals.sceneryAt(game,0,0,used),null);
  let flowerCount=0;
  for(let x=0;x<24;x++)for(let y=0;y<24;y++){
    const prop=visuals.sceneryAt(game,x,y,used);
    assert.equal(prop,visuals.sceneryAt(game,x,y,used));
    if(prop==='flowerpatch')flowerCount++;
    if(prop)assert.ok(isLand(x,y,game));
  }
  assert.ok(flowerCount>0&&flowerCount<50,flowerCount);
  const coast=COAST_EXPANSION.tiles.find(p=>!isLand(p.x,p.y,game));
  if(coast)assert.equal(visuals.sceneryAt(game,coast.x,coast.y,used),null);
});
