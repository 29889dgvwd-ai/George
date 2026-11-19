import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const c=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('../public/places-data.js',import.meta.url),'utf8'),c);
const {items,lookup,selectStops,matches}=c.window.CityRoutePlaces;
const start=lookup('Красная площадь'),end=lookup('Парк Горького');
const targets=[lookup('Кафе «Пушкинъ»'),lookup('ГМИИ имени Пушкина'),lookup('Парк «Зарядье»')];
const run=opts=>selectStops(items,targets,{start,end,maxDistance:5,...opts});
test('Museum selection changes real route stops; no food included when removed',()=>{
 const route=run({style:'culture',interests:['museum'],skipFood:true});assert.ok(route.length);assert.ok(route.every(p=>p.category==='museum'));
 const parks=run({style:'parks',skipFood:true});assert.ok(parks.length);assert.ok(parks.every(p=>p.type==='parks'));assert.notDeepEqual(route.map(p=>p.id),parks.map(p=>p.id));
});
test('Desserts selects one bakery and retains scenic stops',()=>{
 const route=run({style:'food',interests:['dessert']});const food=route.filter(p=>p.type==='food');assert.equal(food.length,1);assert.equal(food[0].category,'bakery');assert.ok(route.some(p=>p.type!=='food'));assert.ok(route.every(p=>!p.generated));
});
test('Endpoints, removed places and duplicates never become automatic stops',()=>{
 const route=selectStops(items,[start,start,end],{start,end,excluded:[lookup('Кафе «Пушкинъ»').id],maxDistance:5});assert.ok(route.every(p=>p.id!==start.id&&p.id!==end.id&&p.name!=='Кафе «Пушкинъ»'));assert.equal(new Set(route.map(p=>p.id)).size,route.length);assert.ok(route.filter(p=>p.type==='food').length<=1);
});
test('Rain and mall avoidance are enforced alongside interests',()=>{
 assert.equal(matches(lookup('Парк Горького'),{interests:['parks'],rain:true}),false);
 assert.equal(matches(lookup('ГУМ'),{interests:['shopping'],avoidMalls:true}),false);
 assert.equal(matches(lookup('ГМИИ имени Пушкина'),{interests:['museum'],rain:true}),true);
});
test('Yandex map and navigation both use the selected transport mode',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const fn=app.slice(app.indexOf('function updateYandex(){'),app.indexOf('// Yandex iframe:'));
 let mode='transit';const elements={yandexNav:{},yandexWidget:{src:'https://yandex.ru/map-widget/v1/'},mapProvider:{}};
 const context=vm.createContext({URL,URLSearchParams,Number,Array,Boolean,setTimeout:f=>{f();return 1},clearTimeout:()=>{},document:{querySelector:s=>s.includes('transport')?{value:mode}:null},$:id=>elements[id],tr:ru=>ru,english:()=>false,city:{value:'Москва'},start:{value:'Старт'},end:{value:'Финиш'},points:[null,null],currentRoutePath:[],currentRoutePlaces:[],yandexFallbackStops:[{lat:55.75,lng:37.61},{lat:55.76,lng:37.62}]});
 vm.runInContext(fn+';updateYandex();',context);
 assert.equal(new URL(elements.yandexNav.href).searchParams.get('rtt'),'mt');assert.equal(new URL(elements.yandexWidget.src).searchParams.get('rtt'),'mt');
 mode='walk';vm.runInContext('updateYandex()',context);assert.equal(new URL(elements.yandexNav.href).searchParams.get('rtt'),'pd');
});
