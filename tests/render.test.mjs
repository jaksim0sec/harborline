import * as visual from "../src/render.js";
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


test('delivery boat trip has a visible outbound leg, return, and stable endpoint',()=>{
 assert.equal(typeof visual.boatTripPoint, 'function');
 const start=visual.boatTripPoint(0), middle=visual.boatTripPoint(.5),end=visual.boatTripPoint(1);
 assert.deepEqual({x:start.x,y:start.y},{x:9,y:23});
 assert.ok(Math.hypot(start.x-middle.x,start.y-middle.y)>2);
 assert.deepEqual({x:end.x,y:end.y},{x:9,y:23});
 assert.ok(visual.boatTripPoint(-3).x===9);
 assert.ok(visual.boatTripPoint(999).x===9);
});

test('terrain texture choice is deterministic, preserves sea and shore, and varies lush meadow', () => {
  assert.equal(typeof visual.groundTexture, 'function');
  assert.equal(visual.groundTexture(9, 1, 'water'), 'water');
  assert.equal(visual.groundTexture(9, 1, 'sand'), 'sand');
  const kinds = new Set();
  for (let x=0;x<24;x++) for (let y=0;y<24;y++) {
    const b = ((x+y)%3===0) ? 'grass2' : 'grass';
    const first = visual.groundTexture(x,y,b);
    assert.equal(first, visual.groundTexture(x,y,b));
    assert.ok(['grass','grass2','meadow','clover'].includes(first), first);
    kinds.add(first);
  }
  assert.deepEqual([...kinds].sort(), ['clover','grass','grass2','meadow']);
});

test('chibi proportions use larger head than torso and keep feet on the world ground plane', () => {
  assert.equal(typeof visual.CHARACTER_SPECS, 'object');
  for (const type of ['neighbor','neighbor2']) {
    const spec = visual.CHARACTER_SPECS[type];
    assert.ok(spec.headWidth >= spec.bodyWidth*1.45, spec);
    assert.ok(spec.headHeight > spec.bodyHeight, spec);
    assert.equal(spec.feetY, 103);
  }
  assert.ok(visual.CHARACTER_SPECS.cat.headWidth > visual.CHARACTER_SPECS.cat.bodyWidth);
});
