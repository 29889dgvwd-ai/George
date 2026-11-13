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
 .replace('<script defer src="static-shell.js"></script>','<script defer src="static-shell.js"></script><script defer src="static-walks.js"></script>');
writeFileSync(join(out,'walks.html'),walks);
const friends=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CityRoute — друзья</title><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="social.css"></head>
<body data-page="friends"><header><a class="logo" href="index.html">City<span>Route</span></a><nav class="project-nav"><a href="index.html">Маршрут</a><a href="walks.html">Мои прогулки</a><a href="friends.html" aria-current="page">Друзья</a></nav><div class="header-actions"><button id="language" type="button">EN</button><button id="theme" type="button">◐</button></div></header>
<main><div class="page-title"><span class="eyebrow">CITYROUTE / ДРУЗЬЯ</span><h1>Гуляйте вместе</h1><p>Построй маршрут и отправь друзьям ссылку из Яндекс Карт.</p></div>
<section class="card" style="padding:28px"><h2>Как поделиться прогулкой</h2><p>На главной построй маршрут — появятся остановки, фотографии и ссылка «Открыть в Яндекс Картах». Отправь её другу, чтобы он увидел точки и смог построить свой путь.</p><p class="field-note">Аккаунты и приглашения на этой бесплатной статической версии пока недоступны. Все сохранения находятся только в твоём браузере.</p><a class="primary inline-link" href="index.html" style="max-width:240px;margin-top:18px">Построить маршрут →</a></section></main><script defer src="static-shell.js"></script></body></html>`;
writeFileSync(join(out,'friends.html'),friends);
writeFileSync(join(out,'.nojekyll'),'');
console.log('Built static CityRoute based on latest full source, ready for GitHub Pages or a static host');
