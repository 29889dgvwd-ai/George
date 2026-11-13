import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync('site-src/public/postgres-client.js','utf8');
const base=js.match(/const BASE='([^']+)'/)?.[1];
const key=js.match(/const KEY="(sb_publishable_[^"]+)"/)?.[1];
assert(base?.startsWith('https://')&&key,'Supabase public configuration is missing');
const headers={apikey:key,accept:'application/json'};
const request=async path=>{
 const response=await fetch(base+path,{headers,signal:AbortSignal.timeout(12000)});
 const raw=await response.text();
 let body;try{body=JSON.parse(raw)}catch{body=null}
 return {status:response.status,body}
};
const places=await request('/rest/v1/cityroute_places?select=id,name,city&type=eq.parks&limit=10');
assert.equal(places.status,200,'Public PostgreSQL places must be readable');
assert(Array.isArray(places.body)&&places.body.length>=4,'Moscow parks should be seeded');
const personal=await request('/rest/v1/routes?select=id,owner_id&limit=5');
assert([200,401,403].includes(personal.status),'Private routes should be blocked for anonymous users');
if(personal.status===200)assert(Array.isArray(personal.body)&&personal.body.length===0,'Anon must not read user routes');
const settings=await request('/rest/v1/cityroute_settings?select=owner_id&limit=5');
assert([200,401,403].includes(settings.status),'Private settings should be blocked');
if(settings.status===200)assert(Array.isArray(settings.body)&&settings.body.length===0,'Anon must not read personal settings');
console.log('PASS: real Supabase PostgreSQL serves public Moscow places and blocks anonymous private-route/settings reads.');