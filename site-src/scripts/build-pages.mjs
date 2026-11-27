import {cpSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'../docs');
mkdirSync(out,{recursive:true});
cpSync(join(root,'public'),out,{recursive:true,force:true});
const fix=html=>html
 .replaceAll('href="/"','href="index.html"')
 .replaceAll('href="/walks"','href="walks.html"')
 .replaceAll('href="/friends"','href="friends.html"')
 .replace(/(src|href)="\/(?!\/)/g,'$1="')
 .replace('<script defer src="social.js"></script>','<script defer src="static-shell.js"></script>')
 .replace(/<dialog id="accountDialog">[\s\S]*?<\/dialog>/g,'')
 .replace('<button id="accountButton" type="button">Войти</button>','')
 .replace('<script defer src="ai.js"></script>','<script defer src="ai-offline.js"></script>')
 .replace(/<a id="aiSignIn"[^>]*>[^<]*<\/a>/g,'<span id="aiSignIn" hidden></span>')
 .replace(/GPT-5\.4 mini переводит пожелания в настройки прогулки\. Для ИИ нужен вход в аккаунт\./g,'Пожелания применяются к настройкам прогулки без регистрации. Для настоящего GPT нужен отдельный сервер.')
 .replace(/GPT-5\.4 mini turns your wishes into walking preferences\. Sign in to use AI\./g,'Your notes adjust the walk filters without a sign-in. Real GPT requires a separate server.')
 .replace(/<summary><span class="ru">Пожелания для GPT<\/span>/g,'<summary><span class="ru">Пожелания к маршруту</span>')
 .replace(/<span class="en">Notes for GPT<\/span>/g,'<span class="en">Walk preferences</span>');
let home=fix(readFileSync(join(root,'pages/home.html'),'utf8'));
writeFileSync(join(out,'index.html'),home);
let walks=fix(readFileSync(join(root,'pages/walks.html'),'utf8'));
walks=walks
 .replace('После входа доступны маршруты из аккаунта. Старые прогулки остаются в этом браузере.','Сохранённые прогулки этого браузера. Можно открыть, удалить или построить новый маршрут.')
 .replace(/<button id="refreshSocial"[\s\S]*?<\/button>/,'')
 .replace(/<section class="card social-card"><div class="section-heading"><span class="step">02<\/span>[\s\S]*?<\/section>/,'')
 .replace('<script defer src="static-shell.js"></script>','<script defer src="static-shell.js"></script><script defer src="places-data.js"></script><script defer src="place-guide.js"></script><script defer src="place-photos.js"></script><script defer src="static-walks.js"></script>');
writeFileSync(join(out,'walks.html'),walks);
const friends=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CityRoute — друзья</title><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="social.css"></head>
<body data-page="friends"><header><a class="logo" href="index.html">City<span>Route</span></a><nav class="project-nav"><a href="index.html">Маршрут</a><a href="walks.html">Мои прогулки</a><a href="friends.html" aria-current="page">Друзья</a></nav><div class="header-actions"><button id="language" type="button">EN</button><button id="theme" type="button">◐</button></div></header>
<main><div class="page-title"><h1><span class="ru">Поделиться прогулкой</span><span class="en">Share a walk</span></h1></div>
<section class="card social-card"><p><span class="ru">Открой прогулку и нажми «Поделиться маршрутом».</span><span class="en">Open a walk and select “Share route”.</span></p><div class="friend-links"><a class="primary inline-link" href="walks.html"><span class="ru">Мои прогулки</span><span class="en">My walks</span></a><a class="secondary inline-link" href="index.html"><span class="ru">Построить маршрут</span><span class="en">Plan a walk</span></a></div></section></main><script defer src="static-shell.js"></script></body></html>`;
writeFileSync(join(out,'friends.html'),friends);
// Refresh asset URLs on every page together, including the generated friends page.
for(const page of ['index.html','walks.html','friends.html']){
 const file=join(out,page);
 writeFileSync(file,readFileSync(file,'utf8').replace(/((?:src|href)="[^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g,'$1?v=20261127-2"'));
}
writeFileSync(join(out,'.nojekyll'),'');
console.log('Built static CityRoute based on latest full source, ready for GitHub Pages or a static host');
