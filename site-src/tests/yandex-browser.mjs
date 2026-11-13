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
  const target=join(root,path==='/'?'index.html':path);
  const body=await readFile(target);
  res.writeHead(200,{'content-type':types[extname(target)]||'application/octet-stream','cache-control':'no-store'});
  res.end(body);
 }catch(e){res.writeHead(404).end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
let browser,errors=[];
const encodeLine=(coords)=>{
 let lastLat=0,lastLon=0,s='';
 for(const [lat0,lon0] of coords){
  const lat=Math.round(lat0*1e6),lon=Math.round(lon0*1e6);
  for(let n of [lat-lastLat,lon-lastLon]){
   n=n<0?~(n<<1):n<<1;
   while(n>=32){s+=String.fromCharCode((32|(n&31))+63);n>>=5}
   s+=String.fromCharCode(n+63);
  }
  lastLat=lat;lastLon=lon
 }
 return s
};
try{
 browser=await chromium.launch({executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>errors.push('browser JS: '+e.message));
 page.on('request',r=>{if(r.url().includes('tile.openstreetmap.org'))errors.push('unexpected OSM tiles')});
 await page.route('https://yandex.ru/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="ru"><body>Yandex widget in smoke test</body></html>'}));
 await page.route('https://photon.komoot.io/**',async r=>{
   const q=new URL(r.request().url()).searchParams.get('q')||'';
   const end=q.includes('Зарядье');const c=end?[37.63,55.751]:[37.62,55.754];
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:c}}]})});
 });
 await page.route('https://valhalla1.openstreetmap.de/**',async r=>{
   const q=JSON.parse(r.request().postData()||'{}');
   const locations=q.locations||[];
   const legs=locations.slice(1).map((end,i)=>{
     const start=locations[i];
     const shape=encodeLine([[start.lat,start.lon],[end.lat,end.lon]]);
     return {shape,summary:{length:0.8,time:900}};
   });
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({trip:{legs,summary:{length:legs.length*0.8,time:legs.length*900}}})});
 });
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#buildReal').waitFor({state:'visible',timeout:12000});
 assert.equal(await page.locator('[data-pick]').count(),0,'No disabled map edit buttons');
 assert.equal(await page.locator('#toggleMap').count(),0,'No switch back to OSM');
 assert.equal(await page.locator('#yandexWidget').count(),1,'Yandex widget should exist');
 assert(await page.locator('#yandexWidget').getAttribute('src').then(v=>v.startsWith('https://yandex.ru/map-widget/v1/')));
 assert(await page.locator('body').evaluate(el=>el.classList.contains('yandex-widget-active')));
 assert(await page.locator('#yandexWidget').evaluate(el=>{const d=getComputedStyle(el);return d.display!=='none'&&Number.parseFloat(d.height)>300}),'Yandex map visible at mobile width');
 assert(await page.locator('#liveMap').evaluate(el=>getComputedStyle(el).display==='none'),'OSM editor hidden');
 await page.locator('#routeStyle').selectOption('direct');
 await page.locator('#startPoint').fill('Красная площадь');
 await page.locator('#endPoint').fill('Парк Зарядье');
 await page.locator('#buildReal').click();
 await page.waitForFunction(()=>document.getElementById('routeDetail')?.textContent?.includes('км'),{timeout:15000});
 const href=await page.locator('#yandexNav').getAttribute('href');
 const frame=await page.locator('#yandexWidget').getAttribute('src');
 assert.equal(new URL(frame).origin,'https://yandex.ru');
 assert(new URL(frame).searchParams.get('rtext')?.includes('~'),'Yandex iframe shows route stops');
 assert.equal(new URL(frame).searchParams.get('rtt'),'pd','Walking profile only');
 assert(new URL(href).searchParams.get('rtext')?.includes('~'),'External Yandex directions link has route');
 assert.equal(await page.locator('#rerollRoute').isVisible(),true,'Alternate route button shown');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: Yandex is sole visible map, no OSM tiles or map-editor controls, routing updates Yandex iframe and link.');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
