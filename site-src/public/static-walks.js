// Saved routes work on static GitHub Pages. No login, no external service required.
(()=>{'use strict';
const KEY='cityroute-saved-itineraries-v1',list=document.getElementById('walksList');
if(!list)return;
const create=(tag,text,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
let saved=[];try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(raw))saved=raw.filter(x=>x&&(x.v>=3?Array.isArray(x.waypoints)&&x.waypoints.length>1:!!x.data?.trip?.legs?.length))}catch{}
const english=()=>document.body.classList.contains('english'),tr=(ru,en)=>english()?en:ru;
function render(){
 list.replaceChildren();
 if(!saved.length){
  list.append(create('p',tr('Здесь пока пусто. Построй маршрут на главной странице и нажми «Сохранить прогулку».','No saved routes yet. Build a walk on the home page and press Save.'),'field-note'));
  return
 }
 for(const [i,item] of saved.entries()){
  const article=create('article',undefined,'saved-route'),body=create('div'),actions=create('div',undefined,'saved-actions');
  const caption=item.v>=3
    ?(item.start||tr('Прогулка','Walk'))+' · '+(item.loop?tr('круговой','round trip'):(item.finish||item.stops?.at(-1)?.name||tr('по городу','city walk')))
    :(item.city||'Москва')+' · '+(Math.round((item.data?.trip?.summary?.length||0)*10)/10)+' км';
  body.append(create('h3',caption),create('p',tr('Остановки: ','Stops: ')+(item.stops?.length||item.places?.length||0),'field-note'));
  const open=create('button',tr('Открыть','Open'),'secondary');open.type='button';
  open.onclick=()=>{try{sessionStorage.setItem('cityroute-open-walk',JSON.stringify(item));location.href='index.html'}catch{alert(tr('Не удалось открыть запись.','Unable to open route.'))}};
  const remove=create('button',tr('Удалить','Delete'),'secondary');remove.type='button';
  remove.onclick=()=>{if(!confirm(tr('Удалить прогулку?','Delete this walk?')))return;saved.splice(i,1);try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{}render()};
  actions.append(open,remove);article.append(body,actions);list.append(article)
 }
}
document.getElementById('language')?.addEventListener('click',()=>queueMicrotask(render));
render();
})();