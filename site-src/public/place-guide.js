/* Offline starter places and photo credits. Other cities use live geographic search. */
(()=>{
const regions=[
{"name":"Санкт-Петербург","aliases":["санкт петербург","петербург","спб","saint petersburg","st petersburg","sankt peterburg"],"lat":59.9392,"lng":30.3158,"items":[
  {"name":"Дворцовая площадь","en":"Palace Square","lat":59.93916667,"lng":30.31583333,"type":"sights","category":"sights","tags":{"wikipedia":"en:Palace Square"},"id":"guide-palace-square","aliases":["Дворцовая"]},
  {"name":"Зимний дворец","en":"Winter Palace","lat":59.9404,"lng":30.3139,"type":"culture","category":"museum","tags":{"wikipedia":"en:Winter Palace"},"id":"guide-hermitage","aliases":["Государственный Эрмитаж","Эрмитаж","Hermitage"]},
  {"name":"Площадь Искусств","en":"Arts Square","lat":59.9373,"lng":30.3317,"type":"sights","category":"sights","tags":{"wikipedia":"en:Arts Square"},"id":"guide-arts-square"},
  {"name":"Летний сад","en":"Summer Garden","lat":59.946,"lng":30.335,"type":"parks","category":"parks","tags":{"wikipedia":"en:Summer Garden"},"id":"guide-summer-garden"},
  {"name":"Казанский собор","en":"Kazan Cathedral, Saint Petersburg","lat":59.9343,"lng":30.3245,"type":"sights","category":"sights","tags":{"wikipedia":"en:Kazan Cathedral, Saint Petersburg"},"id":"guide-kazan-cathedral"},
  {"name":"Север-Метрополь","en":"Sever-Metropol","lat":59.9353,"lng":30.3331,"address":"Невский проспект, 44","type":"food","category":"bakery","check":{"label":"500–900 ₽","source":"https://www.gastronom.ru/text/remeslennyj-hleb-kraffiny-kruglye-kruassany-bulochnye-peterburga-v-kotorye-hochetsya-vozvrashatsya-1026440"},"tags":{"website":"https://sever-metropol.ru/"},"id":"guide-sever","aliases":["Север","Кондитерская Север"]}
 ]},
{"name":"Казань","aliases":["казань","kazan","казан"],"lat":55.794,"lng":49.106,"items":[
  {"name":"Казанский кремль","en":"Kazan Kremlin","lat":55.79916667,"lng":49.10555556,"type":"sights","category":"sights","tags":{"wikipedia":"en:Kazan Kremlin"},"id":"guide-kazan-kremlin","aliases":["Кремль"]},
  {"name":"Мечеть Кул-Шариф","en":"Kul Sharif Mosque","lat":55.79846944,"lng":49.10481111,"type":"sights","category":"sights","tags":{"wikipedia":"en:Kul Sharif Mosque"},"id":"guide-kul-sharif","aliases":["Кул-Шариф"]},
  {"name":"Улица Баумана","en":"Bauman Street, Kazan","lat":55.78722222,"lng":49.12166667,"type":"sights","category":"sights","tags":{"wikipedia":"en:Bauman Street, Kazan"},"id":"guide-bauman"},
  {"name":"Петропавловский собор","en":"Saints Peter and Paul Cathedral, Kazan","lat":55.79361112,"lng":49.11320557,"type":"sights","category":"sights","tags":{"wikipedia":"en:Saints Peter and Paul Cathedral, Kazan"},"id":"guide-peter-paul"},
  {"name":"Дом чая","en":"Dom Chaya","lat":55.789731,"lng":49.116561,"address":"улица Баумана, 64/10","type":"food","category":"cafe","check":{"label":"300 ₽","source":"https://www.restoclub.ru/kzn/place/dom-chaja"},"tags":{"website:menu":"https://www.restoclub.ru/kzn/place/dom-chaja/menu"},"id":"guide-dom-chaya"}
 ]},
{"name":"Paris","aliases":["париж","paris"],"lat":48.8607,"lng":2.3375,"items":[
  {"name":"Musée du Louvre","en":"Louvre","lat":48.8611,"lng":2.3358,"type":"culture","category":"museum","tags":{"wikipedia":"en:Louvre"},"id":"guide-louvre","aliases":["Лувр","Louvre Museum","Musée du Louvre"]},
  {"name":"Pont Neuf","en":"Pont Neuf","lat":48.8575,"lng":2.34166667,"type":"water","category":"water","tags":{"wikipedia":"en:Pont Neuf"},"id":"guide-pont-neuf","aliases":["Новый мост"]},
  {"name":"Palais-Royal","en":"Palais-Royal","lat":48.86333333,"lng":2.33694444,"type":"sights","category":"sights","tags":{"wikipedia":"en:Palais-Royal"},"id":"guide-palais-royal","aliases":["Пале-Рояль"]},
  {"name":"Jardin des Tuileries","en":"Tuileries Garden","lat":48.8639,"lng":2.3261,"type":"parks","category":"parks","tags":{"wikipedia":"en:Tuileries Garden"},"id":"guide-tuileries","aliases":["Сад Тюильри","Тюильри"]},
  {"name":"Le Bistrot Valois","en":"Le Bistrot Valois","lat":48.863,"lng":2.3383,"address":"1 bis place de Valois","type":"food","category":"restaurant","check":{"label":"31–45 €","source":"https://www.pagesjaunes.fr/pros/55033580"},"tags":{"website":"https://bistrot-valois-paris.com/"},"id":"guide-valois"}
 ]},
];
const images={
 "Парк «Зарядье»":{"asset":"zaryadye.webp","source":"https://commons.wikimedia.org/wiki/File:Zaryadye25.jpg","credit":"mos.ru · CC BY 4.0"},
 "Манежная площадь":{"asset":"manezhnaya.webp","source":"https://commons.wikimedia.org/wiki/File:%D0%92%D0%B8%D0%B4_%D0%BD%D0%B0_%D0%98%D1%81%D1%82%D0%BE%D1%80%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D0%BC%D1%83%D0%B7%D0%B5%D0%B9_%D0%B2_%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D1%83_%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B9_%D0%BF%D0%BB%D0%BE%D1%89%D0%B0%D0%B4%D0%B8.jpg","credit":"Олег Токарев · CC BY-SA 4.0"},
 "Государственная Третьяковская галерея":{"asset":"tretyakov.webp","source":"https://commons.wikimedia.org/wiki/File:Moscow_05-2012_TretyakovGallery.jpg","credit":"A.Savin · CC BY-SA 3.0"},
 "Парк Горького":{"asset":"gorky.webp","source":"https://commons.wikimedia.org/wiki/File:Gorky_Park.jpg","credit":"Vladimir OKC · Public domain"},
 "Красная площадь":{"asset":"red-square.webp","source":"https://commons.wikimedia.org/wiki/File:Kremlin_and_Red_Square.1.jpg","credit":"mos.ru · CC BY 4.0"},
 "guide-palace-square":{"asset":"palace-square.webp","source":"https://commons.wikimedia.org/wiki/File:RUS-2016-Aerial-SPB-Winter_Palace.jpg","credit":"Godot13 · CC BY-SA 4.0"},
 "guide-hermitage":{"asset":"hermitage.webp","source":"https://commons.wikimedia.org/wiki/File:RUS-2016-Aerial-SPB-Winter_Palace_(crop).jpg","credit":"Godot13 · CC BY-SA 4.0"},
 "guide-kazan-cathedral":{"asset":"kazan-cathedral.webp","source":"https://commons.wikimedia.org/wiki/File:%D0%A1%D0%BE%D0%B1%D0%BE%D1%80_%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%81%D0%BA%D0%BE%D0%B9_%D0%B8%D0%BA%D0%BE%D0%BD%D1%8B_%D0%91%D0%BE%D0%B6%D0%B8%D0%B5%D0%B9_%D0%9C%D0%B0%D1%82%D0%B5%D1%80%D0%B8_(%D0%B3._%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3,_7_%D0%BE%D0%BA%D1%82%D1%8F%D0%B1%D1%80%D1%8F_2010_%D0%B3.).JPG","credit":"Алексеев Игорь Евгеньевич · Public domain"},
 "guide-arts-square":{"asset":"arts-square.webp","source":"https://commons.wikimedia.org/wiki/File:Ploschad_Iskusstv_may_2011_3770.jpg","credit":"Peterburg23 · CC BY 3.0"},
 "guide-kazan-kremlin":{"asset":"kazan-kremlin.webp","source":"https://commons.wikimedia.org/wiki/File:%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%81%D0%BA%D0%B8%D0%B9_%D0%BA%D1%80%D0%B5%D0%BC%D0%BB%D1%8C._%D0%9F%D0%B0%D0%BD%D0%BE%D1%80%D0%B0%D0%BC%D0%B0_%D1%81_%D0%BA%D0%BE%D0%BB%D0%B5%D1%81%D0%B0_%D0%BE%D0%B1%D0%BE%D0%B7%D1%80%D0%B5%D0%BD%D0%B8%D1%8F.jpg","credit":"Fendes · CC BY-SA 4.0"},
 "guide-bauman":{"asset":"bauman.webp","source":"https://commons.wikimedia.org/wiki/File:Baumana_Street_Kazan_Russia_2009_sept_06.jpg","credit":"Cyrios · CC BY 3.0"},
 "guide-peter-paul":{"asset":"peter-paul.webp","source":"https://commons.wikimedia.org/wiki/File:Kazan_church_near_kremlovskaya.jpg","credit":"user:Ncnever · CC BY-SA 2.5"},
 "guide-louvre":{"asset":"louvre.webp","source":"https://commons.wikimedia.org/wiki/File:Louvre_Museum_Wikimedia_Commons.jpg","credit":"Benh LIEU SONG (Flickr) · CC BY-SA 3.0"},
 "guide-tuileries":{"asset":"tuileries.webp","source":"https://commons.wikimedia.org/wiki/File:Crowd_in_the_Jardin_des_Tuileries,_Paris_July_2014.jpg","credit":"Guilhem Vellut from Tokyo, Japan · CC BY 2.0"},
 "guide-palais-royal":{"asset":"palais-royal.webp","source":"https://commons.wikimedia.org/wiki/File:Conseil_d%27Etat_Paris_WA.jpg","credit":"Marie-Lan Nguyen · Public domain"},
 "guide-pont-neuf":{"asset":"pont-neuf.webp","source":"https://commons.wikimedia.org/wiki/File:The_western_sides_of_the_%C3%8Ele_de_la_Cit%C3%A9_and_the_Pont_Neuf,_14_July_2008.jpg","credit":"Rmrfstar · CC BY-SA 3.0"},
 "guide-sever":{"asset":"sever.webp","source":"https://commons.wikimedia.org/wiki/File:%D0%9A%D0%BE%D0%BD%D0%B4%D0%B8%D1%82%D0%B5%D1%80%D1%81%D0%BA%D0%B0%D1%8F_%D0%A1%D0%B5%D0%B2%D0%B5%D1%80_%D0%A1%D0%9F%D0%B1.jpg","credit":"Olgvasil · CC BY-SA 4.0"},
 "Кафе «Пушкинъ»":{"asset":"pushkin.webp","source":"https://commons.wikimedia.org/wiki/File:Tverskoy_26a,_Dec_2014_02.JPG","credit":"Shuvaev · CC BY-SA 4.0"},
 "ВДНХ — арка главного входа":{"asset":"vdnkh.webp","source":"https://commons.wikimedia.org/wiki/File:VDNKhMainEnrtance.jpg","credit":"Skelanard (Aleksandr Petukhov) · CC BY-SA 4.0"}
};
function photo(p){
 if(!p||typeof p!=='object')return null;
 if(p.id?.startsWith('guide-'))return images[p.id]||null;
 const name=p.name||p.label;
 if(!Object.hasOwn(images,name)||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return null;
 const place=window.CityRoutePlaces?.lookup(name);
 return place&&window.CityRoutePlaces.haversine(place,p)<.2?images[name]:null;
}
window.CityRouteGuide={regions,photo};
})();
