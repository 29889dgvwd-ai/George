/* Hand-picked Moscow walks. Times and kilometres are planning estimates, not live routing. */
((root)=>{
'use strict';
const translations={
'Манежная площадь':'Manezhnaya Square','Александровский сад':'Alexander Garden','Красная площадь':'Red Square','Собор Василия Блаженного':'Saint Basil’s Cathedral','Парк «Зарядье»':'Zaryadye Park','Парящий мост в «Зарядье»':'Floating Bridge','Никольская улица':'Nikolskaya Street','«Теремок» на Никольской':'Teremok on Nikolskaya',
'Парк искусств «Музеон»':'Muzeon Park of Arts','Крымская набережная':'Krymskaya Embankment','Крымский мост':'Krymsky Bridge','Парк Горького':'Gorky Park','Пушкинская набережная':'Pushkinskaya Embankment','Нескучный сад':'Neskuchny Garden','Фрунзенская набережная':'Frunzenskaya Embankment','Новодевичьи пруды':'Novodevichy Ponds','Спорткомплекс «Лужники»':'Luzhniki Stadium','Воробьёвы горы — смотровая площадка':'Sparrow Hills viewpoint',
'Государственная Третьяковская галерея':'State Tretyakov Gallery','Болотная набережная':'Bolotnaya Embankment','Дом на набережной':'House on the Embankment','Дом культуры «ГЭС-2»':'GES-2 House of Culture','Патриарший мост':'Patriarshy Bridge','Культурный квартал «Красный Октябрь»':'Red October creative quarter','Мультимедиа Арт Музей':'Multimedia Art Museum','Музей Москвы':'Museum of Moscow','Новая Третьяковка':'New Tretyakov Gallery',
'Сад «Эрмитаж»':'Hermitage Garden','Кафе «Пушкинъ»':'Café Pushkin','Никитский бульвар':'Nikitsky Boulevard','«Кофемания» на Большой Никитской, 13':'Coffeemania, Bolshaya Nikitskaya 13','Гоголевский бульвар':'Gogolevsky Boulevard','ГМИИ имени Пушкина':'Pushkin State Museum of Fine Arts','Храм Христа Спасителя':'Cathedral of Christ the Saviour','Арбат':'Arbat Street','«Кофемания» на Новом Арбате, 19':'Coffeemania, Novy Arbat 19',
'Музей космонавтики':'Cosmonautics Museum','ВДНХ — арка главного входа':'VDNKh Main Entrance','Музей «АТОМ» на ВДНХ':'ATOM Museum at VDNKh','Фонтан «Дружба народов»':'Friendship of Peoples Fountain','Фонтан «Каменный цветок»':'Stone Flower Fountain','Павильон «Космос» на ВДНХ':'Cosmos Pavilion','Парк «Останкино»':'Ostankino Park',
'Патриаршие пруды':'Patriarch’s Ponds','Музей Михаила Булгакова':'Bulgakov Museum','Тверская улица':'Tverskaya Street','Кузнецкий Мост':'Kuznetsky Most','Камергерский переулок':'Kamergersky Lane','«Буше» в Центральном детском магазине':'Bushe Bakery at Central Children’s Store',
'Московский международный деловой центр':'Moscow City','Пресненская набережная':'Presnenskaya Embankment','Смотровая площадка «Панорама 360»':'Panorama 360 viewpoint','Парк «Красная Пресня»':'Krasnaya Presnya Park','Ростовская набережная':'Rostovskaya Embankment','Театр имени Евгения Вахтангова':'Vakhtangov Theatre',
'Большой театр':'Bolshoi Theatre','Чистопрудный бульвар':'Chistoprudny Boulevard','«Кофемания» на Покровке, 18':'Coffeemania, Pokrovka 18','Сад имени Баумана':'Bauman Garden','Битцевский лес':'Bitsevsky Forest','«Шава-гриль» в Ясенево':'Shava Grill in Yasenevo','Кафе «Оазис» в Ясенево':'Oasis Café in Yasenevo','Парк у Голубинских прудов':'Golubinskiye Ponds Park','Ландшафтный парк «Тёплый Стан»':'Tyoply Stan Landscape Park','Парк «Тропарёво»':'Troparevo Park',
'Чистые пруды':'Chistye Prudy','Покровский бульвар':'Pokrovsky Boulevard','Центр современного искусства «Винзавод»':'Winzavod Art Centre','Центр дизайна Artplay':'Artplay Design Centre','Яузский бульвар':'Yauzsky Boulevard',
'МГУ — главное здание':'MSU Main Building','Новодевичий монастырь':'Novodevichy Convent','Екатерининский парк':'Ekaterininsky Park','Ботанический сад «Аптекарский огород»':'Aptekarsky Ogorod Botanical Garden','Цветной бульвар':'Tsvetnoy Boulevard','Рождественский бульвар':'Rozhdestvensky Boulevard','Казанский собор на Красной площади':'Kazan Cathedral','Дом Пашкова':'Pashkov House',
'Парк Дружбы у Речного вокзала':'Friendship Park','Парк Северного речного вокзала':'Northern River Station Park','Северный речной вокзал':'Northern River Station','Парк «Покровское-Стрешнево»':'Pokrovskoye-Streshnevo Park','Усадьба «Покровское-Стрешнево»':'Pokrovskoye-Streshnevo Estate','Московский Кремль':'Moscow Kremlin'
};
const raw=[
['heart',['Сердце Москвы: не спеша','Moscow highlights at your pace'],['Классика','City highlights'],['Сад, главные площади, Зарядье и недорогой обед.','Squares, gardens, Zaryadye and a casual lunch.'],['Манежная площадь','Александровский сад','Красная площадь','Собор Василия Блаженного','Парк «Зарядье»','Парящий мост в «Зарядье»','Никольская улица','«Теремок» на Никольской'],'Парк «Зарядье»',45,[500,1200]],
['river',['От Музеона до Воробьёвых гор','Riverside grand walk'],['Длинная прогулка','Long walk'],['Набережные, мосты, Нескучный сад и вид с гор.','Embankments, bridges, gardens and a panoramic view.'],['Парк искусств «Музеон»','Крымская набережная','Крымский мост','Парк Горького','Пушкинская набережная','Нескучный сад','Фрунзенская набережная','Новодевичьи пруды','Воробьёвы горы — смотровая площадка'],'Парк Горького',120,[600,1600]],
['art',['Арт-маршрут по Замоскворечью','Art around Zamoskvorechye'],['Музеи','Culture'],['Третьяковка, ГЭС-2, современное искусство и красивые улицы.','Tretyakov, GES-2, contemporary art and lovely streets.'],['Государственная Третьяковская галерея','Болотная набережная','Дом на набережной','Дом культуры «ГЭС-2»','Патриарший мост','Культурный квартал «Красный Октябрь»','Мультимедиа Арт Музей','Музей Москвы','Новая Третьяковка'],'Государственная Третьяковская галерея',140,[500,1500]],
['boulevards',['Бульвары, Арбат и кофе','Boulevards, Arbat and coffee'],['С едой','Food & stroll'],['Кафе, старые улочки, музеи и вечерний Арбат.','Cafés, old streets, museums and Arbat.'],['Сад «Эрмитаж»','Кафе «Пушкинъ»','Никитский бульвар','«Кофемания» на Большой Никитской, 13','Гоголевский бульвар','ГМИИ имени Пушкина','Храм Христа Спасителя','Арбат','«Кофемания» на Новом Арбате, 19'],'Кафе «Пушкинъ»',80,[600,1800]],
['vdnh',['Большое путешествие по ВДНХ','The great VDNKh walk'],['Парки и музеи','Parks & museums'],['Фонтаны, космос, музей АТОМ и парк Останкино.','Fountains, space, ATOM museum and Ostankino Park.'],['Музей космонавтики','ВДНХ — арка главного входа','Музей «АТОМ» на ВДНХ','Фонтан «Дружба народов»','Фонтан «Каменный цветок»','Павильон «Космос» на ВДНХ','Парк «Останкино»'],'ВДНХ — арка главного входа',160,[600,1700]],
['patri',['Патрики, театры и булочки','Patriarch’s Ponds and pastries'],['Лёгкий маршрут','Easy pace'],['Пруды, Булгаков, центр и пекарня на финише.','Ponds, Bulgakov, the city centre and a bakery.'],['Патриаршие пруды','Музей Михаила Булгакова','Кафе «Пушкинъ»','Тверская улица','Сад «Эрмитаж»','Кузнецкий Мост','Камергерский переулок','«Буше» в Центральном детском магазине'],'Патриаршие пруды',85,[500,1400]],
['skyline',['Москва-Сити — Новый Арбат','Moscow City to New Arbat'],['Панорамы','City views'],['Небоскрёбы, набережные, парки и Арбат.','Skyscrapers, embankments, parks and Arbat.'],['Московский международный деловой центр','Пресненская набережная','Смотровая площадка «Панорама 360»','Парк «Красная Пресня»','Ростовская набережная','«Кофемания» на Новом Арбате, 19','Арбат','Театр имени Евгения Вахтангова'],'Московский международный деловой центр',85,[600,1800]],
['food',['Вкусная Москва без спешки','A taste of Moscow'],['С едой','Food & stroll'],['От театра через бульвары до кафе на Покровке.','From the Bolshoi through boulevards to a café.'],['Кафе «Пушкинъ»','Большой театр','Кузнецкий Мост','Никольская улица','«Теремок» на Никольской','Чистопрудный бульвар','«Кофемания» на Покровке, 18','Сад имени Баумана'],'Большой театр',90,[500,1700]],
['yasenevo',['Ясенево: лес и уютные места','Yasenevo: forest and cafés'],['Юго-Запад','Southwest'],['Пруды, Битцевский лес, кафе и большой зелёный маршрут.','Ponds, Bitsevsky Forest, cafés and a green escape.'],['Парк у Голубинских прудов','Кафе «Оазис» в Ясенево','Битцевский лес','«Шава-гриль» в Ясенево','Ландшафтный парк «Тёплый Стан»','Парк «Тропарёво»'],'Битцевский лес',100,[500,1500]],
['east',['Чистые пруды и арт-кварталы','Ponds and creative districts'],['Арт-кварталы','Creative city'],['Чистопрудный бульвар, Винзавод, Artplay и кофе.','Chistye Prudy, Winzavod, Artplay and coffee.'],['Чистые пруды','Чистопрудный бульвар','Покровский бульвар','«Кофемания» на Покровке, 18','Сад имени Баумана','Центр современного искусства «Винзавод»','Центр дизайна Artplay','Яузский бульвар'],'Чистые пруды',115,[600,1600]],
['panorama',['Самые красивые виды Москвы','Moscow’s big viewpoints'],['Фото и виды','Photography'],['От МГУ через Лужники до парков и набережных.','From MSU and Luzhniki to scenic parks and riverbanks.'],['МГУ — главное здание','Воробьёвы горы — смотровая площадка','Спорткомплекс «Лужники»','Новодевичьи пруды','Новодевичий монастырь','Фрунзенская набережная','Нескучный сад','Парк Горького','Парк искусств «Музеон»'],'Воробьёвы горы — смотровая площадка',135,[600,1800]],
['gardens',['Сады центра и старые бульвары','Gardens and old boulevards'],['Парки','Parks'],['Цветы, тихие дорожки, красивые площади и перекус.','Flowers, peaceful paths, city squares and lunch.'],['Сад «Эрмитаж»','Екатерининский парк','Ботанический сад «Аптекарский огород»','Цветной бульвар','Рождественский бульвар','Большой театр','«Теремок» на Никольской'],'Сад «Эрмитаж»',130,[500,1400]],
['heritage',['Кремль и Москва у реки','Kremlin and riverside Moscow'],['Архитектура','Architecture'],['Извилистый маршрут мимо главных городских символов.','A winding route among Moscow’s landmarks.'],['Дом Пашкова','Храм Христа Спасителя','Патриарший мост','Культурный квартал «Красный Октябрь»','Болотная набережная','Парк «Зарядье»','Красная площадь','Казанский собор на Красной площади','Александровский сад'],'Красная площадь',100,[500,1400]],
['north',['Северный речной: целый день','Northern River Station day out'],['Большой маршрут','Long walk'],['Большая парковая прогулка от Речного до усадьбы.','A substantial park walk from the river station to an estate.'],['Парк Дружбы у Речного вокзала','Парк Северного речного вокзала','Северный речной вокзал','Парк «Покровское-Стрешнево»','Усадьба «Покровское-Стрешнево»'],'Северный речной вокзал',165,[600,1600]]
];
// Compact alternatives use the same catalogue and retain every original walk.
const alternatives=[
 ['zaryadye-short',['Зарядье за 40 минут','Zaryadye in about 40 minutes'],'heart',[2,3,4,5],25,[400,900]],
 ['centre-hour',['Центр и перекус за час','City centre and a quick bite'],'heart',[0,1,2,6,7],30,[500,1200]],
 ['river-hour',['Час у воды: Музеон и Горький','An hour by the river'],'river',[0,1,2,3,4],20,[500,1200]],
 ['ponds-coffee',['Патрики и кофе','Patriarch’s Ponds and coffee'],'patri',[0,1,2,3],45,[3000,4000]],
 ['art-two',['Два часа у ГЭС-2','Two hours around GES-2'],'art',[0,1,2,3,4,5],95,[500,1500]],
 ['vdnh-two',['Фонтаны и космос на ВДНХ','VDNKh fountains and space'],'vdnh',[0,1,3,4,5],90,[600,1700]],
 ['river-three',['Три часа вдоль Москвы-реки','Three hours along the Moskva'],'river',[0,1,2,3,4,5],125,[600,1600]],
 ['art-four',['Четыре часа искусства и набережных','Four hours of art and riverbanks'],'art',[0,1,2,3,4,5,6,7,8],180,[500,1500]]
];
for(const [id,title,parent,indices,stops,budget] of alternatives){
 const base=raw.find(r=>r[0]===parent),names=indices.map(i=>base[4][i]);
 raw.push([id,title,['В своём темпе','At your pace'],['От '+names[0]+' до '+names.at(-1)+': прогулка с остановками для отдыха и фото.','From '+(translations[names[0]]||names[0])+' to '+(translations[names.at(-1)]||names.at(-1))+', with breaks for rest and photos.'],names,names.find(n=>n===base[5])||names[0],stops,budget]);
}
const routes=raw.map(([id,title,tag,description,names,cover,stopMinutes,foodBudget])=>({id,title,tag,description,names,englishNames:names.map(n=>translations[n]||n),cover,stopMinutes,foodBudget}));
function resolve(id,items){
 const route=routes.find(r=>r.id===id);if(!route||!Array.isArray(items))return null;
 const byName=new Map(items.map(p=>[p.name,p]));
 const points=route.names.map(n=>byName.get(n));
 return points.every(Boolean)?{...route,points}:null;
}
const haversine=(a,b)=>{
 const rad=Math.PI/180,da=(b.lat-a.lat)*rad,db=(b.lng-a.lng)*rad;
 const h=Math.sin(da/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(db/2)**2;
 return 12742*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
};
function estimate(plan){
 if(!plan)return null;
 const direct=plan.points.slice(1).reduce((km,p,i)=>km+haversine(plan.points[i],p),0);
 const approxKm=direct*1.25; // Heuristic detour factor, NOT a measured pedestrian route.
 const minutes=Math.round((approxKm/4.2*60+plan.stopMinutes)/5)*5;
 return {approxKm,minutes,walkingMinutes:Math.round(approxKm/4.2*60),stopMinutes:plan.stopMinutes,food:plan.points.filter(p=>p.type==='food')};
}
function matchesDuration(minutes,filter){
 return filter==='all'||filter==='quick'&&minutes>=40&&minutes<=60||
  filter==='short'&&minutes>60&&minutes<120||filter==='medium'&&minutes>=120&&minutes<180||
  filter==='extended'&&minutes>=180&&minutes<=240||filter==='long'&&minutes>240;
}
root.CityRouteReady={routes,resolve,estimate,matchesDuration};
if(typeof module!=='undefined')module.exports={routes,resolve,estimate,matchesDuration};
if(typeof document==='undefined')return;
const host=document.getElementById('readyRoutes');if(!host)return;
const tr=(ru,en)=>document.body.classList.contains('english')?en:ru;
const bilingual=(el,values)=>{
 for(const [i,value] of values.entries()){const span=document.createElement('span');span.className=i?'en':'ru';span.textContent=value;el.append(span);}
 return el;
};
const node=(tag,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;return el;};
const plans=routes.slice().sort((a,b)=>{const order=['zaryadye-short','centre-hour','vdnh-two','boulevards','art-four','river'];return (order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99)}).map(route=>resolve(route.id,root.CityRoutePlaces?.items||[])).filter(Boolean);
const state={filter:'all',more:false};
const filters=node('div','ready-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Продолжительность / Duration');
const options=[['all',['Все маршруты','All routes']],['quick',['40–60 минут','40–60 minutes']],['short',['1–2 часа','1–2 hours']],['medium',['2–3 часа','2–3 hours']],['extended',['3–4 часа','3–4 hours']],['long',['Больше 4 часов','Over 4 hours']],['food',['С кафе','With cafés']]];
const controls=new Map();
for(const [key,label] of options){
 const button=bilingual(node('button','ready-filter'),label);button.type='button';button.dataset.filter=key;
 button.addEventListener('click',()=>{state.filter=key;state.more=false;renderCards();});
 controls.set(key,button);filters.append(button);
}
const hint=bilingual(node('p','ready-estimate-note'),[
 'Время включает прогулку и остановки. Километраж — приблизительная оценка по точкам, а не проложенный пеший путь. Стоимость еды — пример бюджета на человека, не подтверждённый средний чек.',
 'Times include stops. Distances are waypoint estimates, not measured walking routes. Food budget is an example per person, not a verified average bill.'
]);
host.parentElement.insertBefore(filters,host);
host.parentElement.insertBefore(hint,host);
const more=bilingual(node('button','ready-more'),['Показать остальные прогулки ↓','Show more walks ↓']);more.type='button';
more.onclick=()=>{state.more=!state.more;renderCards();};
host.parentElement.insertBefore(more,host.nextSibling);
const photos=root.CityRoutePhotos;
const photoObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
 for(const entry of entries)if(entry.isIntersecting){photoObserver.unobserve(entry.target);entry.target.__loadReadyPhoto?.();}
},{rootMargin:'260px'}):null;
function makeCard(plan){
 const info=estimate(plan),card=node('article','ready-route'),media=node('div','ready-route-media');
 const pic=node('img','ready-route-image');pic.alt=plan.cover;pic.loading='lazy';pic.decoding='async';pic.hidden=true;
 const fallback=bilingual(node('span','ready-photo-fallback'),['МОСКВА · МАРШРУТ','MOSCOW · WALK']);
 const badge=bilingual(node('span','ready-route-tag'),plan.tag);
 const counter=node('span','ready-photo-count');counter.hidden=true;
 const arrowPrev=node('button','ready-photo-arrow ready-photo-prev'),arrowNext=node('button','ready-photo-arrow ready-photo-next');
 arrowPrev.type=arrowNext.type='button';arrowPrev.textContent='‹';arrowNext.textContent='›';
 arrowPrev.setAttribute('aria-label',tr('Предыдущее фото','Previous photo'));arrowNext.setAttribute('aria-label',tr('Следующее фото','Next photo'));
 arrowPrev.hidden=arrowNext.hidden=true;
 const credit=node('a','ready-photo-credit');credit.target='_blank';credit.rel='noopener noreferrer';credit.hidden=true;
 const locationLink=node('a','ready-yandex-photos');locationLink.href='https://yandex.ru/maps/?'+new URLSearchParams({ll:plan.points.find(p=>p.name===plan.cover).lng+','+plan.points.find(p=>p.name===plan.cover).lat,z:'16',text:plan.cover}).toString();locationLink.target='_blank';locationLink.rel='noopener noreferrer';locationLink.textContent=tr('Фото в Яндексе ↗','Yandex photos ↗');
 media.append(pic,fallback,badge,arrowPrev,arrowNext,counter,credit,locationLink);
 const body=node('div','ready-route-body');
 const title=bilingual(node('h3'),plan.title),desc=bilingual(node('p'),plan.description);
 const durRu=info.minutes>=120?Math.floor(info.minutes/60)+' ч '+(info.minutes%60?info.minutes%60+' мин':''):info.minutes+' мин';
 const durEn=info.minutes>=120?Math.floor(info.minutes/60)+' h '+(info.minutes%60?info.minutes%60+' min':''):info.minutes+' min';
 const meta=node('div','ready-route-metrics');
 const time=bilingual(node('span'),['◷ ≈ '+durRu+' с остановками','◷ ≈ '+durEn+' incl. stops']);
 const distance=bilingual(node('span'),['↗ ≈ '+info.approxKm.toFixed(1)+' км','↗ ≈ '+info.approxKm.toFixed(1)+' km']);
 meta.append(time,distance);
 const foodName=info.food[0]?.name||'';
 const spend=bilingual(node('p','ready-route-spend'),[
  (foodName?'🍴 '+foodName+' · ':'🍴 Кафе по пути · ')+'план на еду '+plan.foodBudget[0].toLocaleString('ru-RU')+'–'+plan.foodBudget[1].toLocaleString('ru-RU')+' ₽/чел.',
  (foodName?'🍴 '+(translations[foodName]||foodName)+' · ':'🍴 Nearby cafés · ')+'plan for food ₽'+plan.foodBudget[0]+'–'+plan.foodBudget[1]+' / person'
 ]);
 const verified=info.food.find(p=>p.check?.label&&p.check?.source);
 if(verified){
  const fact=node('a','ready-check-source');fact.href=verified.check.source;fact.target='_blank';fact.rel='noopener noreferrer';
  fact.textContent=tr('Указанный чек '+verified.name+': '+verified.check.label+' ↗','Published bill '+(translations[verified.name]||verified.name)+': '+verified.check.label+' ↗');  meta.dataset.verified='true';meta.__checkLink=fact;
 }
 const details=node('details','ready-route-details'),summary=bilingual(node('summary'),['Схема · '+plan.points.length+' остановок','Itinerary · '+plan.points.length+' stops']),stops=node('ol');
 for(const [i,p] of plan.points.entries()){
  const line=node('li'),link=bilingual(node('a'),[p.name,plan.englishNames[i]]);
  link.href='https://yandex.ru/maps/?'+new URLSearchParams({ll:p.lng+','+p.lat,z:'17',text:p.name});link.target='_blank';link.rel='noopener noreferrer';line.append(link);
  if(p.type==='food'){
   line.classList.add('ready-food-stop');
   line.append(bilingual(node('small'),[p.check?.label?'Средний чек: '+p.check.label:'Средний чек уточняется',p.check?.label?'Average bill: '+p.check.label:'Average bill not verified']));
  }
  stops.append(line);
 }
 details.append(summary,stops);
 const preview=node('div','ready-route-outline');
 preview.append(bilingual(node('span'),[plan.names[0],plan.englishNames[0]]),bilingual(node('small'),['Ещё '+(plan.points.length-2)+' остановки по пути','Another '+(plan.points.length-2)+' stops along the way']),bilingual(node('span'),[plan.names.at(-1),plan.englishNames.at(-1)]));
 const split=bilingual(node('p','ready-route-timing'),['Пешком ≈ '+info.walkingMinutes+' мин · остановки '+info.stopMinutes+' мин','Walking ≈ '+info.walkingMinutes+' min · stops '+info.stopMinutes+' min']);
 const cost=bilingual(node('small'),['План расходов: '+plan.foodBudget[0]+'–'+plan.foodBudget[1]+' ₽/чел. на еду. Билеты и транспорт отдельно.','Food allowance: ₽'+plan.foodBudget[0]+'–'+plan.foodBudget[1]+' per person. Tickets and transport extra.']);
 const actions=node('div','ready-route-actions'),open=bilingual(node('button','primary'),['Открыть прогулку →','Open walk →']);
 open.type='button';open.dataset.readyRoute=plan.id;
 open.onclick=()=>document.dispatchEvent(new CustomEvent('cityroute:ready-route',{detail:plan.id}));
 actions.append(open);
 const mapLink=bilingual(node('a','ready-food-link'),['Пеший маршрут в Яндексе','Walking route in Yandex']);
 mapLink.href='https://yandex.ru/maps/?'+new URLSearchParams({rtext:plan.points.map(p=>p.lat+','+p.lng).join('~'),rtt:'pd'});mapLink.target='_blank';mapLink.rel='noopener noreferrer';actions.append(mapLink);
 const lookup=node('a','ready-food-link');
 lookup.href='https://yandex.ru/maps/?'+new URLSearchParams({text:'кафе и рестораны рядом '+plan.names[Math.floor(plan.names.length/2)]+' Москва'}).toString();
 lookup.target='_blank';lookup.rel='noopener noreferrer';bilingual(lookup,['Где поесть рядом ↗','Find food nearby ↗']);actions.append(lookup);
 body.append(meta,title,desc,spend);
 if(meta.__checkLink)body.append(meta.__checkLink);
 body.append(split,preview,details,cost,actions);card.append(media,body);
 let urls=[],idx=0,loaded=false;
 function show(){
  if(!urls.length)return;
  const url=urls[idx],source=photos?.sourceByUrl?.get(url);
  pic.onload=()=>{pic.hidden=false;fallback.hidden=true;credit.hidden=false;counter.hidden=urls.length<2;counter.textContent=(idx+1)+' / '+urls.length;};
  pic.onerror=()=>{if(urls.length>1){urls.splice(idx,1);idx=idx%urls.length;show();}else{urls=[];pic.hidden=true;credit.hidden=true;arrowPrev.hidden=arrowNext.hidden=true;fallback.hidden=false;}};
  pic.src=url;credit.href=source?.source||url;credit.textContent='© '+(source?.credit||'Wikimedia Commons')+' ↗';
  arrowPrev.hidden=arrowNext.hidden=urls.length<2;
 }
 arrowPrev.onclick=()=>{idx=(idx-1+urls.length)%urls.length;show();};
 arrowNext.onclick=()=>{idx=(idx+1)%urls.length;show();};
 card.__loadReadyPhoto=()=>{
  if(loaded)return;loaded=true;
  Promise.resolve(photos?.photos(plan.points.find(p=>p.name===plan.cover))||[]).then(pics=>{
   urls=[...new Set((pics||[]).filter(u=>typeof u==='string'&&u.startsWith('https://')))].slice(0,5);
   if(urls.length)show();
  }).catch(()=>{});
 };
 return card;
}
const cards=new Map(plans.map(plan=>[plan.id,makeCard(plan)]));
function renderCards(){
 const filtered=plans.filter(plan=>{
  const i=estimate(plan);
  return state.filter==='food'?i.food.length>0:matchesDuration(i.minutes,state.filter);
 });
 const displayed=state.more?filtered:filtered.slice(0,6);
 host.replaceChildren(...displayed.map(p=>cards.get(p.id)));
 for(const card of host.children){if(photoObserver)photoObserver.observe(card);else card.__loadReadyPhoto?.();}
 more.hidden=filtered.length<=6;
 more.querySelector('.ru').textContent=state.more?'Свернуть маршруты ↑':'Показать ещё '+(filtered.length-6)+' прогулок ↓';
 more.querySelector('.en').textContent=state.more?'Show fewer walks ↑':'Show '+(filtered.length-6)+' more walks ↓';
 for(const [key,button] of controls){const active=key===state.filter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 if(!displayed.length){const empty=bilingual(node('p','ready-empty'),['Пока нет прогулок такой длительности. Выбери другой фильтр.','No walks match this filter. Try another.']);host.append(empty);}
}
renderCards();
})(typeof window!=='undefined'?window:globalThis);
