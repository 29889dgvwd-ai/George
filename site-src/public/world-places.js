/* Location and place lookup shared by nearby places, the planner and city collections. */
(()=>{
'use strict';
const places=window.CityRoutePlaces;
const {norm,haversine:km}=places;
const seeds=window.CityRouteGuide?.regions||[];
const moscow={name:'Москва',aliases:['москва','moscow'],lat:55.7558,lng:37.6173,items:places.items};
const regions=[moscow,...seeds];
const region=name=>regions.find(r=>r.aliases.includes(norm(name)))||null;
const regionAt=p=>p&&regions.find(r=>km(r,p)<(r===moscow?31:9))||null;
const nearbyCache=new Map(),geocodes=new Map();
const https=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:''}catch{return ''}};
function remember(cache,key,value){
 if(cache.size>=60)cache.delete(cache.keys().next().value);
 cache.set(key,value);return value;
}
async function json(url,signal,ms=5200){
 const timeout=AbortSignal.timeout(ms);
 const response=await fetch(url,{signal:signal?AbortSignal.any([signal,timeout]):timeout});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
function point(text){
 const m=/^\s*([-+]?\d{1,2}(?:\.\d+)?)\s*,\s*([-+]?\d{1,3}(?:\.\d+)?)\s*$/.exec(text);
 return m&&Math.abs(+m[1])<=90&&Math.abs(+m[2])<=180?{lat:+m[1],lng:+m[2],label:text}:null;
}
function featurePoint(f){
 const [lng,lat]=f?.geometry?.coordinates||[];
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
 const t=f.properties||{},kind=({N:'node',W:'way',R:'relation'})[t.osm_type];
 return {lat,lng,name:t.name||t.street||'',city:t.city||t.district||'',
  ...(kind&&t.osm_id?{id:kind+'/'+t.osm_id}:{}),tags:t.osm_key?{[t.osm_key]:t.osm_value}:{}};
}
async function cityCenter(name,signal){
 if(!name.trim())return null;
 const seed=region(name);if(seed)return {lat:seed.lat,lng:seed.lng,name:seed.name};
 const key='city|'+norm(name);if(geocodes.has(key))return geocodes.get(key);
 try{
  const data=await json('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name,count:'5',language:document.documentElement.lang||'ru'}),signal);
  const row=(data.results||[]).find(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude));
  if(row)return remember(geocodes,key,{lat:row.latitude,lng:row.longitude,name:row.name});
 }catch(e){if(signal?.aborted)throw e}
 const data=await json('https://photon.komoot.io/api/?'+new URLSearchParams({q:name,layer:'city',limit:'3'}),signal);
 const p=data.features?.map(featurePoint).find(Boolean);
 return p?remember(geocodes,key,p):null;
}
function localPlace(text,r){
 if(!r||!text)return null;
 if(r===moscow)return places.lookup(text);
 const q=norm(text);
 return r.items.find(p=>[p.name,p.en,p.address,...(p.aliases||[])].some(v=>v&&norm(v)===q))||null;
}
async function locate(text,city,signal,knownCenter){
 text=text.trim();if(!text)return cityCenter(city,signal);
 const literal=point(text);if(literal)return literal;
 const local=localPlace(text,region(city));if(local)return local;
 const key=norm(city)+'|'+norm(text);if(geocodes.has(key))return geocodes.get(key);
 const center=knownCenter||await cityCenter(city,signal).catch(e=>{if(signal?.aborted)throw e;return null});
 if(center&&(norm(city)===norm(text)||norm(center.name)===norm(text)))return center;
 const q=[text,city].filter(Boolean).join(', '),params=new URLSearchParams({q,limit:'5'});
 if(center){params.set('lat',center.lat);params.set('lon',center.lng)}
 let p;
 try{
  const data=await json('https://photon.komoot.io/api/?'+params,signal,4000);
  p=data.features?.map(featurePoint).find(v=>v&&(!center||km(center,v)<65)&&
    !(norm(v.name)===norm(center?.name)&&norm(text)!==norm(center?.name)));
 }catch(e){if(signal?.aborted)throw e}
 if(!p){
  const params=new URLSearchParams({q,format:'jsonv2',limit:'4',extratags:'1'});
  if(center){const dx=Math.min(10,.6/Math.max(.1,Math.cos(center.lat*Math.PI/180)));params.set('viewbox',[center.lng-dx,center.lat+.6,center.lng+dx,center.lat-.6].join(','));params.set('bounded','1')}
  const rows=await json('https://nominatim.openstreetmap.org/search?'+params,signal,4300);
  const row=rows.find(r=>Number.isFinite(parseFloat(r.lat))&&Number.isFinite(parseFloat(r.lon))&&(!center||km(center,{lat:+r.lat,lng:+r.lon})<65)&&!(norm(r.name)===norm(center?.name)&&norm(text)!==norm(center?.name)));
  if(row)p={lat:+row.lat,lng:+row.lon,name:row.name||text,id:row.osm_type+'/'+row.osm_id,tags:row.extratags||{}};
 }
 return p?remember(geocodes,key,{...p,label:text}):null;
}
function category(t){
 if(t.shop==='bakery'||t.shop==='confectionery')return ['food','bakery'];
 if(['cafe','restaurant','ice_cream','fast_food'].includes(t.amenity))return ['food',t.amenity==='restaurant'||t.amenity==='fast_food'?'restaurant':'cafe'];
 if(t.shop==='mall')return ['malls','malls'];
 if(t.shop==='books')return ['books','books'];
 if(['park','garden','playground'].includes(t.leisure))return ['parks','parks'];
 if(t.tourism==='viewpoint')return ['water','viewpoint'];
 if(t.tourism==='museum'||t.tourism==='gallery')return ['culture','museum'];
 if(t.tourism==='artwork')return ['art','art'];
 if(['theatre','cinema','library'].includes(t.amenity))return ['culture',t.amenity];
 return ['sights','sights'];
}
function mapPlace(e,lang){
 const t=e.tags||{},p=e.center||e,name=t['name:'+lang]||t.name;
 if(!name||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return null;
 const [type,kind]=category(t),id=e.type+'/'+e.id;
 const bill=t.average_check||t.average_bill||t['price:average_meal'];
 const label=bill&&(/\p{Sc}|\b(?:USD|EUR|RUB|GBP|JPY|CNY|CHF|CAD|AUD|PLN|CZK|TRY|INR)\b/iu.test(bill)?bill:/^[A-Z]{3}$/.test(t.currency||'')?bill+' '+t.currency:null);
 return {id,name,en:t['name:en'],lat:p.lat,lng:p.lon,type,category:kind,tags:t,
  address:[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' '),
  ...(label&&type==='food'?{check:{label,source:'https://www.openstreetmap.org/'+id}}:{})};
}
async function mapped(center,radius,lang,signal){
 const around='(around:'+radius+','+center.lat.toFixed(5)+','+center.lng.toFixed(5)+')';
 const filters=['leisure~"^(park|garden|playground)$"','tourism~"^(viewpoint|attraction|museum|gallery|artwork)$"','historic~"^(monument|castle|memorial|archaeological_site)$"','amenity~"^(theatre|cinema|library)$"','amenity~"^(cafe|restaurant|ice_cream)$"','shop~"^(mall|bakery|confectionery|books)$"'];
 const query='[out:json][timeout:8];'+filters.map(f=>'nwr'+around+'['+f+'][name][access!~"^(private|no)$"];out center 85;').join('');
 const url='https://overpass-api.de/api/interpreter?'+new URLSearchParams({data:query});
 const data=await json(url,signal,6500);
 if(!Array.isArray(data.elements)||data.remark&&!data.elements.length)throw Error('Place search unavailable');
 return data.elements.map(e=>mapPlace(e,lang)).filter(Boolean);
}
async function nearbyVenues(center,radius,lang,signal){
 const params=new URLSearchParams({lat:center.lat,lon:center.lng,radius:radius/1000,limit:'35'});
 // The public Photon service supports category filters on reverse searches.
 if(lang==='en')params.set('lang','en');
 for(const tag of ['amenity:cafe','amenity:restaurant','shop:bakery','leisure:park','tourism:museum','tourism:attraction','tourism:viewpoint'])params.append('osm_tag',tag);
 const data=await json('https://photon.komoot.io/reverse?'+params,signal,4400);
 return (data.features||[]).flatMap(f=>{
  const t=f.properties||{},p=featurePoint(f);if(!p?.name||!p.id||!t.osm_key)return [];
  const [type,categoryName]=category(p.tags);
  return [{...p,type,category:categoryName,address:[t.street,t.housenumber].filter(Boolean).join(' ')}];
 });
}
async function articles(center,radius,lang,signal,uiLang=lang){
 const params=new URLSearchParams({action:'query',format:'json',origin:'*',generator:'geosearch',ggscoord:center.lat+'|'+center.lng,ggsradius:radius,ggslimit:'45',prop:'coordinates|pageimages|pageprops|pageterms',wbptterms:'description',ppprop:'wikibase_item',piprop:'thumbnail|name',pithumbsize:'640'});
 if(uiLang!==lang){params.set('prop',params.get('prop')+'|langlinks');params.set('lllang',uiLang);params.set('lllimit','max')}
 const data=await json('https://'+lang+'.wikipedia.org/w/api.php?'+params,signal);
 if(data.error)throw Error('Place search unavailable');
 return Object.values(data.query?.pages||{}).flatMap(p=>{
  const c=p.coordinates?.[0],description=p.terms?.description?.[0]||'';
  const subject=p.title+' '+description;
  if(!Number.isFinite(c?.lat)||!Number.isFinite(c?.lon)||/\b(?:former civil parish|neighbou?rh?ood|election|attack|battle|massacre|bombing|demolished|destroyed|municipality|district of|parish in)\b|выборы|теракт|сражение|фрегезия|провинция/iu.test(subject))return [];
  if(!/museum|park|garden|palace|square|bridge|cathedral|heritage monument|castle|fountain|market|church|tower|theat|monument|gallery|library|memorial|temple|waterfront|promenade|plaza|aquarium|botanic|elevator|lift|synagogue|mosque|basilica|архитектур|музей|парк|площадь|мост|собор|дворец|памятник|мечеть|церковь/iu.test(subject))return [];
  const kind=/museum|музей/i.test(description)?['culture','museum']:/park|garden|парк|сад\b/i.test(description)?['parks','parks']:/theat|театр/i.test(description)?['culture','theatre']:['sights','sights'];
  const wiki=lang+':'+p.title,photo=https(p.thumbnail?.source);
  return [{id:'wiki:'+wiki,name:p.langlinks?.[0]?.['*']||p.title,en:lang==='en'?p.title:null,lat:c.lat,lng:c.lon,type:kind[0],category:kind[1],
   tags:{wikipedia:wiki,wikidata:p.pageprops?.wikibase_item},...(photo?{photos:[{url:photo,source:p.pageimage?'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(p.pageimage):'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(p.title),credit:'Wikipedia'}]}:{})}];
 });
}
function mergePlaces(groups){
 const result=[],byId=new Map(),byName=new Map(),byWiki=new Map();
 for(const p of groups.flat()){
  const name=norm(p.name),wiki=p.tags?.wikidata||p.tags?.wikipedia;
  const previous=byId.get(p.id)||(wiki&&byWiki.get(wiki))||(byName.get(name)||[]).find(v=>km(v,p)<.18);
  if(previous){
   previous.tags={...p.tags,...previous.tags};
   for(const k of ['photos','check','rating','address','en'])if(!previous[k]&&p[k])previous[k]=p[k];
  }else{
   const item={...p};result.push(item);byId.set(p.id,item);if(wiki)byWiki.set(wiki,item);
   if(!byName.has(name))byName.set(name,[]);byName.get(name).push(item);
  }
 }
 return result;
}
async function nearby(center,radius,signal){
 radius=Math.max(650,Math.min(8500,Math.round(radius/250)*250));
 const lang=document.documentElement.lang==='en'?'en':'ru';
 const key=[center.lat.toFixed(3),center.lng.toFixed(3),radius,lang].join('/');
 const saved=nearbyCache.get(key);if(saved&&Date.now()-saved.time<1800000)return saved.items;
 const local=(regionAt(center)?.items||[]).filter(p=>km(center,p)<=radius/1000);
 const fetchMap=async()=>{
  try{const found=await mapped(center,radius,lang,signal);if(found.length)return found}catch(e){if(signal?.aborted)throw e}
  return nearbyVenues(center,radius,lang,signal);
 };
 const [osm,wiki]=await Promise.allSettled([fetchMap(),articles(center,radius,'en',signal,lang)]);
 if(signal?.aborted)throw signal.reason;
 let pages=wiki.value||[];
 if(!pages.length&&lang!=='en'&&!(osm.value?.length||local.length))pages=await articles(center,radius,lang,signal).catch(()=>[]);
 const items=mergePlaces([local,osm.value||[],pages]).filter(p=>km(center,p)<=radius/1000+.1).sort((a,b)=>km(center,a)-km(center,b));
 if(!items.length&&osm.status==='rejected'&&wiki.status==='rejected')throw Error('Place search unavailable');
 if(items.length&&(osm.status==='fulfilled'||wiki.status==='fulfilled'))remember(nearbyCache,key,{time:Date.now(),items});
 return items;
}
function identify(p,pool){
 if(!p||typeof p!=='object')return p;
 const names=[p.name,p.label].filter(Boolean).map(norm);
 const match=pool.find(v=>v.id&&v.id===p.id)||pool.find(v=>km(p,v)<.18&&[v.name,v.en,v.address].some(n=>n&&names.includes(norm(n))));
 return match?{...p,...match,lat:p.lat,lng:p.lng}:p;
}
window.CityRouteWorld={region,regionAt,moscow,localPlace,cityCenter,locate,nearby,mergePlaces,identify,point};
})();
