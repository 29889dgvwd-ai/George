/* CityRoute v3: fast, deterministic, no routing/geocoding/places API dependency.
   Yandex Maps calculates the actual pedestrian route. No fake travel time or walking geometry. */
(()=>{'use strict';
const P=window.CityRoutePlaces;
const $=id=>document.getElementById(id);
if(!P||!$('routeForm'))return;
const form=$('routeForm'),start=$('startPoint'),end=$('endPoint'),city=$('city'),map=$('yandexWidget');
const SAVED='cityroute-saved-itineraries-v1',FAVS='cityroute-favourite-places-v1';
const center={lat:55.7558,lng:37.6173};
const tr=(ru,en)=>document.body.classList.contains('english')?en:ru;
const dom=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const read=(key,alternative)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??alternative}catch{return alternative}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
let state={selected:[],results:[],route:null,variant:0,geo:null,favourites:new Set(read(FAVS,[])),lastQuery:'',lastSource:''};
let lastPhotoKey='';
const allowedCity=()=>/^(москва|moscow)(\s*,.*)?$/i.test(city.value.trim());
const norm=P.norm;
const isLoop=()=>form.querySelector('[name="routeMode"]:checked')?.value==='loop';
const pref=n=>form.querySelector('[data-preference="'+n+'"]')?.checked===true;
const desiredKm=()=>Math.max(1,Math.min(12,Number($('distance').value)||3));
const kind=()=>$('routeStyle').value;
const isTransit=()=>form.querySelector('[name="transport"]:checked')?.value==='transit';
function status(ru,en=ru,error=false){
 for(const id of ['formStatus','routeStatus']){const node=$(id);if(node){node.textContent=tr(ru,en);node.setAttribute('role',error?'alert':'status')}}
}
function mapAddress(value){
 if(typeof value==='string'){
  const s=value.trim();if(!s)return '';
  // An explicit coordinate pair stays a pair. Otherwise resolve text in the chosen city inside Yandex.
  if(/^-?\d{1,2}\.\d{3,},\s*-?\d{1,3}\.\d{3,}$/.test(s))return s.replace(/\s/g,'');
  return /москва|moscow/i.test(s)?s:(city.value.trim()||'Москва')+', '+s;
 }
 if(value&&Number.isFinite(value.lat)&&Number.isFinite(value.lng))return value.lat.toFixed(6)+','+value.lng.toFixed(6);
 return '';
}
function startValue(){
 if(state.geo&&start.value===state.geo.label)return state.geo;
 const known=allowedCity()?P.lookup(start.value):null;
 return known?{lat:known.lat,lng:known.lng,label:known.name}:mapAddress(start.value);
}
function endValue(){
 const known=allowedCity()?P.lookup(end.value):null;
 return known?{lat:known.lat,lng:known.lng,label:known.name}:mapAddress(end.value);
}
function routeUrl(waypoints,transport=false){
 const text=waypoints.map(mapAddress).filter(Boolean).join('~');
 const params=new URLSearchParams({rtext:text,rtt:transport?'mt':'pd'});
 return 'https://yandex.ru/maps/?'+params.toString();
}
function resetMap(){
 const p=new URLSearchParams({ll:'37.6173,55.7558',z:'14',lang:document.body.classList.contains('english')?'en_RU':'ru_RU'});
 map.src='https://yandex.ru/map-widget/v1/?'+p.toString();
 $('yandexNav').href='https://yandex.ru/maps/?'+p.toString();
}
function setMap(waypoints){
 const params=new URLSearchParams({rtext:waypoints.map(mapAddress).filter(Boolean).join('~'),rtt:'pd',lang:document.body.classList.contains('english')?'en_RU':'ru_RU'});
 map.src='https://yandex.ru/map-widget/v1/?'+params.toString();
 $('yandexNav').href=routeUrl(waypoints);
}
function goMap(){window.open($('yandexNav').href,'_blank','noopener,noreferrer')}
function getAnchor(){
 if(state.geo&&start.value===state.geo.label)return state.geo;
 const known=P.lookup(start.value);
 return known?{lat:known.lat,lng:known.lng}:null;
}
function tagsForStyle(style){
 switch(style){
  case 'parks':return p=>p.type==='parks';
  case 'water':return p=>p.type==='water'||p.category==='viewpoint';
  case 'sights':return p=>p.type==='sights';
  case 'food':return p=>p.type==='food';
  case 'culture':return p=>p.type==='culture';
  case 'malls':return p=>p.type==='malls';
  default:return ()=>true;
 }
}
function passesPreferences(p){
 if(pref('malls')&&p.type==='malls')return false;
 if(pref('rain')&&!['food','culture','malls'].includes(p.type))return false;
 if(pref('noise')||pref('crowds')){
  if(/Красная площадь|Никольская|ГУМ|ЦУМ|Центральн|Большой театр|ВДНХ — арка/i.test(p.name))return false;
 }
 const food=$('foodPreference')?.value||'all';
 if(kind()==='food'&&food!=='all'){
  if(food==='coffee'&&p.category!=='cafe')return false;
  if(food==='bakery'&&p.category!=='bakery')return false;
  if(food==='restaurant'&&p.category!=='restaurant')return false;
 }
 return true;
}
const icons={parks:'🌳',water:'🌊',sights:'🏛️',culture:'🎭',food:'☕',malls:'🏬'};
const labels={parks:['Парк','Park'],water:['Набережная / смотровая','Waterfront / viewpoint'],sights:['Достопримечательность','Landmark'],culture:['Культура','Culture'],food:['Еда и кафе','Food'],malls:['Торговый центр','Mall'],cafe:['Кофейня','Café'],restaurant:['Ресторан','Restaurant'],bakery:['Пекарня','Bakery'],museum:['Музей','Museum'],theatre:['Театр','Theatre']};
const category=p=>tr(...(labels[p.category]||labels[p.type]||['Место','Place']));
function localPlaceSearch(){
 const a=getAnchor()||center;
 const q=norm($('placeSearch')?.value||'');
 const filter=$('placeFilter').value;
 let hits=P.items.filter(p=>{
   if(pref('malls')&&p.type==='malls')return false;
   if(filter==='favourites'&&!state.favourites.has(p.id))return false;
   if(!['all','favourites'].includes(filter)&&p.type!==filter&&p.category!==filter)return false;
   if(q&&!norm(p.name+' '+p.address).includes(q))return false;
   if(pref('rain')&&!['food','culture','malls'].includes(p.type))return false;
   return true;
 });
 hits.sort((a1,b1)=>{
   const da=P.haversine(a,a1),db=P.haversine(a,b1);
   const aa=state.selected.some(x=>x.id===a1.id)?-999:0,bb=state.selected.some(x=>x.id===b1.id)?-999:0;
   return da+aa-db-bb
 });
 return hits;
}
function searchPlaces({focus=false}={}){
 if(!allowedCity()){
  state.results=[];$('placesList').replaceChildren();$('placesGallery').replaceChildren();lastPhotoKey='';
  $('placesStatus').textContent=tr('Каталог остановок сейчас доступен для Москвы. Для другого города можно указать адреса старта и финиша и открыть маршрут в Яндекс Картах.','The local places catalogue currently covers Moscow. You can still enter addresses in any city and open directions in Yandex Maps.');
  $('externalPlaceSearch').href='https://yandex.ru/maps/?'+new URLSearchParams({text:(city.value.trim()||'')+' '+($('placeSearch')?.value||'')}).toString();return;
 }
 state.results=localPlaceSearch();
 const q=$('placeSearch')?.value?.trim()||'';
 $('externalPlaceSearch').href='https://yandex.ru/maps/?'+new URLSearchParams({text:'Москва '+q}).toString();
 const anchor=getAnchor();
 const where=anchor?tr('рядом с началом прогулки','near your starting point'):tr('по Москве (сначала рядом с центром)','in Moscow (starting near the city centre)');
 $('placesStatus').textContent=tr('Найдено '+state.results.length+' мест — '+where+'. Поиск работает без ожидания сервера.','Found '+state.results.length+' places '+where+'. Results are available without waiting for a server.');
 renderPlaceList();
 if(focus){$('placeSearch')?.focus({preventScroll:true})}
}
function clearBuilt(message=true){
 state.route=null;
 $('rerollRoute').hidden=true;
 $('itinerary').replaceChildren(dom('div','itinerary-empty',tr('После построения здесь появятся остановки и кнопка сохранения.','Your stops and save button will appear here.')));
 $('scenicResult').hidden=true;$('scenicResult').replaceChildren();
 $('transportResult').hidden=true;$('transportResult').replaceChildren();
 $('routeDetail').textContent='';
 resetMap();
 if(message)status('Настройки изменены. Нажми «Построить маршрут».','Preferences changed. Click Build route.');
}
function choosePlace(p){
 const i=state.selected.findIndex(x=>x.id===p.id);
 if(i>=0)state.selected.splice(i,1);
 else{
  if(state.selected.length>=5){status('Можно добавить не более 5 остановок.','You can add up to five stops.',true);return}
  state.selected.push(p);
 }
 clearBuilt(false);renderSelected();renderPlaceList();
 status('Выбрано остановок: '+state.selected.length+'. Построй маршрут.','Selected stops: '+state.selected.length+'. Build your route.');
}
function renderSelected(){
 const box=$('chosenStops');box.replaceChildren();
 for(const p of state.selected){
  const chip=dom('button','selected-place-chip',p.name+' ×');chip.type='button';
  chip.title=tr('Убрать остановку','Remove stop');chip.onclick=()=>choosePlace(p);
  box.append(chip);
 }
}
function setFav(p){
 if(state.favourites.has(p.id))state.favourites.delete(p.id);else state.favourites.add(p.id);
 write(FAVS,[...state.favourites]);renderPlaceList();
}
function viewPlace(p){
 const url='https://yandex.ru/maps/?'+new URLSearchParams({text:p.name+' '+(p.address||'Москва'),ll:p.lng+','+p.lat,z:'16'}).toString();
 window.open(url,'_blank','noopener,noreferrer')
}
function renderPlaceList(){
 const list=$('placesList');list.replaceChildren();
 const listItems=state.results.slice(0,90);
 if(!listItems.length){list.append(dom('p','field-note',tr('В этой категории ничего не найдено. Измени запрос или фильтр.','No matches. Change the search or filter.')));$('placesGallery').replaceChildren();lastPhotoKey='';return}
 const fragment=document.createDocumentFragment();
 for(const p of listItems){
  const row=dom('div','place-search-row'),textBox=dom('div','place-search-name');
  const title=dom('strong','', (icons[p.type]||'📍')+' '+p.name),sub=dom('small','',category(p));
  textBox.append(title,sub);
  const actions=dom('div','place-search-actions');
  const fav=dom('button','fav-place',state.favourites.has(p.id)?'★':'☆');fav.type='button';fav.title=tr('Избранное','Favorite');fav.setAttribute('aria-label',fav.title+': '+p.name);fav.onclick=()=>setFav(p);
  const add=dom('button','add-place',state.selected.some(x=>x.id===p.id)?tr('Убрать','Remove'):tr('+ В маршрут','+ Add'));add.type='button';add.onclick=()=>choosePlace(p);
  const view=dom('button','view-place','↗');view.type='button';view.title=tr('В Яндекс Картах','In Yandex Maps');view.setAttribute('aria-label',view.title+': '+p.name);view.onclick=()=>viewPlace(p);
  actions.append(fav,add,view);row.append(textBox,actions);fragment.append(row);
 }
 list.append(fragment);
 const photoItems=state.results.slice(0,6);
 const photoKey=photoItems.map(p=>p.id).join('|')+'|'+document.body.classList.contains('english');
 if(photoKey!==lastPhotoKey){lastPhotoKey=photoKey;window.CityRoutePhotos?.render(photoItems,$('placesGallery'),{tr,focus:viewPlace});}
}
function randomPick(list,limit=3){
 const arr=[...list];
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}
 return arr.slice(0,limit);
}
function chooseAutoStops(anchor,roundTrip,surprise){
 const style=kind(),reference=anchor||center,km=desiredKm();
 const check=tagsForStyle(style);
 let eligible=P.items.filter(p=>passesPreferences(p)&&p.type!=='malls'&&check(p)&&P.haversine(reference,p)>0.18);
 // Fall back to more general scenic suggestions when no relevant place fits.
 if(!eligible.length)eligible=P.items.filter(p=>passesPreferences(p)&&['parks','sights','water','culture'].includes(p.type));
 const radius=roundTrip?Math.max(.6,km*.4):Math.max(.8,km*.72);
 let nearby=eligible.filter(p=>P.haversine(reference,p)<radius);
 if(!nearby.length)nearby=eligible.filter(p=>P.haversine(reference,p)<Math.max(2.5,km*1.5));
 if(!nearby.length)nearby=eligible;
 nearby.sort((a,b)=>P.haversine(reference,a)-P.haversine(reference,b));
 if(surprise){
  const selected=randomPick(nearby.slice(0,Math.min(28,nearby.length)),roundTrip?2:Math.min(2,nearby.length));
  return selected
 }
 // Selected stops should be near one another, not zig-zag across Moscow.
 const pool=nearby.slice(0,18),out=[];
 const desired=roundTrip?2:Math.min(2,pool.length);
 for(const item of pool){
  if(out.length>=desired)break;
  if(out.every(p=>P.haversine(p,item)>.13))out.push(item)
 }
 return out.length?out:pool.slice(0,1)
}
function routeExplanation(route){
 const root=$('itinerary');root.replaceChildren();
 const header=dom('div','journey-summary');
 header.append(dom('span','route-kicker',tr('МАРШРУТ ГОТОВ','ROUTE READY')));
 header.append(dom('h3','',tr('Твой маршрут','Your walk')));
 header.append(dom('p','field-note',tr('Точный пеший путь, расстояние и время показывает Яндекс. CityRoute передаёт точки — расчётов и ожидания чужого сервера больше нет.','Yandex calculates the actual walking path, distance and time. CityRoute sends the stops without waiting for third-party routing services.')));
 const list=dom('ol','route-stop-list');
 for(const [i,p] of route.waypoints.entries()){
  const row=dom('li','route-stop');
  const label=p?.name||p?.label||(typeof p==='string'?p:tr('Точка','Place'));
  const letter=i===0?'А':i===route.waypoints.length-1?'Б':String(i);
  row.append(dom('b','',letter),dom('span','',label));
  list.append(row);
 }
 const actions=dom('div','journey-cta');
 const open=dom('a','primary',tr('Открыть пеший маршрут ↗','Open walking directions ↗'));
 open.href=routeUrl(route.waypoints);open.target='_blank';open.rel='noopener noreferrer';
 const save=dom('button','secondary',tr('♡ Сохранить прогулку','♡ Save walk'));save.type='button';save.onclick=saveRoute;
 actions.append(open,save);
 header.append(list,actions);
 const note=dom('p','route-disclaimer',tr('ТЦ, оживлённые дороги и шум: настройки влияют на подбор остановок, но не гарантируют обход улиц внутри Яндекс Карт. Проверь маршрут перед выходом.','Preferences influence which stops are suggested, not the street-by-street path in Yandex Maps. Check directions before heading out.'));
 header.append(note);root.append(header);
 $('routeDetail').textContent=tr('Точек маршрута: '+route.waypoints.length+' · пешком','Route points: '+route.waypoints.length+' · walking');
}
function photosForRoute(route){
 const box=$('scenicResult');box.replaceChildren();
 if(!route.stops.length){box.hidden=true;return}
 box.hidden=false;
 box.append(dom('h3','',tr('Места на прогулке','Places on your walk')));
 const gallery=dom('div','place-photo-grid');box.append(gallery);
 window.CityRoutePhotos?.render(route.stops,gallery,{tr,focus:viewPlace});
}
function showTransport(route){
 const panel=$('transportResult');panel.replaceChildren();
 if(!isTransit()){panel.hidden=true;return}
 panel.hidden=false;
 panel.append(dom('h3','',tr('Можно общественным транспортом','Public transport is allowed')));
 const link=dom('a','secondary inline-link',tr('Показать маршрут с транспортом в Яндексе ↗','Public transport in Yandex ↗'));
 link.target='_blank';link.rel='noopener noreferrer';link.href=routeUrl(route.waypoints,true);
 panel.append(link);
}
function notesToPrefs(){
 const text=norm($('gptNotes')?.value||'');if(!text)return;
 const pairs=[['парк','parks'],['сквер','parks'],['музей','museum'],['кофе','cafe'],['еда','restaurant'],['пекар','dessert'],['архитект','architecture'],['фото','photo'],['набереж','water']];
 for(const [term,key] of pairs)if(text.includes(term)){
  const input=form.querySelector('[data-preference="'+key+'"]');if(input)input.checked=true
 }
 $('aiStatus').textContent=tr('Пожелания применены локально; GPT не подключён.','Your preferences were applied locally, without GPT.');
}
function build({surprise=false}={}){
 const source=start.value.trim();
 if(!source){start.setAttribute('aria-invalid','true');start.focus();status('Укажи старт: адрес, место или «Моё положение».','Enter a starting address or choose My location.',true);return}
 start.removeAttribute('aria-invalid');
 notesToPrefs();
 const loop=isLoop(),a=startValue(),b=loop?null:end.value.trim()?endValue():null;
 const anchor=getAnchor();
 const selected=[...state.selected];
 let auto=[];
 if(allowedCity()&&!selected.length&&kind()!=='direct')auto=chooseAutoStops(anchor,loop,surprise);
 if(allowedCity()&&!selected.length&&!auto.length&&!b)auto=chooseAutoStops(anchor,loop,true);
 // For a specified destination, don't add a random stop on a separate side of the city.
 const stops=(selected.length?selected:auto).filter(p=>passesPreferences(p));
 if(loop&&!stops.length){
  status('Для кругового маршрута выбери хотя бы одну остановку в списке ниже.','Add at least one stop for a round trip.',true);
  $('nearbyPlaces').click();return
 }
 if(!loop&&!b&&!stops.length){
  status('Укажи конец прогулки либо выбери остановку. Для Москвы можно нажать «Удиви меня».','Set a destination or choose a stop. In Moscow you can also press Surprise me.',true);
  return
 }
 // A direct walk with no end and with a stop uses the last stop as finish.
 const parts=[a,...stops.map(p=>({lat:p.lat,lng:p.lng,name:p.name}))];
 if(loop)parts.push(a);
 else if(b)parts.push(b);
 if(parts.length<2){status('Нужны минимум две точки.','At least two points are required.',true);return}
 if(parts.length===2&&mapAddress(parts[0])===mapAddress(parts[1])){
  status('Старт и финиш совпадают. Выбери разные точки.','Start and finish must differ.',true);return
 }
 const route={v:3,createdAt:Date.now(),city:city.value.trim()||'Москва',start:source,finish:loop?'':end.value.trim(),loop,stops,waypoints:parts,style:kind(),transport:isTransit(),selectedIds:state.selected.map(p=>p.id)};
 state.route=route;
 setMap(parts);
 routeExplanation(route);photosForRoute(route);showTransport(route);
 $('rerollRoute').hidden=false;
 status('Готово. Точки переданы Яндекс Картам — маршрут можно открыть сразу.','Done. The stops have been sent to Yandex Maps. You can open the route now.');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 $('mapSection').scrollIntoView({behavior:reduce?'instant':'smooth',block:'start'});
}
function saveRoute(){
 const route=state.route;if(!route)return;
 let list=read(SAVED,[]);if(!Array.isArray(list))list=[];
 const id=crypto?.randomUUID?.()||String(Date.now());
 list=[{...route,id},...list].slice(0,25);
 if(write(SAVED,list)){$('saveStatus').textContent=tr('Маршрут сохранён на этом устройстве.','Saved on this device.');renderSaved()}
 else $('saveStatus').textContent=tr('Не получилось сохранить: браузер запретил доступ к памяти.','Browser storage is unavailable.');
}
function renderSaved(){
 const list=read(SAVED,[]),box=$('savedRoutesList');
 box.replaceChildren();
 if(!Array.isArray(list)||!list.length){$('savedRoutes').hidden=true;return}
 $('savedRoutes').hidden=false;
 for(const r of list.slice(0,7)){
  const item=dom('div','saved-route'),name=dom('span','',r.v>=3?(r.start+' · '+(r.loop?tr('круговой','round trip'):(r.finish||r.stops?.at(-1)?.name||tr('прогулка','walk')))):((r.city||'Москва')+' · '+tr('прежняя версия','older route')));
  const open=dom('button','secondary',tr('Открыть','Open'));open.type='button';
  open.onclick=()=>restore(r);
  item.append(name,open);box.append(item)
 }
}
function restore(r){
 if(r.v>=3){
  city.value=r.city||'Москва';start.value=r.start||'';end.value=r.finish||'';
  const mode=form.querySelector('[name="routeMode"][value="'+(r.loop?'loop':'oneway')+'"]');if(mode)mode.checked=true;
  syncMode();state.selected=r.stops||[];renderSelected();
  state.route=r;setMap(r.waypoints);routeExplanation(r);photosForRoute(r);showTransport(r);
  $('rerollRoute').hidden=false;
  status('Сохранённый маршрут открыт.','Saved route loaded.');
  $('mapSection').scrollIntoView({behavior:'smooth',block:'start'});return
 }
 // Earlier format: coordinates, places, full trip, but no dependency on its old route server.
 if(Array.isArray(r.points)&&r.points[0]){
  city.value=r.city||'Москва';start.value=r.points[0].label||mapAddress(r.points[0]);
  end.value=r.loop?'':r.points[1]?.label||'';
  const mode=form.querySelector('[name="routeMode"][value="'+(r.loop?'loop':'oneway')+'"]');if(mode)mode.checked=true;
  syncMode();
  state.selected=(r.places||[]).map((p,i)=>({...p,id:p.id||'saved-'+i}));renderSelected();
  build();return
 }
 status('Эта сохранённая запись больше не поддерживается.','This old saved entry is no longer supported.',true)
}
function reroll(){
 const style=kind();
 if(!allowedCity()){
  status('Для другого города измени конечную точку вручную — автоподбор пока доступен только в Москве.','Change the destination manually; automatic suggestions currently cover Moscow.',true);return
 }
 const prev=new Set([...(state.route?.stops||[]).map(p=>p.id)]);
 state.selected=[];
 state.variant++;
 const suggestions=chooseAutoStops(getAnchor(),isLoop(),true).filter(p=>!prev.has(p.id));
 if(!suggestions.length){const candidate=P.items.filter(p=>!prev.has(p.id)&&passesPreferences(p)&&tagsForStyle(style)(p));suggestions.push(...randomPick(candidate.slice(0,24),isLoop()?2:1))}
 state.selected=suggestions.slice(0,2);renderSelected();renderPlaceList();
 build({surprise:true})
}
function syncPeople(){
 const solo=$('company-alone')?.checked,date=$('company-date')?.checked,target=solo?'1':date?'2':null;
 form.querySelectorAll('[name=people]').forEach(e=>{
  e.disabled=Boolean(target&&e.value!==target);if(target)e.checked=e.value===target
 });
 $('peopleNote').textContent=target?tr('Участников: '+target,'Group size: '+target):''
}
function syncMode(){
 end.disabled=isLoop();end.placeholder=isLoop()?tr('Круговой маршрут — вернёмся к старту','Returns to your start'):tr('Необязательно','Optional')
}
function updateBudget(v){
 const amount=Math.max(0,Math.min(50000,Math.round((Number(v)||0)/500)*500));
 $('budgetRange').value=String(amount);$('budgetAmount').value=amount||'';return amount
}
$('budgetRange').addEventListener('input',e=>updateBudget(e.target.value));
$('budgetAmount').addEventListener('change',e=>updateBudget(e.target.value));
$('budgetAmount').addEventListener('input',e=>{if(e.target.value!=='')$('budgetRange').value=String(Math.max(0,Math.min(50000,Number(e.target.value)||0)))});
for(const el of form.querySelectorAll('[name=company]'))el.addEventListener('change',()=>{syncPeople();clearBuilt()});
for(const el of form.querySelectorAll('[name=routeMode]'))el.addEventListener('change',()=>{syncMode();clearBuilt()});
for(const el of form.querySelectorAll('[data-preference],[name=mood],[name=transport]'))el.addEventListener('change',()=>{clearBuilt();if($('nearbyPlaces'))searchPlaces()});
for(const el of [start,end,city,$('distance'),$('routeStyle'),$('walkTime'),$('foodPreference')].filter(Boolean))el.addEventListener('change',()=>{if(el===start)state.geo=null;if(el===city){state.selected=[];state.results=[];renderSelected();$('placesList').replaceChildren();$('placesGallery').replaceChildren();lastPhotoKey='';}clearBuilt()});
for(const el of [city,start,end,$('gptNotes')]){
 if(!el)continue;
 const bad=/(^|[^\p{L}])(хуй\p{L}*|пизд\p{L}*|бляд\p{L}*|сука|ебать|ебан\p{L}*|мудак)(?=$|[^\p{L}])/iu;
 let good=el.value;el.addEventListener('input',()=>{if(bad.test(el.value))el.value=good;else good=el.value});
}
$('placeSearch')?.addEventListener('input',()=>searchPlaces());
$('placeFilter').addEventListener('change',()=>searchPlaces());
$('nearbyPlaces').onclick=()=>searchPlaces();
$('findPlacesTop').onclick=()=>{
 const detail=$('nearbyDisclosure');detail.open=true;
 searchPlaces({focus:true});detail.scrollIntoView({behavior:'smooth',block:'start'});
};
form.addEventListener('submit',e=>{e.preventDefault();build()});
$('buildMap').onclick=()=>build();
$('surprise').onclick=()=>{if(!start.value.trim()){start.value='Красная площадь';start.dispatchEvent(new Event('change'))}reroll()};
$('rerollRoute').onclick=reroll;
$('clearReal').onclick=()=>{
 start.value='';end.value='';state.geo=null;state.selected=[];renderSelected();clearBuilt(false);
 status('Начни с адреса или выбери «Моё положение».','Enter a start address or choose My location.');
};
$('fitRoute').onclick=goMap;
$('expandMap').onclick=()=>{
 const m=$('mapSection'),open=m.classList.toggle('expanded-map');
 $('expandMap').setAttribute('aria-pressed',String(open));
 $('expandMap').querySelector('.ru').textContent=open?'Свернуть':'Развернуть';
 $('expandMap').querySelector('.en').textContent=open?'Collapse':'Expand'
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('mapSection').classList.contains('expanded-map'))$('expandMap').click()});
$('returnStart').onclick=()=>{
 const value=state.route?.waypoints?.[0]||startValue();
 if(!value){$('returnStatus').textContent=tr('Сначала задай точку старта.','Set a starting point first.');return}
 const params=new URLSearchParams({rtext:'~'+mapAddress(value),rtt:'pd'});
 const link=$('returnLink');link.href='https://yandex.ru/maps/?'+params.toString();link.hidden=false;
 $('returnStatus').textContent=tr('Открой Яндекс Карты, чтобы построить путь от текущего местоположения к старту.','Open Yandex Maps to plan a walk from your current position back to the start.');
};
$('locateReal').onclick=()=>{
 if(!navigator.geolocation){status('Геолокация недоступна. Введи адрес.','Geolocation unavailable. Enter an address.',true);return}
 $('locateReal').disabled=true;
 const timer=setTimeout(()=>{$('locateReal').disabled=false},8500);
 navigator.geolocation.getCurrentPosition(pos=>{
  clearTimeout(timer);$('locateReal').disabled=false;
  const v={lat:pos.coords.latitude,lng:pos.coords.longitude};
  v.label=v.lat.toFixed(6)+','+v.lng.toFixed(6);state.geo=v;start.value=v.label;start.removeAttribute('aria-invalid');clearBuilt(false);
  status('Старт определён. Выбери остановки или построй прогулку.','Your start is set. Add stops or build your walk.');
 },()=>{
  clearTimeout(timer);$('locateReal').disabled=false;
  status('Геолокация недоступна. Укажи адрес вручную.','Location unavailable. Enter an address manually.',true)
 },{timeout:8000,maximumAge:60000,enableHighAccuracy:false})
};
$('language').addEventListener('click',()=>{
 document.body.classList.toggle('english');document.documentElement.lang=document.body.classList.contains('english')?'en':'ru';
 $('language').textContent=document.body.classList.contains('english')?'RU':'EN';
 if(state.route){routeExplanation(state.route);photosForRoute(state.route);showTransport(state.route)}
 if(state.route){setMap(state.route.waypoints)}else resetMap();
 if(state.results.length){lastPhotoKey='';searchPlaces()}
});
$('theme').addEventListener('click',()=>document.body.classList.toggle('dark'));
syncPeople();syncMode();updateBudget($('budgetAmount').value);
resetMap();renderSelected();renderSaved();
const session=sessionStorage.getItem('cityroute-open-walk');
if(session){sessionStorage.removeItem('cityroute-open-walk');try{restore(JSON.parse(session))}catch{status('Сохранённый маршрут не удалось открыть.','Could not open saved route.',true)}}
else status('Укажи начальную точку — поиск мест работает сразу.','Enter a starting point — place search works instantly.');
})();
