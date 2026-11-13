import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {planPreferences} from '../../../../server/ai.mjs';
export const dynamic='force-dynamic';
const attempts=new Map<string,{count:number,until:number}>();
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){return reply({configured:Boolean(env.OPENAI_API_KEY),model:'gpt-5.4-mini'});}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({code:'origin'},403);
 if(!env.OPENAI_API_KEY)return reply({code:'not_configured'},503);
 const user=await getChatGPTUser();if(!user)return reply({code:'sign_in'},401);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({code:'invalid_input'},415);
 try{
  const raw=await request.text();if(raw.length>6000)return reply({code:'invalid_input'},413);
  const body=JSON.parse(raw);
  if(typeof body.notes!=='string'||!body.notes.trim()||body.notes.length>1500)return reply({code:'invalid_input'},400);
  const now=Date.now();for(const [id,entry] of attempts)if(entry.until<now)attempts.delete(id);
  const bucket=attempts.get(user.userId)||{count:0,until:now+60000};
  if(bucket.count>=5)return reply({code:'busy'},429);bucket.count++;attempts.set(user.userId,bucket);
  const plan=await planPreferences(env.OPENAI_API_KEY,{notes:body.notes,language:body.language==='en'?'en':'ru'});
  return reply({plan,model:'gpt-5.4-mini'});
 }catch(e:any){if(e instanceof SyntaxError)return reply({code:'invalid_input'},400);return reply({code:e.status===429?'quota':e.status===401||e.status===403?'key_error':'unavailable'},503);}
}
