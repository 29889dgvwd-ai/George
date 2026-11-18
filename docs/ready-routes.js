/* Curated routes use existing named catalogue places; no invented distance or ratings. */
((root)=>{
'use strict';
const routes=[
 {id:'heart',title:['Сердце Москвы','Heart of Moscow'],tag:['Классика','Highlights'],description:['Красная площадь, парк и вид на реку','Red Square, a park and river views'],names:['Красная площадь','Собор Василия Блаженного','Парк «Зарядье»','Парящий мост в «Зарядье»'],englishNames:['Red Square','Saint Basil’s Cathedral','Zaryadye Park','Floating Bridge'],cover:'Парк «Зарядье»'},
 {id:'river',title:['Вдоль Москвы-реки','Along the Moskva River'],tag:['Парки и набережные','Parks & riverside'],description:['Искусство, набережная и зелёный парк','Art, the waterfront and a green park'],names:['Парк искусств «Музеон»','Крымская набережная','Парк Горького'],englishNames:['Muzeon Park of Arts','Krymskaya Embankment','Gorky Park'],cover:'Парк Горького'},
 {id:'art',title:['Искусство и старый город','Art & the old town'],tag:['Культура','Culture'],description:['Третьяковка, пешеходный мост и Музеон','Tretyakov Gallery, a footbridge and Muzeon'],names:['Государственная Третьяковская галерея','Патриарший мост','Парк искусств «Музеон»'],englishNames:['State Tretyakov Gallery','Patriarshy Bridge','Muzeon Park of Arts'],cover:'Государственная Третьяковская галерея'}
];
function resolve(id,items){const route=routes.find(r=>r.id===id);if(!route)return null;const points=route.names.map(name=>items.find(p=>p.name===name));return points.every(Boolean)?{...route,points}:null;}
root.CityRouteReady={routes,resolve};
if(typeof module!=='undefined')module.exports={routes,resolve};
if(typeof document==='undefined')return;
const host=document.getElementById('readyRoutes');if(!host)return;
const bilingual=(el,values)=>{for(const [i,text] of values.entries()){const s=document.createElement('span');s.className=i?'en':'ru';s.textContent=text;el.append(s);}return el;};
for(const route of routes){
 const plan=resolve(route.id,root.CityRoutePlaces?.items||[]);if(!plan)continue;
 const card=document.createElement('article');card.className='ready-route';
 const media=document.createElement('div');media.className='ready-route-media';
 const cover=plan.points.find(p=>p.name===route.cover);
 const photo=document.createElement('img');photo.alt=route.cover;photo.loading='eager';photo.decoding='async';photo.hidden=true;
 const fallback=bilingual(document.createElement('span'),['Москва · прогулка','Moscow · walking route']);fallback.className='ready-photo-fallback';
 const credit=document.createElement('a');credit.className='ready-photo-credit';credit.target='_blank';credit.rel='noopener noreferrer';credit.hidden=true;
 const badge=bilingual(document.createElement('span'),route.tag);badge.className='ready-route-tag';
 media.append(photo,fallback,credit,badge);
 const body=document.createElement('div');body.className='ready-route-body';
 const title=bilingual(document.createElement('h3'),route.title),desc=bilingual(document.createElement('p'),route.description);
 const count=bilingual(document.createElement('small'),[plan.points.length+' места · пешком',plan.points.length+' places · on foot']);
 const details=document.createElement('details');const summary=bilingual(document.createElement('summary'),['Остановки','Stops']);const list=document.createElement('ol');
 for(const [i,p] of plan.points.entries()){const li=bilingual(document.createElement('li'),[p.name,route.englishNames[i]]);list.append(li);}details.append(summary,list);
 const button=bilingual(document.createElement('button'),['Открыть прогулку →','Open walk →']);button.type='button';button.className='primary';button.dataset.readyRoute=route.id;
 button.onclick=()=>document.dispatchEvent(new CustomEvent('cityroute:ready-route',{detail:route.id}));
 body.append(count,title,desc,details,button);card.append(media,body);host.append(card);
 Promise.resolve(root.CityRoutePhotos?.photos(cover)).then(urls=>{
  if(!urls?.length)return;let index=0;
  const load=()=>{photo.src=urls[index];const source=root.CityRoutePhotos.sourceByUrl.get(urls[index]);credit.href=source?.source||urls[index];credit.textContent='© '+(source?.credit||'Wikimedia Commons')+' ↗';};
  photo.onload=()=>{photo.hidden=false;fallback.hidden=true;credit.hidden=false;};
  photo.onerror=()=>{if(++index<urls.length)load();else{photo.hidden=true;credit.hidden=true;fallback.hidden=false;}};load();
 }).catch(()=>{});
}
})(typeof window!=='undefined'?window:globalThis);
