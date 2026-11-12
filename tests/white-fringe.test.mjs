import test from 'node:test';
import assert from 'node:assert/strict';
import { dematteOutline } from '../src/render.js';

function pixel(data,w,x,y){ return Array.from(data.slice((y*w+x)*4,(y*w+x)*4+4)); }
test('removes near-white alpha fringe without washing out textured interior',()=>{
 const w=9,h=9,source=new Uint8ClampedArray(w*h*4);
 for(let y=2;y<=6;y++)for(let x=2;x<=6;x++){
   const i=(y*w+x)*4, edge=x===2||x===6||y===2||y===6;
   source.set(edge?[244,244,240,200]:[157,91,54,255],i);
 }
 // Interior white flower detail is meaningful and not an edge matte.
 source.set([246,243,238,255],(4*w+4)*4);
 const result=dematteOutline(source,w,h);
 assert.deepEqual(pixel(source,w,2,2),[244,244,240,200],'source data must not be mutated');
 assert.deepEqual(pixel(result,w,0,0),[0,0,0,0],'transparent pixels remain untouched');
 const edge=pixel(result,w,2,2);
 assert.ok(edge[0]<220&&edge[3]<200,'near-white boundary should no longer glow');
 assert.deepEqual(pixel(result,w,4,4),[246,243,238,255],'interior highlights must remain');
 assert.deepEqual(pixel(result,w,3,3),[157,91,54,255],'colored interior is unchanged');
});
test('non-white edges and alpha-zero holes are left alone',()=>{
 const data=new Uint8ClampedArray([0,0,0,0, 120,78,44,110, 0,0,0,0, 43,56,76,255]);
 assert.deepEqual(Array.from(dematteOutline(data,2,2)),Array.from(data));
});
