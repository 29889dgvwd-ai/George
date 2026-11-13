// CityRoute saved walks: quick Yandex routes and earlier CityRoute geometry versions.
(()=>{'use strict';
const KEY='cityroute-saved-itineraries-v1',list=document.getElementById('walksList');if(!list)return;
const node=(tag,value,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e};
let saved=[];try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(data))saved=data.filter(x=>x&&(x.v===3&&Array.isArray(x.waypoints)||x.data?.trip?.legs?.length))}catch{}
const tr=(ru,en)=>document.body.classList.contains('english')?en:ru;
function render(){
 list.replaceChildren();
 if(!saved.length){list.append(node('p',tr('Здесь пока пусто. Построй и сохрани маршрут на главной странице.','No saved walks yet. Build and save one on the home page.'),'field-note'));return;}
 for(const [i,item] of saved.entries()){
  const isNew=item.v===3,article=node('article',undefined,'saved-route'),body=node('div');
  const destination=isNew?(item.loop?tr('круговой маршрут','round trip'):item.finish||item.stops?.at(-1)?.name||tr('прогулка','walk')):(Math.round((item.data?.trip?.summary?.length||0)*10)/10+' км');
  body.append(node('h3',(isNew?(item.start||tr('Начало','Start')):(item.city||'Москва'))+' → '+destination),node('p',tr('Остановок: ','Stops: ')+(isNew?item.stops?.length||0:item.places?.length||0),'field-note'));
  const actions=node('div',undefined,'saved-actions'),open=node('button',tr('Открыть','Open'),'secondary'),remove=node('button',tr('Удалить','Delete'),'secondary');
  open.type=remove.type='button';
  open.onclick=()=>{try{sessionStorage.setItem('cityroute-open-walk',JSON.stringify(item));location.href='index.html'}catch{alert(tr('Не удалось открыть маршрут.','Cannot open route.'))}};
  remove.onclick=()=>{if(!confirm(tr('Удалить эту прогулку?','Delete this walk?')))return;saved.splice(i,1);try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{}render()};
  actions.append(open,remove);article.append(body,actions);list.append(article)
 }
}
document.getElementById('language')?.addEventListener('click',()=>queueMicrotask(render));
render();
})();