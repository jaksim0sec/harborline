import test from 'node:test';
import assert from 'node:assert/strict';
import {paintedGroundContact, CONTACT_SHADOW_WIDTHS} from '../src/render.js';

test('painted building contacts the shared 2:1 tile plane rather than floating above it',()=>{
 const loaded=new Set(['home','bakery','harbor','farm','sawmill','tree']);
 for(const name of loaded){
  const rect=paintedGroundContact(name,loaded,200,320);
  assert.ok(rect?.width>=48&&rect.width<=100,name);
  assert.equal(rect.x+rect.width/2,200,`shadow centered under ${name}`);
  assert.equal(rect.y+rect.height/2,321,`shadow centered at the ground tile for ${name}`);
  assert.equal(rect.height,24);
 }
 assert.ok(CONTACT_SHADOW_WIDTHS.harbor>CONTACT_SHADOW_WIDTHS.tree);
 assert.ok(Object.isFrozen(CONTACT_SHADOW_WIDTHS));
});

test('fallback objects and ground tiles are not double-shadowed',()=>{
 const loaded=new Set(['home','farm','grass','road']);
 assert.equal(paintedGroundContact('sawmill',loaded,0,0),null,'unloaded sawmill keeps old procedural shadow');
 for(const name of ['grass','road','sand','water','squareFountain','lighthouse'])
  assert.equal(paintedGroundContact(name,loaded,0,0),null,`no double shadow for ${name}`);
 assert.deepEqual(paintedGroundContact('home',loaded,72,99),{x:33,y:88,width:78,height:24});
});
