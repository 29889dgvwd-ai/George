import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('Moscow station resolves its exact article; unnamed points do not share photo cache',async()=>{
 const requests=[],context={window:{},URL,URLSearchParams,AbortSignal,document:{body:{classList:{contains:()=>false}}},localStorage:{getItem:()=>null,setItem(){}},fetch:async url=>{requests.push(new URL(url).searchParams.get('titles'));return {ok:true,json:async()=>({query:{pages:{1:{thumbnail:{source:'https://upload.wikimedia.org/'+requests.length+'.jpg'}}}}})}}};
 vm.runInNewContext(source('place-photos.js'),context);
 const photos=context.window.CityRoutePhotos.photos;
 assert.equal((await photos({label:'маяковская',lat:55.769,lng:37.596})).length,1);
 assert.equal(requests[0],'Маяковская (станция метро, Москва)');
 assert.equal((await photos({label:'маяковская',lat:59.93,lng:30.35})).length,0);
 const a=await photos({lat:55.7,lng:37.6,tags:{wikipedia:'ru:Первое'}});
 const b=await photos({lat:55.8,lng:37.6,tags:{wikipedia:'ru:Второе'}});
 assert.notEqual(a[0],b[0]);assert.equal(requests.length,3);
 await photos({label:'маяковская',lat:55.769,lng:37.596});assert.equal(requests.length,3);
});
test('Saved walk search keeps deletion indices and translates its empty result',()=>{
 class Element{constructor(){this.children=[];this.value='';this.handlers={};}append(...nodes){this.children.push(...nodes)}replaceChildren(){this.children=[]}before(node){this.previous=node}addEventListener(event,fn){this.handlers[event]=fn}setAttribute(key,value){this[key]=value}}
 const list=new Element(),language=new Element();let english=false,stored;
 const records=[{v:3,start:'Арбат',waypoints:[],stops:[]},{v:3,start:'Маяковская',waypoints:[],stops:[{name:'Парк'}]}];
 vm.runInNewContext(source('static-walks.js'),{document:{getElementById:id=>id==='walksList'?list:language,createElement:()=>new Element(),body:{classList:{contains:()=>english}}},localStorage:{getItem:()=>JSON.stringify(records),setItem:(_,value)=>stored=JSON.parse(value)},confirm:()=>true,queueMicrotask:fn=>fn()});
 assert.equal(list.children.length,2);const search=list.previous;
 search.value='парк';search.handlers.input();assert.equal(list.children.length,1);
 list.children[0].children[1].children[1].onclick();assert.equal(stored.length,1);assert.equal(stored[0].start,'Арбат');
 english=true;language.handlers.click();assert.equal(search.placeholder,'Find a walk or place…');assert.equal(list.children[0].textContent,'No matches. Try another name.');
 search.value='';search.handlers.input();assert.equal(list.children.length,1);
});
test('English switch is visible and generated pages use the same fresh assets',()=>{
 assert.ok(!source('social.css').includes('#language{display:none}'));
 const versions=new Set();
 for(const page of ['index','walks','friends']){const html=readFileSync(new URL('../../docs/'+page+'.html',import.meta.url),'utf8');assert.ok(html.includes('id="language"'));for(const asset of ['app.css','static-shell.js']){const url=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).find(u=>u.startsWith(asset+'?v='));assert.ok(url);versions.add(url.split('?v=')[1]);}}
 assert.equal(versions.size,1);
});
