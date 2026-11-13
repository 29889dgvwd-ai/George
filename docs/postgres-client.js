/* CityRoute PostgreSQL (Supabase REST + Auth) — no database passwords or secret keys in this file.
   Public publishable API key has only RLS-limited permissions.
   GPS is never transmitted automatically; cloud writes happen on explicit Save/Sync only. */
(()=>{'use strict';
const BASE='https://nueldyadzypealriurmu.supabase.co';
const KEY="sb_publishable_r_x6pqCRxyiVw19YMSjWNA_wgCHCI9a";
const STORE='cityroute-pg-auth-v1';
let session=null,refreshing=null;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function errorText(resp,body){
 const detail=body?.msg||body?.message||body?.error_description||body?.error||resp.statusText||'Request failed';
 const translated=resp.status===429?'Слишком много запросов. Попробуй позднее.':resp.status===401?'Требуется вход в аккаунт.':resp.status===403?'Нет доступа к этим данным.':resp.status>=500?'База данных временно недоступна.':String(detail);
 return new Error(translated);
}
function stored(){try{const value=JSON.parse(localStorage.getItem(STORE)||'null');return value&&value.refresh_token?value:null}catch{return null}}
function remember(v){
 session=v&&v.access_token&&v.refresh_token?{
  access_token:v.access_token,refresh_token:v.refresh_token,
  expires_at:v.expires_at||Math.floor(Date.now()/1000)+(v.expires_in||3600),user:v.user
 }:null;
 try{if(session)localStorage.setItem(STORE,JSON.stringify(session));else localStorage.removeItem(STORE)}catch{}
 return session
}
async function request(path,{method='GET',body,auth=false,prefer,signal}={}){
 const headers={'apikey':KEY,'accept':'application/json'};
 if(auth){
  const s=await current();
  if(!s?.access_token)throw Error('Войди в облачный аккаунт, чтобы использовать PostgreSQL.');
  headers.authorization='Bearer '+s.access_token
 }
 if(body!==undefined)headers['content-type']='application/json';
 if(prefer)headers.prefer=prefer;
 const r=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:signal||AbortSignal.timeout(10000)});
 const raw=await r.text();
 let value;try{value=raw?JSON.parse(raw):null}catch{value={message:raw.slice(0,160)}}
 if(!r.ok)throw errorText(r,value);
 return value
}
async function current(){
 if(!session)session=stored();
 if(!session)return null;
 if(session.expires_at&&session.expires_at>Math.floor(Date.now()/1000)+90)return session;
 if(!refreshing)refreshing=(async()=>{
  try{
   const next=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
   return remember(next)
  }catch{remember(null);return null}finally{refreshing=null}
 })();
 return refreshing
}
async function signIn(email,password){
 if(!email||!password)throw Error('Введи электронную почту и пароль.');
 const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
 if(!data?.access_token)throw Error('Не удалось войти. Проверь почту и пароль.');
 return remember(data)
}
async function signUp(email,password){
 if(!email||!password||password.length<8)throw Error('Укажи email и пароль не короче 8 символов.');
 const data=await request('/auth/v1/signup',{method:'POST',body:{email,password}});
 if(data?.access_token)remember(data);
 return data
}
async function signOut(){
 const s=await current();
 if(s?.access_token)try{await request('/auth/v1/logout',{method:'POST',auth:true})}catch{}
 remember(null);
}
const txt=(v,max)=>String(v||'').trim().slice(0,max)||'Маршрут';
function payloadToRow(route){
 if(!route||typeof route!=='object')throw Error('Маршрут пуст.');
 if(JSON.stringify(route).length>150000)throw Error('Маршрут слишком большой для облака.');
 const waypoints=Array.isArray(route.waypoints)?route.waypoints:[];
 const points=Array.isArray(route.points)?route.points:[];
 const stops=Array.isArray(route.stops)?route.stops:Array.isArray(route.places)?route.places:[];
 const origin=route.start||points[0]?.label||waypoints[0]?.name||waypoints[0]?.label||'Начало';
 const finish=route.loop?'Круговой маршрут':route.finish||points[1]?.label||waypoints.at(-1)?.name||waypoints.at(-1)?.label||'Финиш';
 return {
  title:txt(origin+' → '+finish,150),start_title:txt(origin,200),end_title:txt(finish,200),
  kilometers:Math.max(0,Math.min(2000,Number(route.data?.trip?.summary?.length)||0)),
  minutes:Math.max(0,Math.min(100000,Math.round(Number(route.data?.trip?.summary?.time||0)/60))),
  stops,polyline:[],prefs:{style:route.style||'all',loop:!!route.loop,city:route.city||'Москва'},
  payload:route,updated_at:new Date().toISOString()
 }
}
async function saveRoute(route){
 const s=await current();
 if(!s?.user?.id)throw Error('Войди в облако перед сохранением.');
 const row={...payloadToRow(route),owner_id:s.user.id};
 if(uuid.test(route.id||''))row.id=route.id;
 const records=await request('/rest/v1/routes?on_conflict=id',{method:'POST',body:[row],auth:true,prefer:'resolution=merge-duplicates,return=representation'});
 return records?.[0]||null
}
async function listRoutes(){
 const rows=await request('/rest/v1/routes?select=id,title,start_title,end_title,created_at,payload&order=created_at.desc&limit=50',{auth:true});
 return Array.isArray(rows)?rows:[]
}
async function removeRoute(id){
 if(!uuid.test(id||''))throw Error('Некорректный идентификатор маршрута.');
 await request('/rest/v1/routes?id=eq.'+encodeURIComponent(id),{method:'DELETE',auth:true})
}
async function listPlaces(){
 const rows=await request('/rest/v1/cityroute_places?select=id,name,city,type,category,latitude,longitude,address,wikipedia&city=eq.'+encodeURIComponent('Москва')+'&order=name.asc&limit=250');
 return (Array.isArray(rows)?rows:[]).map(p=>({
  id:p.id,name:p.name,type:p.type,category:p.category,lat:p.latitude,lng:p.longitude,
  address:p.address||'',tags:p.wikipedia?{wikipedia:p.wikipedia}:{},source:'postgres'
 }))
}
async function listFavorites(){
 const rows=await request('/rest/v1/favorites?select=id,place_id,place_name,category,latitude,longitude,created_at&order=created_at.desc&limit=200',{auth:true});
 return Array.isArray(rows)?rows:[]
}
async function saveFavorite(place){
 const s=await current();if(!s?.user?.id)throw Error('Сначала войди.');
 const p={owner_id:s.user.id,place_id:String(place.id||'').slice(0,160)||null,place_name:txt(place.name,150),
  category:txt(place.category||place.type||'Другое',60),
  latitude:Number(place.lat),longitude:Number(place.lng)};
 if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))throw Error('Не указаны координаты места.');
 return request('/rest/v1/favorites?on_conflict=owner_id,place_id',{method:'POST',body:[p],auth:true,prefer:'resolution=merge-duplicates,return=representation'})
}
async function readSettings(){
 const rows=await request('/rest/v1/cityroute_settings?select=theme,language,home_city,preferences&limit=1',{auth:true});
 return rows?.[0]||null
}
async function saveSettings(value){
 const s=await current();if(!s?.user?.id)throw Error('Войди.');
 const body={owner_id:s.user.id,theme:value.theme==='dark'?'dark':'light',
  language:value.language==='en'?'en':'ru',home_city:String(value.home_city||'Москва').slice(0,120),
  preferences:value.preferences&&typeof value.preferences==='object'?value.preferences:{}};
 return request('/rest/v1/cityroute_settings?on_conflict=owner_id',{method:'POST',auth:true,body:[body],prefer:'resolution=merge-duplicates,return=minimal'})
}
window.CityRouteCloud={BASE,current,signIn,signUp,signOut,saveRoute,listRoutes,removeRoute,
 listPlaces,listFavorites,saveFavorite,readSettings,saveSettings,
 isSignedIn:()=>Boolean(session?.access_token),getUser:()=>session?.user||null};
void current();
})();