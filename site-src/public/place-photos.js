/* CityRoute: photos tied to a verifiable OpenStreetMap / Wikimedia source.
   Never label an unrelated stock photo as a real establishment. */
(()=>{'use strict';
const imageCache=new Map();
const photoUrl=(value)=>{
 if(!value)return '';
 let v=String(value).trim();
 if(v.startsWith('File:'))return 'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(v.slice(5).replace(/ /g,'_'))+'?width=900';
 try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}
};
async function loadJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(8500)});if(!r.ok)throw Error('Photo provider unavailable');return r.json()}
const commonsApi=(p)=>'https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({...p,action:'query',format:'json',origin:'*'});
async function wikidataImages(id){
 if(!/^Q\d+$/.test(id||''))return [];
 const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:id,props:'claims',format:'json',origin:'*'});
 const data=await loadJson(url);return (data.entities?.[id]?.claims?.P18||[]).slice(0,5).map(x=>photoUrl('File:'+x.mainsnak?.datavalue?.value)).filter(Boolean)
}
async function categoryImages(cat){
 if(!cat.startsWith('Category:'))return [];
 const data=await loadJson(commonsApi({generator:'categorymembers',gcmtitle:cat,gcmtype:'file',gcmlimit:'18',prop:'imageinfo',iiprop:'url|mime',iiurlwidth:'900'}));
 return Object.values(data.query?.pages||{}).filter(p=>p.imageinfo?.[0]?.mime?.startsWith('image/')&&p.imageinfo?.[0]?.mime!=='image/svg+xml').map(p=>p.imageinfo[0].thumburl||p.imageinfo[0].url).filter(Boolean).slice(0,5)
}
async function wikiImages(tag){
 // Prefer a Wikimedia photo from the place's Wikipedia article, when tagged.
 const match=/^(?:(ru|en|de):)?(.+)$/.exec(tag||'');if(!match)return [];
 const lang=match[1]||'ru';
 const url='https://'+lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',prop:'pageimages',titles:match[2],pithumbsize:'900',format:'json',origin:'*'});
 const data=await loadJson(url);
 return Object.values(data.query?.pages||{}).map(x=>x.thumbnail?.source).filter(Boolean)
}
async function photos(place){
 const id=place.id||place.name; if(imageCache.has(id))return imageCache.get(id);
 const tags=place.tags||{};let urls=[];
 if(tags.image)urls.push(...String(tags.image).split(';').map(photoUrl).filter(Boolean));
 if(tags.wikimedia_commons?.startsWith('File:'))urls.push(photoUrl(tags.wikimedia_commons));
 // Try tagged sources in a defined sequence, so photos are from the actual place.
 for(const request of [
   ()=>tags.wikimedia_commons?.startsWith('Category:')?categoryImages(tags.wikimedia_commons):[],
   ()=>tags.wikidata?wikidataImages(tags.wikidata):[],
   ()=>tags.wikipedia?wikiImages(tags.wikipedia):[]
 ]){if(urls.length>=4)break;try{urls.push(...await request())}catch{}}
 urls=[...new Set(urls)].filter(Boolean).slice(0,5);
 imageCache.set(id,urls);return urls;
}
function locationUrl(p){return 'https://yandex.ru/maps/?'+new URLSearchParams({ll:p.lng+','+p.lat,z:'17',text:p.name}).toString()}
function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e}
function render(places,root,{tr,focus}){
 root.replaceChildren();
 for(const [index,p] of places.entries()){
  const card=node('article','place-photo-card'),media=node('div','place-photo-media'),head=node('div','place-photo-info');
  const badge=node('span','place-photo-index',String(index+1).padStart(2,'0'));
  const placeholder=node('div','place-photo-placeholder','📍');
  const caption=node('span','place-photo-caption',tr('Проверяем фотографии места…','Looking for place photos…'));
  media.append(placeholder,caption);
  const title=node('h4','',p.name),meta=node('p','',tr('Остановка на маршруте','Stop on your walk'));
  const links=node('div','place-photo-actions');
  const view=node('button','place-photo-link',tr('На карте ↗','View on map ↗'));view.type='button';view.onclick=()=>focus(p);
  const yandex=node('a','place-photo-link',tr('Фото и отзывы в Яндекс Картах ↗','Photos and reviews on Yandex Maps ↗'));yandex.href=locationUrl(p);yandex.target='_blank';yandex.rel='noopener noreferrer';
  links.append(view,yandex);head.append(badge,title,meta,links);card.append(media,head);root.append(card);
  photos(p).then(urls=>{
   if(!card.isConnected)return;
   if(!urls.length){caption.textContent=tr('Фото не найдено — открой Яндекс Карты','No verified photo — open Yandex Maps');media.classList.add('no-photo');return}
   let index=0;const photo=node('img','place-photo-image');
   photo.alt=p.name;photo.loading='lazy';photo.referrerPolicy='no-referrer';
   photo.onerror=()=>{urls.splice(index,1);if(urls.length){index=0;photo.src=urls[0]}else {photo.remove();media.classList.add('no-photo');caption.textContent=tr('Фото недоступно — смотри в Яндекс Картах','Photo unavailable — see Yandex Maps')}}
   photo.onload=()=>{placeholder.hidden=true;caption.hidden=true};
   media.prepend(photo);photo.src=urls[0];
   if(urls.length>1){
     const row=node('div','place-photo-thumbs');
     for(const [i,url] of urls.entries()){
      const button=node('button','place-photo-thumb');button.type='button';button.title=tr('Фото '+(i+1),'Photo '+(i+1));button.setAttribute('aria-label',button.title);
      const img=node('img');img.src=url;img.alt='';img.loading='lazy';button.append(img);if(i===0)button.classList.add('active');
      button.onclick=()=>{index=i;photo.src=url;row.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('active',j===i))};
      row.append(button);
     }
     media.append(row)
   }
  }).catch(()=>{caption.textContent=tr('Фото не загружены — смотри в Яндекс Картах','Photos unavailable — see Yandex Maps')});
 }
}
window.CityRoutePhotos={render,photos};
})();
