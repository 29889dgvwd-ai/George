// Conservative exclusion envelopes. Distances refer to mapped geometry, not live conditions.
(()=>{
const cache=new Map();
const inside=(p,r)=>p[0]>=r.s&&p[0]<=r.n&&p[1]>=r.w&&p[1]<=r.e;
function intersects(a,b,r){
 let lo=0,hi=1;
 for(const [v,d,min,max] of [[a[0],b[0]-a[0],r.s,r.n],[a[1],b[1]-a[1],r.w,r.e]]){
  if(Math.abs(d)<1e-14){if(v<min||v>max)return false;continue}
  const x=(min-v)/d,y=(max-v)/d;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));if(lo>hi)return false;
 }return true;
}
function envelope(points,buffer,label){
 const ys=points.map(p=>p.lat),xs=points.map(p=>p.lon),latitude=ys.reduce((a,b)=>a+b,0)/ys.length;
 const dy=buffer/111000,dx=dy/Math.max(.1,Math.cos(latitude*Math.PI/180));
 return{s:Math.min(...ys)-dy,n:Math.max(...ys)+dy,w:Math.min(...xs)-dx,e:Math.max(...xs)+dx,label};
}
const polygon=r=>[[r.w,r.s],[r.e,r.s],[r.e,r.n],[r.w,r.n],[r.w,r.s]];
function hits(path,zones){return zones.filter(r=>path.some((p,i)=>i?intersects(path[i-1],p,r):inside(p,r)))}
async function load(points,km,preferences,signal){
 if(!preferences.malls&&!preferences.traffic&&!preferences.noise&&!preferences.crowds)return {bounds:null,zones:[]};
 const bounds=envelope(points.map(p=>({lat:p.lat,lon:p.lng})),Math.max(1800,km*1300),'coverage');
 const bb=[bounds.s,bounds.w,bounds.n,bounds.e].join(',');
 const roads=preferences.traffic||preferences.noise?'motorway|trunk|primary|secondary|motorway_link|trunk_link|primary_link|secondary_link':'motorway|trunk|primary|motorway_link|trunk_link|primary_link';
 const selectors=preferences.traffic||preferences.noise?[`way[highway~"^(${roads})$"](${bb});`]:[];
 if(preferences.malls)selectors.push(`nwr[shop=mall](${bb});nwr[building=retail][name~"торгов|shopping|mall",i](${bb});`);
 if(preferences.crowds)selectors.push(`nwr[amenity~"^(marketplace|bus_station)$"](${bb});nwr[railway=station](${bb});`);
 const query=`[out:json][timeout:8];(${selectors.join('')});out geom;`,key=query;
 if(cache.has(key))return cache.get(key);
 let data;
 for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
  try{const r=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});if(!r.ok)throw Error();data=await r.json();if(data.remark||!Array.isArray(data.elements))throw Error();break}catch(e){if(signal.aborted)throw e;data=null}
 }
 if(!data)throw Error('Не удалось проверить ТЦ и дороги. Маршрут не построен. Попробуй ещё раз.');
 const zones=[];
 for(const e of data.elements){
  const t=e.tags||{},geometry=e.geometry||e.members?.flatMap(m=>m.geometry||[])||(Number.isFinite(e.lat)?[{lat:e.lat,lon:e.lon}]:[]);
  const ps=geometry.filter(p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon));if(!ps.length)continue;
  if(t.highway){for(let i=1;i<ps.length;i++)zones.push(envelope([ps[i-1],ps[i]],preferences.traffic||preferences.noise?80:50,'крупная дорога'));}
  else zones.push(envelope(ps,150,t.shop==='mall'||t.building==='retail'?'ТЦ':'вокзал или рынок'));
 }
 const result={bounds,zones};cache.set(key,result);return result;
}
window.RouteAvoidance={inside,intersects,envelope,polygon,hits,load};
})();
