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
 check(await page.locator('#mapGPS').isVisible(),'Location control is visible beside map');
 check(await page.locator('#toggleMap').count()===0,'No unwanted OSM toggle');
 check(await page.locator('[data-pick]').count()===0,'No fake map click editor');
 await page.locator('#mapGPS').click();
 await page.waitForFunction(()=>document.getElementById('startPoint')?.value==='55.735000,37.580000',{timeout:7000});
 check((await page.locator('#locationStatus').innerText()).includes('GPS'),'GPS success message');
 await page.waitForFunction(()=>new URL(document.getElementById('yandexWidget').src).searchParams.get('ll')==='37.580000,55.735000',{timeout:3500});
 const gpsFrame=new URL(await page.locator('#yandexWidget').getAttribute('src'));
 check(gpsFrame.searchParams.get('ll')==='37.580000,55.735000','Yandex map centers exactly on GPS');
 check(await page.locator('#locationOnMap').isVisible(),'Full Yandex location link available');
 await page.locator('#findPlacesTop').click();
 check(await page.locator('#nearbyDisclosure').evaluate(el=>el.open),'Nearby places section opened');
 const count=await page.locator('#placesList > div').count();
 check(count>=12,'Instant fallback places visible offline: '+count);
 check(await page.locator('.place-list-card').count()>=12,'Nearby places render as photo-ready cards');
 check(await page.locator('.place-list-card .place-list-actions a').count()>=12,'Every place has its own Yandex photos/reviews link');
 await page.locator('#placeQuery').fill('Парк');
 const filtered=await page.locator('#placesList > div').count();
 check(filtered>=1&&filtered<count,'Place search filters without server');
 await page.locator('#placeQuery').fill('');
 await page.locator('#placesList button').first().click();
 check(await page.locator('#chosenStops button').count()===1,'Choose stop works');
 await page.locator('#endPoint').fill('Парк Горького');
 await page.locator('#buildReal').click();
 await page.locator('.cityroute-map-cta').waitFor({state:'visible',timeout:5000});
 let link=new URL(await page.locator('#yandexNav').getAttribute('href'));
 check(link.searchParams.get('rtt')==='pd','Pedestrian route');
 check(link.searchParams.get('rtext')?.includes('55.735'),'GPS coordinates included in Yandex walking route');
 check(await page.locator('.cityroute-quick-stops li').count()>=2,'Stops appear in itinerary');
 check(await page.locator('.cityroute-step-plan').count()===1,'Walking itinerary has a connected visible step-by-step scheme');
 check(await page.locator('.cityroute-step-leg a').count()>=1,'Each walking leg has real navigation links');
 check(await page.evaluate(()=>!!window.CityRouteMapRescue),'Map fallback is initialized');
 await page.evaluate(()=>window.CityRouteMapRescue.showDiagram());
 check(await page.locator('.cityroute-map-rescue').isVisible(),'Fallback diagram is usable when Yandex iframe is empty');
 check(await page.locator('.cityroute-map-rescue-svg').isVisible(),'Fallback has visible route geometry');
 await page.evaluate(()=>window.CityRouteMapRescue.showMap());
 await page.locator('#distance').selectOption('12');
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
 check(await page.locator('#startPoint').inputValue()==='55.735000,37.580000','Saved GPS start restored');
 await page.locator('label:has([name=routeMode][value=loop])').click({force:true});
 await page.locator('#buildReal').click();
 link=new URL(await page.locator('#yandexNav').getAttribute('href'));
 const rtext=link.searchParams.get('rtext')?.split('~')||[];
 check(rtext.length>=3,'Round trip includes waypoints');
 check(rtext[0]===rtext.at(-1),'Round trip ends at start');
 await page.locator('label:has([name=routeMode][value=oneway])').click({force:true});
 await page.locator('#city').fill('Санкт-Петербург');
 await page.locator('#startPoint').fill('Невский проспект, 28');
 await page.locator('#endPoint').fill('Дворцовая площадь');
 await page.locator('#buildReal').click();
 link=new URL(await page.locator('#yandexNav').getAttribute('href'));
 check(link.searchParams.get('rtext')?.includes('Санкт-Петербург'),'Typed endpoints route in other cities');
 check(!errors.length,'No JS errors: '+errors.join('; '));
 check(!forbidden.length,'No OSM raster tiles loaded');
 console.log('PASS: real GPS, precise Yandex center, fast offline place search, itinerary, save/restore, round trip, other cities and map controls.');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
