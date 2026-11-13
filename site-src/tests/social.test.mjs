import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {social} from '../server/social.mjs';
function setup(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
 const db={prepare(sql){let args=[];return {bind(...a){args=a;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}};},async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const now=1900000000000;
 const call=(u,m,p,b={},time=now)=>social(db,u,m,p,b,time);
 return {call,now,sqlite};
}
async function friends(call){
 await call('alice','POST','profile',{name:'Алиса'});
 await call('bob','POST','profile',{name:'Борис'});
 await call('eve','POST','profile',{name:'Ева'});
 const bob=await call('bob','GET','state');await call('alice','POST','friend/request',{code:bob.profile.code});
 const b=await call('bob','GET','state');const id=b.relations[0].id;
 await assert.rejects(call('eve','POST','friend/respond',{id,accept:true}),/недоступна/);
 await call('bob','POST','friend/respond',{id,accept:true});
}
test('anonymous cannot create records; registration and mutually accepted friends',async()=>{
 const {call}=setup();assert.deepEqual(await call(null,'GET','state'),{authenticated:false});
 await assert.rejects(call(null,'POST','profile',{name:'Test'}),/войди/);
 await friends(call);
 assert.equal((await call('alice','GET','state')).relations[0].status,'accepted');
 assert.equal((await call('eve','GET','state')).stats.length,1);
 await assert.rejects(call('alice','POST','friend/request',{code:(await call('bob','GET','state')).profile.code}),/уже/);
});
test('attendance authorization, disputes and confirmed rating',async()=>{
 const {call,now}=setup();await friends(call);
 const {id}=await call('alice','POST','event/create',{title:'Парк и кофе',place:'Вход в парк',starts:now+120000,members:['bob']});
 assert.equal((await call('eve','GET','state')).events.length,0);
 await assert.rejects(call('eve','POST','event/rsvp',{id,choice:'accepted'}),/недоступно/);
 await call('bob','POST','event/rsvp',{id,choice:'accepted'});
 await assert.rejects(call('alice','POST','event/mark',{id,userId:'bob',outcome:'missed'}),/не началась/);
 const later=now+130000;
 await assert.rejects(call('eve','POST','event/mark',{id,userId:'bob',outcome:'missed'},later),/организатор/);
 await call('alice','POST','event/mark',{id,userId:'bob',outcome:'missed'},later);
 assert.equal((await call('bob','GET','state',{},later)).stats.find(p=>p.id==='bob').score,null);
 await call('bob','POST','event/confirm',{id,choice:'disputed'},later);
 assert.equal((await call('bob','GET','state',{},later)).stats.find(p=>p.id==='bob').total,0);
 await call('alice','POST','event/mark',{id,userId:'bob',outcome:'attended'},later);
 await call('bob','POST','event/confirm',{id,choice:'confirmed'},later);
 assert.equal((await call('alice','GET','state',{},later)).stats.find(p=>p.id==='bob').score,100);
 await assert.rejects(call('alice','POST','event/mark',{id,userId:'bob',outcome:'missed'},later),/нельзя/);
});
test('advance cancellation has no penalty, strangers cannot be invited, deleted friends lose stats',async()=>{
 const {call,now}=setup();await friends(call);
 await assert.rejects(call('alice','POST','event/create',{title:'Парк',place:'Вход',starts:now+120000,members:['eve']}),/друзей/);
 const {id}=await call('alice','POST','event/create',{title:'Парк',place:'Вход',starts:now+120000,members:['bob']});
 await call('bob','POST','event/rsvp',{id,choice:'accepted'});
 await call('bob','POST','event/rsvp',{id,choice:'canceled'});
 const s=await call('bob','GET','state');assert.equal(s.stats[0].canceled,1);assert.equal(s.stats[0].score,null);
 await call('bob','POST','friend/remove',{id:s.relations[0].id});
 assert.equal((await call('alice','GET','state')).stats.length,1);
});
test('cloud walks isolated per account and invalid routes rejected',async()=>{
 const {call}=setup();await friends(call);
 const walk={id:'route-1',points:[{lat:55,lng:37}],places:[],data:{trip:{legs:[{shape:'abc'}],summary:{length:3,time:100}}}};
 await call('alice','POST','walk/save',{walk});
 assert.equal((await call('alice','GET','walks')).walks.length,1);
 assert.equal((await call('bob','GET','walks')).walks.length,0);
 await call('bob','POST','walk/delete',{id:walk.id});assert.equal((await call('alice','GET','walks')).walks.length,1);
 await assert.rejects(call('alice','POST','walk/save',{walk:{id:'bad'}}),/Неверный/);
});
