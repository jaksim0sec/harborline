import { SIZE, inBounds, isLand, terrain, connections, evaluatePlacement, routeToBuilding, workplaceForOrder } from './model.js';

const TILE_W=72, TILE_H=36, SPR_W=144, SPR_H=148;
/** Fixed sprites extracted into true RGBA PNG files, from one coordinated art study. */
export const PAINTED_TEXTURES=Object.freeze({
 home:'/assets/textures/home.png',
 bakery:'/assets/textures/bakery.png',
 tree:'/assets/textures/tree.png'
});
/** Rendering-only size; the actor's world position and collision do not change. */
export const ACTOR_SCALES=Object.freeze({neighbor:.68,neighbor2:.68,cat:.75});
/** Keep the actor's shoes planted on the original 2.5D tile contact plane. */
export function spriteDestination(x,y,scale=1){
 return {x:Math.round(x-72*scale),y:Math.round(y-100*scale),width:SPR_W*scale,height:SPR_H*scale};
}

const names=['water','grass','grass2','meadow','clover','sand','road','farm','sawmill','bakery','home','garden','harbor','tree','bush','boat','neighbor','neighbor2','cat','lighthouse','dockpost','flowerpatch','rock','squareFountain',...Array.from({length:16},(_,i)=>`road-${i}`)];
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
/** +x, -x, -y, +y form four road directions in the fixed isometric grid. */
export function roadMask(roadKeys,x,y){
 return (roadKeys.has(`${x-1},${y}`)?1:0)
      | (roadKeys.has(`${x+1},${y}`)?2:0)
      | (roadKeys.has(`${x},${y-1}`)?4:0)
      | (roadKeys.has(`${x},${y+1}`)?8:0);
}
export function isVillagePlaza(roadKeys,x,y){
 const m=roadMask(roadKeys,x,y);
 return (m.toString(2).match(/1/g)||[]).length>=3;
}
/** Visual-only village heart: pick one reachable junction, never reserve a build tile. */
export function selectVillageSquare(game){
 const harbor=game.buildings.find(b=>b.type==='harbor');
 if(!harbor)return null;
 const keys=new Set(game.roads.map(r=>`${r.x},${r.y}`));
 const reachable=connections(game).roads;
 let best=null,score=Infinity;
 for(const {x,y} of game.roads){
   if(!reachable.has(`${x},${y}`)||!isVillagePlaza(keys,x,y))continue;
   const dist=Math.abs(harbor.x-x)+Math.abs(harbor.y-y);
   const rank=dist*SIZE*SIZE+x*SIZE+y;
   if(rank<score){score=rank;best={x,y};}
 }
 return best;
}
/** Visit the connected fountain without creating any new saved game state. */
export function routeToVillageSquare(game, square=selectVillageSquare(game)) {
 if(!square)return null;
 const harbor=game.buildings.find(b=>b.type==='harbor');
 if(!harbor)return null;
 const key=(x,y)=>`${x},${y}`, goal=key(square.x,square.y);
 const roads=new Set(game.roads.map(r=>key(r.x,r.y)));
 if(!roads.has(goal))return null;
 const start=key(harbor.x,harbor.y), from=new Map([[start,null]]);
 const queue=[{x:harbor.x,y:harbor.y}];
 for(let i=0;i<queue.length;i++){
   const {x,y}=queue[i],current=key(x,y);
   if(current===goal){
     const path=[];
     for(let step=goal;step!==null;step=from.get(step)){
       const [a,b]=step.split(',').map(Number);path.push({x:a,y:b});
     }
     return path.reverse();
   }
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const next=key(x+dx,y+dy);
     if(!roads.has(next)||from.has(next))continue;
     from.set(next,current);queue.push({x:x+dx,y:y+dy});
   }
 }
 return null;
}
/** A short promenade with a real pause at the fountain, then the trip home. */
export function plazaVisitSample(time,path,stepMs=1200,restMs=3600){
 if(!path?.length)return null;
 if(path.length===1)return {...path[0],resting:true};
 const step=Math.max(1,Number(stepMs)||1200), rest=Math.max(0,Number(restMs)||0);
 const walk=(path.length-1)*step,period=walk*2+rest;
 const t=((time%period)+period)%period;
 if(t>=walk&&t<walk+rest)return {...path.at(-1),resting:true};
 const distance=t<walk?t/step:(period-t)/step;
 const i=Math.min(path.length-2,Math.floor(distance)),f=distance-i;
 return {x:path[i].x+(path[i+1].x-path[i].x)*f,y:path[i].y+(path[i+1].y-path[i].y)*f,resting:false};
}
/** The same orthogonal neighbours have different projected screen edges. */
export function coastEdgeMask(game,x,y){
 if(!inBounds(x,y)||terrain(x,y,game)!=='sand')return 0;
 const sea=(a,b)=>inBounds(a,b)&&terrain(a,b,game)==='water';
 return (sea(x-1,y)?1:0)|(sea(x,y-1)?2:0)|(sea(x+1,y)?4:0)|(sea(x,y+1)?8:0);
}
/** Only nearby tall props in front of a moving actor may cover it. */
export function shouldOcclude(actor,object){
 const reach={tree:86,home:82,bakery:82,sawmill:82,harbor:82,lighthouse:100,squareFountain:42};
 const maxHeight=reach[object.type];if(!maxHeight)return false;
 const dy=((object.x+object.y)-(actor.x+actor.y))*TILE_H/2;
 const dx=Math.abs(((object.x-object.y)-(actor.x-actor.y))*TILE_W/2);
 return dy>1&&dy<maxHeight&&dx<(object.type==='tree'?43:51);
}
/** Stable tile-local vectors. A 13px front cliff sits entirely seaward of the existing top plane. */
export function coastReliefFaces(mask){
 const edges=[
  {bit:1,a:[0,-18],b:[-36,0],front:false},
  {bit:2,a:[0,-18],b:[36,0],front:false},
  {bit:4,a:[36,0],b:[0,18],front:true},
  {bit:8,a:[0,18],b:[-36,0],front:true}
 ];
 return edges.filter(e=>mask&e.bit).map(e=>({...e,bottom:e.front?13:0}));
}
/** Painted once per terrain change. Bright grass on the ridge, pale limestone below. */
function shoreRelief(c,px,py,mask){
 for(const face of coastReliefFaces(mask)){
  const [[ax,ay],[bx,by]]=[face.a,face.b];
  if(!face.front){
    line(c,[[px+ax,py+ay+1],[px+bx,py+by+1]],'rgba(89,151,112,.30)',2.3);
    continue;
  }
  const side=face.bit===4;
  const main=side?'#a7ad97':'#c0bda1';
  const shade=side?'#829d91':'#9ba995';
  // Seaward face is a bevel, not a higher tile; feet and click targets remain untouched.
  poly(c,[[px+ax,py+ay],[px+bx,py+by],[px+bx,py+by+13],[px+ax,py+ay+13]],main,shade,.8);
  line(c,[[px+ax,py+ay+5],[px+bx,py+by+5]],side?'rgba(241,223,174,.56)':'rgba(250,231,195,.65)',1.35);
  line(c,[[px+ax,py+ay+9],[px+bx,py+by+9]],'rgba(111,147,122,.30)',1.7);
  // Short seams and sparse lichen break up continuous slab-like bands.
  for(const t of [.24,.71]){
   const x=px+ax+(bx-ax)*t,y=py+ay+(by-ay)*t;
   line(c,[[x,y+5],[x-1.2,y+10]],'rgba(119,116,91,.32)',.85);
   ellipse(c,x+3,y+7,2.8,1.1,'rgba(101,160,113,.42)');
  }
  line(c,[[px+ax,py+ay],[px+bx,py+by]],'#e3d7b5',2.2);
  // Sea foam is below the stone toe and never crosses the buildable tile.
  line(c,[[px+ax+2,py+ay+15],[px+bx-2,py+by+15]],'rgba(233,247,229,.51)',1.9);
 }
}
/** Decorative shoreline strokes are painted into the static map only. */
function shoreline(c,px,py,mask){
 const edges=[
  [1,[0,-18],[-36,0]],[2,[0,-18],[36,0]],
  [4,[36,0],[0,18]],[8,[0,18],[-36,0]]
 ];
 for(const [bit,a,b] of edges){
  if(!(mask&bit))continue;
  line(c,[[px+a[0],py+a[1]],[px+b[0],py+b[1]]],'rgba(255,248,223,.60)',1.9);
  const midx=(a[0]+b[0])*.5,midy=(a[1]+b[1])*.5;
  line(c,[[px+midx*.68,py+midy*.68],[px+midx*.84+3,py+midy*.84]],'rgba(247,230,195,.37)',1.0);
 }
}
function ground(c,name){
 const isSea=name==='water',sand=name==='sand';
 const palette={grass:'#91c98c',grass2:'#9fd297',meadow:'#98ce91',clover:'#87c58a'};
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
 ellipse(c,x+6,y+h+2,w+11,12,'rgba(34,69,57,.23)');
 ellipse(c,x+19,y+h+10,w+8,5,'rgba(44,85,66,.09)');
 // Stone platform plus beveled limestone sides read as a base, not a floating carpet.
 poly(c,[[x-w,y],[x,y+h],[x,y+h+lip],[x-w,y+lip]],'#cfc2a6','#b7a685',.8);
 poly(c,[[x,y+h],[x+w,y],[x+w,y+lip],[x,y+h+lip]],'#a9ae9b','#90978a',.8);
 diamond(c,x,y,w,h,'#ebdfc5','#c1b398');
 for(const t of [.32,.67]){
   line(c,[[x-w+w*t,y+h*t],[x-w+w*t,y+h*t+lip]],'rgba(151,127,103,.5)',.85);
   line(c,[[x+w*t,y+h*(1-t)],[x+w*t,y+h*(1-t)+lip]],'rgba(125,127,107,.48)',.85);
 }
}
function roofTiles(c,roofTop){
 // All marks are clipped into the same two isometric roof faces.
 const faces=[
   {poly:[[41,58],[72,roofTop],[72,73],[41,62]],tone:'rgba(255,240,209,.25)'},
   {poly:[[72,roofTop],[104,57],[104,62],[72,73]],tone:'rgba(83,75,66,.13)'}
 ];
 for(const f of faces){
   c.save();c.beginPath();c.moveTo(...f.poly[0]);for(const pt of f.poly.slice(1))c.lineTo(...pt);c.closePath();c.clip();
   for(let i=0;i<4;i++){
     const x=44+i*17;
     line(c,[[x,25],[x-1,82]],f.tone,.85);
   }
   for(let i=0;i<4;i++){
     const y=41+i*9;
     line(c,[[38,y],[108,y+5]],f.tone,1.1);
   }
   c.restore();
 }
 // Deep carved eaves and one continuous illuminated ridge.
 line(c,[[41,61],[72,76],[104,61]],'rgba(67,76,69,.34)',5);
 line(c,[[41,58],[72,73],[104,58]],'rgba(253,237,213,.62)',1.9);
 line(c,[[72,roofTop],[41,58]],'rgba(248,231,209,.55)',1.3);
 line(c,[[72,roofTop],[104,57]],'rgba(70,83,79,.28)',1.1);
}
function walls(c,opt={}){
 const {left='#ead3aa',right='#f9e3bb',roofLeft='#83acac',roofRight='#689b9a',roofTop=31,base=true,chimney=false}=opt;
 if(base)foundation(c);else shadow(c,28);
 // Shaded gable faces use the exact same world-light direction as the trees.
 poly(c,[[46,59],[72,73],[72,103],[46,88]],left,'#a6937e',.7);
 poly(c,[[72,73],[99,59],[99,87],[72,103]],right,'#a6937e',.7);
 poly(c,[[47,87],[72,100],[98,86],[98,90],[72,105],[47,91]],'rgba(112,103,81,.16)');
 line(c,[[47,63],[47,87],[70,100]],'rgba(132,102,74,.69)',2.8);
 line(c,[[97,63],[97,86],[75,99]],'rgba(108,90,72,.67)',2.8);
 line(c,[[71.7,74],[71.7,101]],'rgba(107,90,75,.34)',2.7);
 // Painted corner braces make the walls read as crafted timber-frame construction.
 line(c,[[49,74],[68,86]],'rgba(149,115,83,.29)',1.3);
 line(c,[[77,86],[95,76]],'rgba(121,98,79,.24)',1.3);
 if(chimney){
   poly(c,[[82,roofTop+15],[88,roofTop+17],[88,roofTop+2],[82,roofTop]],'#b9816b','#986a5c',.7);
   poly(c,[[88,roofTop+17],[92,roofTop+14],[92,roofTop-1],[88,roofTop+2]],'#936f60','#795a50',.7);
   line(c,[[81,roofTop],[88,roofTop+2],[93,roofTop-2]],'#dcb39c',1.5);
 }
 poly(c,[[41,58],[72,roofTop],[72,73],[41,62]],roofLeft,'#547779',.8);
 poly(c,[[72,roofTop],[104,57],[104,62],[72,73]],roofRight,'#547779',.8);
 roofTiles(c,roofTop);
}
function sign(c,text,x,y,fill='#f8eee0',ink='#8d675c',r=10){ellipse(c,x,y,r,r,fill);c.font='bold 10px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.fillText(text,x,y+1);}
export const CHARACTER_SPECS=Object.freeze({
  neighbor:Object.freeze({headWidth:24.4,headHeight:23,bodyWidth:16,bodyHeight:12,feetY:103}),
  neighbor2:Object.freeze({headWidth:24.4,headHeight:23,bodyWidth:16,bodyHeight:12,feetY:103}),
  cat:Object.freeze({headWidth:21.4,headHeight:20,bodyWidth:14,bodyHeight:11,feetY:103})
});
/** The paved paths live entirely on the same ground plane as every 2:1 tile. */
function roadPaving(c,mask){
 const ends=[[1,[54,90]],[2,[90,108]],[4,[90,90]],[8,[54,108]]];
 const count=(mask.toString(2).match(/1/g)||[]).length;
 c.save();
 c.beginPath();c.moveTo(72,81);c.lineTo(108,99);c.lineTo(72,117);c.lineTo(36,99);c.closePath();c.clip();
 // Slight grassy verge and continuous limestone bands: neighboring masks join at one edge.
 for(const [bit,end] of ends){
   if(!(mask&bit))continue;
   line(c,[[72,99],end],'#bbab8b',18);
   line(c,[[72,99],end],'#ede0c6',14);
   line(c,[[72,99],end],'#f6ead5',7);
 }
 if(count>=3){
   diamond(c,72,99,27,12,'#ddcbaa','#aa9475');
   diamond(c,72,99,21,9,'#f1e2c8','#d3b997');
   // A small inlaid compass flower rather than another gameplay building.
   ellipse(c,72,99,8.5,4.3,'#c6d1b6');
   ellipse(c,72,99,5.5,2.9,'#e6dfc2');
   for(const [dx,dy] of [[-5,0],[5,0],[0,-2],[0,2]])ellipse(c,72+dx,99+dy,2.3,1.3,'#adbd98');
   ellipse(c,72,99,1.6,1,'#e6b37f');
 }else{
   diamond(c,72,99,13,6,'#e9dbc1','#c9b391');
   ellipse(c,69,98,2,1,'rgba(252,249,230,.86)');
 }
 // Tiny stone seams add human scale without a repeated unbroken checkerboard.
 for(const [bit,[ex,ey]] of ends){
   if(!(mask&bit))continue;
   const px=72+(ex-72)*.68,py=99+(ey-99)*.68;
   line(c,[[px-2,py-1],[px+2,py+1]],'#d0bda0',.8);
 }
 c.restore();
}
function paint(c,name){
 c.save();
 if(['water','grass','grass2','meadow','clover','sand'].includes(name)){ground(c,name);}
 if(name==='road'||name.startsWith('road-')){
   const mask=name==='road'?0:Number(name.slice(5));
   roadPaving(c,mask);
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
   walls(c,{left:'#b99d7e',right:'#d6b995',roofLeft:'#b59770',roofRight:'#937756',roofTop:35,chimney:true});
   for(let i=0;i<3;i++)line(c,[[49,69+i*6],[70,80+i*6]],'#967e62',1.8);
   // Cross-braces and a framed high loft window.
   line(c,[[51,76],[69,94]],'#6f624f',1.6);
   line(c,[[69,84],[51,87]],'#b8a184',1.1);
   poly(c,[[80,65],[89,61],[89,68],[80,72]],'#96b4a7','#efe0bd',1);
   line(c,[[84,63],[84,70]],'#f1d7a7',1.2);
   poly(c,[[80,75],[94,68],[94,81],[80,88]],'#8e674d','#705741',1);
   for(let i=0;i<3;i++){
     ellipse(c,98-i*8,101-i*3,5,4,'#d2a675');ellipse(c,98-i*8,101-i*3,2,2,'#97704c');
   }
   line(c,[[71,34],[71,29],[87,34]],'#d8dfc9',1.5);
 }
 if(name==='bakery'){
   walls(c,{left:'#efc7aa',right:'#f9ddbb',roofLeft:'#cf8c76',roofRight:'#aa695b',roofTop:33,chimney:true});
   poly(c,[[73,79],[98,67],[98,80],[73,93]],'#ffefdf','#ac6c61');
   for(let i=0;i<4;i++)poly(c,[[74+i*6,79-i*3],[77+i*6,78-i*3],[77+i*6,91-i*3],[74+i*6,92-i*3]],i%2?'#f9e4cb':'#eaa79d');
   // Storefront has a legible glass entrance and a hand-painted awning.
   poly(c,[[77,78],[96,69],[96,82],[77,91]],'rgba(137,185,172,.55)','#f5ead7',1.2);
   line(c,[[79,87],[94,78]],'#fff4da',1.1);
   sign(c,'빵',52,73,'#fff4df','#a66a54',9);
   ellipse(c,82,90,3,5,'#ab7456');
   line(c,[[42,58],[72,33],[104,57]],'#fff0e7',1.6);
 }
 if(name==='home'){
   walls(c,{left:'#e1cfb4',right:'#f5e9d3',roofLeft:'#d09a7f',roofRight:'#b17b69',roofTop:28,chimney:true});
   poly(c,[[79,78],[89,73],[89,89],[79,94]],'#8c7d73','#647970',.7);
   ellipse(c,86,83,1,1,'#f7e4bd');
   poly(c,[[49,69],[59,74],[59,82],[49,77]],'#c1d9d4','#e9f1e4',1.3);
   // Shutters, warm panes and flower boxes: tiny distinct shapes at mobile scale.
   line(c,[[49,68],[59,73]],'#fff6db',1.5);
   line(c,[[48,79],[60,84]],'#9b7e66',1.8);
   poly(c,[[50,80],[59,85],[59,88],[50,83]],'#c78d76','#a76e62',.7);
   ellipse(c,53,81,2.3,1.8,'#efc0b0');ellipse(c,58,82,2,1.7,'#f0d59f');
   poly(c,[[80,82],[88,78],[88,87],[80,91]],'#a3c9b8','#e6e7cd',1);
   line(c,[[84,81],[84,88]],'#f8f1d4',1.5);
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
   walls(c,{left:'#e2bd97',right:'#f2d8b8',roofLeft:'#a8b9a2',roofRight:'#829b8b',roofTop:32,base:false});
   sign(c,'港',53,74,'#fff4db','#77644f',9);
   line(c,[[107,99],[107,52]],'#87705d',2.2);
   poly(c,[[108,53],[124,59],[108,65]],'#dba27e');
   ellipse(c,107,51,3,3,'#f4e6c5');
 }
 if(name==='squareFountain'){
   // A single road-junction landmark. All faces use the shared 2:1 ground plane.
   ellipse(c,72,109,27,7,'rgba(45,88,74,.21)');
   poly(c,[[45,100],[72,114],[72,119],[45,105]],'#d9c8a5','#b5a487',.9);
   poly(c,[[72,114],[99,100],[99,105],[72,119]],'#aeb9ac','#8b9d90',.9);
   diamond(c,72,100,27,14,'#f1e4c8','#d4c3a5');
   for(const [x,y] of [[48,99],[95,101]]){
     ellipse(c,x,y+3,5,2.8,'rgba(71,105,74,.22)');
     ellipse(c,x,y,5.3,3.5,'#9aaf8a');
     ellipse(c,x-2,y-2,3.4,2.4,'#f6d6bc');
     ellipse(c,x+2,y-2,3.2,2.4,'#f7ead3');
     ellipse(c,x,y-2,.9,.9,'#e5ab6a');
   }
   // The basin's warm limestone back lip is visible above the cool water.
   ellipse(c,72,93,21,9,'#c9bfa8');
   poly(c,[[51,93],[72,103],[93,93],[93,101],[72,110],[51,101]],'#b4b6a4','#979c92',.9);
   ellipse(c,72,91,20,8,'#eee0c4');
   ellipse(c,72,90,15.5,5.9,'#7bb4b5');
   ellipse(c,72,89,12.5,4.3,'#9ad4d1');
   // One short water spout and two falling threads, not a simulated fountain system.
   poly(c,[[69,88],[69,73],[72,70],[75,73],[75,88],[72,90]],'#e7d6b7','#b8b7a0',.8);
   ellipse(c,72,71,5.4,2.6,'#f1e6ce');
   ellipse(c,72,69,3,1.8,'#c58d77');
   ellipse(c,72,67,1.3,2,'#f4e7cf');
   line(c,[[67,74],[62,80],[62,86]],'rgba(204,241,235,.92)',1.7);
   line(c,[[77,74],[82,79],[82,85]],'rgba(210,243,235,.82)',1.7);
   ellipse(c,62,87,2.5,1.2,'#d0efdf');ellipse(c,82,86,2.4,1.1,'#d0efdf');
   // Delicate petals distinguish the landmark from a generic stone well.
   ellipse(c,72,68,2.2,1.4,'#f4b5a1');ellipse(c,70.5,69,1.4,1.3,'#fff3d5');
 }
 if(name==='tree'){
   shadow(c,20);
   // A two-face trunk keeps the same top-left light direction as the houses.
   poly(c,[[67,100],[73,101],[73,69],[67,69]],'#ad865d','#98744e',.5);
   poly(c,[[73,101],[78,98],[78,67],[73,69]],'#8e704d','#816547',.5);
   line(c,[[72,79],[64,72]],'#947657',2.3);
   line(c,[[68,95],[68,82]],'rgba(247,224,169,.43)',1.8);
   ellipse(c,73,83,17,6,'rgba(43,104,72,.27)');
   ellipse(c,60,74,15,16,'#549b71');ellipse(c,81,69,18,21,'#559b70');
   ellipse(c,70,57,22,22,'#74b883');ellipse(c,56,66,14,15,'#74b884');
   ellipse(c,84,54,13,14,'#67ad7b');ellipse(c,68,47,13,14,'#91c990');
   // Canopy tiers, with luminous leaf rims and small overlapping clusters.
   ellipse(c,54,60,10,7,'rgba(177,218,150,.27)');
   ellipse(c,81,46,10,7,'rgba(178,220,149,.24)');
   ellipse(c,61,78,11,5,'rgba(39,112,76,.18)');
   ellipse(c,88,74,12,5,'rgba(43,105,71,.20)');
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
/** Load images once. Preserve procedural atlas cells as a fallback if an asset fails. */
export function loadPaintedTextures(atlas){
 if(typeof Image==='undefined')return Promise.resolve([]);
 const tasks=Object.entries(PAINTED_TEXTURES).map(([name,url])=>new Promise(resolve=>{
   const image=new Image();
   image.onload=()=>resolve({name,image});
   image.onerror=()=>resolve(null);
   image.src=url;
 }));
 return Promise.all(tasks).then(results=>{
 const successful=results.filter(Boolean);
 if(!successful.length)return [];
 const c=atlas.canvas.getContext('2d');
 for(const {name,image} of successful){
   const cell=atlas.cells.get(name);if(!cell)continue;
   c.clearRect(cell.sx,cell.sy,SPR_W,SPR_H);
   c.drawImage(image,cell.sx,cell.sy,SPR_W,SPR_H);
 }
 return successful.map(v=>v.name);
 });
}
const hash=(x,y)=>Math.abs(((x+5)*73856093)^((y+8)*19349663))%100;
/** Visual foliage follows inhabited street edges but never changes buildable terrain. */
export function sceneryAt(game,x,y,used){
 if(!isLand(x,y,game)||used.has(`${x},${y}`))return null;
 const h=hash(x,y),edge=x<5||x>18||y<5||y>19;
 const nearVillage=game.buildings.some(b=>['home','bakery','garden','harbor'].includes(b.type)&&Math.abs(b.x-x)+Math.abs(b.y-y)<=3);
 const roadFront=game.roads.some(r=>Math.abs(r.x-x)+Math.abs(r.y-y)<=2);
 if(nearVillage&&roadFront){
   if(h<31)return 'flowerpatch';
   if(h<44)return 'bush';
 }
 if(edge&&h<19)return 'tree';
 if(h<6)return 'bush';
 if(h>=89&&h<94)return 'flowerpatch';
 if(edge&&h===38)return 'rock';
 return null;
}

export class Scene {
 constructor(canvas,game){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.atlas=atlas();
  this.cache=null;this.cacheDirty=true;this.previews=new Map();this.animationTime=0;this.walkPaths=[];this.flashes=[];this.voyage=null;this.plazaMessageSince=null;this.squareRoute=null;this.squareTile=null;this.labelCache=new Map();this.game=game;this.pan={x:0,y:0};this.zoom=1;
  this.hover=null;this.tool='inspect';this.quality=1;this.width=1;this.height=1;this.t=0;this.fps=0;this.samples=[];
  this.CW=SIZE*TILE_W+240;this.CH=SIZE*TILE_H+270;this.OX=this.CW/2;this.OY=130;
  this.resize();
  this.artReady=loadPaintedTextures(this.atlas).then(loaded=>{
    if(loaded.length){
      this.previews.clear();
      this.invalidate();
      this.canvas.dispatchEvent(new Event('harborline:art-ready'));
    }
    return loaded;
  });
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
   this.plazaMessageSince=this.animationTime;
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
 sprite(ctx,name,x,y,scale=1){const s=this.atlas.cells.get(name);if(!s)return;const d=spriteDestination(x,y,scale);ctx.drawImage(this.atlas.canvas,s.sx,s.sy,SPR_W,SPR_H,d.x,d.y,d.width,d.height);}
 tileCenter(x,y){return {x:this.OX+(x-y)*TILE_W/2,y:this.OY+(x+y)*TILE_H/2};}
 buildCache(){
  const cache=makeCanvas(this.CW,this.CH),c=cache.getContext('2d');
  c.imageSmoothingEnabled=true;
  for(let depth=0;depth<(SIZE-1)*2+1;depth++)for(let x=0;x<SIZE;x++){
   const y=depth-x;if(!inBounds(x,y))continue;
   const p=this.tileCenter(x,y);
   this.sprite(c,groundTexture(x,y,terrain(x,y,this.game)),p.x,p.y);
  }
  // Relief overlays render after the entire terrain: the next water tile must not erase cliffs.
  for(let depth=0;depth<(SIZE-1)*2+1;depth++)for(let x=0;x<SIZE;x++){
   const y=depth-x;if(!inBounds(x,y))continue;
   const mask=coastEdgeMask(this.game,x,y);if(!mask)continue;
   const p=this.tileCenter(x,y);
   shoreRelief(c,p.x,p.y,mask);
   shoreline(c,p.x,p.y,mask);
  }
  const roadKeys=new Set(this.game.roads.map(r=>`${r.x},${r.y}`));
  for(const r of this.game.roads){const p=this.tileCenter(r.x,r.y);this.sprite(c,`road-${roadMask(roadKeys,r.x,r.y)}`,p.x,p.y);}
  const used=new Set([...this.game.roads,...this.game.buildings].map(b=>`${b.x},${b.y}`));
  const props=[];
  for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++){
    if(!isLand(x,y,this.game)||used.has(`${x},${y}`))continue;
    const type=sceneryAt(this.game,x,y,used);
    if(type)props.push({x,y,type});
  }
  const square=selectVillageSquare(this.game);
  this.squareTile=square;
  this.squareRoute=routeToVillageSquare(this.game,square);
  if(square)props.push({...square,type:'squareFountain'});
  if(!used.has('5,18'))props.push({x:5,y:18,type:'lighthouse'});
  // 방파제의 작은 말뚝은 물 위 장식으로만 놓인다.
  if(!used.has('7,21'))props.push({x:7,y:21,type:'dockpost'});
  const all=[...props,...this.game.buildings];all.sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x);
  this.occluders=all.filter(o=>['tree','home','sawmill','bakery','harbor','lighthouse','squareFountain'].includes(o.type));
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
  if(!this.game.coastExpanded && this.game.completed>=1){
    const p=this.tileCenter(6,21);
    c.drawImage(this.labelSprite('🌱 바람꽃 해안'),p.x-52,p.y-53);
  }
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
    const working=type==='neighbor'&&this.focusRoute?.length;
    const visiting=type==='neighbor2'&&this.squareRoute?.length>=2;
    if(!working&&!visiting&&!this.walkPaths.length)continue;
    const path=working?this.focusRoute:visiting?this.squareRoute:this.walkPaths[index%this.walkPaths.length];
    const v=visiting?plazaVisitSample(this.animationTime,path):walkSample(this.animationTime+offset,path,speed);
    if(!v)continue;
    const px=(v.x-v.y)*TILE_W/2,py=(v.x+v.y)*TILE_H/2-(SIZE-1)*TILE_H/2;
    this.sprite(c,type,px,py+Math.sin((this.animationTime+offset)*.01)*.6,ACTOR_SCALES[type]||1);
    // Restore only nearby foreground silhouettes, keeping the island itself cached.
    for(const prop of this.occluders||[]){
      if(!shouldOcclude(v,prop))continue;
      const o=this.tileCenter(prop.x,prop.y);
      this.sprite(c,prop.type,o.x-this.OX,o.y-this.OY-(SIZE-1)*TILE_H/2);
    }
  }
  // An existing successful delivery is acknowledged by the village, not a new reward rule.
  if(this.squareTile&&this.plazaMessageSince!==null){
    const age=this.animationTime-this.plazaMessageSince;
    if(age>=0&&age<4200){
      const sq=this.squareTile,px=(sq.x-sq.y)*TILE_W/2,py=(sq.x+sq.y)*TILE_H/2-(SIZE-1)*TILE_H/2;
      c.save();c.globalAlpha=Math.min(1,age/350,(4200-age)/650);
      c.drawImage(this.labelSprite('배달 고마워요!'),px-52,py-128-age*.003);
      c.restore();
    }else if(age>=4200){this.plazaMessageSince=null;}
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
