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

function worldRuntime(fetch){
 const ctx=vm.createContext({window:{},document:{documentElement:{lang:'ru'}},URL,URLSearchParams,AbortSignal,fetch});
 for(const filename of ['places-data','place-guide','world-places'])vm.runInContext(readFileSync(new URL('../public/'+filename+'.js',import.meta.url),'utf8'),ctx);
 return ctx.window.CityRouteWorld;
}
test('Unlisted city returns geographically scoped venues with photos and original currencies',async()=>{
 const center={lat:-33.92,lng:18.42},urls=[];
 const world=worldRuntime(async value=>{
  const u=new URL(value);urls.push(u);
  const json=u.hostname.includes('open-meteo')?{results:[{name:'Cape Town',latitude:center.lat,longitude:center.lng}]}:
   u.hostname.startsWith('overpass')?{elements:[{type:'node',id:91,lat:-33.921,lon:18.419,tags:{name:'Example Cafe',amenity:'cafe',average_bill:'150',currency:'ZAR',opening_hours:'09:00-16:00'}},{type:'node',id:29,lat:55.75,lon:37.62,tags:{name:'Distant Cafe',amenity:'cafe'}}]}:
   {query:{pages:{7:{title:'Example Museum',pageid:7,coordinates:[{lat:-33.923,lon:18.425}],thumbnail:{source:'https://upload.wikimedia.org/example.jpg'},pageimage:'Example.jpg'},8:{title:'Former civil parish',coordinates:[{lat:-33.922,lon:18.422}]}}}};
  return {ok:true,json:async()=>json};
 });
 const anchor=await world.cityCenter('Cape Town');assert.equal(anchor.lat,center.lat);
 const result=await world.nearby(anchor,3000);
 assert.deepEqual(Array.from(result,p=>p.name).sort(),['Example Cafe','Example Museum']);
 const cafe=result.find(p=>p.type==='food');assert.equal(cafe.check.label,'150 ZAR');assert.equal(cafe.check.source,'https://www.openstreetmap.org/node/91');
 assert.ok(result.find(p=>p.name==='Example Museum').photos[0].url.endsWith('example.jpg'));
 assert.equal(urls.filter(u=>u.hostname.includes('overpass')).length,1);
 assert.equal((await world.nearby(anchor,3000)).length,2);assert.equal(urls.length,3);
});
test('Seed lookup and meal prices are isolated by city and survive provider outages',async()=>{
 const world=worldRuntime(async()=>{throw Error('offline')});
 const palace=await world.locate('Дворцовая площадь','Санкт-Петербург');assert.ok(palace.lat>59.9);
 const cafe=await world.locate('Север','Санкт-Петербург');assert.equal(cafe.check.label,'500–900 ₽');
 const paris=await world.nearby(await world.locate('Лувр','Париж'),3000);
 assert.ok(paris.some(p=>p.check?.label.includes('€')));assert.ok(paris.every(p=>p.lat<49&&p.lng<3));
 assert.equal(world.localPlace('Дворцовая площадь',world.region('Казань')),null);
});
