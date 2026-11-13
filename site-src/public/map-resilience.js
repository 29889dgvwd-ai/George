/* A visible route schematic when an embedded third-party map fails to load.
   It is deliberately labelled as a schematic, not a street map. */
(()=>{
 'use strict';
 const shell=document.querySelector('.map-shell'),frame=document.getElementById('yandexWidget');
 if(!shell||!frame)return;
 const $=id=>document.getElementById(id);
 const el=(tag,className,text)=>{const a=document.createElement(tag);if(className)a.className=className;if(text!==undefined)a.textContent=text;return a};
 const tr=(ru,en)=>document.body.classList.contains('english')?en:ru;
 const overlay=el('section','cityroute-map-rescue');
 overlay.setAttribute('aria-label','Схема прогулки');
 const top=el('div','cityroute-map-rescue-head');
 const title=el('strong','',tr('Схема прогулки','Walking route diagram'));
 const hint=el('small','',tr('Схема точек, не карта улиц. Для реальной навигации открой Яндекс.','Waypoints only, not a street map. Open Yandex for navigation.'));
 top.append(title,hint);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 460 400');svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 svg.setAttribute('role','img');svg.setAttribute('aria-label','Порядок остановок прогулки');
 svg.classList.add('cityroute-map-rescue-svg');
 const empty=el('p','cityroute-map-rescue-empty',tr('Укажи старт и построй прогулку — здесь будет видна схема, даже без загрузки карты.','Enter a start and build a walk to view the route even if the map is unavailable.'));
 const footer=el('div','cityroute-map-rescue-foot');
 const navigate=el('a','cityroute-map-rescue-link',tr('Открыть маршрут в Яндекс Картах ↗','Open route in Yandex Maps ↗'));
 navigate.href=$('yandexNav')?.href||'https://yandex.ru/maps/';navigate.target='_blank';navigate.rel='noopener noreferrer';
 footer.append(navigate);
 overlay.append(top,svg,empty,footer);shell.append(overlay);
 const bar=el('div','cityroute-map-toolbar-rescue');
 const toggle=el('button','cityroute-map-switch',tr('◈ Схема','◈ Diagram'));
 toggle.type='button';toggle.setAttribute('aria-pressed','false');
 const standalone=el('a','cityroute-map-standalone',tr('Яндекс ↗','Yandex ↗'));
 standalone.target='_blank';standalone.rel='noopener noreferrer';standalone.href=navigate.href;
 bar.append(toggle,standalone);shell.append(bar);
 let manual=false,open=true,timer=0,last=[],options={},refresh=0;
 const setShow=value=>{
  open=value;overlay.hidden=!value;
  toggle.textContent=value?tr('◉ Карта Яндекса','◉ Yandex map'):tr('◈ Схема','◈ Diagram');
  toggle.setAttribute('aria-pressed',String(value));
  shell.classList.toggle('cityroute-scheme-visible',value);
 };
 toggle.onclick=()=>{manual=true;setShow(!open)};
 const geo=p=>{
  if(Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite))return {lat:p[0],lng:p[1]};
  if(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng))return p;
  if(typeof p==='string'){
   const m=p.trim().match(/^([-+]?\d+(?:\.\d+)?),\s*([-+]?\d+(?:\.\d+)?)$/);
   if(m)return {lat:+m[1],lng:+m[2]};
   return window.CityRoutePlaces?.lookup(p)||null;
  }
  return null;
 };
 const svgEl=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,String(v));return n};
 function draw(){
  svg.replaceChildren();title.textContent=tr('Схема прогулки','Walking route diagram');
  hint.textContent=tr('Схема точек, не карта улиц. Для реальной навигации открой Яндекс.','Waypoints only, not a street map. Open Yandex for navigation.');
  const stops=last.map(geo),validCount=stops.filter(Boolean).length;
  empty.hidden=last.length>1;
  svg.hidden=last.length<=1;
  if(last.length<=1)return;
  const good=validCount===stops.length;
  const centerLat=good?stops.reduce((s,p)=>s+p.lat,0)/stops.length:55.75;
  const coords=good?stops.map(p=>({x:p.lng*111.2*Math.cos(centerLat*Math.PI/180),y:-p.lat*111.2})):
    stops.map((_,i)=>({x:Math.sin((i/(stops.length-1))*Math.PI*1.6)*60+i*40,y:150-i*16+Math.cos(i*2)*28}));
  const xs=coords.map(p=>p.x),ys=coords.map(p=>p.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const w=Math.max(0.02,maxX-minX),h=Math.max(0.02,maxY-minY);
  const factor=Math.min(360/w,292/h),ox=230-(minX+maxX)/2*factor,oy=202-(minY+maxY)/2*factor;
  const pts=coords.map(p=>({x:p.x*factor+ox,y:p.y*factor+oy}));
  // Soft non-geographic background; no street grid or misleading road details.
  svg.append(svgEl('circle',{cx:75,cy:75,r:80,fill:'#cfece8',opacity:'.40'}));
  svg.append(svgEl('circle',{cx:380,cy:298,r:110,fill:'#dce6ff',opacity:'.52'}));
  const points=pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
  svg.append(svgEl('polyline',{points,fill:'none',stroke:'#ffffff','stroke-width':14,'stroke-linecap':'round','stroke-linejoin':'round'}));
  svg.append(svgEl('polyline',{points,fill:'none',stroke:'#315bea','stroke-width':7,'stroke-linecap':'round','stroke-linejoin':'round'}));
  pts.forEach((p,i)=>{
   const first=i===0,lastIdx=i===pts.length-1,number=first?'А':lastIdx?'Б':String(i);
   svg.append(svgEl('circle',{cx:p.x,cy:p.y,r:16,fill:first?'#16866b':lastIdx?'#315bea':'#1e293b',stroke:'white','stroke-width':3}));
   const txt=svgEl('text',{x:p.x,y:p.y+4.8,'text-anchor':'middle','font-size':13,'font-weight':'800',fill:'white'});
   txt.textContent=lastIdx&&good&&stops[0].lat===stops[lastIdx].lat&&stops[0].lng===stops[lastIdx].lng?'А':number;
   svg.append(txt);
  });
  if(options.requestedKm){
   const label=svgEl('text',{x:230,y:375,'text-anchor':'middle','font-size':15,'font-weight':'750',fill:'#1b2540'});
   label.textContent=tr('Цель: ','Target: ')+options.requestedKm+' '+tr('км','km')+
     (options.measuredKm?' · '+tr('по пешеходному графу: ','walking estimate: ')+options.measuredKm.toFixed(1):'');
   svg.append(label);
  }
 }
 function links(){
  const href=$('yandexNav')?.href||'https://yandex.ru/maps/';
  navigate.href=href;standalone.href=href;
 }
 function update(stops,details={}){
  last=Array.isArray(stops)?stops.slice():[];options=details;links();draw();
 }
 function onFrameChange(){
  const id=++refresh;clearTimeout(timer);
  if(!manual)setShow(true);
  timer=setTimeout(()=>{
   if(id!==refresh||manual)return;
   setShow(true);
   hint.textContent=tr('Карта Яндекса не ответила. Схема доступна; открой Яндекс по ссылке.','Yandex map did not respond. Use the diagram or open Yandex Maps.');
  },9500);
 }
 const observer=new MutationObserver((entries)=>{if(entries.some(e=>e.attributeName==='src'))onFrameChange()});
 observer.observe(frame,{attributes:true,attributeFilter:['src']});
 frame.addEventListener('load',()=>{
  clearTimeout(timer);
  if(!manual)setShow(false);
 });
 frame.addEventListener('error',()=>{
  clearTimeout(timer);if(!manual)setShow(true);
 });
 $('language')?.addEventListener('click',()=>queueMicrotask(()=>{setShow(open);draw()}));
 onFrameChange();update([]);
 window.CityRouteMapRescue={update,showDiagram:()=>{manual=true;setShow(true)},showMap:()=>{manual=true;setShow(false)}};
})();
