import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';
import {chromium} from 'playwright-core';

const root=resolve(process.cwd(),'docs');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path.includes('..')){res.writeHead(403).end();return}
  const filename=join(root,path==='/'?'index.html':path),body=await readFile(filename);
  res.writeHead(200,{'content-type':types[extname(filename)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404).end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const fakeUserId='123e4567-e89b-42d3-a456-426614174000';
const fakeUser={id:fakeUserId,email:'example@example.invalid'};
let browser;let remoteSaved=[],settingsSaved=[],errors=[],authCalls=0;
function answer(route,data,status=200){
 return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
}
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const request=route.request(),url=request.url();
  if(url.startsWith(origin))return route.continue();
  if(url.includes('yandex.ru/map-widget/'))return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>Yandex widget</body></html>'});
  if(!url.includes('nueldyadzypealriurmu.supabase.co'))return route.abort();
  if(url.includes('/auth/v1/token?grant_type=password')){
   authCalls++;
   const body=JSON.parse(request.postData()||'{}');
   if(body.email!=='example@example.invalid'||body.password!=='example-secret-password')return answer(route,{message:'invalid credentials'},400);
   return answer(route,{access_token:'test-jwt-for-browser-qa',refresh_token:'fake-refresh-token',token_type:'bearer',expires_in:3600,user:fakeUser});
  }
  if(url.endsWith('/auth/v1/logout'))return answer(route,{});
  if(url.includes('/rest/v1/routes')){
   if(request.method()==='GET')return answer(route,remoteSaved);
   if(request.method()==='DELETE'){remoteSaved=[];return answer(route,[],204)}
   if(request.method()==='POST'){
    const saved=JSON.parse(request.postData()||'[]');
    if(!saved.every(x=>x.owner_id===fakeUserId))return answer(route,{message:'RLS owner denied'},403);
    remoteSaved.push(...saved.map(x=>({...x,created_at:new Date().toISOString()})));
    return answer(route,remoteSaved);
   }
  }
  if(url.includes('/rest/v1/cityroute_settings')){
   if(request.method()==='POST'){settingsSaved=JSON.parse(request.postData()||'[]');return answer(route,[])}
   return answer(route,[])
  }
  if(url.includes('/rest/v1/cityroute_places'))return answer(route,[]);
  return route.abort()
 });
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
 assert(await page.locator('#postgresPanel').isVisible(),'Cloud PostgreSQL section must appear');
 assert(await page.locator('#pgAuthForm').isVisible(),'Account login must be optional and available');
 await page.locator('#pgEmail').fill('example@example.invalid');
 await page.locator('#pgPassword').fill('example-secret-password');
 await page.locator('#pgLogin').click();
 await page.locator('#pgMember').waitFor({state:'visible',timeout:8000});
 assert.equal(authCalls,1,'Should authenticate once against Supabase Auth');
 assert(await page.locator('#pgAuthForm').isHidden(),'Login form hidden after authentication');
 await page.locator('#routeStyle').selectOption('direct');
 await page.locator('#startPoint').fill('Красная площадь');
 await page.locator('#endPoint').fill('Парк Зарядье');
 await page.locator('#buildReal').click();
 await page.locator('.cityroute-save-route').waitFor({state:'visible'});
 await page.locator('.cityroute-save-route').click();
 await page.waitForFunction(()=>document.getElementById('saveStatus')?.textContent?.includes('PostgreSQL'),{timeout:8000});
 assert.equal(remoteSaved.length,1,'Explicit Save uploaded one route to PostgreSQL');
 assert.equal(remoteSaved[0].owner_id,fakeUserId,'Cloud route owned by signed-in account');
 assert.equal(remoteSaved[0].payload.v,3,'Original CityRoute payload persisted');
 assert.equal(remoteSaved[0].payload.start,'Красная площадь','Named start is preserved');
 await page.locator('#pgReload').click();
 await page.locator('.postgres-route').first().waitFor({state:'visible'});
 await page.locator('#pgSaveSettings').click();
 await page.waitForFunction(()=>document.getElementById('pgStatus')?.textContent?.includes('сохранены')||document.getElementById('pgStatus')?.textContent?.includes('saved'),{timeout:7000});
 assert.equal(settingsSaved[0]?.owner_id,fakeUserId,'Cloud settings belong to current user');
 await page.locator('#pgLogout').click();
 await page.locator('#pgAuthForm').waitFor({state:'visible'});
 assert.equal(await page.locator('#pgMember').isHidden(),true,'Cloud account signed out');
 assert.equal(errors.length,0,'Uncaught errors: '+errors.join('\n'));
 console.log('PASS: cloud email/password login, owner-only REST payload, explicit PostgreSQL route save, listing, settings, logout.');
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done))
}
