import test from 'node:test';
import assert from 'node:assert/strict';
await import('../public/distance-planner.js');
const P=globalThis.CityRouteDistance;
const a={lat:55.735,lng:37.580};
const b=P.dest(a,2,80);
test('12 km requested between two points 2 km apart adds a real U-shaped excursion',()=>{
 const p=P.plan({start:a,end:b,targetKm:12});
 assert.equal(p.points.length,4);
 assert(P.km(a,b)>1.95&&P.km(a,b)<2.05);
 assert(P.pathKm(p.points)>8.5, 'Cannot collapse to the shortest 2 km line');
 assert(P.pathKm(p.points)<11.5);
 assert(P.km(p.points[0],p.points.at(-1))<2.05);
});
test('3 km request makes a shorter detour than the 12 km request',()=>{
 const p3=P.plan({start:a,end:b,targetKm:3});
 const p12=P.plan({start:a,end:b,targetKm:12});
 assert(P.pathKm(p3.points)>=2);
 assert(P.pathKm(p12.points)-P.pathKm(p3.points)>6);
});
test('12 km loop returns to start with four distinct walking segments',()=>{
 const plan=P.plan({start:a,end:a,targetKm:12,loop:true});
 assert.equal(plan.points.length,5);
 assert(P.km(plan.points[0],plan.points.at(-1))<.001);
 assert(P.pathKm(plan.points)>9);
 assert(P.km(plan.points[1],plan.points[2])>2);
});
test('independent pedestrian calculation calibrates excursion within 10 percent',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async(_,opts)=>{
  const points=JSON.parse(opts.body).locations.map(p=>({lat:p.lat,lng:p.lon}));
  return {ok:true,json:async()=>({trip:{summary:{length:P.pathKm(points)*1.27,time:P.pathKm(points)*1.27/4.5*3600}}})};
 };
 try{
  const p=await P.matchLength({start:a,end:b,targetKm:12});
  assert(Number.isFinite(p.measuredKm));
  assert(Math.abs(p.measuredKm-12)<=1.2, 'Actual walking estimate should be near the requested length');
 }finally{globalThis.fetch=previous}
});
test('routing service failure still returns useful detour without lying about verified distance',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('Service unavailable')};
 try{
  const p=await P.matchLength({start:a,end:b,targetKm:12});
  assert.equal(p.measuredKm,null);
  assert(p.points.length>=4);
  assert(P.pathKm(p.points)>8.5);
 }finally{globalThis.fetch=previous}
});
test('impossibly short route target is explicitly marked',()=>{
 const far=P.dest(a,8,60);
 const p=P.plan({start:a,end:far,targetKm:3});
 assert.equal(p.tooShort,true);
 assert.equal(p.points.length,2);
});
