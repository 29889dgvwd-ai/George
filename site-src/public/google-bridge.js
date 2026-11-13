/* Google is optional until a restricted browser API key is configured. */
window.initGoogleMap = async function ({key,onClick,onDrag,onView,onFailure}) {
  let failed=false, active=false, googleMap;
  const element=document.getElementById('googleMap');
  const fail=()=>{failed=true;active=false;element.hidden=true;document.body.classList.remove('google-active');onFailure?.();};
  await new Promise((resolve,reject)=>{
    let settled=false;
    const done=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();};
    const timer=setTimeout(()=>done(Error('Google Maps timed out')),12000);
    window.gm_authFailure=()=>{fail();done(Error('Google Maps authentication failed'));};
    window.cityRouteGoogleReady=()=>done();
    const script=document.createElement('script');script.async=true;
    script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,loading:'async',callback:'cityRouteGoogleReady',v:'quarterly',language:document.documentElement.lang||'ru'});
    script.onerror=()=>done(Error('Google Maps could not load'));document.head.append(script);
  });
  if(failed)throw Error('Google Maps unavailable');
  const G=window.google.maps;
  const coord=p=>Array.isArray(p)?{lat:p[0],lng:p[1]}:{lat:p.lat,lng:p.lng};
  element.hidden=false;
  try {googleMap=new G.Map(element,{center:{lat:55.7558,lng:37.6173},zoom:15,gestureHandling:'cooperative',mapTypeControl:false,streetViewControl:false,fullscreenControl:false,clickableIcons:false});}
  catch(error){fail();throw error;}
  active=true;document.body.classList.add('google-active');
  const endpoints=[null,null];let line=null,stops=[],places=[];
  const remove=list=>{list.forEach(m=>m.setMap(null));return [];};
  const marker=(p,label,title,draggable=false)=>new G.Marker({map:googleMap,position:coord(p),label,title,draggable,optimized:true});
  googleMap.addListener('click',e=>{if(active&&e.latLng)onClick([e.latLng.lat(),e.latLng.lng()]);});
  googleMap.addListener('idle',()=>{if(active){const c=googleMap.getCenter();onView?.({lat:c.lat(),lng:c.lng()},googleMap.getZoom());}});
  return {
    view(p,zoom){if(!active)return;const c=googleMap.getCenter(),q=coord(p);if(!c||Math.abs(c.lat()-q.lat)>1e-7||Math.abs(c.lng()-q.lng)>1e-7)googleMap.setCenter(q);if(googleMap.getZoom()!==zoom)googleMap.setZoom(zoom);},
    resize(){if(active)G.event.trigger(googleMap,'resize');},
    point(i,p,label){endpoints[i]?.setMap(null);endpoints[i]=null;if(!p)return;const m=marker(p,i?'Б':'А',label,true);m.addListener('dragend',e=>{if(e.latLng)onDrag(i,[e.latLng.lat(),e.latLng.lng()]);});endpoints[i]=m;},
    route(path){line?.setMap(null);line=path.length?new G.Polyline({map:googleMap,path:path.map(coord),strokeColor:'#315bea',strokeWeight:6,strokeOpacity:1,clickable:false}):null;},
    stops(items){stops=remove(stops);stops=items.map((p,i)=>marker(p.routePoint||p,String(i+1),p.name));},
    places(items,onChoose){places=remove(places);places=items.slice(0,180).map(p=>{const m=marker(p,undefined,p.name);m.addListener('click',()=>onChoose(p));return m;});},
    clear(){endpoints.forEach(m=>m?.setMap(null));endpoints.fill(null);}
  };
};
