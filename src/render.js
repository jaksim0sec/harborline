import { SIZE, inBounds, isLand, terrain, connections, evaluatePlacement, routeToBuilding, workplaceForOrder } from './model.js';

const TILE_W=72, TILE_H=36, SPR_W=144, SPR_H=148;
const names=['water','grass','grass2','meadow','clover','sand','road','farm','sawmill','bakery','home','garden','harbor','tree','bush','boat','neighbor','neighbor2','cat','lighthouse','dockpost','flowerpatch','rock'];
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const poly=(c,points,fill,stroke,line=1)=>{c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
const ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();};
const diamond=(c,x,y,w,h,fill,stroke)=>poly(c,[[x,y-h],[x+w,y],[x,y+h],[x-w,y]],fill,stroke);
const line=(c,pts,color,w=2)=>{c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.stroke();};
export function walkSample(time,path,period=1000){
 if(!path.length)return null;
 if(path.length===1)return {x:path[0].x,y:path[0].y};
 const length=(path.length-1)*2;
 const distance=(((time/period)%length)+length)%length;
 const whole=Math.floor(distance),t=distance-whole;
 const a=path[whole<path.length?whole:length-whole];
 const next=whole+1;
 const b=path[next<path.length?next:length-next];
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
/** Seaward excursion on an all-water lane. 0 → harbor, .5 → outer sea, 1 → harbor. */
export function boatTripPoint(progress){
 const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const away=1-Math.abs(2*t-1);
 return {x:9-3*away,y:23};
}
/** Coordinate-stable variation uses no runtime allocations and never changes game terrain. */
export function groundTexture(x,y,base){
 if(base!=='grass'&&base!=='grass2')return base;
 const h=Math.abs(((x+29)*73856093)^((y+31)*19349663))%100;
 if(h<11)return 'meadow';
 if(h<24)return 'clover';
 return base;
}
function ground(c,name){
 const isSea=name==='water',sand=name==='sand';
 const palette={grass:'#97c98c',grass2:'#a8d39a',meadow:'#a1d299',clover:'#8fc58b'};
 if(!isSea){
   poly(c,[[36,101],[72,119],[108,101],[108,108],[72,126],[36,108]],sand?'#c4ad8a':'#6ca17c');
 }
 diamond(c,72,99,36,18,isSea?'#83b9be':sand?'#ecd7b3':palette[name],
   isSea?'rgba(91,164,175,.27)':sand?'rgba(187,153,106,.16)':'rgba(61,128,77,.085)');
 if(isSea){
   line(c,[[47,94],[52,91],[59,93]],'#d1eae2',1.5);
   line(c,[[82,106],[86,104],[92,105]],'#d9ece6',1.1);
   ellipse(c,67,101,1.3,.7,'#bbdfd4');
 }else if(sand){
   ellipse(c,67,95,1.5,1.2,'#d6bb96');ellipse(c,89,100,1.5,1,'#d3bb9d');ellipse(c,57,106,1.1,1.1,'#f7e6c9');
   ellipse(c,78,94,.9,.6,'#d7bb96');
 }else{
   // Clip micro-texture into the same 2:1 isometric top plane for every variant.
   c.save();c.beginPath();c.moveTo(72,81);c.lineTo(108,99);c.lineTo(72,117);c.lineTo(36,99);c.closePath();c.clip();
   ellipse(c,58,98,17,5,name==='clover'?'rgba(55,130,78,.11)':'rgba(224,243,176,.15)');
   ellipse(c,83,106,16,4,'rgba(57,126,74,.09)');
   for(let i=0;i<9;i++){
     const x=47+(i*17%52),y=95+(i*11%18);
     if(Math.abs(x-72)/36+Math.abs(y-99)/18>.81)continue;
     const ink=i%3===0?'#5da46f':i%3===1?'#7db783':'#d3e7a5';
     line(c,[[x-2,y+1],[x-1,y-2],[x,y]],ink,1.0);
     line(c,[[x+1,y+.5],[x+3,y-1]],ink,.8);
   }
   if(name==='meadow'||name==='clover'){
     const dots=name==='meadow'?[[61,100],[83,102]]:[[65,93],[84,104]];
     for(const [x,y] of dots){
       ellipse(c,x,y,1.5,1.1,name==='meadow'?'#fff8e1':'#f8d9cc');
       ellipse(c,x+1.8,y-.5,1.4,1,'#fff7d5');
       ellipse(c,x+1.0,y,0.85,.8,name==='meadow'?'#edbd64':'#e5a18e');
     }
   }
   c.restore();
 }
}
function shadow(c,size=26){ellipse(c,72,103,size,10,'rgba(53,79,67,.18)');}
// One shared contact plane for every hut; body front wall ends at y=103.
export const BUILDING_BASE=Object.freeze({centerX:72,centerY:92,halfWidth:30,halfHeight:16,wallFrontY:103,lip:4});
function foundation(c){
 const {centerX:x,centerY:y,halfWidth:w,halfHeight:h,lip}=BUILDING_BASE;
 ellipse(c,x,y+h-1,w+3,9,'rgba(44,76,67,.26)');
 poly(c,[[x-w,y],[x,y+h],[x,y+h+lip],[x-w,y+lip]],'#c7b99c','#b7a888',.6);
 poly(c,[[x,y+h],[x+w,y],[x+w,y+lip],[x,y+h+lip]],'#b5b29a','#aa9d87',.6);
 diamond(c,x,y,w,h,'#e5dcc5','#c4b69b');
}
function walls(c,opt={}){
 const {left='#ead3aa',right='#f9e3bb',roofLeft='#83acac',roofRight='#689b9a',roofTop=31,base=true}=opt;
 if(base)foundation(c);else shadow(c,28);
 poly(c,[[46,59],[72,73],[72,103],[46,88]],left,'#a6937e',.7);
 poly(c,[[72,73],[99,59],[99,87],[72,103]],right,'#a6937e',.7);
 poly(c,[[41,58],[72,roofTop],[72,73],[41,62]],roofLeft,'#547779',.8);
 poly(c,[[72,roofTop],[104,57],[104,62],[72,73]],roofRight,'#547779',.8);
 poly(c,[[41,58],[72,roofTop],[104,57],[72,73]],null,'#577d78',1);
}
function sign(c,text,x,y,fill='#f8eee0',ink='#8d675c',r=10){ellipse(c,x,y,r,r,fill);c.font='bold 10px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.fillText(text,x,y+1);}
export const CHARACTER_SPECS=Object.freeze({
  neighbor:Object.freeze({headWidth:24.4,headHeight:23,bodyWidth:16,bodyHeight:12,feetY:103}),
  neighbor2:Object.freeze({headWidth:24.4,headHeight:23,bodyWidth:16,bodyHeight:12,feetY:103}),
  cat:Object.freeze({headWidth:21.4,headHeight:20,bodyWidth:14,bodyHeight:11,feetY:103})
});
function paint(c,name){
 c.save();
 if(['water','grass','grass2','meadow','clover','sand'].includes(name)){ground(c,name);}
 if(name==='road'){
   diamond(c,72,99,26,12,'#e9dcc2','#d4bd9d');
   poly(c,[[51,98],[57,95],[63,98],[58,101]],'#fbf4e3');
   poly(c,[[73,106],[79,103],[85,106],[79,108]],'#d8c9aa');
 }
 if(name==='farm'){
   shadow(c,27);
   diamond(c,72,97,30,15,'#9c7153','#735f4a');
   for(let i=0;i<4;i++){
     const y=88+i*5;
     line(c,[[54-i*1.8,y],[72,y-8],[88+i*1.8,y]],'#79553f',2.6);
     for(let j=0;j<4;j++){
       const px=56+j*8+(i%2)*2,py=90+(px-58)*.12+i*3;
       line(c,[[px,py+1],[px,py-3]],'#4e966f',1.6);
       line(c,[[px,py-2],[px-2,py-4]],'#a6c779',1.5);
     }
   }
   ellipse(c,97,86,5,5,'#dac5a4');ellipse(c,97,85,2,2,'#d7a25f');
 }
 if(name==='sawmill'){
   walls(c,{left:'#b99d7e',right:'#d6b995',roofLeft:'#5d8372',roofRight:'#436d62',roofTop:35});
   for(let i=0;i<3;i++)line(c,[[49,69+i*6],[70,80+i*6]],'#967e62',1.8);
   poly(c,[[80,75],[94,68],[94,81],[80,88]],'#8e674d','#705741',1);
   for(let i=0;i<3;i++){
     ellipse(c,98-i*8,101-i*3,5,4,'#d2a675');ellipse(c,98-i*8,101-i*3,2,2,'#97704c');
   }
   line(c,[[71,34],[71,29],[87,34]],'#d8dfc9',1.5);
 }
 if(name==='bakery'){
   walls(c,{left:'#efc7aa',right:'#f9ddbb',roofLeft:'#d88d81',roofRight:'#c77670',roofTop:33});
   poly(c,[[73,79],[98,67],[98,80],[73,93]],'#ffefdf','#ac6c61');
   for(let i=0;i<4;i++)poly(c,[[74+i*6,79-i*3],[77+i*6,78-i*3],[77+i*6,91-i*3],[74+i*6,92-i*3]],i%2?'#f9e4cb':'#eaa79d');
   sign(c,'빵',52,73,'#fff4df','#a66a54',9);
   ellipse(c,82,90,3,5,'#ab7456');
   line(c,[[42,58],[72,33],[104,57]],'#fff0e7',1.6);
 }
 if(name==='home'){
   walls(c,{left:'#e1cfb4',right:'#f5e9d3',roofLeft:'#83aaae',roofRight:'#6d9d9e',roofTop:28});
   poly(c,[[79,78],[89,73],[89,89],[79,94]],'#8c7d73','#647970',.7);
   ellipse(c,86,83,1,1,'#f7e4bd');
   poly(c,[[49,69],[59,74],[59,82],[49,77]],'#c1d9d4','#e9f1e4',1.3);
   ellipse(c,47,102,6,4,'#82a68d');ellipse(c,50,100,2.6,2.6,'#f0c0ab');
   ellipse(c,94,97,6,4,'#88ae91');ellipse(c,94,95,2.5,2.5,'#f2d69d');
 }
 if(name==='garden'){
   shadow(c,24);
   diamond(c,72,99,30,15,'#b68e74','#896e5a');
   diamond(c,72,96,28,13,'#a5c39c','#8eab85');
   for(let i=0;i<9;i++){
     const x=51+i*5.1, y=93+(i%3)*5;
     line(c,[[x,y+2],[x,y-4]],'#63987d',1.5);
     ellipse(c,x-2,y-4,2.8,2.8,['#eeb5b5','#d6b5de','#fff0b7'][i%3]);
     ellipse(c,x+1.3,y-5,2.6,2.6,['#f8d0a4','#f4c4cf','#f9f0ce'][i%3]);
     ellipse(c,x,y-4,1.3,1.3,'#f2b56f');
   }
 }
 if(name==='harbor'){
   shadow(c,32);
   diamond(c,72,101,33,17,'#9e765c','#785944');
   for(let i=0;i<5;i++)line(c,[[43+i*9,86+i*4.5],[72+i*8/2,103+i*.6]],'#b99274',1.5);
   walls(c,{left:'#e2bd97',right:'#f2d8b8',roofLeft:'#a9a58b',roofRight:'#918f78',roofTop:32,base:false});
   sign(c,'港',53,74,'#fff4db','#77644f',9);
   line(c,[[107,99],[107,52]],'#87705d',2.2);
   poly(c,[[108,53],[124,59],[108,65]],'#dba27e');
   ellipse(c,107,51,3,3,'#f4e6c5');
 }
 if(name==='tree'){
   shadow(c,20);
   // A two-face trunk keeps the same top-left light direction as the houses.
   poly(c,[[67,100],[73,101],[73,69],[67,69]],'#ad865d','#98744e',.5);
   poly(c,[[73,101],[78,98],[78,67],[73,69]],'#8e704d','#816547',.5);
   line(c,[[72,79],[64,72]],'#947657',2.3);
   ellipse(c,60,74,15,16,'#549b71');ellipse(c,81,69,18,21,'#559b70');
   ellipse(c,70,57,22,22,'#74b883');ellipse(c,56,66,14,15,'#74b884');
   ellipse(c,84,54,13,14,'#67ad7b');ellipse(c,68,47,13,14,'#91c990');
   for(const [x,y,w,h] of [[59,52,7,3.2],[73,41,7,3],[87,51,5,2.5],[51,65,4,2],[75,63,4,2]]){
      ellipse(c,x,y,w,h,'rgba(222,245,189,.26)');
   }
   for(const [x,y] of [[57,80],[83,80],[92,69],[55,55],[70,70]]){
      ellipse(c,x,y,2.3,1.8,'rgba(49,128,76,.18)');
   }
 }
 if(name==='bush'){
   ellipse(c,72,102,19,5,'rgba(45,94,58,.17)');
   ellipse(c,62,96,12,10,'#579b70');ellipse(c,78,94,13,12,'#66aa78');
   ellipse(c,69,88,12,11,'#85c18c');ellipse(c,82,90,6,7,'#7ab883');
   ellipse(c,65,85,5,2.8,'rgba(227,244,187,.34)');
   for(const [x,y,color] of [[59,90,'#f3cfbb'],[81,86,'#f8e2a8'],[73,82,'#e7d4ea']]){
      ellipse(c,x,y,2.5,2,color);ellipse(c,x+1.4,y+.5,.9,.9,'#f4bb65');
   }
 }
 if(name==='flowerpatch'){
   ellipse(c,72,103,22,4,'rgba(60,111,67,.12)');
   for(const [x,y] of [[54,98],[62,95],[72,101],[83,96],[93,101],[66,104],[78,105]]){
      line(c,[[x,y+3],[x,y-7]],'#579e69',1.8);
      line(c,[[x,y],[x-3,y-3]],'#72ac6b',1.6);
      const bloom=((x+y)%3);
      ellipse(c,x-2.2,y-7,3.3,2.7,bloom===0?'#f5bdb7':bloom===1?'#fff1cc':'#e7d3f3');
      ellipse(c,x+1.8,y-8,3,2.7,bloom===0?'#f8d5c5':bloom===1?'#fff8df':'#f0e3f8');
      ellipse(c,x,y-7,1.8,1.8,'#e9ad65');
   }
 }
 if(name==='rock'){
   ellipse(c,72,104,22,5,'rgba(53,93,68,.17)');
   poly(c,[[51,100],[56,90],[67,86],[78,94],[79,102],[66,105]],'#b1b7aa','#829989',1.1);
   poly(c,[[56,90],[67,86],[78,94],[66,98]],'#d7d9bf',null);
   poly(c,[[66,98],[78,94],[79,102],[66,105]],'#899f92',null);
   ellipse(c,60,98,5,2,'#75a47b');
   poly(c,[[76,102],[82,95],[90,96],[95,104],[84,106]],'#95aa9a','#829786',.7);
   poly(c,[[82,95],[90,96],[95,104],[85,101]],'#c7cbb5',null);
 }
 if(name==='lighthouse'){
   shadow(c,21);
   diamond(c,72,101,23,12,'#ded2b5','#ad9d7f');
   poly(c,[[61,94],[64,48],[79,48],[83,94],[72,103]],'#f7edcf','#d0c1a0',1);
   poly(c,[[72,103],[83,94],[79,48],[72,53]],'#d8e1c8',null);
   poly(c,[[60,48],[72,35],[84,47],[72,54]],'#79a69a','#467d79',1.2);
   poly(c,[[66,44],[66,31],[78,31],[78,44]],'#f7e7bd','#aaae97',1);
   ellipse(c,72,32,5,2.3,'#f9de9a');
   poly(c,[[64,31],[72,23],[80,31]],'#de9a83','#ad776d',.8);
   poly(c,[[71,79],[77,76],[77,91],[71,94]],'#7baca5','#5e8580',.8);
   ellipse(c,73,59,3,3.2,'#6b9b97');
   line(c,[[64,68],[79,68]],'#dfb77d',2.5);
 }
 if(name==='dockpost'){
   ellipse(c,72,105,11,3,'rgba(63,84,68,.16)');
   poly(c,[[67,99],[74,102],[74,74],[67,72]],'#b8916b','#8a735c',.8);
   poly(c,[[74,102],[79,99],[79,73],[74,74]],'#947656','#806346',.8);
   ellipse(c,73,72,6,3.3,'#d2b38a');
   line(c,[[65,80],[80,84]],'#eee2ba',2);
 }
 if(name==='boat'){
   ellipse(c,73,112,24,6,'rgba(44,83,87,.15)');
   poly(c,[[39,92],[103,92],[95,112],[52,112]],'#4e8d96','#376d76',1.5);
   poly(c,[[44,92],[98,92],[91,98],[50,98]],'#f5ead4');
   poly(c,[[62,83],[86,83],[89,94],[58,94]],'#f3dfc4','#9b9c8a',1);
   poly(c,[[61,82],[73,72],[86,82]],'#cf907a');
   poly(c,[[66,84],[74,84],[74,91],[66,91]],'#8eb8b8');
   line(c,[[91,91],[91,70]],'#7f8b85',1.5);
   poly(c,[[92,72],[105,78],[92,83]],'#f1bc9f');
 }
 if(name==='neighbor'||name==='neighbor2'){
   const other=name==='neighbor2';
   ellipse(c,72,103,11,3.5,'rgba(45,73,68,.20)');
   // Tiny shoes and one-piece coats give way to larger, readable round heads.
   ellipse(c,68,101,3.3,2,'#706e61');ellipse(c,76,101,3.3,2,'#706e61');
   poly(c,[[67,92],[71,88],[76,90],[80,100],[64,100]],other?'#dc9c87':'#73a99a','#6c877b',.65);
   ellipse(c,64,94,3.4,4.1,other?'#d7a38c':'#77b4a2');
   ellipse(c,81,94,3.2,4.0,other?'#d7a38c':'#77b4a2');
   // Hair behind the head helps the silhouette read at mobile zoom.
   ellipse(c,72,79,13.3,13.5,other?'#806554':'#665e52');
   ellipse(c,72,81.5,12.2,11.5,other?'#f5d6b6':'#f6d9ba');
   ellipse(c,59.5,83,2.8,4,'#f2caa6');ellipse(c,84.5,83,2.8,4,'#f2caa6');
   ellipse(c,67.3,81.7,1.4,1.65,'#5c5c55');ellipse(c,77,81.7,1.4,1.65,'#5c5c55');
   ellipse(c,63.3,85,2.8,1.6,'rgba(227,137,129,.38)');ellipse(c,80.4,85,2.8,1.6,'rgba(227,137,129,.38)');
   line(c,[[70,87],[74,87]],'#bc8b7b',1.1);
   if(other){
     // Soft straw hat with a wide brim, rounded top; no perspective mismatch.
     ellipse(c,72,73,15.5,4.1,'#e5c497');
     poly(c,[[63,72],[64,65],[68,61],[77,62],[81,72]],'#f3dcae','#c69f76',.9);
     line(c,[[65,71],[79,71]],'#cc9381',2.1);
   }else{
     // Side fringe and small flower on hair, rather than a cap obscuring the face.
     ellipse(c,70,70,12.3,6.8,'#665e52');
     ellipse(c,63,75,5.6,6.7,'#665e52');
     ellipse(c,80,69,3,2.8,'#f1c0a4');
     ellipse(c,83,68,2.4,2.2,'#fce7c0');
     ellipse(c,81.5,70,1.4,1.3,'#edb87e');
   }
   ellipse(c,82.5,96,3.1,3.4,other?'#f5d7a9':'#edd5b0');
 }
 if(name==='cat'){
   ellipse(c,72,103,12,3,'rgba(41,72,66,.21)');
   // Curled tail behind a small body; kitten's head is visibly larger than torso.
   line(c,[[80,96],[89,92],[87,86]],'#c68f69',3.8);
   ellipse(c,78,95,7,5.7,'#edd4b7');
   ellipse(c,67,90,10.7,10,'#f6dfc3');
   poly(c,[[58,85],[58,76],[65,82],[71,77],[77,85]],'#e9b989','#c5976d',.9);
   poly(c,[[60,80],[60,85],[64,84]],'#e9a5a2');
   poly(c,[[71,81],[73,85],[75,84]],'#e9a5a2');
   ellipse(c,63,89,1.3,1.7,'#635c54');ellipse(c,71,89,1.3,1.7,'#635c54');
   ellipse(c,66.8,92,1.1,1,'#d69f9d');
   line(c,[[65,93.5],[67,94.5],[69,93.5]],'#bd9a89',.9);
   ellipse(c,72,100,3.2,2,'#f9e8d3');ellipse(c,82,100,3.2,2,'#f9e8d3');
 }
 c.restore();
}
function atlas(){
 const c=makeCanvas(4*SPR_W,Math.ceil(names.length/4)*SPR_H),ctx=c.getContext('2d');
 const cells=new Map(); names.forEach((name,i)=>{
   const col=i%4,row=Math.floor(i/4);ctx.save();ctx.translate(col*SPR_W,row*SPR_H);paint(ctx,name);ctx.restore();cells.set(name,{sx:col*SPR_W,sy:row*SPR_H});
 }); return {canvas:c,cells};
}
const hash=(x,y)=>Math.abs(((x+5)*73856093)^((y+8)*19349663))%100;
export class Scene {
 constructor(canvas,game){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.atlas=atlas();
  this.cache=null;this.cacheDirty=true;this.previews=new Map();this.animationTime=0;this.walkPaths=[];this.flashes=[];this.voyage=null;this.labelCache=new Map();this.game=game;this.pan={x:0,y:0};this.zoom=1;
  this.hover=null;this.tool='inspect';this.quality=1;this.width=1;this.height=1;this.t=0;this.fps=0;this.samples=[];
  this.CW=SIZE*TILE_W+240;this.CH=SIZE*TILE_H+270;this.OX=this.CW/2;this.OY=130;
  this.resize();
 }
 resize(){
  const rect=this.canvas.getBoundingClientRect();this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);
  this.quality=Math.min(window.devicePixelRatio||1,1.75);this.canvas.width=Math.round(this.width*this.quality);this.canvas.height=Math.round(this.height*this.quality);
  const mobile=this.width<690;
  if(!this._initialZoom||mobile!==this._wasMobile){this.resetView();this._initialZoom=true;}
  else this.zoom=Math.min(this.zoom,mobile?1.4:2.25);
  this._wasMobile=mobile;
 }
 resetView(){
  this.zoom=this.width<690?.94:this.width<1000?1.08:1.36;
  this.pan.x=this.width<690?this.width*.75+32:Math.min(350,this.width*.26);
  this.pan.y=this.width<690?-52:-12;
 }
 invalidate(){this.cacheDirty=true;}
 /** Receipts are ephemeral and are never written into the save game. */
 showProduction(activity){
   const labels={grain:'햇밀',wood:'목재',bread:'빵',coin:'코인',stars:'온기'};
   this.flashes=(activity||[]).filter(a=>a.amount>0&&labels[a.resource]).slice(0,9).map(a=>({
     x:a.x,y:a.y,text:`+${a.amount} ${labels[a.resource]}`,born:this.animationTime
   }));
 }
 sendDelivery(order){
   if(!order)return;
   this.voyage={since:this.animationTime,resource:order.resource,amount:order.amount};
 }
 labelSprite(text){
   if(this.labelCache.has(text))return this.labelCache.get(text);
   const c=makeCanvas(104,30),g=c.getContext('2d');
   g.fillStyle='rgba(252,247,226,.95)';g.strokeStyle='#e7d3ae';g.lineWidth=1;
   g.beginPath();g.roundRect(1,1,102,27,12);g.fill();g.stroke();
   g.font='bold 12px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#557467';g.fillText(text,52,15);
   this.labelCache.set(text,c);return c;
 }
 toolPreview(name){
  if(this.previews.has(name))return this.previews.get(name);
  const src=this.atlas.cells.get(name);if(!src)return null;
  const preview=makeCanvas(92,92),c=preview.getContext('2d');
  if(name==='road')c.drawImage(this.atlas.canvas,src.sx+35,src.sy+78,74,42,9,27,74,42);
  else c.drawImage(this.atlas.canvas,src.sx+31,src.sy+23,82,92,5,0,82,92);
  const uri=preview.toDataURL('image/png');this.previews.set(name,uri);return uri;
 }
 sprite(ctx,name,x,y){const s=this.atlas.cells.get(name);if(!s)return;ctx.drawImage(this.atlas.canvas,s.sx,s.sy,SPR_W,SPR_H,Math.round(x-72),Math.round(y-100),SPR_W,SPR_H);}
 tileCenter(x,y){return {x:this.OX+(x-y)*TILE_W/2,y:this.OY+(x+y)*TILE_H/2};}
 buildCache(){
  const cache=makeCanvas(this.CW,this.CH),c=cache.getContext('2d');
  c.imageSmoothingEnabled=true;
  for(let depth=0;depth<(SIZE-1)*2+1;depth++)for(let x=0;x<SIZE;x++){
   const y=depth-x;if(!inBounds(x,y))continue;
   const p=this.tileCenter(x,y);this.sprite(c,groundTexture(x,y,terrain(x,y)),p.x,p.y);
  }
  for(const r of this.game.roads){const p=this.tileCenter(r.x,r.y);this.sprite(c,'road',p.x,p.y);}
  const used=new Set([...this.game.roads,...this.game.buildings].map(b=>`${b.x},${b.y}`));
  const props=[];
  for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++){
    if(!isLand(x,y)||used.has(`${x},${y}`))continue;
    const h=hash(x,y);const edge=x<5||x>18||y<5||y>19;
    if(edge&&h<19)props.push({x,y,type:'tree'});
    else if(h<6)props.push({x,y,type:'bush'});
    else if(h>=89&&h<94)props.push({x,y,type:'flowerpatch'});
    else if(edge&&h===38)props.push({x,y,type:'rock'});
  }
  if(!used.has('5,18'))props.push({x:5,y:18,type:'lighthouse'});
  // 방파제의 작은 말뚝은 물 위 장식으로만 놓인다.
  if(!used.has('7,21'))props.push({x:7,y:21,type:'dockpost'});
  const all=[...props,...this.game.buildings];all.sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x);
  for(const item of all){const p=this.tileCenter(item.x,item.y);this.sprite(c,item.type,p.x,p.y);}
  // 항구 주변의 작은 오브젝트는 정적 아틀라스로 단 한 번만 렌더링한다.

  const roadSet=connections(this.game).roads;
  this.walkPaths=this.game.buildings
    .filter(b=>b.type!=='harbor')
    .map(b=>routeToBuilding(this.game,b.x,b.y))
    .filter(path=>path&&path.length>=2);
  this.connectedRoads=roadSet;
  this.focusBuilding=workplaceForOrder(this.game);
  this.focusRoute=this.focusBuilding?routeToBuilding(this.game,this.focusBuilding.x,this.focusBuilding.y):null;
  this.cache=cache;this.cacheDirty=false;
 }
 getCenter(){return {x:this.width*(this.width>=900?.46:.50)+this.pan.x,y:this.height*.55+this.pan.y};}
 worldToScreen(x,y){const center=this.getCenter();return {x:center.x+((x-y)*TILE_W/2)*this.zoom,y:center.y+((x+y)*TILE_H/2-(SIZE-1)*TILE_H/2)*this.zoom};}
 screenToTile(sx,sy){const center=this.getCenter();const u=(sx-center.x)/this.zoom;const v=(sy-center.y)/this.zoom+(SIZE-1)*TILE_H/2;
  const x=Math.round((u/(TILE_W/2)+v/(TILE_H/2))/2),y=Math.round((v/(TILE_H/2)-u/(TILE_W/2))/2);
  return inBounds(x,y)?{x,y}:null;
 }
 zoomAt(amount,x=this.width/2,y=this.height/2){
  const old=this.zoom, next=Math.max(.42,Math.min(2.25,old*amount));if(next===old)return;
  const center=this.getCenter();this.pan.x+=(x-center.x)*(1-next/old);this.pan.y+=(y-center.y)*(1-next/old);this.zoom=next;
 }
 render(time){
  if(this.t&&!this.game.paused)this.animationTime+=Math.min(200,Math.max(0,time-this.t));
  const c=this.ctx,d=this.quality,w=this.width,h=this.height;
  c.setTransform(d,0,0,d,0,0);
  const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#a9d3d3');bg.addColorStop(.58,'#8fc2c5');bg.addColorStop(1,'#80b4bb');c.fillStyle=bg;c.fillRect(0,0,w,h);
  for(let i=0;i<10;i++){
    const xx=((i*179+this.animationTime*.006)% (w+160))-80,yy=((i*91+h*.21)%(h+40));
    ellipse(c,xx,yy,15+i%3*7,1,'rgba(255,253,236,.15)');
  }
  if(this.cacheDirty)this.buildCache();
  const center=this.getCenter();c.save();c.translate(center.x,center.y);c.scale(this.zoom,this.zoom);
  c.drawImage(this.cache,-this.OX,-this.OY-(SIZE-1)*TILE_H/2);
  // Highlight the cached harbor-connected road network only in road mode.
  if(this.tool==='road' && this.connectedRoads){
    c.save();
    for(const k of this.connectedRoads){
      const [x,y]=k.split(',').map(Number);
      const px=(x-y)*TILE_W/2,py=(x+y)*TILE_H/2-(SIZE-1)*TILE_H/2;
      ellipse(c,px,py,3.5,2.2,'rgba(55,120,98,.62)');
      ellipse(c,px,py,1.4,1,'rgba(251,251,218,.95)');
    }
    c.restore();
  }
  const voyageProgress=this.voyage?(this.animationTime-this.voyage.since)/6200:1;
  const moving=this.voyage && voyageProgress<1;
  const boat=moving?boatTripPoint(voyageProgress):boatTripPoint(0);
  const boatX=(boat.x-boat.y)*TILE_W/2,boatY=(boat.x+boat.y)*TILE_H/2-(SIZE-1)*TILE_H/2+Math.sin(this.animationTime*.0016)*2;
  this.sprite(c,'boat',boatX,boatY);
  if(moving){
    c.save();c.globalAlpha=Math.min(1,(1-voyageProgress)*2);
    c.drawImage(this.labelSprite('배달 항해 중'),boatX-19,boatY-65);
    c.restore();
  }else if(this.voyage){this.voyage=null;}
  const visitors=[['neighbor',0,0,1700],['neighbor2',1,850,1950],['cat',0,1800,2600]];
  for(const [type,index,offset,speed] of visitors){
    if(!this.walkPaths.length)break;
    const path=type==='neighbor' && this.focusRoute?.length?this.focusRoute:this.walkPaths[index%this.walkPaths.length];
    const v=walkSample(this.animationTime+offset,path,speed);
    if(!v)continue;
    const px=(v.x-v.y)*TILE_W/2,py=(v.x+v.y)*TILE_H/2-(SIZE-1)*TILE_H/2;
    this.sprite(c,type,px,py+Math.sin((this.animationTime+offset)*.01)*.6);
  }
  if(this.focusBuilding&&this.focusRoute?.length){
    const b=this.focusBuilding,px=(b.x-b.y)*TILE_W/2,py=(b.x+b.y)*TILE_H/2-(SIZE-1)*TILE_H/2;
    c.drawImage(this.labelSprite('✦ 주민 도움 중'),px-52,py-103);
  }
  const ageLimit=3000;
  this.flashes=this.flashes.filter(f=>this.animationTime-f.born<ageLimit);
  for(const f of this.flashes){
    const age=Math.max(0,this.animationTime-f.born);
    const px=(f.x-f.y)*TILE_W/2,py=(f.x+f.y)*TILE_H/2-(SIZE-1)*TILE_H/2;
    c.save();c.globalAlpha=Math.min(1,(ageLimit-age)/550);
    c.drawImage(this.labelSprite(f.text),px-52,py-91-age*.010);
    c.restore();
  }
  if(this.hover&&inBounds(this.hover.x,this.hover.y)){
    const {x,y}=this.hover;const px=(x-y)*TILE_W/2,py=(x+y)*TILE_H/2-(SIZE-1)*TILE_H/2;
    const preview=this.tool==='inspect'?null:evaluatePlacement(this.game,this.tool,x,y);
    const fill=!preview?'rgba(246,248,224,.20)':!preview.ok?'rgba(228,114,94,.40)':preview.linked?'rgba(91,181,136,.40)':'rgba(247,190,94,.40)';
    const stroke=!preview?'#fff9d7':!preview.ok?'#d96860':preview.linked?'#d1f9e2':'#ffebbb';
    c.save();c.globalAlpha=.92;diamond(c,px,py,35,17,fill,stroke);c.restore();
  }
  c.restore();this.t=time;
 }
}
