// Free static edition: read plain notes as filters; don't pretend it is GPT.
window.CityRouteAI={async apply(signal){
 const $=id=>document.getElementById(id),notes=$('gptNotes')?.value?.toLowerCase().trim()||'';
 if(!notes||signal?.aborted)return;
 const en=document.body.classList.contains('english');
 const rules=[[/парк|сад|park|garden/,['parks'],'parks'],[/кафе|кофе|coffee|cafe/,['cafe'],'food'],[/еда|ресторан|food|restaurant/,['restaurant'],'food'],[/музей|museum/,['museum'],'culture'],[/архитект|здани|architecture|building/,['architecture'],'sights'],[/набереж|река|waterfront|river/,['water'],'water'],[/тих|спокой|quiet|calm/,['noise'],null],[/без тц|без торгов|no mall|avoid mall/,['malls'],null]];
 const kinds=[];
 for(const [pattern,inputs,style] of rules)if(pattern.test(notes)){
  for(const name of inputs){const target=document.querySelector('[data-preference="'+name+'"]');if(target)target.checked=true}
  if(style)kinds.push(style)
 }
 if(kinds.length)$('routeStyle').value=kinds[0];
 const msg=$('aiStatus');if(msg)msg.textContent=en?'Your preferences were applied using local rules, not an AI service.':'Пожелания применены по локальным правилам без подключения к GPT.';
}};
