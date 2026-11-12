import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {PAINTED_TEXTURES, ACTOR_SCALES, spriteDestination} from '../src/render.js';

const root=resolve(import.meta.dirname,'..');

test('first image textures are actual transparent PNG atlas cells at fixed dimensions',()=>{
 const names=['bakery','home','tree','harbor','farm','sawmill','grass','grass2','meadow','clover'];
 assert.deepEqual(Object.keys(PAINTED_TEXTURES).sort(),names.toSorted());
 for(const name of names){
   const path=PAINTED_TEXTURES[name];
   assert.ok(path.endsWith(`/assets/textures/${name}.png`),path);
   const buf=readFileSync(resolve(root,'.'+path));
   assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(buf.readUInt32BE(16),144);
   assert.equal(buf.readUInt32BE(20),148);
   assert.equal(buf[25],6,'RGBA PNG must preserve transparency');
   assert.ok(buf.length > (['grass','grass2','meadow','clover'].includes(name)?1600:3000),'a non-placeholder painted image is required');
 }
});

test('residents are reduced while keeping a single contact point on original tile',()=>{
 assert.ok(ACTOR_SCALES.neighbor>=.60&&ACTOR_SCALES.neighbor<=.72);
 assert.equal(ACTOR_SCALES.neighbor2,ACTOR_SCALES.neighbor);
 assert.ok(ACTOR_SCALES.cat<=.80);
 const at=spriteDestination(72,103,ACTOR_SCALES.neighbor);
 assert.ok(at.width<108&&at.height<112,at);
 assert.equal(Math.round(at.y+103*ACTOR_SCALES.neighbor),Math.round(105));
 const full=spriteDestination(72,103);
 assert.equal(full.width,144);
 assert.equal(full.height,148);
 assert.equal(full.x,0);
 assert.equal(full.y,3);
});
