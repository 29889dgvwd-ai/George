// Saved routes remain usable without a login (only in this browser).
(()=>{'use strict';
const KEY='cityroute-saved-itineraries-v1',list=document.getElementById('walksList');
if(!list)return;
const create=(tag,text,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
let saved=[];try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(raw))saved=raw.filter(x=>x&&x.data?.trip?.legs?.length)}catch{}
function render(){
 list.replaceChildren();
 if(!saved.length){list.append(create('p','Здесь пока пусто. Построй маршрут на главной странице и нажми «Сохранить маршрут».','field-note'));return}
 for(const [i,item] of saved.entries()){
  const article=create('article',undefined,'saved-route'),body=create('div'),title=create('h3',(item.city||'Москва')+' · '+Math.round(item.data.trip.summary.length*10)/10+' км'),meta=create('p','Остановок: '+(item.places?.length||0),'field-note'),actions=create('div',undefined,'saved-actions');
  const open=create('button','Открыть','secondary');open.type='button';open.onclick=()=>{try{sessionStorage.setItem('cityroute-open-walk',JSON.stringify(item));location.href='index.html'}catch(e){alert('Не удалось открыть сохранённый маршрут.')}};
  const del=create('button','Удалить','secondary');del.type='button';del.onclick=()=>{if(!confirm('Удалить сохранённую прогулку?'))return;saved.splice(i,1);try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{}render()};
  body.append(title,meta);actions.append(open,del);article.append(body,actions);list.append(article)
 }
}
render();
})();