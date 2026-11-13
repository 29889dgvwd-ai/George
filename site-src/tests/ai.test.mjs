import test from 'node:test';
import assert from 'node:assert/strict';
import {planPreferences} from '../server/ai.mjs';
const plan={style:'parks',interests:['parks','cafe'],avoid:['traffic'],explanation:'Парк и кофе, обход крупных дорог.'};
const completed=p=>({ok:true,json:async()=>({status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:JSON.stringify(p)}]}]})});
test('uses requested model, server authorization and structured output',async()=>{
 const result=await planPreferences('test-key',{notes:'Парк и кофе'},async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(opts.headers.Authorization,'Bearer test-key');const body=JSON.parse(opts.body);assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.store,false);assert.equal(body.text.format.strict,true);return completed(plan)});assert.deepEqual(result,plan);
});
test('rejects invented filter and incomplete output',async()=>{await assert.rejects(()=>planPreferences('k',{},async()=>completed({...plan,style:'invented'})));await assert.rejects(()=>planPreferences('k',{},async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})));});
test('quota failure is classified without leaking provider response',async()=>{await assert.rejects(()=>planPreferences('k',{},async()=>({ok:false,status:429})),e=>e.status===429&&e.message==='OpenAI request failed');});
test('refusal cannot be mistaken for a plan',async()=>{await assert.rejects(()=>planPreferences('k',{},async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]})})));});
