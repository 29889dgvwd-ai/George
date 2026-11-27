(()=>{
'use strict';
const $=id=>document.getElementById(id),start=$('startPoint'),end=$('endPoint'),city=$('city');
const form=$('routeForm'),buttons=[$('buildReal'),$('buildMap'),$('surprise'),$('nearbyPlaces'),$('findPlacesTop')];
const world=window.CityRouteWorld;
let areaCenter=null,areaController=null,searchController=null,areaRevision=0,areaTimer=0,requestedArea=null;
let currentRoutePath=[],currentRoutePlaces=[];let itinerary=null;let avoidance=null;let map,points=[null,null],routeLayer=null,generation=0,controller=null;
let skipFoodStop=false;
let yandexFallbackStops=null,lastLocated=null,locationPending=false;
const english=()=>document.body.classList.contains('english');
const tr=(ru,en)=>english()?en:ru;
function status(ru,en,error=false){for(const el of [$('formStatus'),$('routeStatus')]){el.textContent=tr(ru,en||ru);el.setAttribute('role',error?'alert':'status')}}
function busy(value){buttons.forEach(b=>{b.disabled=value;b.setAttribute('aria-busy',String(value))});$('buildReal').querySelector('.ru').textContent=value?'Строим маршрут…':'Построить маршрут';$('buildReal').querySelector('.en').textContent=value?'Building…':'Build route'}
function cancel(){generation++;controller?.abort();controller=null;busy(false)}
function resetRoute(){currentRoutePath=[];currentRoutePlaces=[];yandexFallbackStops=null;$('rerollRoute').hidden=true;updateYandex();itinerary?.clear();$('itinerary').replaceChildren();$('transportResult').replaceChildren();$('transportResult').hidden=true;if(routeLayer){map?.removeLayer(routeLayer);routeLayer=null}$('routeDetail').textContent=''}
function showWalkingMap(){document.body.classList.add('yandex-widget-active');$('mapProvider').textContent=tr('Яндекс Карты · пеший путь по выбранным остановкам','Yandex Maps · walking route via your selected stops');updateYandex();}
function updateYandex(){
 const transit=document.querySelector('[name=transport]:checked')?.value==='transit';
 const badge=document.querySelector('.walking-badge');if(badge)badge.textContent=transit?tr('Пешком + транспорт','Walk + transit'):tr('Пешком','Walking');
 $('mapProvider').textContent=transit?tr('Яндекс Карты · общественный транспорт и пешие переходы','Yandex Maps · public transport and walking'):tr('Яндекс Карты · пеший путь по выбранным остановкам','Yandex Maps · walking route via your selected stops');
 const coord=p=>Array.isArray(p)?p:([p?.lat,p?.lng]);
 const fmt=p=>{
  if(typeof p==='string'){
   const value=p.trim();if(!value)return '';
   if(/^[-+]?\d+\.\d+,\s*[-+]?\d+\.\d+$/.test(value))return value.replace(/\s+/g,'');
   const area=city.value.trim();return area&&!value.toLocaleLowerCase().includes(area.toLocaleLowerCase())?area+', '+value:value;
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
 if(list.length>1){params.set('rtext',list.join('~'));params.set('rtt',transit?'mt':'pd')}
 else if(hasCoords){const [lat,lng]=list[0].split(',');params.set('ll',lng+','+lat);params.set('z','17')}
 else{
  if(list.length)params.set('text',list[0]);
  const center=areaCenter||world.region(city.value);
  if(center){params.set('ll',center.lng+','+center.lat);params.set('z','14')}
  else if(!list.length&&city.value.trim())params.set('text',city.value.trim());
 }
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
$('language').onclick=()=>{document.body.classList.toggle('english');document.documentElement.lang=english()?'en':'ru';$('language').textContent=english()?'RU':'EN';itinerary?.render();start.placeholder=tr('Адрес, парк или место','Address, park or place');end.placeholder=tr('Можно оставить пустым','Optional');updateYandex();status('','')};
const pref=name=>Boolean(document.querySelector('[data-preference="'+name+'"]:checked'));
function syncPeople(){
 const count=$('company-alone').checked?'1':$('company-date').checked?'2':null;
 document.querySelectorAll('[name="people"]').forEach(input=>{input.disabled=Boolean(count&&input.value!==count);if(count)input.checked=input.value===count});

}
document.querySelectorAll('[name="company"]').forEach(input=>input.addEventListener('change',()=>{syncPeople();cancel();resetRoute()}));syncPeople();
function syncRouteMode(){const loop=document.querySelector('[name="routeMode"]:checked').value==='loop';end.disabled=loop;end.placeholder=loop?tr('Вернёмся к началу','Return to start'):tr('Можно оставить пустым','Optional');cancel();resetRoute();status('','')}
document.querySelectorAll('[name="routeMode"]').forEach(input=>input.addEventListener('change',syncRouteMode));
// Find Places button logic below opens the list and searches.
const amount=$('budgetAmount'),range=$('budgetRange');function budget(v){const n=Math.max(0,Math.min(50000,Math.round(Number(v)/500)*500));amount.value=Number.isFinite(n)?n:0;range.value=amount.value}range.oninput=()=>budget(range.value);amount.oninput=()=>{if(amount.value!=='')range.value=Math.max(0,Math.min(50000,Number(amount.value)))};amount.onchange=()=>{if(amount.value!=='')budget(amount.value);else range.value=0};
// Reject whole profane words without persistent messages or substring matches in addresses.
const forbidden=/(^|[^\p{L}])(хуй\p{L}*|пизд\p{L}*|бляд\p{L}*|сука|ебать|ебан\p{L}*|мудак)(?=$|[^\p{L}])/iu;
for(const f of [city,start,end,$('gptNotes')]){let clean=f.value;f.addEventListener('input',()=>{if(forbidden.test(f.value))f.value=clean;else clean=f.value})}
map={removeLayer(){}};
 // The visible Yandex map, place list and GPS no longer require Leaflet.
for(const [field,i] of [[start,0],[end,1]])field.addEventListener('input',()=>{cancel();points[i]=null;resetRoute();if(i===0){invalidateSearch();chosen=[];drawChosen();drawPlaces([]);lastLocated=null;$('locationStatus').textContent='';$('locationOnMap').hidden=true}field.removeAttribute('aria-invalid');status('','')});
function invalidateSearch(){
 placesRequestId++;searchController?.abort();clearTimeout(placeSearchTimer);
}
function changeArea(){
 clearTimeout(areaTimer);requestedArea=null;areaRevision++;areaController?.abort();areaCenter=null;invalidateSearch();
 if(points[0]&&start.value===points[0].label)start.value='';
 if(points[1]&&end.value===points[1].label)end.value='';
 chosen=[];drawChosen();drawPlaces([]);$('placeQuery').value='';$('placesStatus').textContent='';
 $('locationStatus').textContent='';$('locationOnMap').hidden=true;
 cancel();points=[null,null];lastLocated=null;resetRoute();status('','');$('saveStatus').textContent='';updateSearchLink();
 const seed=world.region(city.value);
 window.CityRouteReady.setArea(city.value.trim(),seed,seed?.items||[],seed?'':'idle');
}
function commitArea(){
 clearTimeout(areaTimer);
 const name=city.value.trim();if(!name||name===requestedArea)return;
 requestedArea=name;void refreshCollections();
}
city.addEventListener('input',()=>{changeArea();if(city.value.trim()&&!world.region(city.value))areaTimer=setTimeout(commitArea,650)});
city.addEventListener('change',commitArea);

async function refreshCollections(anchor){
 const rev=++areaRevision;areaController?.abort();areaController=new AbortController();
 const signal=areaController.signal,area=city.value.trim(),seed=anchor?world.regionAt(anchor):world.region(area);
 areaCenter=anchor||seed;
 if(seed){window.CityRouteReady.setArea(area||seed.name,areaCenter,seed.items);updateYandex();return}
 window.CityRouteReady.setArea(area,anchor,[],'loading');
 try{
  const center=anchor||await world.cityCenter(area,signal);if(rev!==areaRevision)return;
  areaCenter=center;updateYandex();
  if(!center){window.CityRouteReady.setArea(area,null,[],'empty');return}
  const pool=await world.nearby(center,3000,signal);
  if(rev===areaRevision)window.CityRouteReady.setArea(area,center,pool);
 }catch{if(rev===areaRevision)window.CityRouteReady.setArea(area,anchor,[],'error')}
}
document.addEventListener('cityroute:retry-area',()=>refreshCollections(lastLocated));
$('fitRoute').onclick=()=>window.open($('yandexNav').href,'_blank','noopener,noreferrer');
$('expandMap').onclick=()=>{const expanded=$('mapSection').classList.toggle('expanded-map');$('expandMap').setAttribute('aria-pressed',String(expanded));$('expandMap').querySelector('.ru').textContent=expanded?'Свернуть':'Развернуть';$('expandMap').querySelector('.en').textContent=expanded?'Collapse':'Expand'};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('mapSection').classList.contains('expanded-map'))$('expandMap').click()});
for(const field of [$('distance'),$('routeStyle'),$('walkTime')])field.onchange=()=>{if(field===$('routeStyle')){chosen=[];drawChosen();document.querySelectorAll('[data-preference]').forEach(el=>{if(window.CityRoutePlaces.interestCategories[el.dataset.preference])el.checked=false;});}cancel();resetRoute();};
function decode(shape){let i=0,lat=0,lng=0,res=[];function number(){let b=0,n=0,shift=0;do{if(i>=shape.length||shift>30)throw Error('Invalid route geometry');b=shape.charCodeAt(i++)-63;n|=(b&31)<<shift;shift+=5}while(b>=32);return n&1?~(n>>1):n>>1}while(i<shape.length){lat+=number();lng+=number();res.push([lat/1e6,lng/1e6])}return res}
const categoryLabel={bakery:'Пекарня',cafe:'Кафе',restaurant:'Ресторан',museum:'Музей',malls:'ТЦ',parks:'Парк / сад',water:'Набережная / смотровая',sights:'Достопримечательность',culture:'Культура',books:'Книжный',art:'Искусство'};
let poiLayer=null,nearby=[],chosen=[],placesRequestId=0,placeSearchTimer=0;
function pathOf(data){return data.trip.legs.flatMap(l=>decode(l.shape))}
function drawChosen(){
 const box=$('chosenStops');box.replaceChildren();for(const p of chosen){const button=document.createElement('button');button.type='button';button.textContent=p.name+' ×';button.onclick=()=>{chosen=chosen.filter(x=>x.id!==p.id);cancel();resetRoute();drawChosen();drawPlaces(nearby)};box.append(button)}
}
function choosePlace(p){
 if(chosen.some(x=>x.id===p.id))chosen=chosen.filter(x=>x.id!==p.id);
 else if(chosen.length<3)chosen.push(p);else{status('Можно выбрать до трёх остановок. Сначала убери одну.','Choose up to three stops. Remove one first.',true);return}
 cancel();resetRoute();drawChosen();drawPlaces(nearby);status('','');
}
function anchorForSearch(){
 return points[0]?.label===start.value?points[0]:world.point(start.value)||world.localPlace(start.value,world.region(city.value));
}
function backupPlaces(){
 const anchor=anchorForSearch()||areaCenter||world.region(city.value);
 const region=world.regionAt(anchor);
 if(!region)return [];
 return region.items.filter(p=>!pref('malls')||p.type!=='malls').sort((a,b)=>window.CityRoutePlaces.haversine(anchor,a)-window.CityRoutePlaces.haversine(anchor,b));
}
function filterPlaceQuery(places){
 const q=window.CityRoutePlaces?.norm($('placeQuery')?.value||'')||String($('placeQuery')?.value||'').toLowerCase();
 return q?places.filter(p=>(window.CityRoutePlaces?.norm(p.name+' '+(p.address||''))||p.name.toLowerCase()).includes(q)):places;
}
let placeListObserver=null;
function renderPlacesList(places,limit=24){
 const list=$('placesList');list.replaceChildren();placeListObserver?.disconnect();
 const anchor=anchorForSearch()||areaCenter;
 const norm=x=>Number.isFinite(x)?x.toFixed(1):null;
 const io=typeof IntersectionObserver==='function'?new IntersectionObserver((entries)=>{
  for(const entry of entries)if(entry.isIntersecting){entry.target.dispatchEvent(new Event('load-photo'));io.unobserve(entry.target)}
 },{root:list,rootMargin:'180px'}):null;
 placeListObserver=io;
 for(const p of places.slice(0,limit)){
  const row=document.createElement('div');row.className='place-list-card';
  const media=document.createElement('div');media.className='place-list-media';
  const placeholder=window.CityRoutePhotos.illustration(p);media.append(placeholder);
  const copy=document.createElement('div');copy.className='place-list-copy';
  const name=document.createElement('strong');name.textContent=p.name;copy.append(name);
  const detail=document.createElement('small');const km=anchor?norm(window.CityRoutePlaces?.haversine(anchor,p)):null;
  detail.textContent=(english()?({food:'Food',parks:'Park',water:'Waterfront',sights:'Landmark',culture:'Culture',books:'Bookshop',art:'Art',bakery:'Bakery',cafe:'Café',restaurant:'Restaurant',museum:'Museum',malls:'Shopping centre',viewpoint:'Viewpoint',theatre:'Theatre'}[p.category]||'Place'):(categoryLabel[p.category]||categoryLabel[p.type]||'Место'))+(km?' · '+km+' '+tr('км от старта','km from start'):'');
  copy.append(detail);
  if(p.type==='food'){
    const avg=document.createElement('div');avg.className='place-list-price';
    avg.textContent=p.check?.label?tr('Средний чек: ','Average bill: ')+p.check.label:tr('Средний чек: нет данных','Average bill: unavailable');
    copy.append(avg);
    appendPriceLink(copy,p);
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
    let index=0;img.referrerPolicy='no-referrer';
    img.onload=()=>{placeholder.hidden=true;window.CityRoutePhotos.credit(media,urls[index]);};
    img.onerror=()=>{if(++index<urls.length)img.src=urls[index];else img.remove()};img.src=urls[0];media.append(img);
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
 $('placesStatus').textContent=tr('Мест: '+visible.length,'Places: '+visible.length);
}
function appendPriceLink(parent,p){
 const menu=p.tags?.['website:menu']||p.tags?.['contact:website']||p.tags?.website;
 let url;try{url=new URL(p.check?.source||menu)}catch{return}
 if(!['https:','http:'].includes(url.protocol))return;
 const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
 link.className='cityroute-price-source';
 link.textContent=p.check?.source?tr('Источник','Source'):p.tags?.['website:menu']?tr('Меню','Menu'):tr('Сайт заведения','Venue website');parent.append(link);
}
$('findPlacesTop').onclick=()=>{
 $('nearbyDisclosure').open=true;
 $('nearbyPlaces').click();
 $('nearbyDisclosure').scrollIntoView({behavior:'smooth',block:'start'});
};
$('placeQuery').oninput=()=>{
 updateSearchLink();
 clearTimeout(placeSearchTimer);
 placeSearchTimer=setTimeout(()=>drawPlaces(nearby.length?nearby:backupPlaces()),150);
};
function updateSearchLink(){
 const anchor=anchorForSearch()||areaCenter,params=new URLSearchParams({text:[city.value.trim(),$('placeQuery').value.trim()].filter(Boolean).join(' ')});
 if(anchor){params.set('ll',anchor.lng+','+anchor.lat);params.set('z','15')}
 $('openYandexSearch').href='https://yandex.ru/maps/?'+params;
}
$('nearbyPlaces').onclick=async()=>{
 invalidateSearch();const id=placesRequestId;
 searchController=new AbortController();const signal=searchController.signal;
 $('nearbyDisclosure').open=true;
 const instant=backupPlaces();drawPlaces(instant);
 if(!instant.length)$('placesStatus').textContent=tr('Ищем места…','Finding places…');
 try{
  const a=anchorForSearch()||await world.locate(start.value,city.value.trim(),signal,areaCenter);
  if(id!==placesRequestId)return;
  if(!a){drawPlaces([]);$('placesStatus').textContent=tr('Не удалось найти адрес или город.','Address or city not found.');return}
  if(start.value.trim())points[0]={...a,label:start.value.trim()};
  const local=world.regionAt(a);let pool;
  if(local===world.moscow){
   const catalog=backupPlaces();drawPlaces(catalog);
   const rows=await window.CityRouteCloud?.listPlaces?.();
   pool=world.mergePlaces([catalog,rows||[]]).sort((p,q)=>window.CityRoutePlaces.haversine(a,p)-window.CityRoutePlaces.haversine(a,q));
  }else pool=await world.nearby(a,3000,signal);
  if(id!==placesRequestId)return;
  if(local!==world.moscow&&pool.length)window.CityRouteReady.setArea(city.value.trim(),a,pool);
  drawPlaces(pool);updateSearchLink();
  if(!pool.length)$('placesStatus').textContent=tr('Рядом не нашлось мест. Попробуй другой адрес.','No places nearby. Try another address.');
 }catch{if(id===placesRequestId&&!instant.length)$('placesStatus').textContent=tr('Поиск мест недоступен. Попробуй ещё раз.','Place search is unavailable. Try again.')}
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
async function buildOnYandex(surprise=false,readyRoute=null,fixedWaypoints=null){
 const source=start.value.trim();
 if(!source){
  status('Введи адрес начала или нажми «Моё положение».','Enter a starting address or select My location.',true);
  start.setAttribute('aria-invalid','true');start.focus();return true;
 }
 cancel();const buildId=generation;resetRoute();busy(true);
 const distanceEngine=window.CityRouteDistance,local=window.CityRoutePlaces;
 const area=city.value.trim();
 const loop=document.querySelector('[name="routeMode"]:checked')?.value==='loop';
 let style=$('routeStyle').value;
 const unrestricted=$('distance').value==='auto';
 let requestedKm=unrestricted?5:Math.max(1,Math.min(35,Number($('distance').value)||5));
 if(unrestricted&&Number($('walkTime').value)>0)requestedKm=Math.max(2,Math.round(Number($('walkTime').value)*3));
 if(pref('short')&&unrestricted)requestedKm=Math.min(requestedKm,3);
 let pickedFood=false;const picked=chosen.filter(p=>{if(p.type!=='food')return true;if(skipFoodStop||pickedFood)return false;pickedFood=true;return true;});
 let plannedStats=null,waypoints=[],extras=[];
 const signal=controller=new AbortController();
 try{
  // Local wishes processing must never block the walking route.
  try{await window.CityRouteAI?.apply?.(signal.signal)}catch{}
  if(buildId!==generation)return true;
  style=$('routeStyle').value;
  const interests=[...document.querySelectorAll('[data-preference]:checked')].map(el=>el.dataset.preference);
  const snapshot=fixedWaypoints||readyRoute?.points;
  const rawFinish=!loop&&end.value.trim();
  const lookup=(field,i)=>points[i]?.label===field.value.trim()?points[i]:world.locate(field.value.trim(),area,signal.signal,areaCenter).catch(()=>null);
  let [a,b]=snapshot?[snapshot[0],snapshot.at(-1)]:[await lookup(start,0),null];
  if(!snapshot&&rawFinish)b=await lookup(end,1);
  if(buildId!==generation)return true;
  const localRegion=distanceEngine.valid(a)?world.regionAt(a):world.region(area);
  if(unrestricted&&a&&b&&!loop&&Number.isFinite(distanceEngine.km(a,b)))requestedKm=Math.max(requestedKm,Math.ceil(distanceEngine.km(a,b)*1.20));
  if(!b&&!rawFinish&&!loop&&a){
   b=distanceEngine.dest(a,Math.max(.6,Math.min(2.5,requestedKm*.29)),surprise?Math.random()*360:65);
   b={...b,name:tr('Финиш прогулки','Walking finish'),generated:true};
  }
  const knowPath=Boolean(a&&(loop||b));
  if(readyRoute||fixedWaypoints){
   waypoints=(fixedWaypoints||readyRoute.points).slice();extras=waypoints.slice(1,-1);
   plannedStats={points:waypoints,measuredKm:null,tooShort:false};
   points[0]=distanceEngine.valid(waypoints[0])?{...waypoints[0],label:source}:null;points[1]=distanceEngine.valid(waypoints.at(-1))?{...waypoints.at(-1),label:end.value}:null;
  }else if(knowPath){
   const turn=surprise?Math.random()*360:(loop?65:90);
   const localPool=localRegion?.items||[];
   const radius=Math.min(6500,Math.max(2300,requestedKm*600));
   const center=loop||!b||b.generated||distanceEngine.km(a,b)>10?a:{lat:(a.lat+b.lat)/2,lng:(a.lng+b.lng)/2};
   const localEnough=localRegion===world.moscow&&localPool.filter(p=>distanceEngine.km(center,p)<radius/1000).length>=8;
   const getPool=localEnough?Promise.resolve(localPool):world.nearby(center,radius,signal.signal).catch(()=>localPool);
   const getPlan=unrestricted&&requestedKm>35&&!loop
    ?{points:[a,b],measuredKm:null,tooShort:false,uncapped:true}
    :distanceEngine.matchLength({
      start:a,end:loop?a:b,targetKm:requestedKm,loop,rotate:turn,signal:signal.signal,
      onProgress:(i,max)=>status('Подбираем маршрут '+requestedKm+' км · попытка '+i+'/'+max+'…','Matching '+requestedKm+' km walk · pass '+i+'/'+max+'…')
     });
   const [plan,pool]=await Promise.all([getPlan,getPool]);plannedStats=plan;
   if(buildId!==generation)return true;
   const midpoint=plan.points.slice(1,-1);
   a=world.identify(a,pool);b=world.identify(b,pool);
   if(pool.length){drawPlaces(pool);if(localRegion!==world.moscow)window.CityRouteReady.setArea(area,a,pool);}
   const selection={start:a,end:b,style,interests,rain:pref('rain'),avoidMalls:pref('malls'),skipFood:skipFoodStop||picked.some(p=>p.type==='food'),excluded:picked.map(p=>p.id),maxDistance:Math.max(2,Math.min(5,requestedKm*.45))};
   const middle=plannedStats.tooShort||!midpoint.length?[]:local.selectStops(pool,midpoint,selection);
   extras=middle.slice();
   const near=target=>pool.filter(p=>p.type!=='food'&&distanceEngine.km(a,p)>.08&&!picked.some(x=>x.id===p.id)&&!middle.some(x=>x.id===p.id)&&p.id!==a.id&&local.matches(p,{...selection,style:style==='food'?'all':style,interests:interests.filter(k=>!['cafe','restaurant','dessert'].includes(k))}))
    .map(p=>({p,d:distanceEngine.km(target,p)})).filter(x=>x.d<=selection.maxDistance).sort((x,y)=>x.d-y.d)[0]?.p||null;
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
    plannedStats={...plannedStats,measuredKm:null};
   }else waypoints=[a,...middle,loop?a:b];
   // Use a real named attraction as the automatic finish when it is close.
   if(!loop&&b?.generated){
     const named=near(b);
     if(named){b=named;waypoints[waypoints.length-1]=named;}
     else if(waypoints.length>2){waypoints.pop();b=waypoints.at(-1);}
     else{status('Рядом не нашлось остановок. Выбери другой старт или укажи финиш.','No stops found nearby. Choose another start or enter a destination.',true);return true}
   }
   // If a named destination replaced a computed point, its actual network distance
   // must be recomputed. Never display a stale kilometer estimate.
   if(loop&&waypoints.length<3){status('Не нашлось остановок для круга. Измени интересы или начальную точку.','No stops for a round trip. Try different interests or a different start.',true);return true}
   extras=waypoints.slice(1,-1);
   if(!plannedStats.tooShort){
    plannedStats={...plannedStats,measuredKm:null};
    try{const recalculated=await distanceEngine.walkingLength(waypoints,{signal:signal.signal,timeoutMs:3000});
      if(recalculated)plannedStats={...plannedStats,measuredKm:recalculated.km,minutes:recalculated.minutes};
    }catch{plannedStats={...plannedStats,measuredKm:null,routerUnavailable:true}}
   }
   if(buildId!==generation)return true;
   points[0]={...a,label:source};
   if(!loop&&b)points[1]={lat:b.lat,lng:b.lng,label:end.value.trim()||b.name||tr('Финиш','Finish')};
  }else if(rawFinish){
   // Never claim a distance-calibrated walking route when endpoints are unknown.
   if(localRegion===world.moscow){
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
  let meal=skipFoodStop;
  const limited=waypoints.filter((p,i)=>{if(i===0||i===waypoints.length-1||p.type!=='food')return true;if(meal)return false;meal=true;return true;});
  if(limited.length!==waypoints.length){waypoints=limited;if(readyRoute)readyRoute={...readyRoute,points:waypoints};extras=waypoints.slice(1,-1).filter(p=>!p.generated);plannedStats={...plannedStats,measuredKm:null};}
  if(waypoints.length<2)return true;
  extras=waypoints.slice(1,-1);
  if(buildId!==generation)return true;
  yandexFallbackStops=waypoints;
  currentRoutePlaces=extras.filter(p=>!p.generated);
  updateYandex();
  const panel=$('itinerary');panel.replaceChildren();
  const heading=document.createElement('h3');heading.className='quick-journey-title';
  heading.textContent=loop?tr('Круговая прогулка','Round-trip walk'):tr('Маршрут','Your route');
  panel.append(heading);
  const measured=plannedStats?.measuredKm;
  if(document.querySelector('[name=transport]:checked')?.value==='transit')$('mapProvider').textContent=tr('Яндекс Карты · общественный транспорт и пешие переходы','Yandex Maps · public transport and walking');
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
  if(readyRoute){
   const estimate=window.CityRouteReady.estimate(readyRoute);
   heading.textContent=tr(...readyRoute.title);
   kmInfo.textContent=tr('План: ≈ '+estimate.minutes+' мин, из них остановки '+estimate.stopMinutes+' мин · ≈ '+estimate.approxKm.toFixed(1)+' км. Точный пеший путь — в Яндексе.','Plan: ≈ '+estimate.minutes+' min, including '+estimate.stopMinutes+' min at stops · ≈ '+estimate.approxKm.toFixed(1)+' km. Confirm the walking route in Yandex.');
  }
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
    if(p?.id&&p?.name)return english()?(p.en||p.name):p.name;
    if(i===0||loop&&i===waypoints.length-1)return readable(source,tr('Моё местоположение','My location'));
    if(i===waypoints.length-1&&end.value.trim())return readable(end.value.trim(),tr('Точка назначения','Destination'));
    if(typeof p==='string')return readable(p,tr('Точка назначения','Destination'));
    return readable(p.name||p.label,tr('Прогулочный ориентир','Walking landmark'));
  };
  const pointCoords=p=>typeof p==='object'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?[p.lat,p.lng]:null;
  const pointText=p=>{const c=pointCoords(p);return c?c.map(x=>x.toFixed(6)).join(','):[area,String(p)].filter(Boolean).join(', ')};
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
   {
    const isFood=p?.type==='food';
    if(isFood){
      const price=document.createElement('div');price.className='cityroute-stop-price';
      price.textContent=p.check?.label?tr('Средний чек: ','Average bill: ')+p.check.label:tr('Средний чек: нет подтверждённых данных','Average bill: not verified');
      body.append(price);
      if(i>0&&i<waypoints.length-1){const remove=document.createElement('button');remove.type='button';remove.className='secondary remove-food-stop';remove.textContent=tr('Убрать остановку на еду','Remove meal stop');remove.onclick=()=>{skipFoodStop=true;chosen=chosen.filter(x=>x.type!=='food');drawChosen();buildOnYandex(false,null,waypoints.filter((x,j)=>j===0||j===waypoints.length-1||x.type!=='food'));};body.append(remove);}
      appendPriceLink(body,p);
    }else if(p?.generated){
      const detail=document.createElement('small');detail.textContent=tr('Ориентир рядом · не подтверждённый вход в заведение','Nearby landmark · not a confirmed venue stop');body.append(detail);
    }
    if(typeof p==='object'&&distanceEngine.valid(p)){
      const media=document.createElement('div');media.className='cityroute-step-media';
      const pictured=p.generated&&p.nearbyReference?p.nearbyReference:p;
      const link=document.createElement('a');
      link.href='https://yandex.ru/maps/?'+new URLSearchParams({ll:pictured.lng+','+pictured.lat,z:'17',text:pictured.name||pictured.label||''}).toString();
      link.target='_blank';link.rel='noopener noreferrer';
      link.textContent=tr('Фотографии и отзывы в Яндексе ↗','Photos and reviews in Yandex ↗');
      link.className='stop-photo-fallback-link';media.append(link);body.prepend(media);
      if(window.CityRoutePhotos?.renderInline && (!p.generated||p.nearbyReference)){
        if(p.generated){const note=document.createElement('small');note.textContent=tr('Фото ориентира поблизости, не этой точки','Photo of a nearby landmark, not this waypoint');media.append(note)}
        window.CityRoutePhotos.renderInline(pictured,media);
      }
    }

    if(!p?.generated&&typeof p==='object'){
      const facts=document.createElement('div');facts.className='cityroute-stop-facts';
      const hours=document.createElement('small');
      hours.textContent=p.tags?.opening_hours?tr('Часы работы (из каталога): ','Hours (catalogue): ')+(p.tags.opening_hours==='24/7'?tr('круглосуточно','24 hours'):p.tags.opening_hours):tr('Часы работы: уточни в Яндексе','Opening hours: check Yandex');
      if(p.tags?.opening_hours)facts.append(hours);if(p.hoursSource){const source=document.createElement('a');source.href=p.hoursSource;source.target='_blank';source.rel='noopener noreferrer';source.textContent=tr('Расписание и изменения','Hours and updates');facts.append(source);}
      const rating=document.createElement('small');
      rating.textContent=p.rating?.value&&p.rating?.source?tr('Рейтинг: ','Rating: ')+p.rating.value:tr('Рейтинг: смотри в Яндексе','Rating: check Yandex');
      if(p.rating?.value&&p.rating?.source)facts.append(rating);if(facts.childElementCount)body.append(facts);
    }
    if(i>0){const prev=waypoints[i-1],leg=document.createElement('div');leg.className='cityroute-step-leg';
    const url=new URL('https://yandex.ru/maps/');
    url.search=new URLSearchParams({rtext:pointText(prev)+'~'+pointText(p),rtt:'pd'}).toString();
    const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';
    a.textContent=tr('Пеший переход ↗','Walking directions ↗');leg.append(a);
    const c1=pointCoords(prev),c2=pointCoords(p);
    if(c1&&c2){const d=distanceEngine.km({lat:c1[0],lng:c1[1]},{lat:c2[0],lng:c2[1]});
     if(Number.isFinite(d)){
      const note=document.createElement('span');
      const min=Math.max(1,Math.round(d*1.25/4.2*60));
      note.textContent=tr('≈ '+(d*1.25).toFixed(1)+' км · '+min+' мин пешком','≈ '+(d*1.25).toFixed(1)+' km · '+min+' min walk');
      leg.append(note)
     }
    }
    if(document.querySelector('[name=transport]:checked')?.value==='transit'){const transit=document.createElement('a');const transitUrl=new URL(url);transitUrl.searchParams.set('rtt','mt');transit.href=transitUrl.href;transit.target='_blank';transit.rel='noopener noreferrer';transit.textContent=tr('Этот участок на транспорте','Take public transport for this leg');leg.append(transit);}
    body.append(leg);}
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
    const entry={v:3,id:crypto.randomUUID?.()||String(Date.now()),city:area,start:source,finish:end.value.trim(),loop,style,transport:document.querySelector('[name=transport]:checked')?.value||'walk',stops:extras,waypoints,distanceKm:measured||null,requestedKm,readyRouteId:readyRoute?.id||null};
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
  const share=document.createElement('button');share.type='button';share.className='secondary cityroute-share-route';
  share.textContent=tr('Поделиться маршрутом ↗','Share route ↗');
  share.onclick=async()=>{
   const url=action.href;
   try{
    if(navigator.share){await navigator.share({title:'CityRoute',url});return;}
    if(navigator.clipboard){await navigator.clipboard.writeText(url);$('saveStatus').textContent=tr('Ссылка скопирована — отправь её другу.','Link copied — send it to a friend.');return;}
   }catch(error){if(error.name==='AbortError')return;}
   window.prompt(tr('Скопируй ссылку на маршрут:','Copy route link:'),url);
  };
  panel.append(action,save,share);
  if(skipFoodStop){const restore=document.createElement('button');restore.type='button';restore.className='secondary';restore.textContent=tr('Добавить остановку на еду','Add a meal stop');restore.onclick=()=>{skipFoodStop=false;buildOnYandex();};panel.append(restore);}
  if(document.querySelector('[name="transport"]:checked')?.value==='transit'){
   const box=$('transportResult');box.hidden=false;box.replaceChildren();
   const a=document.createElement('a');a.className='secondary inline-link';a.target='_blank';a.rel='noopener noreferrer';
   const url=new URL($('yandexNav').href);url.searchParams.set('rtt','mt');a.href=url.href;
   a.textContent=tr('На транспорте ↗','Public transport ↗');box.append(a);
  }
  if(localRegion===world.moscow&&!nearby.length)drawPlaces(backupPlaces());
  $('routeDetail').textContent=unrestricted
   ?(Number.isFinite(measured)?tr('Пешком ≈ '+measured.toFixed(1)+' км · без лимита','Walking ≈ '+measured.toFixed(1)+' km · unlimited'):tr('Без ограничения · проверить в Яндексе','Unlimited · check Yandex'))
   :(Number.isFinite(measured)?tr('Пешком ≈ '+measured.toFixed(1)+' км · цель '+requestedKm,'Walking ≈ '+measured.toFixed(1)+' km · target '+requestedKm):tr('Цель '+requestedKm+' км · проверить в Яндексе','Target '+requestedKm+' km · check Yandex'));
  $('rerollRoute').hidden=false;
  if(plannedStats?.tooShort)status('Маршрут на '+requestedKm+' км не построен: финиш слишком далеко. Выбери другой финиш или круговой маршрут.','No '+requestedKm+' km route built: destination is too far. Choose another destination or a round trip.',true);
  else if(!extras.length&&!readyRoute&&!fixedWaypoints)status('Маршрут между точками. Дополнительных остановок не найдено.','Route between endpoints. No additional stops found.');
  else status('Маршрут готов.','Route ready.');
  scrollMap();return true;
 }catch(error){
  window.cityrouteLastBuildError=String(error?.stack||error);if(buildId===generation)status('Ошибка построения: '+(error?.message||'неизвестно'),'Routing error: '+(error?.message||'unknown'),true);
  return true;
 }finally{if(buildId===generation){controller=null;busy(false)}}
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
 const route=window.CityRouteReady?.getPlan(event.detail);if(!route)return;
 city.value=route.city??'Москва';skipFoodStop=false;start.value=route.points[0].name;end.value=route.points.at(-1).name;end.disabled=false;
 document.querySelector('[name="routeMode"][value="oneway"]').checked=true;
 $('distance').value='auto';$('routeStyle').value='all';chosen=route.points.slice(1,-1);drawChosen();points=[null,null];
 buildOnYandex(false,route);
});
function openQuickSaved(r){
 if(!r||r.v!==3||!Array.isArray(r.waypoints))return;
 const transport=document.querySelector('[name=transport][value="'+(r.transport==='transit'?'transit':'walk')+'"]');if(transport)transport.checked=true;
 city.value=r.city??'Москва';changeArea();start.value=r.start||'';end.value=r.finish||'';
 const mode=document.querySelector('[name=routeMode][value="'+(r.loop?'loop':'oneway')+'"]');if(mode)mode.checked=true;
 end.disabled=!!r.loop;chosen=Array.isArray(r.stops)?r.stops:[];drawChosen();
 points=[null,null];
 const first=r.waypoints[0];if(first&&typeof first==='object'&&Number.isFinite(first.lat)&&Number.isFinite(first.lng))points[0]={lat:first.lat,lng:first.lng,label:start.value};
 $('distance').value=r.readyRouteId||![3,5,8,12,20,30].includes(r.requestedKm)?'auto':String(r.requestedKm);
 $('routeStyle').value=r.style||'all';skipFoodStop=false;
 void refreshCollections(world.point(typeof first==='string'?first:'')||(typeof first==='object'?first:null));
 const preset=window.CityRouteReady?.resolve(r.readyRouteId,window.CityRoutePlaces?.items||[]);
 buildOnYandex(false,preset,r.waypoints);
}
// Build through the current Yandex-backed planner; the old routing branch below
// was unreachable after an unconditional return and only increased JS parse cost.
async function build(surprise=false){
 return buildOnYandex(surprise);
}

document.querySelectorAll('[data-preference], [name=transport], [name=mood]').forEach(input=>input.addEventListener('change',()=>{chosen=[];drawChosen();cancel();resetRoute();avoidance=null;status('','')}));
form.addEventListener('submit',e=>{e.preventDefault();build()});$('buildMap').onclick=()=>build();$('surprise').onclick=()=>build(true);$('rerollRoute').onclick=()=>build(true);
$('clearReal').onclick=()=>{chosen=[];drawChosen();if(poiLayer)map.removeLayer(poiLayer);nearby=[];$('placesList').replaceChildren();$('placesStatus').textContent='';cancel();resetRoute();points=[null,null];start.value=end.value='';start.removeAttribute('aria-invalid');end.removeAttribute('aria-invalid');invalidateSearch();skipFoodStop=false;updateYandex();status('','')};
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
  const foundRegion=world.regionAt(p);city.value=foundRegion?.name||'';
  changeArea();areaCenter=p;void refreshCollections(p);
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
    if(points[0]?.lat===p.lat&&points[0]?.lng===p.lng&&!city.value&&properties.city){city.value=properties.city;void refreshCollections(p);updateSearchLink()}
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
  status('','');
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
showWalkingMap();renderQuickSaved();if(!$('routeDetail').textContent)status('','');
// A Yandex iframe needs no JavaScript API key, but cannot forward its clicks to CityRoute.
// Keep the verified route link accessible even if a browser blocks embedding.
})();
