const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const text=(value,min,max)=>{if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail('Проверь длину поля.');return value.trim();};
const uid=()=>crypto.randomUUID();
export async function social(db,user,method,path,body={},now=Date.now()){
 const one=(sql,...args)=>db.prepare(sql).bind(...args).first();
 const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const run=(sql,...args)=>db.prepare(sql).bind(...args).run();
 if(!user) {if(method==='GET'&&path==='state')return {authenticated:false};fail('Сначала войди в аккаунт.',401);}
 let me=await one('SELECT id,name,code FROM profiles WHERE id=?',user);
 if(method==='POST'&&path==='profile'){
  const name=text(body.name,2,40);
  if(me)await run('UPDATE profiles SET name=? WHERE id=?',name,user);
  else await run('INSERT INTO profiles(id,name,code,created) VALUES(?,?,?,?)',user,name,uid().replaceAll('-','').slice(0,16).toUpperCase(),now);
  return {ok:true};
 }
 if(!me){if(method==='GET'&&path==='state')return {authenticated:true,profile:null};fail('Сначала создай профиль.',409);}
 const friend=async(other)=>!!await one("SELECT id FROM friends WHERE status='accepted' AND ((sender=? AND recipient=?) OR (recipient=? AND sender=?))",user,other,user,other);
 if(method==='GET'&&path==='state'){
  const relations=await all("SELECT f.id,f.sender,f.recipient,f.status,p.id AS userId,p.name,p.code FROM friends f JOIN profiles p ON p.id=CASE WHEN f.sender=? THEN f.recipient ELSE f.sender END WHERE (f.sender=? OR f.recipient=?) AND f.status IN ('pending','accepted')",user,user,user);
  const users=[user,...relations.filter(r=>r.status==='accepted').map(r=>r.userId)];
  const slots=users.map(()=>'?').join(',');
  const totals=await all(`SELECT a.user_id, SUM(CASE WHEN a.outcome='attended' THEN 1 ELSE 0 END) AS attended, SUM(CASE WHEN a.outcome='missed' THEN 1 ELSE 0 END) AS missed FROM attendance a JOIN events e ON e.id=a.event_id WHERE a.user_id IN (${slots}) AND a.confirmation='confirmed' AND e.canceled=0 AND e.starts<=? GROUP BY a.user_id`,...users,now);
  const cancellations=await all(`SELECT a.user_id,COUNT(*) AS count FROM attendance a JOIN events e ON e.id=a.event_id WHERE a.user_id IN (${slots}) AND a.rsvp='canceled' AND e.canceled=0 GROUP BY a.user_id`,...users);
  const stats=users.map(id=>{
   const p=id===user?me:relations.find(r=>r.userId===id),s=totals.find(r=>r.user_id===id)||{};
   const attended=Number(s.attended||0),missed=Number(s.missed||0),total=attended+missed;
   return {id,name:p.name,attended,missed,canceled:cancellations.find(r=>r.user_id===id)?.count||0,total,score:total?Math.round(attended*100/total):null};
  });
  const eventRows=await all('SELECT e.*,p.name AS ownerName FROM events e JOIN profiles p ON p.id=e.owner WHERE e.owner=? OR EXISTS(SELECT 1 FROM attendance a WHERE a.event_id=e.id AND a.user_id=?) ORDER BY e.starts DESC LIMIT 100',user,user);
  if(eventRows.length){
   const members=await all(`SELECT a.*,p.name FROM attendance a JOIN profiles p ON p.id=a.user_id WHERE a.event_id IN (${eventRows.map(()=>'?').join(',')})`,...eventRows.map(e=>e.id));
   for(const e of eventRows)e.members=members.filter(m=>m.event_id===e.id);
  }
  return {authenticated:true,profile:me,relations,stats,events:eventRows};
 }
 if(method==='GET'&&path==='walks')return {walks:(await all('SELECT payload FROM walks WHERE user_id=? ORDER BY updated DESC LIMIT 20',user)).map(r=>JSON.parse(r.payload))};
 if(method!=='POST')fail('Не найдено.',404);
 if(path==='friend/request'){
  const code=text(body.code,16,16).toUpperCase();
  const target=await one('SELECT id FROM profiles WHERE code=?',code);
  if(!target||target.id===user)fail('Друг с таким кодом не найден.');
  const existing=await one("SELECT id,status FROM friends WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",user,target.id,target.id,user);
  if(existing)fail('Заявка или дружба уже существует.');
  const count=await one("SELECT COUNT(*) AS n FROM friends WHERE sender=? OR recipient=?",user,user);
  if(count.n>=50)fail('Лимит — 50 заявок и друзей.');
  // Canonical pair ID prevents reciprocal/racing duplicate requests.
  await run("INSERT INTO friends(id,sender,recipient,status,created) VALUES(?,?,?,'pending',?)",[user,target.id].sort().join(':'),user,target.id,now);return {ok:true};
 }
 if(path==='friend/respond'){
  const r=await one("SELECT * FROM friends WHERE id=?",text(body.id,1,500));
  if(!r||r.recipient!==user||r.status!=='pending')fail('Заявка недоступна.',403);
  if(body.accept===true){const n=await one("SELECT COUNT(*) AS n FROM friends WHERE status='accepted' AND (sender=? OR recipient=?)",user,user);if(n.n>=50)fail('Лимит — 50 друзей.');}
  if(body.accept===true)await run("UPDATE friends SET status='accepted' WHERE id=? AND recipient=?",r.id,user);
  else await run('DELETE FROM friends WHERE id=? AND recipient=?',r.id,user);
  return {ok:true};
 }
 if(path==='friend/remove'){
  await run('DELETE FROM friends WHERE id=? AND (sender=? OR recipient=?)',text(body.id,1,500),user,user);return {ok:true};
 }
 if(path==='event/create'){
  const title=text(body.title,2,100),place=text(body.place,2,180),starts=Number(body.starts);
  if(!Number.isFinite(starts)||starts<now+60000||starts>now+366*86400000)fail('Выбери будущее время в пределах года.');
  if(!Array.isArray(body.members)||!body.members.length||body.members.length>20)fail('Выбери от 1 до 20 друзей.');
  const members=[...new Set(body.members)];
  for(const id of members)if(typeof id!=='string'||!await friend(id))fail('Приглашать можно только подтверждённых друзей.',403);
  const count=await one('SELECT COUNT(*) AS n FROM events WHERE owner=? AND created>?',user,now-86400000);if(count.n>=20)fail('Лимит — 20 прогулок в день.');
  const id=uid();await db.batch([db.prepare('INSERT INTO events(id,owner,title,place,starts,created) VALUES(?,?,?,?,?,?)').bind(id,user,title,place,starts,now),...members.map(m=>db.prepare("INSERT INTO attendance(event_id,user_id,rsvp,confirmation,updated) VALUES(?,?,'invited','pending',?)").bind(id,m,now))]);return {ok:true,id};
 }
 if(path.startsWith('event/')){
  const e=await one('SELECT * FROM events WHERE id=?',text(body.id,1,100));if(!e)fail('Прогулка не найдена.',404);
  if(path==='event/cancel'){
   if(e.owner!==user)fail('Отменить прогулку может только организатор.',403);
   await run('UPDATE events SET canceled=1 WHERE id=?',e.id);return {ok:true};
  }
  if(e.canceled)fail('Прогулка отменена.');
  if(path==='event/rsvp'){
   if(e.starts<=now)fail('Встреча уже началась.');
   const a=await one('SELECT * FROM attendance WHERE event_id=? AND user_id=?',e.id,user);if(!a)fail('Приглашение недоступно.',403);
   const choice=body.choice;if(!['accepted','declined','canceled'].includes(choice))fail('Неизвестный ответ.');
   if(choice==='canceled'&&a.rsvp!=='accepted')fail('Сначала нужно принять приглашение.');
   await run('UPDATE attendance SET rsvp=?,outcome=NULL,confirmation=\'pending\',updated=? WHERE event_id=? AND user_id=?',choice,now,e.id,user);return {ok:true};
  }
  if(path==='event/mark'){
   if(e.owner!==user)fail('Отмечать участие может только организатор.',403);
   if(e.starts>now)fail('Прогулка ещё не началась.');
   if(!['attended','missed'].includes(body.outcome))fail('Неизвестная отметка.');
   const a=await one('SELECT * FROM attendance WHERE event_id=? AND user_id=?',e.id,body.userId);
   if(!a||a.rsvp!=='accepted')fail('Участник не подтвердил приглашение.');
   if(a.confirmation==='confirmed')fail('Подтверждённую отметку менять нельзя.');
   await run("UPDATE attendance SET outcome=?,confirmation='pending',updated=? WHERE event_id=? AND user_id=?",body.outcome,now,e.id,body.userId);return {ok:true};
  }
  if(path==='event/confirm'){
   const a=await one('SELECT * FROM attendance WHERE event_id=? AND user_id=?',e.id,user);
   if(!a||!a.outcome||e.starts>now)fail('Нет отметки для подтверждения.',403);
   if(a.confirmation==='confirmed')fail('Отметка уже подтверждена.');
   if(!['confirmed','disputed'].includes(body.choice))fail('Неизвестный ответ.');
   await run('UPDATE attendance SET confirmation=?,updated=? WHERE event_id=? AND user_id=?',body.choice,now,e.id,user);return {ok:true};
  }
 }
 if(path==='walk/save'){
  const r=body.walk,encoded=JSON.stringify(r);
  if(!r||typeof r.id!=='string'||r.id.length>100||encoded.length>300000||!Array.isArray(r.points)||!r.points[0]||!Array.isArray(r.places)||!r.data?.trip?.legs?.length||r.data.trip.legs.length>30||!r.data.trip.legs.every(l=>typeof l.shape==='string')||!Number.isFinite(r.data.trip.summary?.length)||!Number.isFinite(r.data.trip.summary?.time))fail('Неверный маршрут.');
  await db.batch([db.prepare('INSERT INTO walks(id,user_id,payload,updated) VALUES(?,?,?,?) ON CONFLICT(id,user_id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(r.id,user,encoded,now),db.prepare('DELETE FROM walks WHERE user_id=? AND id NOT IN (SELECT id FROM walks WHERE user_id=? ORDER BY updated DESC LIMIT 20)').bind(user,user)]);
  return {ok:true};
 }
 if(path==='walk/delete'){await run('DELETE FROM walks WHERE id=? AND user_id=?',text(body.id,1,100),user);return {ok:true};}
 fail('Не найдено.',404);
}
