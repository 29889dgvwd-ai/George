/* CityRoute approximate route geometry.
   Produces distinct detour waypoints for the requested length even if start and finish are close.
   Geodesic distances are only planning estimates; actual pedestrian distances require a router. */
((root)=>{
 'use strict';
 const rad=Math.PI/180,earth=6371.0088;
 const valid=p=>Boolean(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180);
 const dest=(p,km,bearing)=>{
  const a=p.lat*rad,o=p.lng*rad,theta=bearing*rad,s=km/earth;
  const la=Math.asin(Math.sin(a)*Math.cos(s)+Math.cos(a)*Math.sin(s)*Math.cos(theta));
  const lo=o+Math.atan2(Math.sin(theta)*Math.sin(s)*Math.cos(a),Math.cos(s)-Math.sin(a)*Math.sin(la));
  return {lat:la/rad,lng:lo/rad}
 };
 const km=(a,b)=>{
  if(!valid(a)||!valid(b))return NaN;
  const dLat=(b.lat-a.lat)*rad,dLon=(b.lng-a.lng)*rad;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
  return 2*earth*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)))
 };
 const bearing=(a,b)=>{
  const d=(b.lng-a.lng)*rad;
  const x=Math.sin(d)*Math.cos(b.lat*rad);
  const y=Math.cos(a.lat*rad)*Math.sin(b.lat*rad)-Math.sin(a.lat*rad)*Math.cos(b.lat*rad)*Math.cos(d);
  return (Math.atan2(x,y)/rad+360)%360
 };
 const pathKm=points=>points.slice(1).reduce((sum,p,i)=>sum+km(points[i],p),0);
 const normalized=n=>((n%360)+360)%360;
 function plan({start,end,targetKm=3,loop=false,scale=1,rotate=0}){
  if(!valid(start))throw Error('Invalid route start');
  const requested=Math.max(.5,Math.min(35,Number(targetKm)||3));
  const multiplier=Math.max(.18,Math.min(2.8,Number(scale)||1));
  let points=[],tooShort=false;
  if(loop||!valid(end)||km(start,end)<.12){
   // Four-sided walk anchored at the chosen start, not out-and-back along a single road.
   const axis=normalized(rotate||65),side=requested*.205*multiplier;
   const one=dest(start,side,axis),two=dest(one,side,axis+90),three=dest(start,side,axis+90);
   points=[start,one,two,three,start];
  }else{
   const direct=km(start,end);
   if(direct>requested*1.04){tooShort=true;points=[start,end]}
   else{
    // U-shaped excursion. Bisection solves the geodesic waypoint length to ~82% requested,
    // leaving room for street-network detours; real length is measured independently.
    const axis=normalized(bearing(start,end)+(rotate||90));
    const goal=Math.max(direct+0.05,requested*.82*multiplier);
    let low=0,high=Math.max(.1,requested*.7);
    function candidate(offset){
     const a=dest(start,offset,axis),b=dest(end,offset,axis);
     return [start,a,b,end];
    }
    for(let i=0;i<21;i++){
     const mid=(low+high)/2;
     if(pathKm(candidate(mid))<goal)low=mid;else high=mid;
    }
    points=candidate((low+high)/2);
   }
  }
  return {points,targetKm:requested,straightKm:pathKm(points),directKm:valid(end)?km(start,end):0,tooShort};
 }
 // Public demo API: always optional, short timeout, and never required to view the route.
 async function walkingLength(points,{signal,timeoutMs=5500}={}){
  if(!Array.isArray(points)||points.length<2||points.some(p=>!valid(p)))return null;
  const input={locations:points.map(p=>({lat:p.lat,lon:p.lng})),costing:'pedestrian',units:'kilometers',directions_options:{units:'kilometers',directions_type:'none'}};
  const timeout=AbortSignal.timeout(timeoutMs);
  const combined=signal?AbortSignal.any([signal,timeout]):timeout;
  const r=await fetch('https://valhalla1.openstreetmap.de/route',{method:'POST',headers:{'Content-Type':'application/json','X-Client-Id':'CityRoute-school-project'},body:JSON.stringify(input),signal:combined});
  if(!r.ok)throw Error('Walking router HTTP '+r.status);
  const json=await r.json();
  const length=Number(json.trip?.summary?.length);
  if(!Number.isFinite(length)||length<=0)throw Error('Invalid pedestrian route length');
  return {km:length,minutes:Math.round(Number(json.trip?.summary?.time||length/4.5*3600)/60)};
 }
 async function matchLength({start,end,targetKm,loop=false,rotate=0,signal,onProgress}){
  let scale=1,best=null;
  for(let trial=0;trial<3;trial++){
   if(signal?.aborted)throw signal.reason||Error('Cancelled');
   const planned=plan({start,end,targetKm,loop,rotate,scale});
   if(planned.tooShort)return {...planned,measuredKm:null,attempts:trial};
   try{
    onProgress?.(trial+1,3);
    const result=await walkingLength(planned.points,{signal,timeoutMs:4200});
    const record={...planned,measuredKm:result.km,minutes:result.minutes,attempts:trial+1};
    if(!best||Math.abs(record.measuredKm-targetKm)<Math.abs(best.measuredKm-targetKm))best=record;
    if(Math.abs(result.km-targetKm)<=Math.max(.45,targetKm*.10))break;
    // Adjust excursion scale cautiously. Actual route may contain detours and bridges.
    const baseline=loop?0:planned.directKm;
    const correction=(targetKm-baseline)/Math.max(.25,result.km-baseline);
    scale=Math.max(.3,Math.min(2.3,scale*Math.max(.65,Math.min(1.45,correction))));
   }catch(error){
    if(signal?.aborted)throw error;
    // If the public walking router is unavailable, show plausible waypoints
    // but never invent a measured walking distance.
    return best||{...planned,measuredKm:null,attempts:trial+1,routerUnavailable:true};
   }
  }
  return best;
 }
 const api={valid,dest,km,bearing,pathKm,plan,matchLength,walkingLength};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.CityRouteDistance=api;
})(typeof window!=='undefined'?window:globalThis);
