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
  const target=join(root,path==='/'?'index.html':path),body=await readFile(target);
  res.writeHead(200,{'content-type':types[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404).end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const errors=[],forbidden=[];
let browser;
const check=(v,msg)=>assert(v,msg);
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:55.735,longitude:37.58,accuracy:13},permissions:['geolocation']});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/tile\.openstreetmap\.org/.test(r.url()))forbidden.push(r.url())});
 await page.route('**/*',r=>{
  const url=r.request().url();
  if(url.startsWith(base))return r.continue();
  if(url.startsWith('https://yandex.ru/map-widget/'))return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>Yandex map widget</body></html>'});
  return r.abort();
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:20000});
 await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
 check(await page.locator('#yandexWidget').isVisible(),'Yandex is visible on iPhone-sized browser');
  check(await page.locator('.ready-route').count()>=6,'At least six ready walk cards render immediately');
  check(await page.locator('.ready-route-spend').count()>=6,'Ready walks show food budget information');
 check(await page.locator('#mapGPS').isVisible(),'Location control is visible beside map');
 check(await page.locator('.cityroute-map-rescue').count()===0,'No schematic overlays the embedded map');
 check(await page.locator('#toggleMap').count()===0,'No unwanted OSM toggle');
 check(await page.locator('[data-pick]').count()===0,'No fake map click editor');
 await page.locator('#mapGPS').click();
 await page.waitForFunction(()=>document.getElementById('startPoint')?.value==='Моё местоположение',{timeout:7000});
 check((await page.locator('#locationStatus').innerText()).includes('Местоположение определено'),'GPS success message matches UI wording');
 await page.waitForFunction(()=>new URL(document.getElementById('yandexWidget').src).searchParams.get('ll')==='37.580000,55.735000',{timeout:3500});
 const gpsFrame=new URL(await page.locator('#yandexWidget').getAttribute('src'));
 check(gpsFrame.searchParams.get('ll')==='37.580000,55.735000','Yandex map centers exactly on GPS');
 check(await page.locator('#locationOnMap').isVisible(),'Full Yandex location link available');
 // Simulate indoor/network positioning failure, then a valid precise fix.
 await page.evaluate(()=>{
  window.__gpsAttempts=[];
  navigator.geolocation.getCurrentPosition=(ok,fail,options)=>{
   window.__gpsAttempts.push(options.enableHighAccuracy);
   queueMicrotask(()=>options.enableHighAccuracy?ok({coords:{latitude:55.735,longitude:37.58,accuracy:13}}):fail({code:2}));
  };
 });
 await page.locator('#locateReal').click();
 await page.waitForFunction(()=>window.__gpsAttempts.length===2&&!document.getElementById('locateReal').disabled);
 check(JSON.stringify(await page.evaluate(()=>window.__gpsAttempts))==='[false,true]','Network position failure retries precise GPS');
 check((await page.locator('#mapLocationStatus').innerText()).includes('Местоположение определено'),'Map toolbar displays GPS result');
 await page.evaluate(()=>{
  window.__gpsAttempts=[];
  navigator.geolocation.getCurrentPosition=(ok,fail,options)=>{window.__gpsAttempts.push(options.enableHighAccuracy);queueMicrotask(()=>fail({code:1}));};
 });
 await page.locator('#mapGPS').click();
 await page.waitForFunction(()=>window.__gpsAttempts.length===1&&!document.getElementById('mapGPS').disabled);
 check((await page.locator('#mapLocationStatus').innerText()).includes('Доступ запрещён'),'Denied access explained without inventing GPS');
 check(await page.locator('#startPoint').inputValue()==='Моё местоположение','Permission failure preserves prior valid start');
 await page.evaluate(()=>{delete navigator.geolocation.getCurrentPosition;});
 await page.locator('#locateReal').click();
 await page.waitForFunction(()=>document.getElementById('locationStatus').textContent.includes('Местоположение определено')&&!document.getElementById('locateReal').disabled);
 await page.locator('#findPlacesTop').click();
 check(await page.locator('#nearbyDisclosure').evaluate(el=>el.open),'Nearby places section opened');
 const count=await page.locator('#placesList > div').count();
 check(count>=12,'Instant fallback places visible offline: '+count);
 check(await page.locator('.place-list-card').count()>=12,'Nearby places render as photo-ready cards');
 check(await page.locator('.place-list-card .place-list-actions a').count()>=12,'Every place has its own Yandex photos/reviews link');
 await page.locator('#placeQuery').fill('Парк');
 await page.waitForFunction(()=>{const names=[...document.querySelectorAll('#placesList .place-list-copy strong')].map(n=>n.textContent.toLocaleLowerCase('ru'));return names.length>0&&names.every(n=>n.includes('парк'));},null,{timeout:3500});
 check(await page.locator('#placesList > div').count()>=1,'Place search filters without server');
 await page.locator('#placeQuery').fill('');
 await page.locator('#placesList button').first().click();
 check(await page.locator('#chosenStops button').count()===1,'Choose stop works');
 await page.locator('#endPoint').fill('Парк Горького');
 await page.locator('#buildReal').click();
 try{await page.locator('.cityroute-map-cta').waitFor({state:'visible',timeout:10000})}catch(error){
  console.error('ROUTE DEBUG',JSON.stringify(await page.evaluate(()=>({
    formStatus:document.getElementById('formStatus')?.textContent,
    errorStack:window.cityrouteLastBuildError,
    routeStatus:document.getElementById('routeStatus')?.textContent,
    waypointCount:document.querySelectorAll('.cityroute-step-plan li').length,
    distanceApi:!!window.CityRouteDistance,
    start:document.getElementById('startPoint')?.value,
    end:document.getElementById('endPoint')?.value,
    scripts:[...document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))
  })),null,2),'PAGE ERRORS',errors);throw error;
 }
 let link=new URL(await page.locator('#yandexNav').getAttribute('href'));
 check(link.searchParams.get('rtt')==='pd','Pedestrian route');
 check(link.searchParams.get('rtext')?.includes('55.735'),'GPS coordinates included in Yandex walking route');
 check(await page.locator('.cityroute-quick-stops li').count()>=2,'Stops appear in itinerary');
 check(await page.locator('.cityroute-step-plan').count()===1,'Walking itinerary shows actual stops');
 check((await page.locator('.cityroute-step-plan').innerText()).includes('Моё местоположение'),'GPS coordinates are not shown as the stop name');
 check(await page.locator('.cityroute-step-media a').count()>=1,'Intermediate places have photo links');
 check(await page.locator('.cityroute-step-leg a').count()>=1,'Each walking leg has real navigation links');
 check(await page.locator('.cityroute-map-rescue').count()===0,'The unwanted schematic is removed');
 check(await page.locator('#yandexWidget').isVisible(),'Yandex iframe stays visible');
 check(await page.locator('#scenicResult').count()===0,'No duplicate end-of-page photo gallery');
 await page.locator('#distance').evaluate(el=>{el.value='12';el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#buildReal').click();
 await page.locator('.route-distance-summary').waitFor({state:'visible',timeout:7000});
 const fullDistanceLink=new URL(await page.locator('#yandexNav').getAttribute('href'));
 check((fullDistanceLink.searchParams.get('rtext')||'').split('~').length>=4,'12km route has additional scenic detour waypoints rather than 2km shortcut');
 check((await page.locator('.route-distance-summary').innerText()).includes('12'),'Requested 12km appears in route distance summary');

 check(await page.locator('#rerollRoute').isVisible(),'Route variant button is visible');
 await page.locator('.cityroute-save-route').click();
 check((await page.evaluate(()=>JSON.parse(localStorage.getItem('cityroute-saved-itineraries-v1')||'[]')))[0]?.v===3,'Save works');
 await page.goto(base+'/walks.html',{waitUntil:'domcontentloaded'});
 check(await page.locator('.saved-route').count()>=1,'Saved route visible in My Walks');
 await page.locator('.saved-route .saved-actions button').first().click();
 await page.waitForURL(/index\.html/);
 await page.locator('.cityroute-map-cta').waitFor({state:'visible'});
 check(await page.locator('#startPoint').inputValue()==='Моё местоположение','Saved GPS start restored with readable label');
 await page.locator('label:has([name=routeMode][value=loop])').click({force:true});
 await page.locator('#buildReal').click();
 await page.waitForFunction(()=>{const q=new URL(document.getElementById('yandexNav').href);return (q.searchParams.get('rtext')||'').split('~').length>=3;},{timeout:9000});
 link=new URL(await page.locator('#yandexNav').getAttribute('href'));
 const rtext=link.searchParams.get('rtext')?.split('~')||[];
 check(rtext.length>=3,'Round trip includes waypoints');
 check(rtext[0]===rtext.at(-1),'Round trip ends at start');
 await page.locator('label:has([name=routeMode][value=oneway])').click({force:true});
 await page.locator('#city').fill('Санкт-Петербург');
 await page.locator('#startPoint').fill('Невский проспект, 28');
 await page.locator('#endPoint').fill('Дворцовая площадь');
 await page.locator('#buildReal').click();
 await page.waitForFunction(()=>{const q=new URL(document.getElementById('yandexNav').href);return (q.searchParams.get('rtext')||'').includes('Санкт-Петербург');},{timeout:11000});
 link=new URL(await page.locator('#yandexNav').getAttribute('href'));
 check(link.searchParams.get('rtext')?.includes('Санкт-Петербург'),'Typed endpoints route in other cities');

 // A non-Moscow collection works offline, keeps its local currency and restores the exact stops.
 await page.locator('#city').fill('Paris');await page.locator('#city').press('Tab');
 await page.locator('[data-ready-route^="area-"]').first().click();
 await page.locator('.cityroute-save-route').waitFor({state:'visible'});
 const stopsBefore=await page.locator('#yandexNav').getAttribute('href');
 check(new URL(stopsBefore).searchParams.get('rtext').split('~').every(p=>p.startsWith('48.')),'Paris collection keeps all points in Paris');
 check((await page.locator('#itinerary').innerText()).includes('31–45 €'),'Paris meal displays its published euro price');
 await page.waitForFunction(()=>[...document.querySelectorAll('.cityroute-stop-gallery img')].some(img=>img.complete&&img.naturalWidth>0));
 await page.locator('.cityroute-save-route').click();
 await page.goto(base+'/walks.html');await page.locator('.saved-route .saved-actions button').first().click();
 await page.locator('.cityroute-save-route').waitFor({state:'visible'});
 check(await page.locator('#yandexNav').getAttribute('href')===stopsBefore,'Reopening a saved international walk preserves every waypoint');
 // Reproduce the user's iPhone report: known metro names, twelve-kilometer
 // target, and endpoints that are actually much further than 12 km apart.
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#startPoint').fill('метро ясенево');
 await page.locator('#endPoint').fill('рязанский проспект');
 await page.locator('#distance').evaluate(el=>{el.value='12';el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#buildReal').click();
 await page.locator('#suggestLoopRoute').waitFor({state:'visible',timeout:6000});
 check((await page.locator('.route-distance-alert').innerText()).includes('по прямой'),'Too-distant endpoints show actual straight-line minimum, not a fake 12 km walk');
 check(await page.locator('.cityroute-step-plan li').count()===2,'Impossible 12 km point-to-point walk is clearly distinguished from a real planned route');
 await page.locator('#suggestLoopRoute').click();
 await page.waitForFunction(()=>{
   const url=new URL(document.getElementById('yandexNav').href);
   return (url.searchParams.get('rtext')||'').split('~').length>=5
 },{timeout:14000});
 check(await page.locator('.cityroute-step-plan li').count()>=5,'12 km nearby loop has intermediate points and returns to the station');
 const planned=new URL(await page.locator('#yandexNav').getAttribute('href'));
 const pts=planned.searchParams.get('rtext').split('~');
 check(pts[0]===pts.at(-1),'Metro Yasenevo loop ends at the original start');
 check(await page.locator('#yandexWidget').isVisible(),'Only the real map is displayed');
 check(await page.locator('.place-list-price').count()>=1,'Nearby food venues show sourced average checks or honest missing-data state');
 const nearFood=await page.locator('.place-list-card').filter({hasText:'«Оазис»'}).count();
 check(nearFood>=1,'Near-Yasenevo cafe included in the searchable catalogue');
 check(!errors.length,'No JS errors: '+errors.join('; '));
 check(!forbidden.length,'No OSM raster tiles loaded');
 console.log('PASS: real GPS, precise Yandex center, fast offline place search, itinerary, save/restore, round trip, other cities and map controls.');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
