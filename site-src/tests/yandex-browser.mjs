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
 }catch{res.writeHead(404).end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const origin='http://127.0.0.1:'+port;
const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
let browser;
const errors=[],offsite=[];
const check=(val,message)=>assert(val,message);
try{
 browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:55.7558,longitude:37.6173},permissions:['geolocation']});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>{if(/overpass|valhalla|photon|tile\.openstreetmap/.test(req.url()))offsite.push(req.url())});
 // Tests must succeed even if ALL third-party providers are unavailable.
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith(origin))return route.continue();
  if(url.includes('yandex.ru/map-widget'))return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="ru"><body>Yandex test widget</body></html>'});
  return route.abort();
 });
 const start=Date.now();
 await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:20000});
 await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
 await page.locator('#buildReal').waitFor({state:'visible'});
 check(await page.locator('script[src$="route-app.js"]').count()===1,'Route app is loaded');
 check(await page.locator('script[src="app.js"]').count()===0,'Old timed-out routing app is absent');
 check(await page.locator('[data-pick]').count()===0,'Unavailable map-edit buttons are gone');
 check(await page.locator('#yandexWidget').evaluate(el=>getComputedStyle(el).display!=='none'),'Yandex widget should be visible');
 check(await page.locator('#yandexWidget').getAttribute('src').then(s=>s.includes('yandex.ru')),'Yandex map URL');
 await page.locator('#findPlacesTop').click();
 await page.locator('#placeSearch').waitFor({state:'visible'});
 const initialCount=await page.locator('.place-search-row').count();
 check(initialCount>=15,'Search should return multiple real locations without network: '+initialCount);
 await page.locator('#placeSearch').fill('Зарядье');
 const found=await page.locator('.place-search-row').count();
 check(found>=1&&found<initialCount,'Local text filtering works');
 check((await page.locator('#placesStatus').innerText()).includes('Найдено'),'Place search responds immediately');
 await page.locator('.place-search-row .add-place').first().click();
 check(await page.locator('.selected-place-chip').count()===1,'Add stop works');
 await page.locator('#placeSearch').fill('');
 await page.locator('#startPoint').fill('Красная площадь');
 await page.locator('#routeStyle').selectOption('direct');
 await page.locator('#endPoint').fill('Парк «Зарядье»');
 await page.locator('#budgetRange').evaluate(el=>{el.value='1500';el.dispatchEvent(new Event('input',{bubbles:true}))});
 check(await page.locator('#budgetAmount').inputValue()==='1500','Budget slider and input synchronized');
 await page.locator('label:has(#company-date)').click({force:true});
 check(await page.locator('[name=people][value="2"]').isChecked(),'Date is exactly two people');
 await page.locator('#buildReal').click();
 await page.waitForFunction(()=>document.getElementById('routeDetail')?.textContent?.includes('Точек'),{timeout:7000});
 check(Date.now()-start<20000,'No timeouts; complete test finishes fast');
 const url=await page.locator('#yandexNav').getAttribute('href'),frame=await page.locator('#yandexWidget').getAttribute('src');
 check(new URL(url).searchParams.get('rtext')?.includes('~'),'Walking URL has route stops');
 check(new URL(frame).searchParams.get('rtext')?.includes('~'),'Widget has route stops');
 check(new URL(url).searchParams.get('rtt')==='pd','Walking route requested');
 check(await page.locator('#itinerary .route-stop').count()>=3,'Itinerary visible');
 check(await page.locator('#scenicResult .place-photo-card').count()>=1,'Selected stop has photo/review card');
 check(await page.locator('#rerollRoute').isVisible(),'Alternate route action shown');
 await page.getByText('♡ Сохранить прогулку').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cityroute-saved-itineraries-v1')||'[]'));
 check(saved.length===1&&saved[0].v===3,'Saves route locally');
 await page.goto(origin+'/walks.html',{waitUntil:'domcontentloaded'});
 check(await page.locator('.saved-route').count()>=1,'Saved route appears in My Walks');
 await page.locator('.saved-route button').first().click();
 await page.waitForURL(/index\.html/);
 check(await page.locator('#routeDetail').innerText().then(t=>t.includes('Точек')),'Saved route restores');
 await page.locator('[name=routeMode][value=loop]').check();
 await page.locator('#buildReal').click();
 const loop=await page.locator('#yandexNav').getAttribute('href');
 const points=new URL(loop).searchParams.get('rtext')?.split('~')||[];
 check(points.length>=3,'Round trip includes intermediate place');
 check(points[0]===points.at(-1),'Round trip finishes at its starting point');
 await page.locator('[name=routeMode][value=oneway]').check();
 await page.locator('#city').fill('Санкт-Петербург');
 await page.locator('#startPoint').fill('Невский проспект, 28');
 await page.locator('#endPoint').fill('Дворцовая площадь');
 await page.locator('#buildReal').click();
 const other=new URL(await page.locator('#yandexNav').getAttribute('href')).searchParams.get('rtext');
 check(other.includes('Санкт-Петербург'),'Other cities still allow direct address routing');
 check(errors.length===0,'No uncaught browser errors:\n'+errors.join('\n'));
 check(offsite.length===0,'No old geocoding, routing or POI services requested: '+offsite.join(','));
 console.log('PASS: instant offline search, filters, adding stops, Yandex routes, photos, budget, group size, save and restore, round trip, other cities, no external routing calls. Elapsed '+(Date.now()-start)+'ms');
}finally{
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}
