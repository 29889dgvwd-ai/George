(()=>{
'use strict';
const $=id=>document.getElementById(id),start=$('startPoint'),end=$('endPoint'),city=$('city');
const form=$('routeForm'),buttons=[$('buildReal'),$('buildMap'),$('surprise'),$('nearbyPlaces'),$('findPlacesTop')],cache=new Map();
let currentRoutePath=[],currentRoutePlaces=[];let itinerary=null;let googleBridge=null;let avoidance=null;let map,points=[null,null],markers=[null,null],routeLayer=null,pickMode=0,generation=0,controller=null;
const english=()=>document.body.classList.contains('english');
const tr=(ru,en)=>english()?en:ru;
function status(ru,en,error=false){for(const el of [$('formStatus'),$('routeStatus')]){el.textContent=tr(ru,en||ru);el.setAttribute('role',error?'alert':'status')}}
function busy(value){buttons.forEach(b=>{b.disabled=value;b.setAttribute('aria-busy',String(value))});$('buildReal').querySelector('.ru').textContent=value?'Строим маршрут…':'Построить маршрут';$('buildReal').querySelector('.en').textContent=value?'Building…':'Build route'}
function cancel(){generation++;controller?.abort();controller=null;busy(false)}
function resetRoute(){currentRoutePath=[];currentRoutePlaces=[];$('rerollRoute').hidden=true;updateYandex();itinerary?.clear();googleBridge?.stops([]);$('transportResult').replaceChildren();$('transportResult').hidden=true;googleBridge?.route([]);$('scenicResult').replaceChildren();$('scenicResult').hidden=true;if(routeLayer){map?.removeLayer(routeLayer);routeLayer=null}$('routeDetail').textContent=''}
function showWalkingMap(){document.body.classList.remove('yandex-widget-active');$('toggleMap').textContent=tr('Яндекс Карты','Yandex Maps');$('mapProvider').textContent=tr('Схема прогулки: OpenStreetMap · выбранные остановки и обходы','Walking map: OpenStreetMap · selected stops and detours');map?.invalidateSize();}
function updateYandex(){const coords=p=>Array.isArray(p)?p:[p.lat,p.lng];const stops=currentRoutePath.length?[currentRoutePath[0],...currentRoutePlaces.map(p=>coords(p.routePoint||p)),currentRoutePath.at(-1)]:points.filter(Boolean).map(coords);const url=new URL('https://yandex.ru/maps/');url.search=new URLSearchParams(stops.length>1?{rtext:stops.map(p=>p.join(',')).join('~'),rtt:'pd'}:{ll:stops.length?stops[0][1]+','+stops[0][0]:'37.6173,55.7558',z:'14'}).toString();$('yandexNav').href=url.href;if(document.body.classList.contains('yandex-widget-active')){const frame=new URL('https://yandex.ru/map-widget/v1/');frame.search=url.search;if($('yandexWidget').src!==frame.href)$('yandexWidget').src=frame.href;}}
$('toggleMap').onclick=()=>{if(document.body.classList.contains('yandex-widget-active'))showWalkingMap();else{document.body.classList.add('yandex-widget-active');$('toggleMap').textContent=tr('Схема прогулки','Walking map');$('mapProvider').textContent=tr('Яндекс Карты · Яндекс рассчитывает свой путь между остановками; обходы CityRoute показаны на схеме прогулки.','Yandex Maps calculates its own route between stops; CityRoute detours appear on the walking map.');updateYandex();}};
// Request location only after an explicit click; keep it out of storage.
$('returnStart').onclick=()=>{
 const destination=currentRoutePath.length?currentRoutePath[0]:points[0]?[points[0].lat,points[0].lng]:null;
 const note=$('returnStatus'),link=$('returnLink'),button=$('returnStart');
 link.hidden=true;
 if(!destination){note.textContent=tr('Сначала выбери начало прогулки на карте или построй маршрут.','Choose a start on the map or build a route first.');return;}
 const show=(origin)=>{const url=new URL('https://yandex.ru/maps/');url.search=new URLSearchParams({rtext:(origin?origin.join(','):'')+'~'+destination.join(','),rtt:'pd'}).toString();link.href=url.href;link.hidden=false;button.disabled=false;button.removeAttribute('aria-busy');note.textContent=origin?tr('Готово. Открой маршрут: Яндекс покажет путь и время пешком.','Ready. Open the route for walking directions and time.'):tr('Геопозиция недоступна. Открой маршрут и укажи своё положение в Яндекс Картах.','Location is unavailable. Open the route and set your position in Yandex Maps.');};
 if(!navigator.geolocation){show(null);return;}
 button.disabled=true;button.setAttribute('aria-busy','true');note.textContent=tr('Определяем твоё положение…','Finding your location…');
 navigator.geolocation.getCurrentPosition(p=>show([p.coords.latitude,p.coords.longitude]),()=>show(null),{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
};
function scrollMap(){ $('mapSection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function mark(i,p,label,fill=true){points[i]={lat:p.lat,lng:p.lng,label};if(markers[i])map.removeLayer(markers[i]);
 markers[i]=L.marker(p,{draggable:true,icon:L.divIcon({className:'point-marker'+(i?' finish':''),html:i?'Б':'А',iconSize:[42,42],iconAnchor:[21,21]})}).addTo(map).bindTooltip(i?tr('Финиш','Finish'):tr('Старт','Start'),{permanent:true,direction:'top',offset:[0,-23],className:'endpoint-label'});
 googleBridge?.point(i,p,label);updateYandex();
 const input=i?end:start;if(fill)input.value=label;input.removeAttribute('aria-invalid');
 markers[i].on('dragend',e=>{cancel();resetRoute();const p=e.target.getLatLng();points[i]={lat:p.lat,lng:p.lng,label:tr('Точка на карте','Map point')};input.value=points[i].label;googleBridge?.point(i,p,points[i].label);status('Точка изменена. Нажми «Построить маршрут».','Point moved. Click Build route.')});
}
function pick(i,scroll=true){showWalkingMap();pickMode=i;document.querySelectorAll('[data-pick]').forEach(b=>b.classList.toggle('active',Number(b.dataset.pick)===i));status(i?'Нажми на карте, где закончить прогулку.':'Нажми на карте, откуда начать прогулку.',i?'Tap the map to set a destination.':'Tap the map to set your start.');if(scroll)scrollMap()}
$('theme').onclick=()=>document.body.classList.toggle('dark');
$('language').onclick=()=>{document.body.classList.toggle('english');document.documentElement.lang=english()?'en':'ru';$('language').textContent=english()?'RU':'EN';itinerary?.render();start.placeholder=tr('Адрес, парк или место','Address, park or place');end.placeholder=tr('Можно оставить пустым','Optional');status('Нужна только начальная точка.','Only a starting point is needed.')};
const pref=name=>Boolean(document.querySelector('[data-preference="'+name+'"]:checked'));
function syncPeople(){
 const count=$('company-alone').checked?'1':$('company-date').checked?'2':null;
 document.querySelectorAll('[name="people"]').forEach(input=>{input.disabled=Boolean(count&&input.value!==count);if(count)input.checked=input.value===count});
 $('peopleNote').textContent=count?tr('Число участников: '+count+'. Для другой компании можно выбрать количество.','Group size: '+count+'. Choose another company to change it.') : '';
}
document.querySelectorAll('[name="company"]').forEach(input=>input.addEventListener('change',()=>{syncPeople();cancel();resetRoute()}));syncPeople();
function syncRouteMode(){const loop=document.querySelector('[name="routeMode"]:checked').value==='loop';end.disabled=loop;end.placeholder=loop?tr('Вернёмся к началу','Return to start'):tr('Можно оставить пустым','Optional');document.querySelectorAll('[data-pick="1"]').forEach(button=>button.disabled=loop);cancel();resetRoute();status(loop?'Круговой маршрут вернёт тебя к началу.':'Маршрут закончится в другой точке.',loop?'This route returns to the start.':'This route ends at another point.')}
document.querySelectorAll('[name="routeMode"]').forEach(input=>input.addEventListener('change',syncRouteMode));
$('findPlacesTop').onclick=()=>$('nearbyPlaces').click();
const amount=$('budgetAmount'),range=$('budgetRange');function budget(v){const n=Math.max(0,Math.min(50000,Math.round(Number(v)/500)*500));amount.value=Number.isFinite(n)?n:0;range.value=amount.value}range.oninput=()=>budget(range.value);amount.oninput=()=>{if(amount.value!=='')range.value=Math.max(0,Math.min(50000,Number(amount.value)))};amount.onchange=()=>{if(amount.value!=='')budget(amount.value);else range.value=0};
// Reject whole profane words without persistent messages or substring matches in addresses.
const forbidden=/(^|[^\p{L}])(хуй\p{L}*|пизд\p{L}*|бляд\p{L}*|сука|ебать|ебан\p{L}*|мудак)(?=$|[^\p{L}])/iu;
for(const f of [city,start,end,$('gptNotes')]){let clean=f.value;f.addEventListener('input',()=>{if(forbidden.test(f.value))f.value=clean;else clean=f.value})}
if(!window.L){status('Карта не загрузилась. Обнови страницу.','Map failed to load. Refresh the page.',true);return}
map=L.map('liveMap',{scrollWheelZoom:false,zoomControl:false}).setView([55.7558,37.6173],15);
L.control.zoom({position:'topright'}).addTo(map);L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
let tileErrors=0;tiles.on('tileerror',()=>{if(++tileErrors===3)$('routeStatus').textContent=tr('Часть карты не загрузилась. Проверь соединение.','Some map tiles failed to load. Check your connection.')});
let resizeFrame;new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>map.invalidateSize())}).observe($('liveMap'));
document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>pick(Number(b.dataset.pick)));
map.on('click',e=>{cancel();resetRoute();mark(document.querySelector('[name="routeMode"]:checked').value==='loop'?0:pickMode,e.latlng,tr('Точка на карте','Map point'));if(pickMode===0){pickMode=1;status('Начало выбрано. Можно строить прогулку или указать конец.','Start selected. Build a walk or choose a destination.')}else status('Обе точки выбраны. Можно строить маршрут.','Both points selected. Ready to build.');document.querySelectorAll('[data-pick]').forEach(b=>b.classList.remove('active'))});
for(const [field,i] of [[start,0],[end,1]])field.addEventListener('input',()=>{cancel();resetRoute();points[i]=null;googleBridge?.point(i,null);if(markers[i])map.removeLayer(markers[i]);markers[i]=null;field.removeAttribute('aria-invalid');status('Нужна только начальная точка.','Only a starting point is needed.')});
city.addEventListener('input',()=>{chosen=[];drawChosen();if(poiLayer)map.removeLayer(poiLayer);nearby=[];cancel();resetRoute();cache.clear();points.forEach((p,i)=>{if(p&&p.label!==tr('Точка на карте','Map point')&&p.label!==tr('Моё положение','My location')){points[i]=null;googleBridge?.point(i,null);if(markers[i])map.removeLayer(markers[i]);markers[i]=null}})});
$('fitRoute').onclick=()=>{if(routeLayer)map.fitBounds(routeLayer.getBounds(),{padding:[55,55],maxZoom:16});else if(points[0])map.setView(points[0],16)};
$('expandMap').onclick=()=>{const expanded=$('mapSection').classList.toggle('expanded-map');$('expandMap').setAttribute('aria-pressed',String(expanded));$('expandMap').querySelector('.ru').textContent=expanded?'Свернуть':'Развернуть';$('expandMap').querySelector('.en').textContent=expanded?'Collapse':'Expand';map.invalidateSize();if(routeLayer)map.fitBounds(routeLayer.getBounds(),{padding:[55,55],maxZoom:16})};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('mapSection').classList.contains('expanded-map'))$('expandMap').click()});
for(const field of [$('distance'),$('routeStyle'),$('walkTime')])field.onchange=()=>{cancel();resetRoute()};
async function json(url,signal){const r=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});if(!r.ok)throw Error(r.status===429?tr('Сервис занят. Попробуй через минуту.','Service is busy. Try again in a minute.'):tr('Сервис маршрутов временно недоступен. Попробуй ещё раз.','Routing service is temporarily unavailable. Try again.'));return r.json()}
async function resolve(field,i,signal){const raw=field.value.trim();if(points[i]?.label===raw)return points[i];
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
let lastScenicId=null,poiLayer=null,nearby=[],chosen=[];
const meters=(a,b)=>L.latLng(a).distanceTo(b);
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
  const timer=setTimeout(()=>local.abort(),18000);
  try{let response;
   for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
    try{const result=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:AbortSignal.any([local.signal,AbortSignal.timeout(8000)])});if(!result.ok)throw Error('Place search unavailable');response=await result.json();if(response.remark)throw Error('Place search unavailable');break}catch(e){if(local.signal.aborted)throw e;response=null}
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
function renderPlacesList(places,limit=60){const list=$('placesList');list.replaceChildren();for(const p of places.slice(0,limit)){const row=document.createElement('div'),name=document.createElement('span'),button=document.createElement('button');name.textContent=p.name+' · '+(categoryLabel[p.category]||categoryLabel[p.type]||'Место');button.type='button';const selected=chosen.some(x=>x.id===p.id);button.textContent=selected?tr('Убрать','Remove'):tr('В маршрут','Add stop');button.setAttribute('aria-label',(selected?'Убрать: ':'В маршрут: ')+p.name);button.setAttribute('aria-pressed',String(selected));button.onclick=()=>choosePlace(p);row.append(name,button);list.append(row)}if(places.length>limit){const more=document.createElement('button');more.type='button';more.textContent=tr('Показать ещё места','Show more places');more.onclick=()=>{renderPlacesList(places,limit+60)};list.append(more)}if(!places.length)list.textContent=tr('Здесь пока нет загруженных мест этой категории.','No loaded places in this category.')}
$('placeFilter').onchange=()=>drawPlaces(nearby);
function drawPlaces(places){
 nearby=places;const visible=places.filter(p=>$('placeFilter').value==='all'||p.type===$('placeFilter').value||p.category===$('placeFilter').value);renderPlacesList(visible);if(poiLayer)map.removeLayer(poiLayer);poiLayer=L.layerGroup().addTo(map);
 const colors={parks:'#16866b',water:'#008bab',food:'#c57521',malls:'#8b48be',culture:'#b44c79',sights:'#4866bf',art:'#b44c79',books:'#916746'};
 for(const p of visible.slice(0,180)){
  const popup=document.createElement('div'),title=document.createElement('strong'),button=document.createElement('button');title.textContent=p.name;button.type='button';button.textContent=chosen.some(x=>x.id===p.id)?tr('Убрать остановку','Remove stop'):tr('Через это место','Visit this place');button.className='poi-choice';button.onclick=()=>choosePlace(p);popup.append(title,document.createElement('br'),button);
  const label=document.createElement('span');label.textContent=p.name;
  const marker=L.circleMarker(p,{bubblingMouseEvents:false,radius:chosen.some(x=>x.id===p.id)?10:6,color:'#fff',weight:2,fillColor:colors[p.type]||'#4866bf',fillOpacity:1}).bindTooltip(label).bindPopup(popup).addTo(poiLayer);const el=marker.getElement();el.setAttribute('role','button');el.setAttribute('aria-label',p.name);el.setAttribute('tabindex','0');el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();marker.openPopup()}});
 }
 $('placesStatus').textContent=tr('Найдено '+visible.length+' мест. На карте '+Math.min(visible.length,180)+' мест. Нажми на метку, чтобы добавить остановку (до 3).','Showing '+Math.min(visible.length,180)+' places. Tap a marker to add a stop (up to 3).');
 googleBridge?.places(visible.slice(0,180),choosePlace);
}
$('nearbyPlaces').onclick=async(event)=>{
 cancel();const id=generation,abort=new AbortController();controller=abort;busy(true);$('placesStatus').textContent=tr('Ищем места…','Finding places…');
 try{const center=start.value.trim()?await resolve(start,0,abort.signal):map.getCenter();const places=await scenicPlaces(center,null,3,'all',abort.signal);if(id!==generation)return;drawPlaces(places);if(start.value.trim())map.setView(center,15);if(event?.isTrusted)scrollMap()}
 catch(e){if(id===generation)$('placesStatus').textContent=tr('Не удалось загрузить места. Попробуй ещё раз.','Could not load places. Try again.')}
 finally{if(id===generation){busy(false);controller=null}}
};
function showScenic(places,note,layer){
 currentRoutePlaces=places;googleBridge?.stops(places);
 const box=$('scenicResult');box.hidden=false;
 const heading=document.createElement('h3');heading.textContent=places.length?tr('Места на маршруте','Places on your walk'):tr('О маршруте','About this route');box.append(heading);
 for(const [i,p] of places.entries()){
  const row=document.createElement('p');row.className='scenic-place';row.textContent=(i+1)+'. '+p.name+' · '+(categoryLabel[p.category]||categoryLabel[p.type]||'Место');box.append(row);
  if(points[1]&&meters(p.routePoint||p,points[1])<35)continue;
  const label=document.createElement('span');label.textContent=p.name;
  L.marker(p.routePoint||p,{icon:L.divIcon({className:'scenic-pin',html:String(i+1),iconSize:[28,28],iconAnchor:[14,14]})}).bindTooltip(label).addTo(layer);
 }
 const description=document.createElement('p');description.className='field-note';description.textContent=note;box.append(description);
 if(places.length){const gallery=document.createElement('div');gallery.className='place-photo-grid';box.append(gallery);window.CityRoutePhotos?.render(places,gallery,{tr,focus:p=>{showWalkingMap();map.setView([p.lat,p.lng],17)}});}
}

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

async function build(surprise=false){
 if(!start.value.trim()){status('Выбери начало: введи адрес, нажми «Моё положение» или отметь точку на карте.','Choose a start: enter an address, use My location, or tap the map.',true);start.setAttribute('aria-invalid','true');start.focus();return}
 cancel();const id=generation,abort=new AbortController();controller=abort;const timer=setTimeout(()=>abort.abort('timeout'),90000);busy(true);resetRoute();status('Строим пеший маршрут…','Building your walking route…');
 try{await window.CityRouteAI.apply(abort.signal);if(id!==generation)return;const a=await resolve(start,0,abort.signal);const loop=document.querySelector('[name="routeMode"]:checked').value==='loop';const autoEnd=!loop&&!end.value.trim();const b=loop?a:autoEnd?null:await resolve(end,1,abort.signal);if(id!==generation)return;
  mark(0,a,start.value);if(b&&!loop)mark(1,b,end.value);else{points[1]=null;googleBridge?.point(1,null);if(markers[1])map.removeLayer(markers[1]);markers[1]=null}
  const hours=Number($('walkTime').value);const distance=Math.min(Number($('distance').value)||3,pref('short')?3:Infinity,hours?hours*3:Infinity),kind=$('routeStyle').value;let selectedPlaces=[],scenicNote='';
  const placesTask=kind!=='direct'&&!chosen.length?scenicPlaces(a,loop?null:b,distance,kind,abort.signal).then(value=>({value}),error=>({error})):null;
  async function getPlaces(){const result=await placesTask;if(result?.error)throw result.error;return result?.value||[]}
  let avoidanceLoadNote='';
  status('Подбираем путь с учётом пожеланий…','Finding a route with your preferences…');
  try{avoidance=await RouteAvoidance.load([a,...(b?[b]:[]),...chosen],distance,{malls:pref('malls'),traffic:pref('traffic'),noise:pref('noise'),crowds:pref('crowds')},abort.signal)}
  catch(e){if(abort.signal.aborted)throw e;avoidance={bounds:null,zones:[]};avoidanceLoadNote='Не удалось проверить зоны обхода. Построен обычный пеший маршрут.'}
  if(id!==generation)return;
  // OSRM's public walking endpoint is a secondary source when Valhalla is unavailable.
  function encodeLine(coords){let lastLat=0,lastLng=0,out='';for(const p of coords){const lat=Math.round(p[0]*1e6),lng=Math.round(p[1]*1e6);for(let x of [lat-lastLat,lng-lastLng]){x=x<0?~(x<<1):x<<1;while(x>=0x20){out+=String.fromCharCode((0x20|(x&0x1f))+63);x>>=5;}out+=String.fromCharCode(x+63)}lastLat=lat;lastLng=lng}return out}
  async function osrmWalking(waypoints){
    const coords=waypoints.map(p=>p.lng+','+p.lat).join(';');let err;
    for(const endpoint of ['https://routing.openstreetmap.de/routed-foot/route/v1/driving/','https://router.project-osrm.org/route/v1/foot/']){
      try{const url=endpoint+coords+'?overview=false&geometries=geojson&steps=true';const r=await fetch(url,{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(11000)])});if(!r.ok)throw Error('OSRM HTTP '+r.status);const j=await r.json();if(j.code!=='Ok'||!j.routes?.[0]?.legs?.length)throw Error('No walking path');const best=j.routes[0];
       const legs=best.legs.map((leg,i)=>{const coords=[];for(const step of leg.steps||[]){for(const [lng,lat] of step.geometry?.coordinates||[]){const prev=coords.at(-1);if(!prev||Math.abs(prev[0]-lat)+Math.abs(prev[1]-lng)>1e-9)coords.push([lat,lng]);}}if(coords.length<2)throw Error('Missing walking geometry');return {shape:encodeLine(coords),summary:{length:leg.distance/1000,time:leg.duration}}});
       if(legs.length!==waypoints.length-1)throw Error('Missing walking segments');return {trip:{legs,summary:{length:best.distance/1000,time:best.duration}},avoidanceNote:'Резервный пешеходный маршрут; дополнительные обходы дорог и ТЦ не подтверждены.'};
      }catch(e){if(abort.signal.aborted)throw e;err=e}
    }throw err||Error('Walking routing unavailable');
  }
  async function route(waypoints){
    const payload={locations:waypoints.map(p=>({lat:p.lat,lon:p.lng})),costing:'pedestrian',costing_options:{pedestrian:{walkway_factor:kind==='direct'?1:.65,alley_factor:2,driveway_factor:5}},directions_options:{units:'kilometers'}};
    const excluded=new Set();let original=null;
    for(let attempt=0;attempt<4;attempt++){
     if(excluded.size)payload.exclude_polygons=[...excluded].map(RouteAvoidance.polygon);
     let result;
     try{
      const response=await fetch('https://valhalla1.openstreetmap.de/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(12000)])});
      if(!response.ok)throw Error('Сервис маршрутов не отвечает. Попробуй ещё раз.');
      result=await response.json();
      if(result.error||!result.trip?.legs?.length)throw Error('Не найден доступный пеший путь. Выбери другие точки.');
     }catch(e){if(abort.signal.aborted)throw e;if(!original)return await osrmWalking(waypoints);break}
     if(!original)original=result;
     const path=pathOf(result);
     if(avoidance.bounds&&path.some(p=>!RouteAvoidance.inside(p,avoidance.bounds))){original.avoidanceNote='Часть пути за пределами проверенной области: пожелания об обходе не подтверждены.';break}
     const conflicts=RouteAvoidance.hits(path,avoidance.zones);
     if(!conflicts.length){result.avoidanceNote=avoidanceLoadNote;return result}
     original.avoidanceNote='Не удалось полностью обойти: '+[...new Set(RouteAvoidance.hits(pathOf(original),avoidance.zones).map(r=>r.label))].join(', ')+'. Показан обычный пеший маршрут.';
     if(waypoints.some(p=>RouteAvoidance.hits([[p.lat,p.lng]],avoidance.zones).length))break;
     conflicts.forEach(r=>excluded.add(r));if(excluded.size>160)break;
    }
    return original;
  }
  let data;
  if(loop){
   if(chosen.length){
    const remaining=[...chosen],ordered=[];let current=a;while(remaining.length){remaining.sort((p,q)=>meters(current,p)-meters(current,q));current=remaining.shift();ordered.push(current)}
    data=await route([a,...ordered,a]);selectedPlaces=ordered.map((p,i)=>({...p,routePoint:decode(data.trip.legs[i].shape).at(-1)}));
   }else{
    let options=[];
    if(kind!=='direct')try{const places=await getPlaces();if(id!==generation)return;drawPlaces(places);options=places.filter(p=>wantedPlace(p,kind)&&meters(a,p)>200&&meters(a,p)<distance*450)}catch(e){if(abort.signal.aborted)throw e;scenicNote=tr('Поиск мест недоступен. Круговой маршрут построен по улицам.','Place search is unavailable. Round trip follows streets.')}
    const angle=surprise?Math.random()*360:270;let bestPlaces=[];
    for(let attempt=0;attempt<3;attempt++){
     const first=destination(a,distance*.25,angle+attempt*120),second=destination(a,distance*.25,angle+attempt*120+60);
     const near=point=>[...options].sort((p,q)=>(meters(p,point)-beauty(p)*.35)-(meters(q,point)-beauty(q)*.35)).find(p=>meters(p,point)<distance*140);
     const p=near(first),q=near(second);
     const stops=[p||first,q&&q.id!==p?.id?q:second];
     try{const candidate=await route([a,...stops,a]);if(id!==generation)return;
      if(!data||Math.abs(candidate.trip.summary.length-distance)<Math.abs(data.trip.summary.length-distance)){data=candidate;bestPlaces=stops.flatMap((place,i)=>place.name?[{...place,routePoint:decode(candidate.trip.legs[i].shape).at(-1)}]:[])}
      if(candidate.trip.summary.length>=distance*.55&&candidate.trip.summary.length<=distance*1.5)break;
     }catch(e){if(abort.signal.aborted)throw e}
    }
    if(!data||data.trip.summary.length>distance*1.8)throw Error(tr('Не найден круговой маршрут нужной длины. Измени начало или длину.','No round trip of this length found. Change the start or distance.'));
    selectedPlaces=bestPlaces;
   }
  }
  if(!data&&chosen.length){
   const remaining=[...chosen],ordered=[];let current=a;
   while(remaining.length){remaining.sort((p,q)=>meters(current,p)-meters(current,q));current=remaining.shift();ordered.push(current)}
   data=await route([a,...ordered,...(b?[b]:[])]);
   if(repeats(pathOf(data)))throw Error(tr('Эти остановки требуют обратного пути. Убери одну или выбери другие места.','These stops require backtracking. Remove one or choose other places.'));
   selectedPlaces=ordered.map((p,i)=>({...p,routePoint:decode(data.trip.legs[i].shape).at(-1)}));
  }
  if(!data&&kind!=='direct'){
    status('Подбираем красивые места рядом…','Finding scenic places nearby…');
    try{
      let places=await getPlaces();if(id!==generation)return;drawPlaces(places);const preferred=places.filter(p=>wantedPlace(p,kind));places=preferred.length?preferred:places.filter(p=>wantedPlace(p,kind,true));
      const direct=b?meters(a,b):distance*700;
      places=places.filter(p=>meters(a,p)>300&&(b?meters(a,p)+meters(p,b)<direct*1.5+300:meters(a,p)>distance*300&&meters(a,p)<distance*1100));
      places.sort((p,q)=>{
        const score=x=>Math.abs((meters(a,x)+(b?meters(x,b):0))-(b?direct:distance*700))-beauty(x);
        return score(p)-score(q);
      });
      if(surprise){places=places.slice(0,12).filter(p=>p.id!==lastScenicId);for(let i=places.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[places[i],places[j]]=[places[j],places[i]]}}
      for(const place of places.slice(0,3)){
        try{
          // Insert distinct stops where they add the least walking distance.
          const stops=[place],pool=preferred.filter(p=>p.id!==place.id&&meters(a,p)>120).sort((p,q)=>beauty(q)-beauty(p)).slice(0,100);
          const target=Math.min(4,Math.max(2,Math.round(distance/1.5)));
          while(stops.length<target){
            const chain=[a,...stops,...(b?[b]:[])];let best=null;
            const base=chain.slice(1).reduce((n,p,i)=>n+meters(chain[i],p),0);
            for(const p of pool){
              if(stops.some(q=>q.id===p.id||meters(q,p)<120))continue;
              for(let j=1;j<chain.length;j++){
                const extra=meters(chain[j-1],p)+meters(p,chain[j])-meters(chain[j-1],chain[j]);
                if(extra>Math.max(350,distance*160)||base+extra>Math.max(distance*1050,direct*1.5))continue;
                const diversity=stops.some(q=>q.category===p.category)?180:0;
                const scenic=-beauty(p)*.55;
                const score=extra+diversity+scenic;
                if(!best||score<best.score)best={p,j,score};
              }
            }
            if(!best)break;stops.splice(best.j-1,0,best.p);
          }
          const candidate=await route([a,...stops,...(b?[b]:[])]);if(id!==generation)return;
          const path=pathOf(candidate);
          const snapped=stops.map((p,i)=>({...p,routePoint:decode(candidate.trip.legs[i].shape).at(-1)}));
          if(snapped.some(p=>!p.routePoint||meters(p,p.routePoint)>250)||repeats(path))continue;
          if(autoEnd&&(candidate.trip.summary.length>distance*1.7||meters(a,path.at(-1))<distance*250))continue;
          if(b&&candidate.trip.summary.length>Math.max(distance*1.5,direct/1000*2.2))continue;
          data=candidate;selectedPlaces=snapped;lastScenicId=place.id;break;
        }catch(e){if(abort.signal.aborted)throw e}
      }
      if(!data)scenicNote=tr('Подходящих мест для выбранного вида прогулки не найдено. Построен обычный маршрут.','No suitable places found for this walk type. Showing a regular route.');
    }catch(e){if(abort.signal.aborted)throw e;scenicNote=tr('Поиск красивых мест временно недоступен. Построен обычный маршрут.','Scenic place search is unavailable. Showing a regular route.');}
  }

  if(!data&&autoEnd){
    const angle=surprise?Math.random()*360:300;
    let lastError;
    for(const bearing of [angle,angle+100,angle+220]){
      try{
        const candidate=await route([a,destination(a,distance*.72,bearing)]);
        if(id!==generation)return;
        const path=candidate.trip.legs.flatMap(l=>decode(l.shape));
        const finish=path.at(-1);
        if(!finish||L.latLng(a).distanceTo(finish)<distance*350)continue;
        if(!data||Math.abs(candidate.trip.summary.length-distance)<Math.abs(data.trip.summary.length-distance))data=candidate;
        if(data.trip.summary.length<=distance*1.35&&data.trip.summary.length>=distance*.6)break;
      }catch(e){if(abort.signal.aborted)throw e;lastError=e}
    }
    if(!data)throw lastError||Error(tr('Не удалось подобрать конечную точку. Попробуй другое начало.','Could not find a destination. Try another start.'));
    if(data.trip.summary.length>distance*1.8)throw Error(tr('Подходящий по длине путь не найден. Выбери другое начало или укажи конец.','No route of a suitable length found. Choose another start or a destination.'));
  }else if(!data){
    if(L.latLng(a).distanceTo(b)<80)throw Error(tr('Начало и конец слишком близко. Выбери другую конечную точку.','Start and finish are too close. Choose a different destination.'));
    data=await route([a,b]);
  }
  if(id!==generation)return;
  if(pref('short')&&data.trip.summary.length>3)data.avoidanceNote=[data.avoidanceNote,'Не удалось уложиться в 3 км. Показан более длинный пеший путь.'].filter(Boolean).join(' ');
  const path=data.trip.legs.flatMap(l=>decode(l.shape));if(path.length<2)throw Error(tr('Маршрут пуст. Выбери другое начало.','Empty route. Choose another starting point.'));
  if(autoEnd){const finish=path.at(-1);mark(1,{lat:finish[0],lng:finish[1]},tr('Конец выбран автоматически','Destination chosen automatically'),false)}
  routeLayer=L.featureGroup([L.polyline(path,{color:'#fff',weight:10,opacity:.95,lineCap:'round'}),L.polyline(path,{color:'#315bea',weight:6,opacity:1,lineCap:'round'})]).addTo(map);
  if(kind!=='direct'||selectedPlaces.length||data.avoidanceNote)showScenic(selectedPlaces,[data.avoidanceNote,scenicNote].filter(Boolean).join(' ')||tr('Маршрут через места, отмеченные в OpenStreetMap. Доступность и часы работы уточняй перед посещением.','Route via a place mapped in OpenStreetMap. Check access and opening hours before visiting.'),routeLayer);
  if(document.querySelector('[name="transport"]:checked')?.value==='transit')showTransport(data,selectedPlaces,loop);
  itinerary?.show({data,places:selectedPlaces,points:points.map(p=>p&&({...p})),loop,city:city.value,style:$('routeStyle').value,transit:document.querySelector('[name=transport]:checked')?.value==='transit',note:[data.avoidanceNote,scenicNote].filter(Boolean).join(' '),settings:captureSettings()});
  currentRoutePath=path;googleBridge?.route(path);updateYandex();showWalkingMap();$('rerollRoute').hidden=false;
  map.fitBounds(routeLayer.getBounds(),{padding:[50,50],maxZoom:16});$('routeDetail').textContent=data.trip.summary.length.toFixed(1)+' '+tr('км','km')+' · '+Math.max(1,Math.round(data.trip.summary.time/60))+' '+tr('мин','min');
  status(loop?'Круговой маршрут готов: финиш у старта.':selectedPlaces.length?'Маршрут готов. Остановок: '+selectedPlaces.length+'.':autoEnd?(surprise?'Случайный маршрут готов. Финиш — у точки Б.':'Маршрут готов. Финиш выбран автоматически — точка Б.'):'Маршрут до конечной точки готов.',loop?'Round trip ready: finish at the start.':selectedPlaces.length?'Your scenic route is ready.':autoEnd?'Your route is ready. The selected destination is point B.':'Your route to the destination is ready.');scrollMap();
 }catch(e){if(id!==generation)return;status(abort.signal.reason==='timeout'?'Сервис долго не отвечает. Попробуй ещё раз.':e.message||'Не удалось построить маршрут.',abort.signal.reason==='timeout'?'Service timed out. Please try again.':e.message||'Could not build route.',true)}finally{clearTimeout(timer);if(id===generation){busy(false);controller=null}}
}
document.querySelectorAll('[data-preference], [name=transport], [name=mood]').forEach(input=>input.addEventListener('change',()=>{cancel();resetRoute();avoidance=null;status('Настройки изменены. Построй маршрут заново.','Preferences changed. Rebuild your route.')}));
form.addEventListener('submit',e=>{e.preventDefault();build()});$('buildMap').onclick=()=>build();$('surprise').onclick=()=>build(true);$('rerollRoute').onclick=()=>build(true);
$('clearReal').onclick=()=>{googleBridge?.clear();chosen=[];drawChosen();if(poiLayer)map.removeLayer(poiLayer);nearby=[];$('placesList').replaceChildren();googleBridge?.places([],choosePlace);$('placesStatus').textContent='';cancel();resetRoute();points=[null,null];markers.forEach(m=>m&&map.removeLayer(m));markers=[null,null];start.value=end.value='';start.removeAttribute('aria-invalid');end.removeAttribute('aria-invalid');pickMode=0;status('Нужна только начальная точка.','Only a starting point is needed.')};
$('locateReal').onclick=()=>{if(!navigator.geolocation){status('Геолокация недоступна. Введи адрес.','Location is unavailable. Enter an address.',true);return}status('Определяем твоё положение…','Finding your location…');navigator.geolocation.getCurrentPosition(pos=>{cancel();resetRoute();const p={lat:pos.coords.latitude,lng:pos.coords.longitude};mark(0,p,tr('Моё положение','My location'));map.setView(p,15);status('Начало выбрано. Нажми «Построить маршрут».','Start selected. Click Build route.')},()=>status('Не удалось определить положение. Введи адрес или выбери точку на карте.','Could not find your location. Enter an address or use the map.',true),{enableHighAccuracy:false,timeout:10000})};

function captureSettings(){return [...form.querySelectorAll('input,select,textarea')].filter(e=>e.id||e.name||e.dataset.preference).map(e=>({id:e.id,name:e.name,value:e.value,preference:e.dataset.preference,checked:e.checked}));}
function restoreSettings(settings){for(const saved of settings||[]){const el=[...form.querySelectorAll('input,select,textarea')].find(e=>saved.id?e.id===saved.id:saved.preference?e.dataset.preference===saved.preference:e.name===saved.name&&e.value===saved.value);if(!el)continue;if(el.type==='checkbox'||el.type==='radio')el.checked=!!saved.checked;else el.value=saved.value;}syncPeople();syncRouteMode();}
itinerary=window.CityRouteItinerary.create({decode,tr,focus:p=>{map.setView([p.lat,p.lng],17);googleBridge?.view(p,17);},fit:()=>$('fitRoute').click(),restore:r=>{
 cancel();resetRoute();restoreSettings(r.settings);city.value=r.city;chosen=[];drawChosen();if(poiLayer)map.removeLayer(poiLayer);nearby=[];$('placesList').replaceChildren();googleBridge?.clear();googleBridge?.places([],choosePlace);
 points=[null,null];markers.forEach(m=>m&&map.removeLayer(m));markers=[null,null];r.points.forEach((p,i)=>{if(p)mark(i,p,p.label)});
 const path=pathOf(r.data);routeLayer=L.featureGroup([L.polyline(path,{color:'#fff',weight:10}),L.polyline(path,{color:'#315bea',weight:6})]).addTo(map);showScenic(r.places,r.note,routeLayer);if(r.transit)showTransport(r.data,r.places,r.loop);currentRoutePath=path;googleBridge?.route(path);updateYandex();showWalkingMap();$('rerollRoute').hidden=false;map.fitBounds(routeLayer.getBounds(),{padding:[50,50],maxZoom:16});$('routeDetail').textContent=r.data.trip.summary.length.toFixed(1)+' '+tr('км','km');status('Открыт сохранённый маршрут.','Saved route opened.');scrollMap();
}});
try{const raw=sessionStorage.getItem('cityroute-open-walk');if(raw){sessionStorage.removeItem('cityroute-open-walk');const saved=JSON.parse(raw);if(window.CityRouteItinerary.valid(saved))itinerary.open(saved);}}catch{status('Не удалось открыть сохранённый маршрут.','Could not open saved route.',true);}
showWalkingMap();status('Нужна только начальная точка.','Only a starting point is needed.');
// Search starts only on user request; never block the initial page with a POI lookup.
if(window.CityRouteMapConfig?.googleMapsApiKey)window.initGoogleMap({
 key:window.CityRouteMapConfig.googleMapsApiKey,
 onClick:p=>map.fire('click',{latlng:L.latLng(p)}),
 onDrag:(i,p)=>{markers[i]?.setLatLng(p).fire('dragend')},
 onView:(p,z)=>{const c=map.getCenter();if(Math.abs(c.lat-p.lat)>1e-7||Math.abs(c.lng-p.lng)>1e-7||map.getZoom()!==z)map.setView(p,z,{animate:false})},
 onFailure:()=>{if(!map.hasLayer(tiles))tiles.addTo(map);$('mapProvider').textContent=tr('Резервная карта OpenStreetMap — Google Maps недоступна.','Fallback OpenStreetMap — Google Maps is unavailable.')}
}).then(bridge=>{
 googleBridge=bridge;map.removeLayer(tiles);
 map.on('moveend',()=>googleBridge.view(map.getCenter(),map.getZoom()));
 new ResizeObserver(()=>googleBridge.resize()).observe($('googleMap'));
 googleBridge.view(map.getCenter(),map.getZoom());
 points.forEach((p,i)=>{if(p)googleBridge.point(i,p,p.label)});
 if(routeLayer)googleBridge.route(currentRoutePath);
 googleBridge.stops(currentRoutePlaces);googleBridge.places(nearby.slice(0,180),choosePlace);
 $('mapProvider').textContent='Google Maps · '+tr('Места и пешие маршруты: OpenStreetMap','Places and walking routes: OpenStreetMap');
}).catch(()=>{$('mapProvider').textContent=tr('Резервная карта OpenStreetMap — Google Maps недоступна.','Fallback OpenStreetMap — Google Maps is unavailable.');});
})();
