// Portable shell for the free GitHub Pages edition (no server-side login).
(()=>{'use strict';
const $=id=>document.getElementById(id),home=document.body.dataset.page==='home';
try{if(localStorage.getItem('cityroute-theme')==='dark')document.body.classList.add('dark');if(localStorage.getItem('cityroute-lang')==='en'){document.body.classList.add('english');document.documentElement.lang='en';if($('language'))$('language').textContent='RU';}}catch{}
const remember=()=>{try{localStorage.setItem('cityroute-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}};
if(home){$('theme')?.addEventListener('click',remember);$('language')?.addEventListener('click',()=>{try{localStorage.setItem('cityroute-lang',document.body.classList.contains('english')?'en':'ru');}catch{}});}
else{
 $('theme')?.addEventListener('click',()=>{document.body.classList.toggle('dark');remember()});
 $('language')?.addEventListener('click',()=>{document.body.classList.toggle('english');const en=document.body.classList.contains('english');document.documentElement.lang=en?'en':'ru';$('language').textContent=en?'RU':'EN';try{localStorage.setItem('cityroute-lang',en?'en':'ru');}catch{}});
}
})();