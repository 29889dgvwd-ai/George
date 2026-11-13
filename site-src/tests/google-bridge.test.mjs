import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const code=readFileSync('public/google-bridge.js','utf8');
function setup(fail=false){
 const items=[],events={};const element={hidden:true},classes=new Set();
 class Map{constructor(el,opts){this.center=opts.center;this.zoom=opts.zoom;}addListener(n,cb){events[n]=cb;}getCenter(){return {lat:()=>this.center.lat,lng:()=>this.center.lng};}getZoom(){return this.zoom;}setCenter(p){this.center=p;}setZoom(z){this.zoom=z;}}
 class Marker{constructor(options){this.options=options;this.events={};items.push(this);}addListener(n,f){this.events[n]=f;}setMap(m){this.options.map=m;}}
 const context={URLSearchParams,setTimeout,clearTimeout,document:{documentElement:{lang:'ru'},getElementById:()=>element,body:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},createElement:()=>({}),head:{append:()=>queueMicrotask(()=>fail?context.gm_authFailure():context.cityRouteGoogleReady())}},google:{maps:{Map,Marker,Polyline:Marker,event:{trigger(){}}}}};
 context.window=context;vm.createContext(context);vm.runInContext(code,context);return {context,items,events,element,classes};
}
test('map selection, dragging, endpoint removal and overlay replacement',async()=>{
 const s=setup();let selected,dragged,view;
 const b=await s.context.initGoogleMap({key:'test',onClick:p=>selected=p,onDrag:(i,p)=>dragged=[i,p],onView:(p,z)=>view=[p,z]});
 assert.equal(s.element.hidden,false);
 s.events.click({latLng:{lat:()=>55,lng:()=>37}});assert.equal(selected.join(','),'55,37');
 b.point(0,{lat:55,lng:37},'A');const first=s.items.at(-1);
 first.events.dragend({latLng:{lat:()=>56,lng:()=>38}});assert.equal(dragged[1].join(','),'56,38');
 b.point(0,null);assert.equal(first.options.map,null);
 b.route([[55,37],[56,38]]);const line=s.items.at(-1);b.route([]);assert.equal(line.options.map,null);
 b.stops([{name:'Park',routePoint:[55,37]}]);const stop=s.items.at(-1);b.stops([]);assert.equal(stop.options.map,null);
 b.view({lat:57,lng:39},12);s.events.idle();assert.equal(view[0].lat,57);assert.equal(view[1],12);
 b.places([{lat:55,lng:37,name:'P'}],p=>selected=p.name);s.items.at(-1).events.click();assert.equal(selected,'P');
 b.clear();
});
test('invalid key restores fallback visibility',async()=>{
 const s=setup(true);let failures=0;
 await assert.rejects(s.context.initGoogleMap({key:'invalid',onFailure:()=>failures++}));
 assert.equal(s.element.hidden,true);assert.equal(s.classes.has('google-active'),false);assert.equal(failures,1);
});
test('late Google authorization failure restores fallback',async()=>{
 const s=setup();let failures=0;await s.context.initGoogleMap({key:'test',onFailure:()=>failures++});
 s.context.gm_authFailure();assert.equal(s.element.hidden,true);assert.equal(failures,1);
});
test('HTML scripts and navigation integration stay consistent',()=>{
 const html=readFileSync('pages/home.html','utf8');
 for(const [,path] of html.matchAll(/<script[^>]+src="\/([^"]+)"/g))assert.ok(readFileSync('public/'+path).length);
 assert.ok(html.includes('id="googleMap"'));
 for(const file of ['app.js','itinerary.js']){const src=readFileSync('public/'+file,'utf8');assert.ok(!src.includes('yandex.ru'));assert.ok(src.includes("api:'1'"));assert.ok(src.includes("travelmode:"));}
 assert.equal(JSON.parse(readFileSync('firebase.json')).hosting.public,'dist');
});
