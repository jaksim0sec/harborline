import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAINTED_TEXTURES, ACTOR_SCALES, spriteDestination } from '../src/render.js';
const root = resolve(import.meta.dirname,'..');
const subjects = ['harbor','farm','sawmill','grass','grass2','meadow','clover'];

test('expanded painted atlas has independently loaded PNG subjects',()=>{
 for(const name of subjects){
  const url=PAINTED_TEXTURES[name];
  assert.equal(url,`/assets/textures/${name}.png`);
  const data=readFileSync(resolve(root,'.'+url));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name);
  assert.equal(data.readUInt32BE(16),144,name);
  assert.equal(data.readUInt32BE(20),148,name);
  assert.equal(data[25],6,`${name} must be RGBA`);
  assert.ok(data.length>2500,`${name} must not be a placeholder`);
 }
});

test('all world actors share their original grounded projection without save changes',()=>{
 assert.ok(ACTOR_SCALES.neighbor>=.65&&ACTOR_SCALES.neighbor<=.76);
 assert.equal(ACTOR_SCALES.neighbor,ACTOR_SCALES.neighbor2);
 const {y,height}=spriteDestination(72,103,ACTOR_SCALES.neighbor);
 assert.equal(Math.round(y+100*ACTOR_SCALES.neighbor),Math.round(103));
 assert.ok(height>=95&&height<=113);
});
