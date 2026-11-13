import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {social} from '../../../../server/social.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 try {
  const url=new URL(request.url);
  if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return Response.json({error:'Запрос с другого сайта отклонён.'},{status:403});
  const user=await getChatGPTUser();
  const path=url.pathname.replace('/api/social/','');
  let body={};
  if(request.method==='POST'){
   if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Нужен JSON.'},{status:415});
   const raw=await request.text();if(raw.length>310000)return Response.json({error:'Слишком большой запрос.'},{status:413});
   body=JSON.parse(raw);
  }
  const result=await social(env.DB,user?.userId||null,request.method,path,body);
  return Response.json(result,{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 } catch(e:any){return Response.json({error:e.status?e.message:'Не удалось выполнить запрос. Попробуй ещё раз.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});}
}
export const GET=handle;
export const POST=handle;
