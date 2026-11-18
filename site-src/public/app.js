(()=>{
'use strict';
const $=id=>document.getElementById(id),start=$('startPoint'),end=$('endPoint'),city=$('city');
const form=$('routeForm'),buttons=[$('buildReal'),$('buildMap'),$('surprise'),$('nearbyPlaces'),$('findPlacesTop')],cache=new Map();
let currentRoutePath=[],currentRoutePlaces=[];let itinerary=null;let avoidance=null;let map,points=[null,null],routeLayer=null,generation=0,controller=null;
let yandexFallbackStops=null,lastLocated=null,locationPending=false;
const english=()=>document.body.classList.contains('english');
const tr=(ru,en)=>english()?en:ru;
function status(ru,en,error=false){for(const el of [$('formStatus'),$('routeStatus')]){el.textContent=tr(ru,en||ru);el.setAttribute('role',error?'alert':'status')}}
function busy(value){buttons.forEach(b=>{b.disabled=value;b.setAttribute('aria-busy',String(value))});$('buildReal').querySelector('.ru').textContent=value?'Строим маршрут…':'Построить маршрут';$('buildReal').querySelector('.en').textContent=value?'Building…':'Build route'}
function cancel(){generation++;controller?.abort();controller=null;busy(false)}
function resetRoute(){currentRoutePath=[];currentRoutePlaces=[];yandexFallbackStops=null;$('rerollRoute').hidden=true;updateYandex();itinerary?.clear();$('transportResult').replaceChildren();$('transportResult').hidden=true;if(routeLayer){map?.removeLayer(routeLayer);routeLayer=null}$('routeDetail').textContent=''}
function showWalkingMap(){document.body.classList.add('yandex-widget-active');$('mapProvider').textContent=tr('Яндекс Карты · пеший путь по выбранным остановкам','Yandex Maps · walking route via your selected stops');updateYandex();}
function updateYandex(){
 const coord=p=>Array.isArray(p)?p:([p?.lat,p?.lng]);
 const fmt=p=>{
  if(typeof p==='string'){
   const value=p.trim();if(!value)return '';
   if(/^[-+]?\d+\.\d+,\s*[-+]?\d+\.\d+$/.test(value))return value.replace(/\s+/g,'');
   return /москва|moscow/i.test(value)?value:(city.value.trim()||'Москва')+', '+value;
  }
  return coord(p).every(Number.isFinite)?coord(p).map(v=>Number(v).toFixed(6)).join(','):'';
 };
 const GPS=points[0]&&start.value===points[0].label?coord(points[0]):null;
 const endPoint=points[1]&&end.value===points[1].label?coord(points[1]):null;
 const stops=yandexFallbackStops?.length?yandexFallbackStops
  :currentRoutePath.length?[currentRoutePath[0],...currentRoutePlaces.map(p=>coord(p.routePoint||p)),currentRoutePath.at(-1)]
  :[GPS||start.value,...(end.value.trim()&&!end.disabled?[endPoint||end.value]:[])].filter(Boolean);
 const list=stops.map(fmt).filter(Boolean),hasCoords=list.length===1&&/^[-+]?\d+\.\d+,[-+]?\d+\.\d+$/.test(list[0]);
 const params=new URLSearchParams({lang:english()?'en_RU':'ru_RU'});
 if(list.length>1){params.set('rtext',list.join('~'));params.set('rtt','pd')}
 else if(hasCoords){const [lat,lng]=list[0].split(',');params.set('ll',lng+','+lat);params.set('z','17')}
 else if(list.length){params.set('text',list[0]);params.set('ll','37.6173,55.7558');params.set('z','13')}
 else{params.set('ll','37.6173,55.7558');params.set('z','14')}
 const link=new URL('https://yandex.ru/maps/');link.search=params.toString();
 $('yandexNav').href=link.href;
 const frame=new URL('https://yandex.ru/map-widget/v1/');frame.search=params.toString();
 clearTimeout(updateYandex.reload);
 // Avoid reloading the heavy iframe when only parameter order has changed.
 // While typing, wait until the input settles; built routes and GPS respond promptly.
 const precise=Boolean(currentRoutePath.length||yandexFallbackStops?.length||hasCoords);
 updateYandex.reload=setTimeout(()=>{
  const widget=$('yandexWidget');
  try{
   const existing=new URL(widget.src).searchParams;
   const target=frame.searchParams;
   if([...existing].length===[...target].length&&[...target].every(([k,v])=>existing.get(k)===v))return;
  }catch{}
  widget.src=frame.href;
 },precise?160:950);
}
// Yandex iframe: clicking/dragging a point is not exposed to this site without Yandex JS API key.
// Start and destination are edited through text inputs or the explicit geolocation button.
// Request location only after an explicit click; keep it out of storage.
$('returnStart').onclick=()=>{
 const destination=currentRoutePath.length?currentRoutePath[0]:points[0]?[points[0].lat,points[0].lng]:null;
 const note=$('returnStatus'),link=$('returnLink'),button=$('returnStart');
 link.hidden=true;
 if(!destination){note.textContent=tr('Сначала введи начало прогулки или построй маршрут.','Enter a starting point or build a route first.');return;}
 const show=(origin)=>{const url=new URL('https://yandex.ru/maps/');url.search=new URLSearchParams({rtext:(origin?origin.join(','):'')+'~'+destination.join(','),rtt:'pd'}).toString();link.href=url.href;link.hidden=false;button.disabled=false;button.removeAttribute('aria-busy');note.textContent=origin?tr('Готово. Открой маршрут: Яндекс покажет путь и время пешком.','Ready. Open the route for walking directions and time.'):tr('Геопозиция недоступна. Открой маршрут и укажи своё положение в Яндекс Картах.','Location is unavailable. Open the route and set your position in Yandex Maps.');};
 if(!navigator.geolocation){show(null);return;}
 button.disabled=true;button.setAttribute('aria-busy','true');note.textContent=tr('Определяем твоё положение…','Finding your location…');
 navigator.geolocation.getCurrentPosition(p=>show([p.coords.latitude,p.coords.longitude]),()=>show(null),{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
};
function scrollMap(){ $('mapSection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function mark(i,p,label,fill=true){
  points[i]={lat:p.lat,lng:p.lng,label};
  const input=i?end:start;
  if(fill)input.value=label;
  input.removeAttribute('aria-invalid');
  updateYandex();
}
$('theme').onclick=()=>document.body.classList.toggle('dark');
$('language').onclick=()=>{document.body.classList.toggle('english');document.documentElement.lang=english()?'en':'ru';$('language').textContent=english()?'RU':'EN';itinerary?.render();start.placeholder=tr('Адрес, парк или место','Address, park or place');end.placeholder=tr('Можно оставить пустым','Optional');updateYandex();status('Нужна только начальная точка.','Only a starting point is needed.')};
const pref=name=>Boolean(document.querySelector('[data-preference="'+name+'"]:checked'));
function syncPeople(){
 const count=$('company-alone').checked?'1':$('company-date').checked?'2':null;
 document.querySelectorAll('[name="people"]').forEach(input=>{input.disabled=Boolean(count&&input.value!==count);if(count)input.checked=input.value===count});
 $('peopleNote').textContent=count?tr('Число участников: '+count+'. Для другой компании можно выбрать количество.','Group size: '+count+'. Choose another company to change it.') : '';
}
document.querySelectorAll('[name="company"]').forEach(input=>input.addEventListener('change',()=>{syncPeople();cancel();resetRoute()}));syncPeople();
function syncRouteMode(){const loop=document.querySelector('[name="routeMode"]:checked').value==='loop';end.disabled=loop;end.placeholder=loop?tr('Вернёмся к началу','Return to start'):tr('Можно оставить пустым','Optional');cancel();resetRoute();status(loop?'Круговой маршрут вернёт тебя к началу.':'Маршрут закончится в другой точке.',loop?'This route returns to the start.':'This route ends at another point.')}
document.querySelectorAll('[name="routeMode"]').forEach(input=>input.addEventListener('change',syncRouteMode));
// Find Places button logic below opens the list and searches.
const amount=$('budgetAmount'),range=$('budgetRange');function budget(v){const n=Math.max(0,Math.min(50000,Math.round(Number(v)/500)*500));amount.value=Number.isFinite(n)?n:0;range.value=amount.value}range.oninput=()=>budget(range.value);amount.oninput=()=>{if(amount.value!=='')range.value=Math.max(0,Math.min(50000,Number(amount.value)))};amount.onchange=()=>{if(amount.value!=='')budget(amount.value);else range.value=0};
// Reject whole profane words without persistent messages or substring matches in addresses.
const forbidden=/(^|[^\p{L}])(хуй\p{L}*|пизд\p{L}*|бляд\p{L}*|сука|ебать|ебан\p{L}*|мудак)(?=$|[^\p{L}])/iu;
for(const f of [city,start,end,$('gptNotes')]){let clean=f.value;f.addEventListener('input',()=>{if(forbidden.test(f.value))f.value=clean;else clean=f.value})}
map={removeLayer(){}};
 // The visible Yandex map, place list and GPS no longer require Leaflet.
for(const [field,i] of [[start,0],[end,1]])field.addEventListener('input',()=>{cancel();points[i]=null;resetRoute();if(i===0){lastLocated=null;$('locationStatus').textContent='';$('locationOnMap').hidden=true}field.removeAttribute('aria-invalid');status('Укажи начальную точку и при желании финиш.','Enter your starting point and optionally a destination.')});
city.addEventListener('input',()=>{placesRequestId++;clearTimeout(placeSearchTimer);chosen=[];drawChosen();if(poiLayer)map.removeLayer(poiLayer);nearby=[];cancel();points=[null,null];lastLocated=null;resetRoute();cache.clear()});
$('fitRoute').onclick=()=>window.open($('yandexNav').href,'_blank','noopener,noreferrer');
$('expandMap').onclick=()=>{const expanded=$('mapSection').classList.toggle('expanded-map');$('expandMap').setAttribute('aria-pressed',String(expanded));$('expandMap').querySelector('.ru').textContent=expanded?'Свернуть':'Развернуть';$('expandMap').querySelector('.en').textContent=expanded?'Collapse':'Expand'};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('mapSection').classList.contains('expanded-map'))$('expandMap').click()});
for(const field of [$('distance'),$('routeStyle'),$('walkTime')])field.onchange=()=>{cancel();resetRoute()};
async function json(url,signal){const r=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});if(!r.ok)throw Error(r.status===429?tr('Сервис занят. Попробуй через минуту.','Service is busy. Try again in a minute.'):tr('Сервис маршрутов временно недоступен. Попробуй ещё раз.','Routing service is temporarily unavailable. Try again.'));return r.json()}
async function resolve(field,i,signal){const raw=field.value.trim();if(points[i]?.label===raw)return points[i];
 const literal=raw.match(/^\s*([-+]?\d{1,2}\.\d{3,})\s*,\s*([-+]?\d{1,3}\.\d{3,})\s*$/);
 if(literal){const lat=Number(literal[1]),lng=Number(literal[2]);if(Math.abs(lat)<=90&&Math.abs(lng)<=180)return {lat,lng,label:raw};}
 const known=window.CityRoutePlaces?.lookup(raw);if(known&&/^(москва|moscow)/i.test(city.value.trim()))return {lat:known.lat,lng:known.lng,label:raw};
 const key=(city.value.trim()||'Москва')+'|'+raw;if(cache.has(key))return cache.get(key);
 const q=raw+', '+(city.value.trim()||'Москва');const data=await json('https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&limit=1',signal);
 if(!data.features?.length){field.setAttribute('aria-invalid','true');throw Error(tr('Не найдено место: ','Place not found: ')+raw)}
 const c=data.features[0].geometry.coordinates;const p={lat:c[1],lng:c[0]};if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,p);return p;
}
function destination(a,km,bearing){const rad=Math.PI/180,ang=km/6371,b=bearing*rad,la=a.lat*rad,lo=a.lng*rad;
 const lat=Math.asin(Math.sin(la)*Math.cos(ang)+Math.cos(la)*Math.sin(ang)*Math.cos(b));
 const lng=lo+Math.atan2(Math.sin(b)*Math.sin(ang)*Math.cos(la),Math.cos(ang)-Math.sin(la)*Math.sin(lat));return{lat:lat/rad,lng:lng/rad};}
function decode(shape){let i=0,lat=0,lng=0,res=[];function number(){let b=0,n=0,shift=0;do{if(i>=shape.length||shift>30)throw Error('Invalid route geometry');b=shape.charCodeAt(i++)-63;n|=(b&31)<<shift;shift+=5}while(b>=32);return n&1?~(n>>1):n>>1}while(i<shape.length){lat+=number();lng+=number();res.push([lat/1e6,lng/1e6])}return res}
const categoryLabel={bakery:'Пекарня',cafe:'Кафе',restaurant:'Ресторан',museum:'Музей',malls:'ТЦ',parks:'Парк / сад',water:'Набережная / смотровая',sights:'Достопримечательность',culture:'Культура',books:'Книжный',art:'Искусство'};
const placeCache=new Map();
function cachedPlaces(key){const hit=placeCache.get(key);if(hit&&Date.now()-hit.time<1800000)return hit.places;try{const saved=JSON.parse(sessionStorage.getItem('cityroute-places-v2')||'null');if(saved?.key===key&&Date.now()-saved.time<1800000){placeCache.set(key,saved);return saved.places}}catch{}return null}
function savePlaces(key,places){const entry={key,places,time:Date.now()};if(placeCache.size>=8)placeCache.delete(placeCache.keys().next().value);placeCache.set(key,entry);try{sessionStorage.setItem('cityroute-places-v2',JSON.stringify(entry))}catch{}}
function beauty(p){const t=p.tags||{};let score=({water:1000,parks:900,sights:750,art:550,culture:350,food:80,books:70,malls:0})[p.type]||0;if(['playground','dog_park'].includes(t.leisure))score-=650;if(t.wikidata||t.wikipedia)score+=160;const mood=document.querySelector('[name="mood"]:checked')?.value;if((mood==='romantic'&&['water','parks'].includes(p.type))||(mood==='calm'&&p.type==='parks'))score+=300;return score}
let lastScenicId=null,poiLayer=null,nearby=[],chosen=[],placesRequestId=0,placeSearchTimer=0;
const meters=(a,b)=>{
 const point=p=>Array.isArray(p)?{lat:Number(p[0]),lng:Number(p[1])}:p;
 const km=window.CityRouteDistance?.km(point(a),point(b));
 return Number.isFinite(km)?km*1000:Infinity;
};
function pathOf(data){return data.trip.legs.flatMap(l=>decode(l.shape))}
function repeats(path){
 const edges=new Set();let repeated=0,total=0;
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=meters(a,b);total+=length;
 const ka=a.map(v=>v.toFixed(5)).join(','),kb=b.map(v=>v.toFixed(5)).join(',');if(ka===kb)continue;
 const key=[ka,kb].sort().join('|');if(edges.has(key))repeated+=length;edges.add(key)}
 return repeated>Math.max(50,total*.05);
}
async function scenicPlaces(a,b,distance,kind,signal){
 const center=b?{lat:(a.lat+b.lat)/2,lng:(a.lng+b.lng)/2}:a;
 const radius=Math.round(Math.min(9000,b?meters(a,b)/2+1200:distance*900));
 const key=[center.lat.toFixed(3),center.lng.toFixed(3),radius].join('|');
 let places=cachedPlaces(key);
 if(!places){
  const around=`(around:${radius},${center.lat},${center.lng})`;
  const query=`[out:json][timeout:12];(nwr${around}[leisure~"^(park|garden)$"][name][access!~"^(private|no)$"];nwr${around}[tourism~"^(viewpoint|attraction)$"][name][access!~"^(private|no)$"];nwr${around}[historic~"^(monument|castle|memorial)$"][name][access!~"^(private|no)$"];way${around}[highway~"^(footway|pedestrian|path)$"][name~"набереж|embankment|promenade",i][access!~"^(private|no)$"];nwr${around}[shop~"^(mall|bakery|books|confectionery)$"][name][access!~"^(private|no)$"];nwr${around}[amenity~"^(cafe|restaurant|ice_cream|theatre|cinema|library)$"][name][access!~"^(private|no)$"];nwr${around}[tourism~"^(museum|gallery|artwork|picnic_site)$"][name][access!~"^(private|no)$"];nwr${around}[leisure~"^(playground|dog_park|escape_game)$"][name][access!~"^(private|no)$"];);out center tags 2000;`;
  const local=new AbortController(),onAbort=()=>local.abort();signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)local.abort();
  const timer=setTimeout(()=>local.abort(),4700);
  try{let response;
   for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
    try{const result=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:AbortSignal.any([local.signal,AbortSignal.timeout(2600)])});if(!result.ok)throw Error('Place search unavailable');response=await result.json();if(response.remark)throw Error('Place search unavailable');break}catch(e){if(local.signal.aborted)throw e;response=null}
   }
   if(!response)throw Error('Place search unavailable');
   if(response.remark)throw Error('Place search unavailable');
   const seen=new Set();places=(response.elements||[]).flatMap(e=>{
    const loc=e.center||e,t=e.tags||{},name=t['name:ru']||t.name;
    if(!name||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lon)||seen.has(name+'|'+loc.lat.toFixed(4)+'|'+loc.lon.toFixed(4)))return[];seen.add(name+'|'+loc.lat.toFixed(4)+'|'+loc.lon.toFixed(4));
    const type=t.shop==='mall'?'malls':t.shop==='bakery'||t.shop==='confectionery'||['cafe','restaurant','ice_cream'].includes(t.amenity)?'food':['museum','gallery'].includes(t.tourism)||['theatre','cinema','library'].includes(t.amenity)?'culture':t.tourism==='artwork'?'art':t.shop==='books'?'books':t.leisure==='playground'||t.leisure==='dog_park'?'parks':/набереж|embankment|promenade/i.test(name)?'water':t.leisure==='park'||t.leisure==='garden'?'parks':t.tourism==='viewpoint'?'water':'sights';
    const category=t.shop==='bakery'||t.shop==='confectionery'?'bakery':t.amenity==='cafe'||t.amenity==='ice_cream'?'cafe':t.amenity==='restaurant'?'restaurant':t.tourism==='museum'?'museum':type;
    return[{lat:loc.lat,lng:loc.lon,name,type,category,tags:t,id:e.type+'/'+e.id}];});
   places.sort((p,q)=>meters(center,p)-meters(center,q));
   savePlaces(key,places);
  }finally{clearTimeout(timer);signal.removeEventListener('abort',onAbort)}
 }
 return places;
}
function wantedPlace(p,kind,relaxed=false){
 if(!relaxed&&pref('malls')&&p.type==='malls')return false;
 if(!relaxed&&avoidance&&RouteAvoidance.hits([[p.lat,p.lng]],avoidance.zones).length)return false;
 if(pref('rain')&&!['food','culture','malls','books'].includes(p.type))return false;
 if(kind!=='all'&&kind!=='direct'&&p.type!==kind&&p.category!==kind)return false;
 const selected=[['parks','parks'],['nature','parks'],['photo','water'],['architecture','sights'],['cafe','food'],['restaurant','food'],['dessert','food'],['museum','culture'],['theatre','culture'],['cinema','culture'],['viewpoint','water'],['water','water'],['shopping','malls'],['entertainment','culture'],['quest','culture'],['picnic','parks'],['pets','parks'],['kids','parks'],['art','art'],['books','books'],['history','sights']].filter(([name])=>pref(name)).map(([,type])=>type);
 return !selected.length||selected.includes(p.type);
}
function drawChosen(){
 const box=$('chosenStops');box.replaceChildren();for(const p of chosen){const button=document.createElement('button');button.type='button';button.textContent=p.name+' ×';button.onclick=()=>{chosen=chosen.filter(x=>x.id!==p.id);cancel();resetRoute();drawChosen();drawPlaces(nearby)};box.append(button)}
}
function choosePlace(p){
 if(chosen.some(x=>x.id===p.id))chosen=chosen.filter(x=>x.id!==p.id);
 else if(chosen.length<3)chosen.push(p);else{status('Можно выбрать до трёх остановок. Сначала убери одну.','Choose up to three stops. Remove one first.',true);return}
 cancel();resetRoute();drawChosen();drawPlaces(nearby);status('Остановки выбраны. Нажми «Построить маршрут».','Stops selected. Click Build route.');
}
function backupPlaces(){
 if(!/^(москва|moscow)/i.test(city.value.trim()))return [];
 const catalog=window.CityRoutePlaces;
 if(!catalog?.items)return [];
 const anchor=points[0]&&start.value===points[0].label?points[0]:catalog.lookup(start.value)||{lat:55.7558,lng:37.6173};
 return catalog.items.filter(p=>!pref('malls')||p.type!=='malls')
 .sort((a,b)=>catalog.haversine(anchor,a)-catalog.haversine(anchor,b));
}
function filterPlaceQuery(places){
 const q=window.CityRoutePlaces?.norm($('placeQuery')?.value||'')||String($('placeQuery')?.value||'').toLowerCase();
 return q?places.filter(p=>(window.CityRoutePlaces?.norm(p.name+' '+(p.address||''))||p.name.toLowerCase()).includes(q)):places;
}
let placeListObserver=null;
function renderPlacesList(places,limit=24){
 const list=$('placesList');list.replaceChildren();placeListObserver?.disconnect();
 const anchor=points[0]?.label===start.value?points[0]:window.CityRoutePlaces?.lookup(start.value);
 const norm=x=>Number.isFinite(x)?x.toFixed(1):null;
 const io=typeof IntersectionObserver==='function'?new IntersectionObserver((entries)=>{
  for(const entry of entries)if(entry.isIntersecting){entry.target.dispatchEvent(new Event('load-photo'));io.unobserve(entry.target)}
 },{root:list,rootMargin:'180px'}):null;
 placeListObserver=io;
 for(const p of places.slice(0,limit)){
  const row=document.createElement('div');row.className='place-list-card';
  const media=document.createElement('div');media.className='place-list-media';
  const placeholder=document.createElement('span');placeholder.textContent='📍';media.append(placeholder);
  const copy=document.createElement('div');copy.className='place-list-copy';
  const name=document.createElement('strong');name.textContent=p.name;copy.append(name);
  const detail=document.createElement('small');const km=anchor?norm(window.CityRoutePlaces?.haversine(anchor,p)):null;
  detail.textContent=(categoryLabel[p.category]||categoryLabel[p.type]||tr('Место','Place'))+(km?' · '+km+' '+tr('км от старта','km from start'):'');
  copy.append(detail);
  if(p.type==='food'){
    const avg=document.createElement('div');avg.className='place-list-price';
    avg.textContent=p.check?.label?tr('Средний чек: ','Average bill: ')+p.check.label:tr('Средний чек: нет данных','Average bill: unavailable');
    copy.append(avg);
    if(p.check?.source){const source=document.createElement('a');source.className='cityroute-price-source';source.href=p.check.source;source.target='_blank';source.rel='noopener noreferrer';source.textContent=tr('Источник чека ↗','Bill source ↗');copy.append(source)}
  }
  const actions=document.createElement('div');actions.className='place-list-actions';
  const button=document.createElement('button');button.type='button';
  const selected=chosen.some(x=>x.id===p.id);button.textContent=selected?tr('Убрать','Remove'):tr('+ Остановка','+ Stop');
  button.setAttribute('aria-pressed',String(selected));button.onclick=()=>choosePlace(p);
  const photos=document.createElement('a');photos.textContent=tr('Фото / отзывы ↗','Photos / reviews ↗');
  photos.href='https://yandex.ru/maps/?'+new URLSearchParams({ll:p.lng+','+p.lat,z:'17',text:p.name}).toString();
  photos.target='_blank';photos.rel='noopener noreferrer';actions.append(button,photos);
  copy.append(actions);row.append(media,copy);list.append(row);
  media.addEventListener('load-photo',async()=>{
   if(media.dataset.loaded)return;media.dataset.loaded='yes';
   try{
    const urls=await window.CityRoutePhotos?.photos?.(p);
    if(!urls?.length||!media.isConnected)return;
    const img=document.createElement('img');img.loading='lazy';img.alt=tr('Фотография: ','Photo: ')+p.name;
    img.referrerPolicy='no-referrer';img.onload=()=>placeholder.remove();
    img.onerror=()=>img.remove();img.src=urls[0];media.append(img);
   }catch{}
  },{once:true});
  if(io)io.observe(media);else if(places.indexOf(p)<6)media.dispatchEvent(new Event('load-photo'));
 }
 if(places.length>limit){
  const more=document.createElement('button');more.type='button';more.className='secondary place-list-more';
  more.textContent=tr('Показать ещё '+(places.length-limit)+' мест','Show '+(places.length-limit)+' more places');
  more.onclick=()=>renderPlacesList(places,places.length);list.append(more);
 }
}
$('placeFilter').onchange=()=>drawPlaces(nearby);
function drawPlaces(places){
 nearby=places;const visible=filterPlaceQuery(places).filter(p=>$('placeFilter').value==='all'||p.type===$('placeFilter').value||p.category===$('placeFilter').value);renderPlacesList(visible);if(poiLayer)map.removeLayer(poiLayer);poiLayer=null;
 const colors={parks:'#16866b',water:'#008bab',food:'#c57521',malls:'#8b48be',culture:'#b44c79',sights:'#4866bf',art:'#b44c79',books:'#916746'};
 for(const p of visible.slice(0,180)){
  const popup=document.createElement('div'),title=document.createElement('strong'),button=document.createElement('button');title.textContent=p.name;button.type='button';button.textContent=chosen.some(x=>x.id===p.id)?tr('Убрать остановку','Remove stop'):tr('Через это место','Visit this place');button.className='poi-choice';button.onclick=()=>choosePlace(p);popup.append(title,document.createElement('br'),button);
  const label=document.createElement('span');label.textContent=p.name;
  // This map has no editable POI layer. Places are selected from the accessible list below.
 }
 $('placesStatus').textContent=tr('Найдено '+visible.length+' мест. Добавь остановки кнопками в списке ниже (до 3).','Found '+visible.length+' places. Use Add stop in the list below (up to 3).');
 
}
$('findPlacesTop').onclick=()=>{
 $('nearbyDisclosure').open=true;
 $('nearbyPlaces').click();
 $('nearbyDisclosure').scrollIntoView({behavior:'smooth',block:'start'});
};
$('placeQuery').oninput=()=>{
 const query=$('placeQuery').value.trim();
 $('openYandexSearch').href='https://yandex.ru/maps/?'+new URLSearchParams({text:(city.value.trim()||'Москва')+' '+query}).toString();
 clearTimeout(placeSearchTimer);
 placeSearchTimer=setTimeout(()=>drawPlaces(nearby.length?nearby:backupPlaces()),150);
};
$('nearbyPlaces').onclick=async()=>{
 const requestId=++placesRequestId;
 // Always show local results first: search works offline and on paused free databases.
 $('nearbyDisclosure').open=true;
 const instant=backupPlaces();drawPlaces(instant);
 const isMoscow=/^(москва|moscow)/i.test(city.value.trim());
 if(!isMoscow){
  $('placesStatus').textContent=tr('База мест сейчас для Москвы. Поиск других городов открой в Яндекс Картах.','PostgreSQL places currently cover Moscow. Search other cities in Yandex Maps.');
  return;
 }
 $('placesStatus').textContent=tr('Места показаны сразу. Обновляем каталог из PostgreSQL…','Places displayed instantly. Refreshing from PostgreSQL…');
 const cloud=window.CityRouteCloud;
 if(!cloud?.listPlaces)return;
 try{
  const rows=await cloud.listPlaces();
  if(requestId!==placesRequestId||!/^(москва|moscow)/i.test(city.value.trim()))return;
  const existing=new Set(rows.map(p=>p.id));
  const combined=[...rows.map(p=>{const detail=window.CityRoutePlaces?.items.find(x=>x.id===p.id);return detail?{...p,check:detail.check||null,tags:{...(p.tags||{}),...(detail.tags||{})}}:p}),...instant.filter(p=>!existing.has(p.id))];
  if(combined.length){
   drawPlaces(combined);
   const source=cloud.catalogStatus?.();
   $('placesStatus').textContent=source==='stale'
    ?tr('Нет связи с базой: '+rows.length+' мест из сохранённого каталога.','Offline: '+rows.length+' cached places.')
    :source==='cache'
     ?tr('Кеш каталога: '+rows.length+' мест.','Cached catalogue: '+rows.length+' places.')
     :tr('PostgreSQL: '+rows.length+' мест. Выбирай остановки ниже.','PostgreSQL: '+rows.length+' places. Choose stops below.');
  }
 }catch(e){
  if(requestId!==placesRequestId)return;
  $('placesStatus').textContent=tr('Показаны '+instant.length+' мест из локального каталога. PostgreSQL временно недоступен.','Showing '+instant.length+' local places. PostgreSQL is temporarily unavailable.');
 }
};

function showTransport(data,places,loop){
 const box=$('transportResult');box.hidden=false;box.replaceChildren();
 const heading=document.createElement('h3');heading.textContent=tr('Пешком + общественный транспорт','Walking + public transport');box.append(heading);
 const note=document.createElement('p');note.className='field-note';note.textContent=tr('Синяя линия, километры и время выше — пеший вариант. Выбери участок: Яндекс Карты покажут доступный транспорт, пересадки и время поездки. Пожелания об обходе относятся только к пешему варианту CityRoute.','The blue line, distance and time above describe walking. Choose a leg to see available transit, transfers and travel time in Yandex Maps. Avoidance preferences apply only to CityRoute walking routes.');box.append(note);
 for(const [i,leg] of data.trip.legs.entries()){
  const path=decode(leg.shape);if(path.length<2)continue;
  const from=i===0?tr('Старт','Start'):places[i-1]?.name||tr('Остановка '+i,'Stop '+i);
  const to=places[i]?.name||(loop?tr('Старт','Start'):tr('Финиш','Finish'));
  const row=document.createElement('div');row.className='transport-leg';
  const title=document.createElement('span');title.textContent=from+' → '+to;
  const link=document.createElement('a');const url=new URL('https://yandex.ru/maps/');url.search=new URLSearchParams({rtext:path[0].join(',')+'~'+path.at(-1).join(','),rtt:'mt'}).toString();link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=tr('На транспорте','By public transport');link.setAttribute('aria-label',link.textContent+': '+from+' → '+to);row.append(title,link);box.append(row);
 }
}

// Fast Yandex-only route builder: the embedded map, not an unresponsive
// third-party routing server, determines the actual pedestrian path.
async function buildOnYandex(surprise=false,readyRoute=null){
 const source=start.value.trim();
 if(!source){
  status('Введи адрес начала или нажми «Моё положение».','Enter a starting address or select My location.',true);
  start.setAttribute('aria-invalid','true');start.focus();return true;
 }
 cancel();const buildId=generation;resetRoute();busy(true);
 const distanceEngine=window.CityRouteDistance,local=window.CityRoutePlaces;
 const moscow=/^(москва|moscow)/i.test(city.value.trim());
 const loop=document.querySelector('[name="routeMode"]:checked')?.value==='loop';
 const style=$('routeStyle').value;
 const unrestricted=$('distance').value==='auto';
 let requestedKm=unrestricted?5:Math.max(1,Math.min(35,Number($('distance').value)||5));
 if(pref('short')&&unrestricted)requestedKm=3;
 const picked=chosen.slice();
 let plannedStats=null,waypoints=[],extras=[];
 const signal=new AbortController();
 const timer=setTimeout(()=>signal.abort('timeout'),18000);
 try{
  // Local wishes processing must never block the walking route.
  try{await window.CityRouteAI?.apply?.()}catch{}
  if(buildId!==generation)return true;
  async function coordsFor(point,label){
   if(point&&typeof point==='object'&&distanceEngine.valid(point))return point;
   const text=String(label||point||'').trim();
   const literal=text.match(/^([-+]?\d{1,2}(?:\.\d+)?),\s*([-+]?\d{1,3}(?:\.\d+)?)$/);
   if(literal){const p={lat:+literal[1],lng:+literal[2],label:text};if(distanceEngine.valid(p))return p}
   if(moscow){
    const known=local?.lookup(text);if(known)return known;
   }
   if(!text)return null;
   try{
    const url='https://photon.komoot.io/api/?'+new URLSearchParams({q:text+', '+(city.value.trim()||'Москва'),limit:'1'});
    const r=await fetch(url,{signal:AbortSignal.any([signal.signal,AbortSignal.timeout(4500)])});
    if(!r.ok)return null;
    const data=await r.json(),c=data.features?.[0]?.geometry?.coordinates;
    if(!c)return null;
    const p={lat:Number(c[1]),lng:Number(c[0]),label:text};
    if(!distanceEngine.valid(p)||moscow&&!(p.lat>55.2&&p.lat<56.2&&p.lng>36.9&&p.lng<38.2))return null;
    return p;
   }catch{return null}
  }
  const knownStart=points[0]?.label===source?points[0]:moscow?local?.lookup(source)||source:source;
  const rawFinish=!loop&&end.value.trim()?(points[1]?.label===end.value?points[1]:moscow?local?.lookup(end.value)||end.value:end.value):null;
  status('Подбираем дорожки нужной длины…','Matching walking distance to your target…');
  const a=await coordsFor(knownStart,source);
  if(buildId!==generation)return true;
  let b=rawFinish?await coordsFor(rawFinish,end.value.trim()):null;
  if(buildId!==generation)return true;
  // Automatic mode does not reject a destination farther than the old 12 km cap.
  if(unrestricted&&a&&b&&!loop&&Number.isFinite(distanceEngine.km(a,b))){
   requestedKm=Math.max(2,Math.ceil(distanceEngine.km(a,b)*1.20));
  }
  if(!b&&!rawFinish&&!loop&&a){
   b=distanceEngine.dest(a,Math.max(.6,Math.min(2.5,requestedKm*.29)),surprise?Math.random()*360:65);
   b={...b,name:tr('Финиш прогулки','Walking finish'),generated:true};
  }
  const knowPath=Boolean(a&&(loop||b));
  if(readyRoute){
   waypoints=readyRoute.points.slice();extras=waypoints.slice(1,-1);
   plannedStats={points:waypoints,measuredKm:null,tooShort:false};
   points[0]={...waypoints[0],label:source};points[1]={...waypoints.at(-1),label:end.value};
  }else if(knowPath){
   const turn=surprise?Math.random()*360:(loop?65:90);
   plannedStats=unrestricted&&requestedKm>35&&!loop
    ?{points:[a,b],measuredKm:null,tooShort:false,uncapped:true}
    :await distanceEngine.matchLength({
      start:a,end:loop?a:b,targetKm:requestedKm,loop,rotate:turn,signal:signal.signal,
      onProgress:(i,max)=>status('Подбираем маршрут '+requestedKm+' км · попытка '+i+'/'+max+'…','Matching '+requestedKm+' km walk · pass '+i+'/'+max+'…')
     });
   if(buildId!==generation)return true;
   const midpoint=plannedStats.points.slice(1,-1);
   // Fill gaps in the local catalogue with actual named POIs from public map data.
   const offline=moscow&&local?.items?local.items:[];
   let livePlaces=[];
   if(moscow&&midpoint.length&&offline.filter(p=>distanceEngine.km(a,p)<Math.max(1.8,requestedKm*.5)).length<8){
     try{livePlaces=await scenicPlaces(a,loop?null:b,requestedKm,style,signal.signal)}catch{}
   }
   if(buildId!==generation)return true;
   const used=new Set(picked.map(p=>p.id));
   const pool=[...offline,...livePlaces];
   const candidates=target=>pool.filter(p=>p.type!=='malls'&&!used.has(p.id)&&
     (!pref('rain')||['food','culture','books'].includes(p.type))&&
     (style==='all'||style==='direct'||style===p.type||style===p.category||style==='food'&&p.type==='food'))
      .map(p=>({p,km:distanceEngine.km(target,p)}))
      .filter(x=>Number.isFinite(x.km)).sort((x,y)=>x.km-y.km);
   const near=target=>{
     const found=candidates(target)[0];
     if(found&&found.km<=1.45){used.add(found.p.id);return found.p}
     return null;
   };
   const nearestReference=target=>{
     const found=pool.filter(p=>p.type!=='malls')
       .map(p=>({p,km:distanceEngine.km(target,p)}))
       .filter(x=>Number.isFinite(x.km)).sort((x,y)=>x.km-y.km)[0];
     return found&&found.km<=2?found.p:null;
   };
   // The named places actually become route waypoints, not unrelated gallery items.
   let middle=midpoint.map((p,i)=>{
    const match=near(p);
    if(match){extras.push(match);return match}
    const reference=nearestReference(p);
    return {...p,name:reference?tr('Рядом с ','Near ')+reference.name:tr('Прогулочный участок ','Walking section ')+(i+1),
      nearbyReference:reference||null,generated:true}
   });
   if(picked.length){
    // Preserve the user's stops and insert them where they create the smallest detour.
    const route=[a,...middle,loop?a:b];
    for(const p of picked){
     if(!distanceEngine.valid(p))continue;
     let best={cost:Infinity,index:1};
     for(let i=1;i<route.length;i++){
      const extra=distanceEngine.km(route[i-1],p)+distanceEngine.km(p,route[i])-distanceEngine.km(route[i-1],route[i]);
      if(extra<best.cost)best={cost:extra,index:i};
     }
     route.splice(best.index,0,p);
    }
    waypoints=route;extras=[...picked,...extras];
    // Re-measure the actual combined waypoints, instead of showing a false km figure.
    try{
     const measured=await distanceEngine.walkingLength(route,{signal:signal.signal,timeoutMs:2800});
     if(measured)plannedStats={...plannedStats,measuredKm:measured.km,minutes:measured.minutes};
    }catch{plannedStats={...plannedStats,measuredKm:null,routerUnavailable:true}}
   }else waypoints=[a,...middle,loop?a:b];
   // Use a real named attraction as the automatic finish when it is close.
   if(!loop&&b?.generated){
     const named=near(b);
     if(named){b=named;waypoints[waypoints.length-1]=named;extras.push(named)}
   }
   // If a named destination replaced a computed point, its actual network distance
   // must be recomputed. Never display a stale kilometer estimate.
   if(!picked.length&&extras.length&&!plannedStats.tooShort){
    try{const recalculated=await distanceEngine.walkingLength(waypoints,{signal:signal.signal,timeoutMs:3000});
      if(recalculated)plannedStats={...plannedStats,measuredKm:recalculated.km,minutes:recalculated.minutes};
    }catch{plannedStats={...plannedStats,measuredKm:null,routerUnavailable:true}}
   }
   points[0]={lat:a.lat,lng:a.lng,label:source};
   if(!loop&&b)points[1]={lat:b.lat,lng:b.lng,label:end.value.trim()||b.name||tr('Финиш','Finish')};
  }else if(rawFinish){
   // Never claim a distance-calibrated walking route when endpoints are unknown.
   if(moscow){
    status('Не удалось определить точные координаты '+(!a?'начала':'финиша')+'. Выбери место из списка или нажми «Моё положение».','Could not geocode the starting point or destination. Select a known place or use GPS.',true);
    return true;
   }
   // In other cities, pass user-entered address to Yandex without a false km claim.
   waypoints=[a||source,...picked,b||rawFinish];extras=picked;
  }else{
   status('Не удалось определить старт. Разреши геолокацию или введи точный адрес с городом.','Could not locate the start. Allow GPS or enter a precise address and city.',true);
   $('mapSection').scrollIntoView({behavior:'smooth',block:'start'});
   return true;
  }
  if(waypoints.length<2)return true;
  if(buildId!==generation)return true;
  yandexFallbackStops=waypoints;
  currentRoutePlaces=extras.filter(p=>!p.generated);
  updateYandex();
  const panel=$('itinerary');panel.replaceChildren();
  const heading=document.createElement('h3');heading.className='quick-journey-title';
  heading.textContent=loop?tr('Круговая прогулка','Round-trip walk'):tr('Маршрут','Your route');
  panel.append(heading);
  const measured=plannedStats?.measuredKm;
  const kmInfo=document.createElement('p');kmInfo.className='route-distance-summary';
  const closeToGoal=Number.isFinite(measured)&&Math.abs(measured-requestedKm)<=Math.max(.5,requestedKm*.12);
  kmInfo.textContent=unrestricted
    ?(Number.isFinite(measured)
      ?tr('Без ограничения длины · по пешеходным дорожкам ≈ '+measured.toFixed(1)+' км','No distance limit · walking estimate ≈ '+measured.toFixed(1)+' km')
      :tr('Без ограничения длины. Длину и время пешком уточни в Яндекс Картах.','No distance limit. Confirm walking distance and time in Yandex Maps.'))
    :(Number.isFinite(measured)
      ?tr('Цель '+requestedKm+' км · пешеходный расчёт '+measured.toFixed(1)+' км'+(closeToGoal?' ✓':' · возможна разница'),'Target '+requestedKm+' km · walking estimate '+measured.toFixed(1)+' km'+(closeToGoal?' ✓':' · may differ'))
      :tr('Цель '+requestedKm+' км · промежуточные точки добавлены. Точную длину проверь в Яндексе.','Target '+requestedKm+' km · detour waypoints added. Confirm actual distance in Yandex.'));
  if(plannedStats?.tooShort)kmInfo.textContent=tr('Маршрут на '+requestedKm+' км не построен: старт и финиш слишком далеко друг от друга.','No '+requestedKm+' km route was built: the starting point and destination are too far apart.');
  panel.append(kmInfo);
  if(plannedStats?.tooShort){
    const d=distanceEngine.km(waypoints[0],waypoints.at(-1));
    const callout=document.createElement('section');callout.className='route-distance-alert';
    const heading=document.createElement('strong');heading.textContent=tr('Маршрут выбранной длины невозможен','The requested distance is not possible');
    const message=document.createElement('p');
    message.textContent=tr('От старта до финиша '+d.toFixed(1)+' км по прямой. За '+requestedKm+' км туда пешком не дойти. Выбери ближний финиш или построй круговой маршрут около начала.','Start and destination are '+d.toFixed(1)+' km apart in a straight line. A '+requestedKm+' km walk cannot reach the destination. Choose a closer finish or take a loop near the start.');
    const createLoop=document.createElement('button');createLoop.type='button';createLoop.className='primary';
    createLoop.id='suggestLoopRoute';
    createLoop.textContent=tr('↻ Построить прогулку '+requestedKm+' км рядом со стартом','↻ Build a '+requestedKm+' km walk near the start');
    createLoop.onclick=()=>{
      const item=document.querySelector('[name="routeMode"][value="loop"]');
      if(item){item.checked=true;end.disabled=true;}
      build(true);
    };
    callout.append(heading,message,createLoop);panel.append(callout);
  }
  const numeric=/^[-+]?\d+(?:\.\d+)?,\s*[-+]?\d+(?:\.\d+)?$/;
  const readable=(name,fallback)=>numeric.test(String(name||'').trim())?fallback:String(name||fallback);
  const pointLabel=(p,i)=>{
    if(i===0||loop&&i===waypoints.length-1)return readable(source,tr('Моё местоположение','My location'));
    if(i===waypoints.length-1&&end.value.trim())return readable(end.value.trim(),tr('Точка назначения','Destination'));
    if(typeof p==='string')return readable(p,tr('Точка назначения','Destination'));
    return readable(p.name||p.label,tr('Прогулочный ориентир','Walking landmark'));
  };
  const pointCoords=p=>typeof p==='object'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?[p.lat,p.lng]:null;
  const pointText=p=>{const c=pointCoords(p);return c?c.map(x=>x.toFixed(6)).join(','):(city.value.trim()||'Москва')+', '+String(p)};
  const steps=document.createElement('ol');steps.className='cityroute-quick-stops cityroute-step-plan';
  for(const [i,p] of waypoints.entries()){
   const li=document.createElement('li');li.className='cityroute-step';
   const marker=document.createElement('span');marker.className='cityroute-step-marker';
   marker.textContent=i===0?'А':i===waypoints.length-1?(loop?'А':'Б'):String(i);
   const body=document.createElement('div');body.className='cityroute-step-body';
   const name=document.createElement('strong');name.textContent=pointLabel(p,i);body.append(name);
   const meta=document.createElement('small');
   meta.textContent=i===0?tr('Старт','Start'):i===waypoints.length-1?tr('Финиш','Finish'):tr('Остановка '+i,'Stop '+i);
   body.append(meta);
   if(i>0){
    const isFood=p?.type==='food';
    if(isFood){
      const price=document.createElement('div');price.className='cityroute-stop-price';
      price.textContent=p.check?.label?tr('Средний чек: ','Average bill: ')+p.check.label:tr('Средний чек: нет подтверждённых данных','Average bill: not verified');
      body.append(price);
      if(p.check?.source){const sourceLink=document.createElement('a');sourceLink.href=p.check.source;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.className='cityroute-price-source';sourceLink.textContent=tr('Источник цены ↗','Bill source ↗');body.append(sourceLink)}
    }else if(p?.generated){
      const detail=document.createElement('small');detail.textContent=tr('Ориентир рядом · не подтверждённый вход в заведение','Nearby landmark · not a confirmed venue stop');body.append(detail);
    }
    if(typeof p==='object'&&distanceEngine.valid(p)){
      const media=document.createElement('div');media.className='cityroute-step-media';
      const pictured=p.generated&&p.nearbyReference?p.nearbyReference:p;
      const link=document.createElement('a');
      link.href='https://yandex.ru/maps/?'+new URLSearchParams({ll:pictured.lng+','+pictured.lat,z:'17',text:pictured.name||''}).toString();
      link.target='_blank';link.rel='noopener noreferrer';
      link.textContent=tr('Фотографии и отзывы в Яндексе ↗','Photos and reviews in Yandex ↗');
      media.append(link);body.append(media);
      if(window.CityRoutePhotos?.renderInline && (!p.generated||p.nearbyReference)){
        if(p.generated){const note=document.createElement('small');note.textContent=tr('Фото ориентира поблизости, не этой точки','Photo of a nearby landmark, not this waypoint');media.append(note)}
        window.CityRoutePhotos.renderInline(pictured,media);
      }
    }

    if(!p?.generated&&typeof p==='object'){
      const facts=document.createElement('div');facts.className='cityroute-stop-facts';
      const hours=document.createElement('small');
      hours.textContent=p.tags?.opening_hours?tr('Часы работы (из каталога): ','Hours (catalogue): ')+p.tags.opening_hours:tr('Часы работы: уточни в Яндексе','Opening hours: check Yandex');
      facts.append(hours);
      const rating=document.createElement('small');
      rating.textContent=p.rating?.value&&p.rating?.source?tr('Рейтинг: ','Rating: ')+p.rating.value:tr('Рейтинг: смотри в Яндексе','Rating: check Yandex');
      facts.append(rating);body.append(facts);
    }
    const prev=waypoints[i-1],leg=document.createElement('div');leg.className='cityroute-step-leg';
    const url=new URL('https://yandex.ru/maps/');
    url.search=new URLSearchParams({rtext:pointText(prev)+'~'+pointText(p),rtt:'pd'}).toString();
    const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';
    a.textContent=tr('Пеший переход ↗','Walking directions ↗');leg.append(a);
    const c1=pointCoords(prev),c2=pointCoords(p);
    if(c1&&c2){const d=distanceEngine.km({lat:c1[0],lng:c1[1]},{lat:c2[0],lng:c2[1]});
     if(Number.isFinite(d)){
      const note=document.createElement('span');
      const min=Math.max(1,Math.round(d/4.5*60));
      note.textContent=tr('≈ '+min+' мин пешком · от '+d.toFixed(1)+' км по прямой (оценка)','≈ '+min+' min walk · from '+d.toFixed(1)+' km straight-line (estimate)');
      leg.append(note)
     }
    }
    body.append(leg);
   }
   li.append(marker,body);steps.append(li);
  }
  panel.append(steps);
  const action=document.createElement('a');action.className='primary inline-link cityroute-map-cta';
  action.href=$('yandexNav').href;action.target='_blank';action.rel='noopener noreferrer';
  action.textContent=plannedStats?.tooShort
    ?tr('Посмотреть путь до выбранного финиша в Яндексе ↗','See directions to your distant destination on Yandex ↗')
    :tr('Открыть весь маршрут в Яндекс Картах ↗','Open complete route in Yandex Maps ↗');
  const save=document.createElement('button');save.type='button';save.className='secondary cityroute-save-route';
  save.textContent=tr('♡ Сохранить прогулку','♡ Save this walk');
  save.onclick=()=>{
   try{
    const key='cityroute-saved-itineraries-v1',old=JSON.parse(localStorage.getItem(key)||'[]');
    const entry={v:3,id:crypto.randomUUID?.()||String(Date.now()),city:city.value.trim()||'Москва',start:source,finish:end.value.trim(),loop,style,stops:extras,waypoints,distanceKm:measured||null,requestedKm,readyRouteId:readyRoute?.id||null};
    localStorage.setItem(key,JSON.stringify([entry,...(Array.isArray(old)?old:[])].slice(0,30)));
    $('saveStatus').textContent=tr('✓ Сохранено в браузере.','✓ Saved on this device.');
    save.disabled=true;save.textContent=tr('Сохранено ✓','Saved ✓');renderQuickSaved();
    const cloud=window.CityRouteCloud;
    if(cloud?.isSignedIn()){
     $('saveStatus').textContent=tr('Сохраняем в PostgreSQL…','Saving to PostgreSQL…');
     void cloud.saveRoute(entry).then(()=>{$('saveStatus').textContent=tr('✓ В браузере и PostgreSQL.','✓ Saved locally and in PostgreSQL.');window.CityRouteCloudUI?.refresh?.()})
      .catch(e=>{$('saveStatus').textContent=tr('✓ Локально сохранено. PostgreSQL: ','✓ Saved locally. PostgreSQL: ')+(e?.message||'')});
    }
   }catch{$('saveStatus').textContent=tr('Не удалось сохранить на устройстве.','Could not save locally.')}
  };
  panel.append(action,save);
  if(document.querySelector('[name="transport"]:checked')?.value==='transit'){
   const box=$('transportResult');box.hidden=false;box.replaceChildren();
   const a=document.createElement('a');a.className='secondary inline-link';a.target='_blank';a.rel='noopener noreferrer';
   const url=new URL($('yandexNav').href);url.searchParams.set('rtt','mt');a.href=url.href;
   a.textContent=tr('На транспорте ↗','Public transport ↗');box.append(a);
  }
  if(moscow){drawPlaces(backupPlaces());$('nearbyDisclosure').open=false;}
  $('routeDetail').textContent=unrestricted
   ?(Number.isFinite(measured)?tr('Пешком ≈ '+measured.toFixed(1)+' км · без лимита','Walking ≈ '+measured.toFixed(1)+' km · unlimited'):tr('Без ограничения · проверить в Яндексе','Unlimited · check Yandex'))
   :(Number.isFinite(measured)?tr('Пешком ≈ '+measured.toFixed(1)+' км · цель '+requestedKm,'Walking ≈ '+measured.toFixed(1)+' km · target '+requestedKm):tr('Цель '+requestedKm+' км · проверить в Яндексе','Target '+requestedKm+' km · check Yandex'));
  $('rerollRoute').hidden=false;
  if(plannedStats?.tooShort)status('Маршрут на '+requestedKm+' км не построен: финиш слишком далеко. Выбери другой финиш или круговой маршрут.','No '+requestedKm+' km route built: destination is too far. Choose another destination or a round trip.',true);
  else status('Маршрут готов: остановки в списке, путь в Яндекс Картах.','Route ready: stops are listed and the map is in Yandex.');
  scrollMap();return true;
 }catch(error){
  window.cityrouteLastBuildError=String(error?.stack||error);if(buildId===generation)status('Ошибка построения: '+(error?.message||'неизвестно'),'Routing error: '+(error?.message||'unknown'),true);
  return true;
 }finally{clearTimeout(timer);if(buildId===generation)busy(false)}
}
function renderQuickSaved(){
 const box=$('quickSavedRoutes');if(!box)return;
 box.replaceChildren();
 let list=[];try{list=JSON.parse(localStorage.getItem('cityroute-saved-itineraries-v1')||'[]')}catch{}
 const quick=(Array.isArray(list)?list:[]).filter(r=>r.v===3).slice(0,8);
 $('quickSavedSection').hidden=quick.length===0;
 for(const route of quick){
  const a=document.createElement('button');a.type='button';a.className='secondary';
  a.textContent=(route.start||tr('Маршрут','Route'))+' → '+(route.loop?tr('к началу','start'):(route.finish||route.stops?.at(-1)?.name||tr('финиш','finish')));
  a.onclick=()=>openQuickSaved(route);box.append(a);
 }
}
document.addEventListener('cityroute:ready-route',event=>{
 const route=window.CityRouteReady?.resolve(event.detail,window.CityRoutePlaces?.items||[]);if(!route)return;
 city.value='Москва';start.value=route.points[0].name;end.value=route.points.at(-1).name;end.disabled=false;
 document.querySelector('[name="routeMode"][value="oneway"]').checked=true;
 $('distance').value='auto';$('routeStyle').value='all';chosen=route.points.slice(1,-1);drawChosen();points=[null,null];
 buildOnYandex(false,route);
});
function openQuickSaved(r){
 if(!r||r.v!==3||!Array.isArray(r.waypoints))return;
 city.value=r.city||'Москва';start.value=r.start||'';end.value=r.finish||'';
 const mode=document.querySelector('[name=routeMode][value="'+(r.loop?'loop':'oneway')+'"]');if(mode)mode.checked=true;
 end.disabled=!!r.loop;chosen=Array.isArray(r.stops)?r.stops:[];drawChosen();
 points=[null,null];
 const first=r.waypoints[0];if(first&&typeof first==='object'&&Number.isFinite(first.lat)&&Number.isFinite(first.lng))points[0]={lat:first.lat,lng:first.lng,label:start.value};
 if(r.readyRouteId)$('distance').value='auto';
 buildOnYandex(false,window.CityRouteReady?.resolve(r.readyRouteId,window.CityRoutePlaces?.items||[]));
}
// Build through the current Yandex-backed planner; the old routing branch below
// was unreachable after an unconditional return and only increased JS parse cost.
async function build(surprise=false){
 return buildOnYandex(surprise);
}

document.querySelectorAll('[data-preference], [name=transport], [name=mood]').forEach(input=>input.addEventListener('change',()=>{cancel();resetRoute();avoidance=null;status('Настройки изменены. Построй маршрут заново.','Preferences changed. Rebuild your route.')}));
form.addEventListener('submit',e=>{e.preventDefault();build()});$('buildMap').onclick=()=>build();$('surprise').onclick=()=>build(true);$('rerollRoute').onclick=()=>build(true);
$('clearReal').onclick=()=>{chosen=[];drawChosen();if(poiLayer)map.removeLayer(poiLayer);nearby=[];$('placesList').replaceChildren();$('placesStatus').textContent='';cancel();resetRoute();points=[null,null];start.value=end.value='';start.removeAttribute('aria-invalid');end.removeAttribute('aria-invalid');status('Нужна только начальная точка.','Only a starting point is needed.')};
function locateActual(){
 if(locationPending)return;
 if(!window.isSecureContext||!navigator.geolocation){
  const msg=tr('GPS требует HTTPS и разрешения браузера. Открой опубликованный сайт напрямую в Safari и разреши геопозицию.','GPS requires HTTPS and browser permission. Open the published website directly in Safari and allow location.');
  $('locationStatus').textContent=msg;status(msg,msg,true);return;
 }
 locationPending=true;
 const controls=[$('locateReal'),$('mapGPS')];
 controls.forEach(b=>{b.disabled=true;b.setAttribute('aria-busy','true')});
 $('locationStatus').textContent=tr('Получаем геопозицию устройства…','Getting your device location…');
 let done=false,watchdog=0;
 const finish=()=>{
  if(done)return false;done=true;locationPending=false;clearTimeout(watchdog);
  controls.forEach(b=>{b.disabled=false;b.removeAttribute('aria-busy')});return true;
 };
 function fail(err){
  if(!finish())return;
  const message=err?.code===1
   ?tr('Доступ к геопозиции запрещён. iPhone: Настройки → Конфиденциальность и безопасность → Службы геолокации → Safari → разрешить. Открой ссылку напрямую, не во встроенном браузере.','Location denied. iPhone: Settings → Privacy & Security → Location Services → Safari → allow. Open the site directly in Safari.')
   :err?.code===2?tr('Браузер не получил координаты. Проверь службы геолокации и попробуй ещё раз.','Browser could not get coordinates. Check Location Services and retry.')
   :tr('Геопозиция не отвечает. Открой CityRoute по HTTPS в Safari, разреши доступ или введи адрес.','Location request timed out. Open CityRoute using HTTPS in Safari and allow access or enter an address.');
  $('locationStatus').textContent=message;status(message,message,true);
 }
 function success(pos){
  if(done)return;
  const p={lat:Number(pos?.coords?.latitude),lng:Number(pos?.coords?.longitude)};
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)){fail({code:2});return}
  if(!finish())return;
  cancel();resetRoute();
  const coords=p.lat.toFixed(6)+','+p.lng.toFixed(6);
  mark(0,p,tr('Моё местоположение','My location'));lastLocated=p;
  // Resolve a readable nearby address when possible; never lose GPS precision.
  // This is an optional public geocoder request, not a blocking prerequisite.
  const expectedLabel=start.value,expectedGeneration=generation;
  void (async()=>{
   try{
    const url='https://photon.komoot.io/reverse?'+new URLSearchParams({
      lat:p.lat.toFixed(6),lon:p.lng.toFixed(6),lang:'ru'
    });
    const result=await fetch(url,{signal:AbortSignal.timeout(2800)});
    if(!result.ok)return;
    const properties=(await result.json()).features?.[0]?.properties||{};
    const street=[properties.street,properties.housenumber].filter(Boolean).join(', ');
    const name=street||[properties.name,properties.city||properties.district].filter(Boolean).join(', ');
    if(name&&name.length<=140&&start.value===expectedLabel&&generation===expectedGeneration&&
       points[0]?.lat===p.lat&&points[0]?.lng===p.lng){
       const label=name+(properties.city&&!name.includes(properties.city)?', '+properties.city:'');
       points[0].label=label;start.value=label;
       status('Местоположение определено. Старт: '+label+'.','Location found. Start: '+label+'.');
    }
   }catch{}
  })();
  const accuracy=Math.round(Number(pos.coords.accuracy)||0);
  $('locationStatus').textContent=tr('✓ Местоположение определено · точность '+accuracy+' м.','✓ Location found · accuracy '+accuracy+' m.');
  const url=new URL('https://yandex.ru/maps/');
  url.search=new URLSearchParams({ll:p.lng.toFixed(6)+','+p.lat.toFixed(6),z:'17',lang:english()?'en_RU':'ru_RU'}).toString();
  $('locationOnMap').href=url.href;$('locationOnMap').hidden=false;
  status('GPS определён. Нажми «Построить маршрут», чтобы подобрать прогулку.','Location found. Select Build route to plan your walk.');
 }
 // High-accuracy GPS can time out indoors or on iOS: retry once with lower accuracy
 // and a recently cached fix, without ever inventing a location.
 watchdog=setTimeout(()=>fail({code:3}),21000);
 const coarse=()=>{
  if(done)return;
  $('locationStatus').textContent=tr('Точный GPS не ответил, пробуем обычную геолокацию…','Precise GPS timed out; trying standard location…');
  try{navigator.geolocation.getCurrentPosition(success,fail,{enableHighAccuracy:false,timeout:7000,maximumAge:120000})}
  catch{fail({code:2})}
 };
 try{navigator.geolocation.getCurrentPosition(success,e=>{if(e?.code===1)fail(e);else coarse()},{enableHighAccuracy:true,timeout:9500,maximumAge:60000})}
 catch{coarse()}
}
 $('locateReal').onclick=locateActual;
$('mapGPS').onclick=locateActual;

function captureSettings(){return [...form.querySelectorAll('input,select,textarea')].filter(e=>e.id||e.name||e.dataset.preference).map(e=>({id:e.id,name:e.name,value:e.value,preference:e.dataset.preference,checked:e.checked}));}
function restoreSettings(settings){for(const saved of settings||[]){const el=[...form.querySelectorAll('input,select,textarea')].find(e=>saved.id?e.id===saved.id:saved.preference?e.dataset.preference===saved.preference:e.name===saved.name&&e.value===saved.value);if(!el)continue;if(el.type==='checkbox'||el.type==='radio')el.checked=!!saved.checked;else el.value=saved.value;}syncPeople();syncRouteMode();}
itinerary=window.CityRouteItinerary.create({decode,tr,focus:p=>{const u=new URL('https://yandex.ru/maps/');u.search=new URLSearchParams({ll:p.lng+','+p.lat,z:'17'});window.open(u.href,'_blank','noopener,noreferrer')},fit:()=>$('fitRoute').click(),restore:r=>{
 cancel();resetRoute();restoreSettings(r.settings);city.value=r.city;chosen=[];drawChosen();if(poiLayer)map.removeLayer(poiLayer);nearby=[];$('placesList').replaceChildren();
 points=[null,null];r.points.forEach((p,i)=>{if(p)mark(i,p,p.label)});
 const path=pathOf(r.data);if(r.transit)showTransport(r.data,r.places,r.loop);currentRoutePath=path;updateYandex();showWalkingMap();$('rerollRoute').hidden=false;$('routeDetail').textContent=r.data.trip.summary.length.toFixed(1)+' '+tr('км','km');status('Открыт сохранённый маршрут.','Saved route opened.');scrollMap();
}});
try{const raw=sessionStorage.getItem('cityroute-open-walk');if(raw){sessionStorage.removeItem('cityroute-open-walk');const saved=JSON.parse(raw);if(saved?.v===3)openQuickSaved(saved);else if(window.CityRouteItinerary.valid(saved))itinerary.open(saved);}}catch{status('Не удалось открыть сохранённый маршрут.','Could not open saved route.',true);}
showWalkingMap();renderQuickSaved();if(!$('routeDetail').textContent)status('Нужна только начальная точка.','Only a starting point is needed.');
// A Yandex iframe needs no JavaScript API key, but cannot forward its clicks to CityRoute.
// Keep the verified route link accessible even if a browser blocks embedding.
})();
