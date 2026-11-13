(()=>{
'use strict';
const $=id=>document.getElementById(id),page=document.body.dataset.page,KEY='cityroute-saved-itineraries-v1';
let state=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function note(message){const box=$('socialStatus')||$('accountStatus');if(box)box.textContent=message;}
async function api(path,body){
 const response=await fetch('/api/social/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Сервис недоступен.');return result;
}
const button=(label,fn,danger=false)=>{const b=el('button',label,'small-button'+(danger?' danger-button':''));b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){note(e.message);}finally{b.disabled=false;}};return b;};
const action=async(path,body,message)=>{await api(path,body);await refresh();note(message);};
function account(){
 $('profileFields').hidden=!state?.authenticated;
 $('signInLink').hidden=!!state?.authenticated;
 $('signOutLink').hidden=!state?.authenticated;
 $('profileName').value=state?.profile?.name||'';
 $('accountInfo').textContent=state?.authenticated?'Выбери имя, которое увидят твои друзья.':'Вход через ChatGPT создаёт защищённую сессию. Затем можно выбрать имя в CityRoute.';
 $('accountDialog').showModal();
}
$('accountButton').onclick=account;$('closeAccount').onclick=()=>$('accountDialog').close();
document.querySelectorAll('[data-account]').forEach(b=>b.onclick=account);
$('signInLink').href='/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname);
$('signOutLink').href='/signout-with-chatgpt?return_to='+encodeURIComponent(location.pathname);
$('profileForm').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api('profile',{name:$('profileName').value});await refresh();$('accountDialog').close();note('Профиль сохранён.');}catch(e){$('accountStatus').textContent=e.message;}finally{b.disabled=false;}};
try{if(localStorage.getItem('cityroute-theme')==='dark')document.body.classList.add('dark');}catch{}
if(page!=='home')$('theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('cityroute-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}};
else $('theme').addEventListener('click',()=>queueMicrotask(()=>{try{localStorage.setItem('cityroute-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}}));
document.querySelectorAll('[data-page]').forEach(a=>{if(a.tagName==='A'&&a.dataset.page===page)a.setAttribute('aria-current','page');});
function relations(){
 const box=$('friendRequests'),list=$('friendList'),members=$('eventMembers');box.replaceChildren();list.replaceChildren();members.replaceChildren(el('legend','Кого приглашаем'));
 for(const r of state.relations){
  if(r.status==='pending'){const row=el('div',undefined,'request-row');row.append(el('span',r.name+(r.recipient===state.profile.id?' хочет добавить тебя в друзья':' · заявка отправлена')));const actions=el('div',undefined,'row-actions');
   if(r.recipient===state.profile.id)actions.append(button('Принять',()=>action('friend/respond',{id:r.id,accept:true},'Друг добавлен.')),button('Отклонить',()=>action('friend/respond',{id:r.id,accept:false},'Заявка отклонена.')));
   else actions.append(button('Отменить заявку',()=>action('friend/remove',{id:r.id},'Заявка отменена.')));
   row.append(actions);box.append(row);
  } else {
   const card=el('article',undefined,'friend-card');card.append(el('h3',r.name),el('p','Вы друзья','field-note'),button('Убрать из друзей',async()=>{if(confirm('Убрать '+r.name+' из друзей?'))await action('friend/remove',{id:r.id},'Друг удалён.');},true));list.append(card);
   const label=el('label',undefined,'member-check'),input=el('input');input.type='checkbox';input.name='member';input.value=r.userId;label.append(input,el('span',r.name));members.append(label);
  }
 }
 if(!state.relations.some(r=>r.status==='accepted')){list.append(el('p','Пока нет друзей. Обменяйтесь личными кодами и примите заявку.','field-note'));members.append(el('p','Сначала добавь друга.','field-note'));}
}
function ratings(){
 const box=$('ratings');box.replaceChildren();const scroll=el('div',undefined,'table-scroll'),table=el('table',undefined,'rating-table'),head=el('thead'),hr=el('tr');
 ['Участник','Пришёл','Не пришёл','Отменил заранее','Рейтинг'].forEach(t=>hr.append(el('th',t)));head.append(hr);table.append(head);
 const body=el('tbody');for(const p of [...state.stats].sort((a,b)=>(b.score??-1)-(a.score??-1)||b.total-a.total)){
  const row=el('tr');row.append(el('td',p.name+(p.id===state.profile.id?' · ты':'')),el('td',String(p.attended)),el('td',String(p.missed)),el('td',String(p.canceled)));
  const score=el('td');score.append(el('strong',p.score===null?'—':p.score+'%'),el('div',p.total?String(p.total)+' подтверждённых встреч':'Пока нет данных','field-note'));row.append(score);body.append(row);
 }table.append(body);scroll.append(table);box.append(scroll);
}
const rsvpLabels={invited:'ждём ответ',accepted:'идёт',declined:'не пойдёт',canceled:'отменил заранее'};
const outcomeLabels={attended:'пришёл',missed:'не пришёл'};
function events(target,upcoming=false){
 target.replaceChildren();let items=state?.events||[];if(upcoming)items=items.filter(e=>!e.canceled&&e.starts>Date.now()).sort((a,b)=>a.starts-b.starts);
 if(!items.length){target.append(el('p',state?.profile?'Пока нет встреч. Создай прогулку и пригласи друзей.':'Войди, чтобы увидеть приглашения на прогулки.','field-note'));return;}
 for(const e of items){
  const card=el('article',undefined,'event-card');card.append(el('h3',e.title),el('p',new Date(e.starts).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})+' · '+e.place,'event-meta'),el('p','Организатор: '+e.ownerName,'field-note'));
  if(e.canceled)card.append(el('span','Встреча отменена','pill'));
  const owner=e.owner===state.profile.id,past=e.starts<=Date.now();
  for(const m of e.members){
   const row=el('div',undefined,'attendance-row'),text=el('div');text.append(el('span',m.name+' · '+rsvpLabels[m.rsvp]));
   if(m.outcome)text.append(el('p',outcomeLabels[m.outcome]+' · '+({pending:'ждёт подтверждения',confirmed:'подтверждено',disputed:'оспаривается'}[m.confirmation]),'field-note'));
   row.append(text);const actions=el('div',undefined,'row-actions');
   if(!e.canceled){
    if(m.user_id===state.profile.id&&!past){
     if(m.rsvp!=='accepted')actions.append(button('Пойду',()=>action('event/rsvp',{id:e.id,choice:'accepted'},'Ты в компании!')));
     if(m.rsvp==='accepted')actions.append(button('Отменить участие',()=>action('event/rsvp',{id:e.id,choice:'canceled'},'Участие отменено до начала встречи.')));
     if(m.rsvp==='invited')actions.append(button('Не пойду',()=>action('event/rsvp',{id:e.id,choice:'declined'},'Ответ сохранён.')));
    }
    if(owner&&past&&m.rsvp==='accepted'&&m.confirmation!=='confirmed')actions.append(button('Пришёл',()=>action('event/mark',{id:e.id,userId:m.user_id,outcome:'attended'},'Отметка отправлена участнику на подтверждение.')),button('Не пришёл',()=>action('event/mark',{id:e.id,userId:m.user_id,outcome:'missed'},'Отметка отправлена участнику на подтверждение.')));
    if(m.user_id===state.profile.id&&m.outcome&&m.confirmation==='pending')actions.append(button('Подтвердить',()=>action('event/confirm',{id:e.id,choice:'confirmed'},'Статистика обновлена.')),button('Оспорить',()=>action('event/confirm',{id:e.id,choice:'disputed'},'Отметка оспорена и не входит в рейтинг.')));
   }
   row.append(actions);card.append(row);
  }
  if(owner&&!e.canceled)card.append(button('Отменить встречу',async()=>{if(confirm('Отменить встречу для всех участников?'))await action('event/cancel',{id:e.id},'Встреча отменена.');},true));
  target.append(card);
 }
}
function localWalks(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(r=>r?.id&&r.data?.trip?.summary&&Array.isArray(r.places)):[];}catch{return [];}}
async function renderWalks(){
 const list=$('walksList');list.replaceChildren(el('p','Загружаем маршруты…','field-note'));
 let cloud=[];if(state?.profile)cloud=(await api('walks')).walks;
 const combined=[...cloud.map(r=>({...r,cloud:true})),...localWalks().filter(r=>!cloud.some(c=>c.id===r.id))];
 list.replaceChildren();if(!combined.length)list.append(el('p','Пока пусто. Построй маршрут и нажми «Сохранить маршрут».','field-note'));
 for(const r of combined){
  const card=el('article',undefined,'walk-card');card.append(el('h3',r.city||'Прогулка'),el('p',Number(r.data.trip.summary.length).toFixed(1)+' км · '+r.places.length+' мест'),el('p',r.cloud?'В аккаунте':'В этом браузере','field-note'));
  const actions=el('div',undefined,'row-actions');actions.append(button('Открыть маршрут',()=>{sessionStorage.setItem('cityroute-open-walk',JSON.stringify(r));location.href='/';}));
  if(!r.cloud&&state?.profile)actions.append(button('Сохранить в аккаунт',async()=>{await api('walk/save',{walk:r});await renderWalks();note('Маршрут сохранён в аккаунте.');}));
  actions.append(button('Удалить',async()=>{if(!confirm('Удалить сохранённый маршрут?'))return;if(r.cloud)await api('walk/delete',{id:r.id});localStorage.setItem(KEY,JSON.stringify(localWalks().filter(x=>x.id!==r.id)));await renderWalks();},true));card.append(actions);list.append(card);
 }
 events($('myEvents'),true);
}
async function refresh(){
 state=await api('state');$('accountButton').textContent=state.profile?.name||(state.authenticated?'Создать профиль':'Войти');
 if(page==='friends'){
  $('friendsGate').hidden=!!state.profile;$('friendsContent').hidden=!state.profile;
  if(state.profile){$('myName').textContent=state.profile.name;$('friendCode').textContent=state.profile.code;relations();ratings();events($('eventsList'));}
 }
 if(page==='walks')await renderWalks();
 return state;
}
if(page==='friends'){
 $('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(state.profile.code);note('Код скопирован.');}catch{note('Не удалось скопировать. Выдели код и скопируй вручную.');}};
 $('friendForm').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await action('friend/request',{code:$('friendInput').value.trim()},'Заявка отправлена. Друг должен её принять.');$('friendForm').reset();}catch(e){note(e.message);}finally{e.submitter.disabled=false;}};
 $('eventForm').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await action('event/create',{title:$('eventTitle').value,place:$('eventPlace').value,starts:new Date($('eventDate').value).getTime(),members:[...document.querySelectorAll('[name=member]:checked')].map(x=>x.value)},'Встреча создана. Приглашения появились у друзей.');$('eventForm').reset();}catch(e){note(e.message);}finally{e.submitter.disabled=false;}};
}
if($('refreshSocial'))$('refreshSocial').onclick=async()=>{const b=$('refreshSocial');b.disabled=true;try{await refresh();note('Данные обновлены.');}catch(e){note(e.message);}finally{b.disabled=false;}};
window.CityRouteSocial={api,getState:()=>state,ready:null};
window.CityRouteSocial.ready=refresh().catch(e=>{note('Не удалось загрузить аккаунт: '+e.message);if(page==='walks')renderWalks().catch(e=>note(e.message));return null;});
})();
