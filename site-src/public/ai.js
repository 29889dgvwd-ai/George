window.CityRouteAI={async apply(signal){
 const $=id=>document.getElementById(id),en=()=>document.body.classList.contains('english'),say=(ru,eng)=>{$('aiStatus').textContent=en()?eng:ru};
 const notes=$('gptNotes').value.trim();if(!notes)return;
 say('GPT обрабатывает пожелания…','GPT is reading your wishes…');
 try{
  const response=await fetch('/api/ai/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes,language:en()?'en':'ru'}),signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])});const result=await response.json();
  if(!response.ok){const code=result.code;$('aiSignIn').hidden=code!=='sign_in';
   const messages={not_configured:['GPT пока не активирован владельцем сайта. Строим по выбранным настройкам без ИИ.','GPT is not activated yet. Using your selected settings without AI.'],sign_in:['Войди для обработки пожеланий GPT. Сейчас строим без ИИ.','Sign in to use GPT. Continuing without AI.'],quota:['Лимит OpenAI исчерпан. Строим без ИИ.','OpenAI quota reached. Continuing without AI.']};
   say(...(messages[code]||['GPT временно недоступен. Строим по выбранным настройкам без ИИ.','GPT is unavailable. Continuing with your settings without AI.']));return;
  }
  if(signal.aborted)return;const plan=result.plan;
  $('routeStyle').value=plan.style;
  for(const name of [...plan.interests,...plan.avoid]){const input=document.querySelector('[data-preference="'+name+'"]');if(input)input.checked=true;}
  say('GPT-5.4 mini: '+plan.explanation,'GPT-5.4 mini: '+plan.explanation);
 }catch{if(signal.aborted)return;say('GPT не ответил вовремя. Строим по выбранным настройкам без ИИ.','GPT did not respond. Continuing without AI.');}
}};
fetch('/api/ai/preferences').then(r=>r.ok?r.json():null).then(data=>{if(data&&!data.configured)document.getElementById('aiStatus').textContent='GPT ожидает активации. Маршруты доступны без ИИ. / GPT activation pending; routes work without AI.';}).catch(()=>{});
