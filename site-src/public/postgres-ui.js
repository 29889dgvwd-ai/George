// CityRoute PostgreSQL cloud UI. All sync actions are explicit and opt-in.
(()=>{'use strict';
const cloud=window.CityRouteCloud,$=id=>document.getElementById(id);
if(!cloud||!$('postgresPanel'))return;
const tr=(ru,en)=>document.body.classList.contains('english')?en:ru;
const E=(name,text,cls)=>{const el=document.createElement(name);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const controls=['pgLogin','pgSignup','pgLogout','pgReload','pgUpload','pgSaveSettings'];
let inFlight=false,renderId=0;
function message(ru,en,error=false){
 const el=$('pgStatus');el.textContent=tr(ru,en);el.setAttribute('role',error?'alert':'status')
}
function busy(active){inFlight=active;for(const id of controls){const button=$(id);if(button)button.disabled=active}}
async function wrap(work){
 if(inFlight)return;
 busy(true);
 try{await work()}catch(e){message('Ошибка облака: '+(e?.message||'неизвестная ошибка'),'Cloud error: '+(e?.message||'unknown'),true)}
 finally{busy(false)}
}
async function updateUser(){
 const s=await cloud.current();
 const signed=Boolean(s?.user?.id);
 $('pgAuthForm').hidden=signed;$('pgMember').hidden=!signed;
 if(signed)$('pgAccount').textContent=tr('Вошёл: ','Signed in: ')+(s.user.email||tr('аккаунт','account'));
 return signed
}
async function fetchSaved(){
 if(!await updateUser())return;
 const requestId=++renderId;
 const rows=await cloud.listRoutes();
 if(requestId!==renderId)return;
 const list=$('pgRoutes');list.replaceChildren();
 if(!rows.length){list.append(E('p',tr('В облаке пока нет сохранённых прогулок.','No saved walks in PostgreSQL yet.'),'field-note'));return}
 const fragment=document.createDocumentFragment();
 for(const row of rows){
  const card=E('article',undefined,'postgres-route'),body=E('div',undefined,'postgres-route-body');
  body.append(E('strong',row.title||tr('Прогулка','Walk')),E('small',new Date(row.created_at).toLocaleDateString(document.documentElement.lang||'ru-RU')));
  const actions=E('div',undefined,'postgres-route-actions');
  const open=E('button',tr('Открыть','Open'),'secondary');open.type='button';
  open.onclick=()=>{
   try{sessionStorage.setItem('cityroute-open-walk',JSON.stringify(row.payload));location.href='index.html'}
   catch{message('Не удалось открыть маршрут.','Could not open this route.',true)}
  };
  const del=E('button',tr('Удалить из облака','Delete from cloud'),'secondary');del.type='button';
  del.onclick=()=>wrap(async()=>{
   if(!confirm(tr('Удалить маршрут из PostgreSQL? Локальная копия останется на этом устройстве.','Delete this route from PostgreSQL? Local copies stay on this device.')))return;
   await cloud.removeRoute(row.id);
   message('Маршрут удалён из облака.','Route removed from cloud.');
   await fetchSaved()
  });
  actions.append(open,del);card.append(body,actions);fragment.append(card)
 }
 list.append(fragment)
}
$('pgAuthForm').addEventListener('submit',ev=>{
 ev.preventDefault();
 wrap(async()=>{
  const email=$('pgEmail').value.trim(),password=$('pgPassword').value;
  await cloud.signIn(email,password);
  $('pgPassword').value='';
  await updateUser();
  message('Вход выполнен. PostgreSQL подключён.','Signed in. PostgreSQL is connected.');
  await fetchSaved()
 })
});
$('pgSignup').addEventListener('click',()=>wrap(async()=>{
 const email=$('pgEmail').value.trim(),password=$('pgPassword').value;
 if(!email||!password||password.length<8){
  message('Введи email и пароль длиной не меньше 8 символов.','Enter an email and a password of at least 8 characters.',true);return
 }
 const data=await cloud.signUp(email,password);
 $('pgPassword').value='';
 const signed=await updateUser();
 message(signed?'Аккаунт создан, вход выполнен.':'Проверь почту: нужно подтвердить регистрацию. После подтверждения войди сюда.',
   signed?'Account created and signed in.':'Check your inbox and confirm your address, then sign in here.');
 if(signed)await fetchSaved()
}));
$('pgLogout').addEventListener('click',()=>wrap(async()=>{
 await cloud.signOut();await updateUser();$('pgRoutes').replaceChildren();
 message('Ты вышел из облака. Локальные маршруты остались на устройстве.','Signed out. Local routes remain on this device.')
}));
$('pgReload').addEventListener('click',()=>wrap(async()=>{
 await fetchSaved();message('Маршруты загружены из PostgreSQL.','Routes loaded from PostgreSQL.')
}));
$('pgUpload').addEventListener('click',()=>wrap(async()=>{
 if(!await updateUser())throw Error('Сначала войди в облако.');
 const raw=JSON.parse(localStorage.getItem('cityroute-saved-itineraries-v1')||'[]');
 const routes=(Array.isArray(raw)?raw:[]).filter(r=>r&&typeof r==='object').slice(0,30);
 if(!routes.length){message('На этом устройстве пока нет сохранённых прогулок.','No local routes to upload.');return}
 let uploaded=0,failures=0;
 for(const route of routes){
  try{await cloud.saveRoute(route);uploaded++}catch{failures++}
 }
 await fetchSaved();
 message('В PostgreSQL перенесено маршрутов: '+uploaded+(failures?'. Не получилось: '+failures:''),
  'Uploaded to PostgreSQL: '+uploaded+(failures?'. Failed: '+failures:''),
  failures>0&&uploaded===0);
}));
$('pgSaveSettings').addEventListener('click',()=>wrap(async()=>{
 const fields=document.getElementById('routeForm');
 const checks=[...fields.querySelectorAll('[data-preference]:checked')].map(el=>el.dataset.preference);
 await cloud.saveSettings({
  theme:document.body.classList.contains('dark')?'dark':'light',
  language:document.body.classList.contains('english')?'en':'ru',
  home_city:document.getElementById('city').value.trim()||'Москва',
  preferences:{preferences:checks,routeStyle:document.getElementById('routeStyle').value}
 });
 message('Тема, язык и предпочтения сохранены в PostgreSQL.','Theme, language and preferences saved to PostgreSQL.')
}));
window.CityRouteCloudUI={refresh:()=>fetchSaved().catch(()=>{})};
void updateUser().then(ok=>{if(ok)return fetchSaved();message('Облако готово. Вход необязателен.','Cloud ready. Signing in is optional.')}).catch(()=>message('База пока не отвечает. Локальное сохранение продолжает работать.','Cloud unavailable. Local routes are still available.',true));
})();