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
