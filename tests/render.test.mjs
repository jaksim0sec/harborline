import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkSample } from '../src/render.js';

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
