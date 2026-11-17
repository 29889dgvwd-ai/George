// CityRoute static shell: saves appearance and translates all visible static pages.
(()=>{'use strict';
const $=id=>document.getElementById(id),home=document.body.dataset.page==='home';
const translations={
 'Маршрут':'Route','Мои прогулки':'My walks','Друзья':'Friends',
 'Красивые места · подобрать автоматически':'Scenic spots · automatic',
 'Парки и сады':'Parks and gardens','Набережные и смотровые':'Waterfronts and viewpoints',
 'Архитектура и достопримечательности':'Architecture and landmarks',
 'Торговые центры':'Shopping centres','Кафе, рестораны и пекарни':'Cafés, restaurants and bakeries',
 'Музеи, театры и кино':'Museums, theatres and cinema','Обычный маршрут':'Regular walk',
 'Без ограничения · подобрать автоматически':'Unlimited · choose automatically',
 'Около 3 км':'About 3 km','Около 5 км':'About 5 km','Около 8 км':'About 8 km',
 'Около 12 км':'About 12 km','Около 20 км':'About 20 km','Около 30 км':'About 30 km',
 'Без ограничения':'No limit','2 часа':'2 hours','3 часа':'3 hours','4 часа':'4 hours',
 'CITYROUTE / ПРОГУЛКИ':'CITYROUTE / WALKS','Сохранённые маршруты':'Saved routes',
 'Сохраняй понравившиеся маршруты и планируй встречи с друзьями.':'Save your favourite walks and share plans with friends.',
 'Сохранённые прогулки этого браузера. Можно открыть, удалить или построить новый маршрут.':'Your walks are saved in this browser. Open, delete or plan a new route.',
 'CITYROUTE / ДРУЗЬЯ':'CITYROUTE / FRIENDS','Гуляйте вместе':'Walk together',
 'Построй маршрут и отправь друзьям ссылку из Яндекс Карт.':'Plan a route and send your friends its Yandex Maps link.',
 'Как поделиться прогулкой':'How to share your walk',
 'На главной построй маршрут — появятся остановки, фотографии и ссылка «Открыть в Яндекс Картах». Отправь её другу, чтобы он увидел точки и смог построить свой путь.':'Plan a route on the home page. You will see stops, photos and an “Open in Yandex Maps” link. Send it to a friend so they can explore the stops and get directions.',
 'Аккаунты и приглашения на этой бесплатной статической версии пока недоступны. Все сохранения находятся только в твоём браузере.':'Accounts and invitations are not available in this free static edition. Saved walks remain in your browser.',
 'Построить маршрут →':'Build a route →',
 'Длина прогулки':'Walking distance','Время прогулки':'Walking time',
 'Сменить язык':'Change language','Сменить тему':'Change theme'
};
const localized=[];
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
let n;while((n=walker.nextNode())){
 if(n.parentElement?.closest('script,style'))continue;
 const source=n.nodeValue.trim();
 if(!Object.prototype.hasOwnProperty.call(translations,source))continue;
 localized.push({node:n,ru:n.nodeValue,en:n.nodeValue.replace(source,translations[source])});
}
const attrs=[];
for(const el of document.querySelectorAll('[placeholder],[aria-label]')){
 for(const attr of ['placeholder','aria-label']){
  const ru=el.getAttribute(attr);if(ru&&translations[ru])attrs.push({el,attr,ru,en:translations[ru]});
 }
}
const translate=()=>{
 const en=document.body.classList.contains('english');
 for(const item of localized)item.node.nodeValue=en?item.en:item.ru;
 for(const item of attrs)item.el.setAttribute(item.attr,en?item.en:item.ru);
 if(document.body.dataset.page==='walks')document.title=en?'CityRoute — My walks':'CityRoute — Мои прогулки';
 if(document.body.dataset.page==='friends')document.title=en?'CityRoute — Friends':'CityRoute — Друзья';
};
try{if(localStorage.getItem('cityroute-theme')==='dark')document.body.classList.add('dark');if(localStorage.getItem('cityroute-lang')==='en'){document.body.classList.add('english');document.documentElement.lang='en';if($('language'))$('language').textContent='RU';}}catch{}
const remember=()=>{try{localStorage.setItem('cityroute-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}};
if(home){
 $('theme')?.addEventListener('click',()=>queueMicrotask(remember));
 $('language')?.addEventListener('click',()=>queueMicrotask(()=>{try{localStorage.setItem('cityroute-lang',document.body.classList.contains('english')?'en':'ru');}catch{}translate();}));
}else{
 $('theme')?.addEventListener('click',()=>{document.body.classList.toggle('dark');remember()});
 $('language')?.addEventListener('click',()=>{document.body.classList.toggle('english');const en=document.body.classList.contains('english');document.documentElement.lang=en?'en':'ru';$('language').textContent=en?'RU':'EN';try{localStorage.setItem('cityroute-lang',en?'en':'ru');}catch{}translate();});
}
translate();
})();
