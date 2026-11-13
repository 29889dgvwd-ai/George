(()=>{
'use strict';
const KEY='cityroute-saved-itineraries-v1';
const styles={all:['Красивые места','Scenic walk'],parks:['Парки и сады','Parks and gardens'],water:['Вдоль воды','Along the waterfront'],sights:['Архитектура города','City architecture'],malls:['По магазинам','Shopping walk'],food:['Вкусный маршрут','Food walk'],culture:['Культурная прогулка','Culture walk'],direct:['Городская прогулка','City walk']};
function valid(r){return r&&r.data?.trip?.legs?.length>0&&r.data.trip.legs.every(l=>typeof l.shape==='string')&&Number.isFinite(r.data.trip.summary?.length)&&Number.isFinite(r.data.trip.summary?.time)&&Array.isArray(r.points)&&r.points[0]&&Array.isArray(r.places);}
function model(r,decode){
 const start=r.points[0];let elapsed=0;
 const steps=r.data.trip.legs.map((leg,i)=>{
  const path=decode(leg.shape),end=path.at(-1);let best=null,delta=Infinity;
  for(const [index,p] of r.places.entries()){const pos=p.routePoint||[p.lat,p.lng];const lat=Array.isArray(pos)?pos[0]:pos.lat,lng=Array.isArray(pos)?pos[1]:pos.lng;const d=Math.hypot((lat-end[0])*111000,(lng-end[1])*111000*Math.cos(end[0]*Math.PI/180));if(d<delta){best={...p,number:index+1};delta=d;}}
  const isLast=i===r.data.trip.legs.length-1;
  const place=delta<15&&!(isLast&&r.loop)?best:null;
  const km=Number.isFinite(leg.summary?.length)?leg.summary.length:null,seconds=Number.isFinite(leg.summary?.time)?leg.summary.time:null;
  elapsed=elapsed===null||seconds===null?null:elapsed+seconds;
  const finish=place||{name:isLast?(r.loop?start.label:r.points[1]?.label):'',number:isLast?(r.loop?'А':'Б'):'•'};
  return {place:finish,lat:end[0],lng:end[1],from:path[0],to:end,km,seconds,elapsed,isLast};
 });return {start,steps};
}
function create({decode,tr,focus,fit,restore}){
 const $=id=>document.getElementById(id),panel=$('itinerary'),empty=panel.innerHTML;let current=null,tab='overview',saved=[];
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(raw))saved=raw.filter(valid).slice(0,20);}catch{}
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn,cls='journey-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
 const title=r=>(r.city||tr('Город','City'))+' · '+tr(...(styles[r.style]||styles.all));
 const mins=s=>s===null?'—':Math.max(1,Math.round(s/60))+' '+tr('мин','min');
 const distance=km=>km===null?'—':km<1?Math.round(km*1000)+' '+tr('м','m'):km.toFixed(1)+' '+tr('км','km');
 function navLink(from,to,mode){const a=el('a','journey-link',mode==='mt'?tr('На транспорте ↗','Public transport ↗'):tr('Пешком ↗','Walk there ↗'));const url=new URL('https://yandex.ru/maps/');url.search=new URLSearchParams({rtext:from.join(',')+'~'+to.join(','),rtt:mode==='mt'?'mt':'pd'}).toString();a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));saved=next;renderSaved();return true;}catch{$('saveStatus').textContent=tr('Не удалось сохранить: память браузера заполнена или недоступна.','Could not save: browser storage is full or unavailable.');return false;}}
 function renderSaved(){const list=$('savedRoutesList');list.replaceChildren();if(!saved.length){list.append(el('p','saved-empty',tr('Здесь будут твои прогулки. Построй маршрут и нажми «Сохранить».','Your walks will appear here. Build a route and select Save.')));return;}
 for(const r of saved){const card=el('article','saved-route');const text=el('div');text.append(el('h3','',title(r)),el('p','field-note',distance(r.data.trip.summary.length)+' · '+r.places.length+' '+tr('мест','places')));const actions=el('div','saved-actions');actions.append(button(tr('Открыть','Open'),()=>{restore(r);show(r);}),button(tr('Убрать','Remove'),()=>{const before=saved; if(persist(saved.filter(x=>x.id!==r.id))){const note=$('saveStatus');note.replaceChildren(el('span','',tr('Маршрут убран. ','Route removed. ')),button(tr('Отменить','Undo'),()=>{if(persist(before))note.replaceChildren();}));}},'journey-button muted-button'));card.append(text,actions);list.append(card);}}
 function render(){renderSaved();if(!current)return;const r=current,m=model(r,decode);panel.replaceChildren();
 const tabs=el('div','journey-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',tr('Вид маршрута','Route view'));
 for(const [key,ru,en] of [['overview','Обзор','Overview'],['steps','По шагам','Step by step']]){const b=button(tr(ru,en),()=>{tab=key;render();$('tab-'+key).focus();},'journey-tab');b.id='tab-'+key;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===key));b.setAttribute('aria-controls','journey-content');b.tabIndex=tab===key?0:-1;b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();tab=e.key==='Home'?'overview':e.key==='End'?'steps':tab==='steps'?'overview':'steps';render();$('tab-'+tab).focus();}};tabs.append(b);}panel.append(tabs);
 const content=el('div','journey-content');content.id='journey-content';content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby','tab-'+tab);
 const eyebrow=el('div','journey-eyebrow',r.loop?tr('КРУГОВАЯ ПРОГУЛКА','ROUND TRIP'):tr('ПЛАН ПРОГУЛКИ','WALKING ITINERARY'));content.append(eyebrow,el('h3','journey-title',title(r)));
 const stats=el('div','journey-stats');for(const [value,label] of [[distance(r.data.trip.summary.length),tr('длина пути','distance')],[mins(r.data.trip.summary.time),tr('пешком','walking')],[String(r.places.length),tr('мест по пути','places')]]){const cell=el('div');cell.append(el('strong','',value),el('span','',label));stats.append(cell);}content.append(stats,el('p','field-note',tr('Время — только в пути, без посещения мест.','Walking time excludes time spent at stops.')));
 if(tab==='overview'){
  const route=el('div','route-outline');route.append(el('p','', 'А · '+m.start.label));for(const p of r.places)route.append(el('p','',p.name));if(r.loop||!r.places.length||m.steps.at(-1)?.place.number==='Б')route.append(el('p','',r.loop?tr('А · Возвращение к началу','A · Return to start'): 'Б · '+(r.points[1]?.label||tr('Финиш','Finish'))));content.append(route);
  if(r.note)content.append(el('p','route-notice',r.note));
  content.append(button(tr('Смотреть план по шагам →','View step by step →'),()=>{tab='steps';render();$('tab-steps').focus();},'journey-button journey-primary'));
 }else{
  const timeline=el('ol','journey-timeline');const first=el('li','journey-stop');first.append(el('span','stop-number','А'),el('h4','',m.start.label),button(tr('Показать старт','Show start'),()=>focus(m.start)));timeline.append(first);
  for(const step of m.steps){const li=el('li','journey-stop');const transfer=el('div','journey-transfer',tr('Пешком','Walk')+' · '+distance(step.km)+' · '+mins(step.seconds));li.append(transfer,el('span','stop-number',String(step.place.number)),el('h4','',step.place.name||tr('Промежуточная точка','Waypoint')));
   if(step.elapsed!==null)li.append(el('p','field-note',tr('От старта пешком: ','Walking from start: ')+mins(step.elapsed)));
   const tags=step.place.tags||{};const address=[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(', ');if(address)li.append(el('p','place-detail',address));if(tags.opening_hours)li.append(el('p','place-detail',tr('Часы работы (данные карты): ','Opening hours (map data): ')+tags.opening_hours));
   const actions=el('div','stop-actions');actions.append(button(tr('На карте','On map'),()=>{panel.querySelectorAll('.selected-stop').forEach(n=>n.classList.remove('selected-stop'));li.classList.add('selected-stop');focus(step);if(matchMedia('(max-width: 900px)').matches)document.querySelector('.map-shell').scrollIntoView({behavior:'smooth',block:'start'});}),navLink(step.from,step.to,'pd'));if(r.transit)actions.append(navLink(step.from,step.to,'mt'));li.append(actions);timeline.append(li);
  }content.append(timeline,el('p','field-note',tr('Доступность мест и часы работы уточняй перед посещением.','Check access and opening hours before visiting.')));
 }
 if(r.transit)content.append(el('p','field-note',tr('На карте — пеший путь. Расписание и пересадки доступны по ссылкам «На транспорте».','The map shows walking. Transit schedules and transfers open via the public transport links.')));
 const actions=el('div','journey-bottom');actions.append(button(tr('Весь маршрут','Fit route'),fit));const exists=saved.some(x=>x.id===r.id);const save=button(exists?tr('Сохранено ✓','Saved ✓'):tr('Сохранить маршрут','Save route'),async()=>{save.disabled=true;const social=window.CityRouteSocial;await social?.ready;let cloud=false;try{if(social?.getState()?.profile){await social.api('walk/save',{walk:r});cloud=true;}const local=persist([r,...saved.filter(x=>x.id!==r.id)].slice(0,20));if(local||cloud){$('saveStatus').textContent=cloud?tr('Маршрут сохранён в аккаунте. Открой «Мои прогулки».','Saved to your account. Open My walks.'):tr('Маршрут сохранён в этом браузере. Открой «Мои прогулки».','Saved in this browser. Open My walks.');render();}}catch(e){$('saveStatus').textContent=e.message;save.disabled=false;}},'journey-button journey-primary');save.disabled=exists;actions.append(save);content.append(actions);panel.append(content);
 }
 function show(r){current=JSON.parse(JSON.stringify(r));current.id=current.id||crypto.randomUUID();tab='overview';render();}
 function clear(){current=null;panel.innerHTML=empty;}
 renderSaved();return {show,clear,render,open:r=>{restore(r);show(r);}};
}
window.CityRouteItinerary={create,model,valid};
})();
