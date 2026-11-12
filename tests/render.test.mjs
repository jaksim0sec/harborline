import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkSample, BUILDING_BASE } from '../src/render.js';

test('walkSample stays on a looping walk and returns fractional positions', () => {
  const path = [{x:9,y:19},{x:9,y:18},{x:10,y:18}];
  assert.deepEqual(walkSample(0,path,1000),{x:9,y:19});
  assert.deepEqual(walkSample(500,path,1000),{x:9,y:18.5});
  assert.deepEqual(walkSample(2000,path,1000),{x:10,y:18});
  assert.deepEqual(walkSample(4000,path,1000),{x:9,y:19});
});

test('walkSample remains stable with one or no walkable tile', () => {
 assert.deepEqual(walkSample(10000,[{x:9,y:21}],1200),{x:9,y:21});
 assert.equal(walkSample(10000,[],1200),null);
});


test('building foundation extends to the ground beneath wall endpoints', () => {
  assert.equal(BUILDING_BASE.centerX, 72);
  assert.equal(BUILDING_BASE.centerY, 92);
  assert.equal(BUILDING_BASE.centerY + BUILDING_BASE.halfHeight, 108);
  assert.ok(BUILDING_BASE.centerY + BUILDING_BASE.halfHeight > BUILDING_BASE.wallFrontY);
});
