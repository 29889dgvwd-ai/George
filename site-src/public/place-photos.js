/* Photos may only be labelled as a specific establishment when the source identifies it.
   Uses published Wikimedia/Wikidata images + local verified photo metadata.
   No Yandex scraping, random stock imagery, or unrelated photos. */
(()=>{'use strict';
const cache=new Map(),sourceByUrl=new Map();
const TAG='cityroute-commons-images-v5:',TTL=5*24*3600*1000;
// Exact, verified Wikimedia Commons categories for identified Moscow venues.
const verifiedCategories={'Кафе «Пушкинъ»':'Category:Café Pouchkine','Кондитерская «Кафе Пушкинъ»':'Category:Café Pouchkine'};
const text=(ru,en)=>document.body.classList.contains('english')?en:ru;
const imageFile=f=>'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(String(f).replace(/^File:/,'').replaceAll(' ','_'))+'?width=900';
const safeUrl=x=>{try{const u=new URL(String(x||''));return u.protocol==='https:'?u.href:''}catch{return ''}};
const sourceFile=f=>'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(String(f).replace(/^File:/,'').replaceAll(' ','_'));
const record=(url,creditLink,credit='Wikimedia Commons')=>{
 const u=safeUrl(url);if(u)sourceByUrl.set(u,{source:safeUrl(creditLink),credit:String(credit||'Wikimedia Commons').slice(0,120)});return u;
};
let active=0;
const pending=[];
function limited(work){
 return new Promise((resolve,reject)=>{
  pending.push({work,resolve,reject});next();
 });
}
function next(){
 while(active<3&&pending.length){
  const {work,resolve,reject}=pending.shift();active++;
  Promise.resolve().then(work).then(resolve,reject).finally(()=>{active--;next()});
 }
}
function getJson(url){
 return limited(async()=>{
  const r=await fetch(url,{signal:AbortSignal.timeout(5200)});
  if(!r.ok)throw Error('Wikimedia HTTP '+r.status);
  return r.json();
 });
}
const commonsApi=p=>'https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({...p,action:'query',format:'json',origin:'*'});
async function categoryImages(category){
 const title='Category:'+String(category||'').replace(/^Category:/,'');
 if(title==='Category:')return [];
 const data=await getJson(commonsApi({generator:'categorymembers',gcmtitle:title,gcmtype:'file',gcmlimit:'25',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'900'}));
 return Object.values(data.query?.pages||{}).filter(page=>{
  const info=page.imageinfo?.[0];return info?.mime?.startsWith('image/')&&!['image/svg+xml','image/gif'].includes(info.mime);
 }).slice(0,12).map(page=>{
  const info=page.imageinfo[0],url=info.thumburl||info.url;
  const license=info.extmetadata?.LicenseShortName?.value||'Wikimedia Commons';
  const artistHtml=info.extmetadata?.Artist?.value||'',artist=artistHtml.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,65);
  const credits=[artist,license].filter(Boolean).join(' · ');
  return record(url,info.descriptionurl||'https://commons.wikimedia.org/wiki/'+encodeURIComponent(page.title),credits);
 }).filter(Boolean).slice(0,7);
}
async function wikidataImages(id){
 if(!/^Q\d+$/.test(String(id||'')))return [];
 const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:id,props:'claims',format:'json',origin:'*'});
 const response=await getJson(url),claims=response.entities?.[id]?.claims||{};
 const files=(claims.P18||[]).slice(0,4).map(c=>c.mainsnak?.datavalue?.value).filter(Boolean);
 const photos=files.map(file=>record(imageFile(file),sourceFile(file))).filter(Boolean);
 const category=claims.P373?.[0]?.mainsnak?.datavalue?.value;
 if(category)try{photos.push(...await categoryImages(category))}catch{}
 return photos;
}
async function wikipediaImages(wikipedia){
 const match=/^(?:(ru|en|de):)?(.+)$/.exec(String(wikipedia||''));if(!match)return [];
 const lang=match[1]||'ru',title=match[2];
 const url='https://'+lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',prop:'pageimages|pageprops',titles:title,pithumbsize:'900',format:'json',origin:'*'});
 const response=await getJson(url);
 const page=Object.values(response.query?.pages||{})[0];if(!page||page.missing!==undefined)return [];
 const source='https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(title.replaceAll(' ','_'));
 const files=page.thumbnail?.source?[record(page.thumbnail.source,source,'Wikipedia')]:[];
 const id=page.pageprops?.wikibase_item;
 if(id)try{files.push(...await wikidataImages(id))}catch{}
 return files;
}
function store(key,urls){
 cache.set(key,{urls,time:Date.now()});
 if(!urls.length)return;
 try{sessionStorage.setItem(TAG+key,JSON.stringify({urls,time:Date.now()}))}catch{}
}
function fromStore(key){
 if(cache.has(key))return cache.get(key).urls;
 try{
  const data=JSON.parse(sessionStorage.getItem(TAG+key)||'null');
  if(data&&Date.now()-data.time<TTL&&Array.isArray(data.urls)){cache.set(key,data);return data.urls}
 }catch{}
 return null;
}
async function photos(p){
 const key=String(p.id||p.name).slice(0,130);
 const saved=fromStore(key);if(saved)return saved;
 const tags=p.tags||{},found=[];
 if(tags.image){
  for(const raw of String(tags.image).split(';')){
   const url=raw.startsWith('File:')?imageFile(raw):safeUrl(raw);
   if(url)found.push(record(url,raw.startsWith('File:')?sourceFile(raw):url));
  }
 }
 if(tags.wikimedia_commons?.startsWith('File:'))found.push(record(imageFile(tags.wikimedia_commons),sourceFile(tags.wikimedia_commons)));
 const source=tags.wikimedia_commons||verifiedCategories[p.name];
 if(source?.startsWith('Category:'))try{found.push(...await categoryImages(source))}catch{}
 if(found.length<5&&tags.wikidata)try{found.push(...await wikidataImages(tags.wikidata))}catch{}
 if(found.length<5&&tags.wikipedia)try{found.push(...await wikipediaImages(tags.wikipedia))}catch{}
 const result=[...new Set(found)].filter(Boolean).slice(0,7);
 store(key,result);
 return result;
}
const locationUrl=p=>'https://yandex.ru/maps/?'+new URLSearchParams({ll:p.lng+','+p.lat,z:'17',text:p.name}).toString();
const node=(tag,cls,content)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el};
function render(places,root,{tr,focus}){
 root.replaceChildren();
 for(const [i,p] of places.entries()){
  const card=node('article','place-photo-card'),media=node('div','place-photo-media'),details=node('div','place-photo-info');
  const placeholder=node('div','place-photo-placeholder','📷');
  const caption=node('span','place-photo-caption',tr('Подбираем фотографии места…','Looking for verified photos…'));
  media.append(placeholder,caption);
  const count=node('span','place-photo-index',String(i+1).padStart(2,'0'));
  const title=node('h4','',p.name),meta=node('p','',tr('Остановка на твоём маршруте','Stop on your route'));
  const links=node('div','place-photo-actions');
  const map=node('button','place-photo-link',tr('Показать точку ↗','Show on map ↗'));map.type='button';map.onclick=()=>focus(p);
  const yandex=node('a','place-photo-link',tr('Фотографии и отзывы в Яндексе ↗','Photos and reviews on Yandex ↗'));
  yandex.href=locationUrl(p);yandex.target='_blank';yandex.rel='noopener noreferrer';
  links.append(map,yandex);details.append(count,title,meta,links);card.append(media,details);root.append(card);
  photos(p).then(urls=>{
   if(!card.isConnected)return;
   if(!urls.length){caption.textContent=tr('Нет подтверждённого фото. Открой галерею в Яндексе.','No verified photos. Open this location in Yandex.');return}
   let current=0;
   const photo=node('img','place-photo-image');photo.alt=p.name;photo.loading='lazy';photo.referrerPolicy='no-referrer';
   const credits=node('a','place-photo-license',tr('Источник фотографии ↗','Photo source ↗'));
   credits.target='_blank';credits.rel='noopener noreferrer';
   media.append(photo,credits);
   let row=null;
   const put=index=>{
    if(!urls.length)return;
    current=index;photo.src=urls[current];
    credits.href=sourceByUrl.get(urls[current])?.source||urls[current];
    credits.title=sourceByUrl.get(urls[current])?.credit||'Wikimedia Commons';
    credits.textContent='© '+(sourceByUrl.get(urls[current])?.credit||'Wikimedia Commons')+' ↗';
    row?.querySelectorAll('button').forEach((button,j)=>button.classList.toggle('active',j===index));
   };
   photo.onload=()=>{placeholder.hidden=true;caption.hidden=true};
   photo.onerror=()=>{
    const failed=urls.splice(current,1)[0];
    if(row){row.remove();row=null}
    if(urls.length){put(0);makeThumbs()}
    else{photo.remove();credits.remove();placeholder.hidden=false;caption.hidden=false;caption.textContent=tr('Фото недоступно — смотри в Яндексе','Photo unavailable — view in Yandex')}
   };
   function makeThumbs(){
    if(urls.length<2)return;
    row=node('div','place-photo-thumbs');
    for(const [j,url] of urls.entries()){
     const btn=node('button','place-photo-thumb');btn.type='button';
     btn.title=tr('Фотография ','Photo ')+(j+1);btn.setAttribute('aria-label',btn.title);
     const thumb=node('img');thumb.src=url;thumb.alt='';thumb.loading='lazy';btn.append(thumb);
     btn.onclick=()=>put(j);row.append(btn);
    }
    media.append(row);row.querySelector('button')?.classList.add('active');
   }
   put(0);makeThumbs();
  }).catch(()=>{caption.textContent=tr('Фото недоступны — проверь в Яндекс Картах','Photos unavailable — check Yandex Maps')});
 }
}
window.CityRoutePhotos={photos,render,sourceByUrl};
})();
