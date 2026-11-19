import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const context=vm.createContext({window:{}});
for(const name of ['places-data','ready-routes'])vm.runInContext(readFileSync(new URL('../public/'+name+'.js',import.meta.url),'utf8'),context);
const {CityRouteReady:ready,CityRoutePlaces:places}=context.window;
test('Each ready walk resolves to distinct real catalogue points in its published order',()=>{
 for(const route of ready.routes){const plan=ready.resolve(route.id,places.items);assert.ok(plan);assert.ok(plan.points.length>=3);assert.equal(new Set(plan.points.map(p=>p.id)).size,plan.points.length);assert.equal(JSON.stringify(plan.points.map(p=>p.name)),JSON.stringify(route.names));assert.ok(plan.points.some(p=>p.name===route.cover));assert.equal(route.englishNames.length,route.names.length);for(const p of plan.points){assert.ok(Number.isFinite(p.lat)&&Number.isFinite(p.lng));assert.ok(!p.generated);}}
});
test('Incomplete catalogue or unknown route never produces a partial walk',()=>{
 assert.equal(ready.resolve('missing',places.items),null);assert.equal(ready.resolve(ready.routes[0].id,[]),null);
});

test('Curated walks cover multiple durations and every food claim refers to the catalogue',()=>{
 assert.ok(ready.routes.length>=12);
 let overFour=0,underTwo=0,withFood=0;
 for(const route of ready.routes){
  const plan=ready.resolve(route.id,places.items);
  assert.ok(plan,route.id);
  assert.equal(route.englishNames.length,route.names.length);
  assert.ok(route.names.length>=3);
  const info=ready.estimate(plan);
  assert.ok(Number.isFinite(info.approxKm)&&info.approxKm>0);
  assert.ok(info.minutes>=40);
  if(info.minutes>=240)overFour++;
  if(info.minutes<120)underTwo++;
  if(info.food.length)withFood++;
  assert.ok(route.foodBudget[0]>0&&route.foodBudget[1]>route.foodBudget[0]);
  assert.ok(plan.points.some(p=>p.name===route.cover));
 }
 assert.ok(overFour>=1,'at least one walk lasting 4+ hours');
 assert.ok(underTwo>=1,'at least one walk under 2 hours');
 assert.ok(withFood>=5,'at least five routes with catalogue food stops');
});

test('Duration filters cover short walks through four hours, with exact boundaries',()=>{
 const expected=[[40,'quick'],[60,'quick'],[65,'short'],[120,'medium'],[180,'extended'],[240,'extended'],[245,'long']];
 for(const [minutes,filter] of expected){
  assert.ok(ready.matchesDuration(minutes,filter));
  for(const other of ['quick','short','medium','extended','long'].filter(f=>f!==filter))assert.equal(ready.matchesDuration(minutes,other),false);
 }
 for(const filter of ['quick','short','medium','extended','long'])assert.ok(ready.routes.some(r=>ready.matchesDuration(ready.estimate(ready.resolve(r.id,places.items)).minutes,filter)),filter);
 const shortest=Math.min(...ready.routes.map(r=>ready.estimate(ready.resolve(r.id,places.items)).minutes));assert.equal(shortest,40);
});
