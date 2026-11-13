window.initYandexMap=async function({key,onClick,onDrag}){
 await new Promise((resolve,reject)=>{
  const script=document.createElement('script');let settled=false;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve()};
  const timer=setTimeout(()=>finish(Error('Yandex Maps timed out')),15000);
  script.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey='+encodeURIComponent(key);
  script.onerror=()=>finish(Error('Yandex Maps could not load'));
  script.onload=()=>window.ymaps?ymaps.ready(()=>finish(),e=>finish(e)):finish(Error('Yandex Maps is unavailable'));
  document.head.append(script);
 });
 const element=document.getElementById('yandexMap');element.hidden=false;
 let map;
 try{map=new ymaps.Map(element,{center:[55.7558,37.6173],zoom:15,controls:['zoomControl','typeSelector']});}catch(e){element.hidden=true;throw e}
 document.body.classList.add('yandex-active');
 const endpoints=[null,null];let line=null;const places=new ymaps.GeoObjectCollection();map.geoObjects.add(places);
 const stops=new ymaps.GeoObjectCollection();map.geoObjects.add(stops);
 const coords=p=>Array.isArray(p)?p:[p.lat,p.lng];
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 map.events.add('click',e=>onClick(e.get('coords')));
 return {
  view(p,zoom){map.setCenter(coords(p),zoom,{duration:0})},
  resize(){map.container.fitToViewport()},
  point(i,p,label){if(endpoints[i])map.geoObjects.remove(endpoints[i]);const marker=new ymaps.Placemark(coords(p),{iconContent:i?'Б':'А',hintContent:escape(label)},{preset:i?'islands#greenStretchyIcon':'islands#blueStretchyIcon',draggable:true});marker.events.add('dragend',()=>onDrag(i,marker.geometry.getCoordinates()));endpoints[i]=marker;map.geoObjects.add(marker)},
  route(path){if(line)map.geoObjects.remove(line);line=null;if(path.length){line=new ymaps.Polyline(path,{}, {strokeColor:'#315bea',strokeWidth:6,strokeOpacity:1});map.geoObjects.add(line)}},
  stops(items){stops.removeAll();for(const [i,p] of items.entries()){stops.add(new ymaps.Placemark(coords(p.routePoint||p),{iconContent:String(i+1),hintContent:escape(p.name)},{preset:'islands#blueCircleIcon'}));}},
  places(items,onChoose){places.removeAll();for(const p of items){const marker=new ymaps.Placemark(coords(p),{hintContent:escape(p.name)+' · нажми, чтобы выбрать остановку'},{preset:'islands#violetCircleDotIcon'});marker.events.add('click',()=>onChoose(p));places.add(marker)}},
  clear(){for(let i=0;i<2;i++){if(endpoints[i])map.geoObjects.remove(endpoints[i]);endpoints[i]=null}}
 };
};
