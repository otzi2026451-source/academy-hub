/* Academy Hub 5.0: weekly planning, sports, grades, events, access control */
(function(){
'use strict';
if(typeof GROUPS==='undefined'||!document.getElementById('adminContent'))return;
const $5=id=>document.getElementById(id);
const E=(tag,props={},parent)=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(props)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else if(k==='value')n.value=v;else n.setAttribute(k,String(v))}if(parent)parent.appendChild(n);return n};
const line=(parent,text)=>E('p',{class:'v5-note',text},parent);
const input=(parent,id,label,tag='input')=>{const wrap=E('label',{class:'v5-field'},parent);E('span',{text:label},wrap);return E(tag,{id,class:'input'},wrap)};
const click=(parent,title,handler,cls='btn secondary')=>{const b=E('button',{class:cls,text:title,type:'button'},parent);b.addEventListener('click',handler);return b};
const safeArray=a=>Array.isArray(a)?a:[];
const allowedGroups=new Set(GROUPS.map(g=>g.key));
const days=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const groupKeys=GROUPS.map(g=>g.key);
function dayToday(){const w=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Almaty',weekday:'short'}).format(new Date()).slice(0,3).toLowerCase();return ({mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:7})[w]||1}
function cloneValue(o){return JSON.parse(JSON.stringify(o||{}))}
function parseLines5(text,limit=150){return String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,limit)}
function readDaySchedule(st,key,day){
  const schedule=st.weekSchedules?.[key];
  const weekly=schedule?.[String(day)];
  if(Array.isArray(weekly))return weekly;
  return safeArray(st.groups?.[key]?.schedule);
}
function groupName(k){return GROUPS.find(g=>g.key===k)?.label||k}
function average(pairs){const values=safeArray(pairs).map(p=>Number(p?.[1])).filter(v=>Number.isFinite(v)&&v>=0&&v<=100);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function cap(str,n=250){return String(str||'').trim().slice(0,n)}
function parseDate(v){const m=String(v).match(/^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/);if(!m)return null;const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);const ms=Date.UTC(y,mo-1,d);return new Date(ms).getUTCDate()===d&&new Date(ms).getUTCMonth()===mo-1?ms:null}
function tvDate(){const s=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Almaty',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());return parseDate(s)||Date.now()}
function escapeHtml(s){return esc(s)}
function dateLabel(ms){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(ms))}
function parseEvents(lines){
 return safeArray(lines).map(s=>{const p=String(s).split('|').map(x=>cap(x,160));if(p.length<2)return null;const date=parseDate(p[0]);return date?{date,title:p[1],where:p[2]||''}:null}).filter(Boolean).sort((a,b)=>a.date-b.date);
}
function parseWins(lines){
 return safeArray(lines).map(s=>{const p=String(s).split('|').map(x=>cap(x,90));if(p.length<5||!allowedGroups.has(p[2])||!allowedGroups.has(p[3]))return null;const m=p[4].match(/^(\d{1,3}):(\d{1,3})$/);if(!m)return null;const date=parseDate(p[0]);return date?{date,sport:p[1],home:p[2],away:p[3],a:Number(m[1]),b:Number(m[2])}:null}).filter(Boolean);
}
function standings(matches){
 const scores=Object.fromEntries(groupKeys.map(k=>[k,0]));
 for(const m of matches){if(m.a===m.b){scores[m.home]+=1;scores[m.away]+=1}else scores[m.a>m.b?m.home:m.away]+=3}
 return Object.entries(scores).sort((a,b)=>b[1]-a[1]);
}
function auditState(state){
 const issues=[];const day=dayToday();
 for(const g of GROUPS){
  const rows=readDaySchedule(state,g.key,day);
  if(!rows.length)issues.push(g.label+': расписание на сегодня отсутствует');
  const starts=new Set();
  for(const row of rows){
   const m=String(row).match(/^(\d{1,2}):(\d{2})/);
   if(!m)continue;
   const h=Number(m[1]),mn=Number(m[2]);
   if(h>23||mn>59){issues.push(g.label+': неверное время');continue}
   const key=h*60+mn;
   if(starts.has(key))issues.push(g.label+': две пары начинаются одновременно');
   starts.add(key);
  }
  if(!safeArray(state.groupGrades?.[g.key]).length)issues.push(g.label+': оценки ещё не внесены');
 }
 const eventLines=safeArray(state.events);
 for(const l of eventLines)if(!parseEvents([l]).length)issues.push('Календарь: проверь строку «'+cap(l,45)+'»');
 const competitionLines=safeArray(state.matches);
 for(const l of competitionLines)if(!parseWins([l]).length)issues.push('Спорт: проверь матч «'+cap(l,45)+'»');
 const now=Date.now();
 if(state.lastContentUpdate&&now-Date.parse(state.lastContentUpdate)>14*86400000)issues.push('Последнее изменение было более 14 дней назад');
 return [...new Set(issues)].slice(0,30);
}
function normalizeWeek(){
 if(!current.weekSchedules||typeof current.weekSchedules!=='object')current.weekSchedules={};
 if(!current.events)current.events=[];
 if(!current.matches)current.matches=[];
 if(!current.achievements)current.achievements=[];
 if(!current.gradeSnapshots)current.gradeSnapshots=[];
}
normalizeWeek();

const container=$5('adminContent');
const dashboard=$5('dashboard');
const extras=E('div',{id:'academy5Admin',class:'v5-admin'},container);
E('h2',{class:'v5-heading',text:'Планирование, спорт и аналитика'},extras);
line(extras,'Всё, что нужно для шести групп. Изменения появляются на табло после сохранения.');
function section(name){
 const details=E('details',{class:'v5-section'},extras);
 E('summary',{text:name},details);
 const body=E('div',{class:'v5-body'},details);
 return {details,body};
}
const scheduleArea=section('01 · Недельное расписание — все 6 групп');
line(scheduleArea.body,'Выбери группу и день недели. Если для дня ничего не задано, сохраняется старое однодневное расписание группы.');
const controls=E('div',{class:'v5-inline'},scheduleArea.body);
const grp=E('select',{id:'v5Group',class:'input'},controls),daySel=E('select',{id:'v5Day',class:'input'},controls);
for(const g of GROUPS)E('option',{value:g.key,text:g.label},grp);
days.forEach((d,i)=>E('option',{value:String(i+1),text:d},daySel));
daySel.value=String(dayToday());
const scheduleText=input(scheduleArea.body,'v5Schedule','Время | Предмет | Кабинет (необязательно)','textarea');
scheduleText.placeholder='08:30 | Математика · 301\n10:20 | Физика · 204';
scheduleText.rows=6;
let weekDraft=cloneValue(current.weekSchedules);
let weekTouched=false;
let wkCurrent=grp.value+'#'+daySel.value;
scheduleText.addEventListener('input',()=>{weekTouched=true});
function saveWeekDraft(){
 if(!weekTouched)return;
 const [k,d]=wkCurrent.split('#');if(!allowedGroups.has(k))return;
 weekDraft[k]=weekDraft[k]||{};weekDraft[k][d]=parseLines5(scheduleText.value,40);weekTouched=false;
}
function loadWeekDraft(){
 wkCurrent=grp.value+'#'+daySel.value;const list=weekDraft[grp.value]?.[daySel.value];
 scheduleText.value=Array.isArray(list)?list.join('\n'):safeArray(current.groups?.[grp.value]?.schedule).join('\n');
 weekTouched=false;
}
const swapWeek=()=>{saveWeekDraft();loadWeekDraft()};
grp.addEventListener('change',swapWeek);daySel.addEventListener('change',swapWeek);
loadWeekDraft();
const hint=E('p',{class:'v5-note',id:'v5WeekStatus',text:'Новые пары сохранятся при нажатии основной кнопки «Сохранить на все экраны».'},scheduleArea.body);
click(scheduleArea.body,'Скопировать этот день на Пн–Пт',()=>{
  saveWeekDraft();const lines=parseLines5(scheduleText.value,40);
  if(!confirm('Скопировать выбранные пары на все пять будних дней именно этой группы?'))return;
  weekDraft[grp.value]=weekDraft[grp.value]||{};
  for(let d=1;d<=5;d++)weekDraft[grp.value][String(d)]=lines.slice();
  hint.textContent='Будние дни заполнены в черновике. Нажми «Сохранить на все экраны».';
});

const sportsArea=section('02 · Матчи, результаты и лучшая группа');
line(sportsArea.body,'Одна строка: ДД.ММ.ГГГГ | Вид спорта | KRD1 | OTZI1 | 3:2. Можно учитывать футбол, волейбол, борьбу и другие секции.');
const sportText=input(sportsArea.body,'v5Matches','Завершённые соревнования','textarea');
sportText.rows=6;sportText.placeholder='16.10.2026 | Футбол | KRD1 | OTZI1 | 3:2';
const sportsTable=E('div',{id:'v5GroupStandings',class:'v5-analytics'},sportsArea.body);
function drawStandings(){
 sportsTable.replaceChildren();
 const matches=parseWins(parseLines5(sportText.value,300)),table=E('table',{class:'v5-analytics-table'},sportsTable);
 const head=E('tr',{},table);['Место','Группа','Очки'].forEach(x=>E('th',{text:x},head));
 for(const [i,[k,points]]of standings(matches).entries()){
  const tr=E('tr',{},table);
  E('td',{text:String(i+1)},tr);E('td',{text:groupName(k)},tr);E('td',{text:String(points)},tr);
 }
 E('p',{class:'v5-note',text:'Подсчёт: победа = 3 очка, ничья = 1. Учтено матчей: '+matches.length},sportsTable);
}
sportText.addEventListener('input',drawStandings);


const eventsArea=section('03 · Мероприятия и обратный отсчёт');
line(eventsArea.body,'Даты: ДД.ММ.ГГГГ | Событие | Место. Секретные мероприятия и адреса сюда не добавляй.');
const eventsText=input(eventsArea.body,'v5Events','Календарь мероприятий','textarea');
eventsText.rows=6;eventsText.placeholder='18.10.2026 | Спортивные соревнования | Спортзал';

const achArea=section('04 · Достижения и лучший курсант месяца');
line(achArea.body,'Только разрешённые к публикации результаты. Формат: Награда | Курсант или группа | Дата');
const achievementsText=input(achArea.body,'v5Achievements','Доска достижений','textarea');
achievementsText.rows=5;achievementsText.placeholder='Лидер месяца | Курсант Н. | Октябрь 2026';

const analyticsArea=section('05 · Динамика успеваемости и аналитика');
line(analyticsArea.body,'Средний результат отражает только введённые итоговые баллы, без выдуманной поправки на сложность ОТЗИ.');
const analytics=E('div',{id:'v5GradeAnalytics',class:'v5-analytics'},analyticsArea.body);
click(analyticsArea.body,'Обновить аналитику',()=>drawAnalytics());

const checksArea=section('06 · Проверка расписаний и данных');
const checkStatus=E('div',{class:'v5-checks',id:'v5Checks'},checksArea.body);
click(checksArea.body,'Проверить всё',()=>{
  const data=draftReadSafe();showAudit(data);
});
function showAudit(state){
 const issues=auditState(state);
 checkStatus.replaceChildren();
 E('p',{class:'v5-note',text:issues.length?'Найдено замечаний: '+issues.length:'Проверка прошла, явных противоречий не обнаружено.'},checkStatus);
 for(const item of issues)E('div',{class:'v5-issue',text:'• '+item},checkStatus);
}

const viewersArea=section('07 · Права Samsung TV — только просмотр');
line(viewersArea.body,'Для отдельного телевизора сначала создай подтверждённый пользовательский аккаунт в Supabase Auth. Затем добавь его email здесь. Телевизор увидит только табло, без админ-панели и реестра.');
const viewerEmail=input(viewersArea.body,'v5ViewerEmail','Email существующего подтверждённого TV-аккаунта');
viewerEmail.type='email';
const viewerActions=E('div',{class:'btnrow'},viewersArea.body);
const viewerStatus=E('div',{class:'v5-note',id:'v5ViewerStatus'},viewersArea.body);
async function editViewer(enable){
 if(!window.academySession?.canEdit()){viewerStatus.textContent='Нет прав администратора';return}
 const addr=viewerEmail.value.trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)){viewerStatus.textContent='Укажи корректный email';return}
 if(!confirm((enable?'Открыть':'Отозвать')+' просмотр для '+addr+'?'))return;
 try{
  const jwt=await window.academySession.getToken();
  const r=await fetch(base+'/rest/v1/rpc/academy_grant_viewer',{method:'POST',headers:{apikey:pub,Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify({target_email:addr,enable_access:enable})});
  const d=await r.json().catch(()=>null);
  if(!r.ok)throw Error(d?.message||d?.hint||'Ошибка '+r.status);
  viewerStatus.textContent=enable?'Просмотр разрешён. Теперь аккаунт может войти на Samsung TV.':'Доступ отозван. Открытый сеанс будет автоматически закрыт.';
  viewerEmail.value='';
 }catch(e){viewerStatus.textContent='Ошибка: '+(e.message||e)}
}
click(viewerActions,'Разрешить просмотр',()=>editViewer(true),'btn primary');
click(viewerActions,'Отозвать доступ',()=>editViewer(false));
const listViewers=E('div',{class:'v5-viewers',id:'v5Viewers'},viewersArea.body);
click(viewersArea.body,'Показать разрешённые аккаунты',async()=>{
 if(!window.academySession?.canEdit())return;
 const t=await window.academySession.getToken();
 const r=await fetch(base+'/rest/v1/academy_viewers?select=user_id,granted_at&order=granted_at.desc',{headers:{apikey:pub,Authorization:'Bearer '+t}});
 listViewers.replaceChildren();
 if(r.ok){
  const rows=await r.json();
  E('p',{class:'v5-note',text:'Подключённых TV-аккаунтов: '+rows.length},listViewers);
  rows.forEach(row=>E('p',{class:'v5-note',text:'ID '+row.user_id.slice(0,8)+'… · '+new Date(row.granted_at).toLocaleDateString('ru-RU')},listViewers));
 }else E('p',{class:'v5-note',text:'Список пока недоступен'},listViewers);
});

const importArea=section('08 · Массовый импорт Excel по шести группам');
line(importArea.body,'Листы называй KRD1…KRD4, OTZI1, OTZI2. Колонки для расписания: День / Время / Предмет. Для оценок: ФИО / Балл. Импорт не удаляет остальные данные.');
const xlsxInput=input(importArea.body,'v5Excel','Файл XLSX / XLS','input');
xlsxInput.type='file';xlsxInput.accept='.xlsx,.xls,.csv';
const xlsxButtons=E('div',{class:'btnrow'},importArea.body);
const xlsxStatus=E('p',{class:'v5-note',id:'v5XlsxStatus'},importArea.body);
const xlsxPreview=E('pre',{class:'v5-preview',id:'v5XlsxPreview',text:'Сначала выбери файл.'},importArea.body);
let pendingXlsx=null;
function aliasOfSheet(name){const compact=String(name).toUpperCase().replace(/[\s_-]/g,'').replace(/КРД/g,'KRD').replace(/ОТЗИ/g,'OTZI');return allowedGroups.has(compact)?compact:null}
function headerIndex(headers,names){return headers.findIndex(h=>names.some(n=>String(h||'').trim().toLocaleLowerCase('ru-RU').includes(n)))}
function dayFrom(value){const s=String(value||'').trim().toLocaleLowerCase('ru-RU');let i=days.findIndex(d=>d.toLocaleLowerCase('ru-RU').startsWith(s)||s.startsWith(d.slice(0,2).toLocaleLowerCase('ru-RU')));if(i>=0)return i+1;const n=Number(s);return Number.isInteger(n)&&n>=1&&n<=7?n:null}
click(xlsxButtons,'Проверить Excel',async()=>{
 pendingXlsx=null;
 const f=xlsxInput.files?.[0];if(!f){xlsxStatus.textContent='Выбери XLSX, XLS или CSV';return}
 if(f.size>6*1024*1024){xlsxStatus.textContent='Максимальный размер 6 МБ';return}
 try{
  if(typeof lib!=='function')throw Error('Модуль импорта не загружен');
  await lib('xlsx','XLSX');
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:false});
  const result={weekSchedules:{},groupGrades:{},summary:[]};
  for(const name of wb.SheetNames.slice(0,18)){
   const key=aliasOfSheet(name);if(!key)continue;
   const matrix=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false});
   if(matrix.length<2)continue;
   const header=matrix[0].map(x=>String(x).trim());
   const dayColumn=headerIndex(header,['день','day']);
   const timeColumn=headerIndex(header,['время','time']);
   const subjectColumn=headerIndex(header,['предмет','дисциплина','урок','subject']);
   const nameColumn=headerIndex(header,['фио','имя','name']);
   const gradeColumn=headerIndex(header,['балл','оценка','grade','score']);
   if(timeColumn>=0&&subjectColumn>=0){
    const byDay={};let total=0;
    for(const row of matrix.slice(1,501)){
     const d=dayColumn>=0?dayFrom(row[dayColumn]):dayToday();
     const time=cap(row[timeColumn],8),subject=cap(row[subjectColumn],130);
     if(!d||!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)||!subject)continue;
     (byDay[d]??=[]).push(time.padStart(5,'0')+' | '+subject);total++;
    }
    if(total){result.weekSchedules[key]=byDay;result.summary.push(groupName(key)+': '+total+' пар')}
   }
   if(nameColumn>=0&&gradeColumn>=0){
    const pairs=[];
    for(const row of matrix.slice(1,501)){
     const nm=cap(row[nameColumn],120),v=Number(String(row[gradeColumn]).replace(',','.'));
     if(nm&&Number.isFinite(v)&&v>=0&&v<=100)pairs.push([nm,v]);
    }
    if(pairs.length){result.groupGrades[key]=pairs;result.summary.push(groupName(key)+': '+pairs.length+' оценок')}
   }
  }
  if(!result.summary.length)throw Error('Не найдены корректные листы KRD1–OTZI2 или нужные заголовки колонок');
  pendingXlsx=result;
  xlsxPreview.textContent=result.summary.join('\n');
  xlsxStatus.textContent='Проверь данные и нажми «Сохранить Excel на табло». Остальные группы останутся без изменений.';
 }catch(e){xlsxStatus.textContent='Ошибка: '+(e.message||e);xlsxPreview.textContent=''}
});
click(xlsxButtons,'Проверено — сохранить Excel на табло',async()=>{
 if(!pendingXlsx){xlsxStatus.textContent='Сначала проверь Excel';return}
 if(!window.academySession?.canEdit()){xlsxStatus.textContent='Нужны права администратора';return}
 if(!confirm('Сохранить '+pendingXlsx.summary.length+' наборов из Excel? Текущая версия попадёт в историю.'))return;
 try{
  const next=normalizeState(current);
  next.weekSchedules={...(next.weekSchedules||{})};
  next.groupGrades={...(next.groupGrades||{})};
  for(const [k,dayMap] of Object.entries(pendingXlsx.weekSchedules)){
   next.weekSchedules[k]={...(next.weekSchedules[k]||{}),...dayMap};
  }
  for(const [k,pairs] of Object.entries(pendingXlsx.groupGrades))next.groupGrades[k]=pairs;
  next.lastContentUpdate=new Date().toISOString();
  await saveState(next);
  current=normalizeState(next);
  pendingXlsx=null;render();fillAdmin();
  xlsxStatus.textContent='Excel сохранён. Табло обновится автоматически.';
 }catch(e){xlsxStatus.textContent='Ошибка: '+(e.message||e)}
},'btn primary');

const drawAnalytics=()=>{
 analytics.replaceChildren();
 const snapshots=safeArray(current.gradeSnapshots).slice(-8);
 const last=Object.fromEntries(GROUPS.map(g=>[g.key,average(current.groupGrades?.[g.key])]));
 const table=E('table',{class:'v5-analytics-table'},analytics);
 const head=E('tr',{},table);
 ['Группа','Средний балл','Изменение','Записей'].forEach(v=>E('th',{text:v},head));
 for(const g of GROUPS){
  const tr=E('tr',{},table),avg=last[g.key],prev=snapshots.length?snapshots[snapshots.length-1].averages?.[g.key]:null;
  const delta=avg!==null&&prev!=null?avg-Number(prev):null;
  E('td',{text:g.label},tr);
  E('td',{text:avg===null?'—':avg.toFixed(1)},tr);
  E('td',{text:delta===null?'—':(delta>0?'+':'')+delta.toFixed(1)},tr);
  E('td',{text:String(safeArray(current.groupGrades?.[g.key]).length)},tr);
 }
 E('p',{class:'v5-note',text:snapshots.length?'Сравнение с предыдущим сохранённым результатом. История: '+snapshots.length+' сохранений.':'Тенденция появится после двух сохранений оценок.'},analytics);
 const dataPoints=snapshots.slice(-7).map(item=>item.averages||{});
 dataPoints.push(last);
 if(dataPoints.length>1){
  const w=540,h=156,left=34,top=12,plotH=112;
  const svg=E('svg',{viewBox:'0 0 '+w+' '+h,width:'100%',height:'156',role:'img','aria-label':'Изменение средних баллов шести групп'},analytics);
  const ns='http://www.w3.org/2000/svg';
  const line=(tag,attributes)=>{
   const e=document.createElementNS(ns,tag);
   Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,String(v)));
   svg.appendChild(e);return e;
  };
  const palette=['#e2c58b','#8fbea5','#caa4a1','#95b9d7','#d3be8a','#b9abc9'];
  [50,75,100].forEach(v=>{
    const y=top+(100-v)/50*plotH;
    line('line',{x1:left,x2:w-12,y1:y,y2:y,stroke:'#47595a','stroke-width':'1'});
    const t=line('text',{x:0,y:y+4,fill:'#c6d2cc','font-size':11});t.textContent=String(v);
  });
  GROUPS.forEach((g,i)=>{
    const positions=dataPoints.map((p,j)=>{
      const v=p[g.key];if(v===null||v===undefined||!Number.isFinite(Number(v)))return null;
      return [left+j*(w-left-18)/(dataPoints.length-1),top+(100-Number(v))/50*plotH];
    }).filter(Boolean);
    if(positions.length>1)line('polyline',{points:positions.map(p=>p.join(',')).join(' '),fill:'none',stroke:palette[i],'stroke-width':2.4,'stroke-linecap':'round','stroke-linejoin':'round'});
  });
  const label=line('text',{x:left,y:h-6,fill:'#c6d2cc','font-size':11});label.textContent='Изменение среднего балла по сохранениям';
  const legend=E('div',{class:'v5-chart-legend'},analytics);
  GROUPS.forEach((g,i)=>{const el=E('span',{text:'● '+g.label},legend);el.style.color=palette[i]});
 }

};
function draftReadSafe(){
 try{
  const st=typeof readAdminState==='function'?readAdminState():normalizeState(current);
  return st;
 }catch{return normalizeState(current)}
}
function render5Fields(){
 weekDraft=cloneValue(current.weekSchedules||{});
 loadWeekDraft();
 sportText.value=safeArray(current.matches).join('\n');
 eventsText.value=safeArray(current.events).join('\n');
 achievementsText.value=safeArray(current.achievements).join('\n');
 drawStandings();drawAnalytics();showAudit(current);
}
const originalFillAdmin=fillAdmin;
fillAdmin=function(){originalFillAdmin();render5Fields()};
const originalReadAdmin=readAdminState;
readAdminState=function(){
 saveWeekDraft();
 const next=originalReadAdmin();
 next.weekSchedules=cloneValue(weekDraft);
 next.matches=parseLines5(sportText.value,300);
 next.events=parseLines5(eventsText.value,300);
 next.achievements=parseLines5(achievementsText.value,200);
 const before=JSON.stringify(current.groupGrades||{}),after=JSON.stringify(next.groupGrades||{});
 next.gradeSnapshots=safeArray(current.gradeSnapshots).slice(-39);
 if(before!==after){
  const averages=Object.fromEntries(GROUPS.map(g=>[g.key,average(current.groupGrades?.[g.key])]));
  next.gradeSnapshots.push({at:new Date().toISOString(),averages});
 }
 next.lastContentUpdate=new Date().toISOString();
 const critical=[];
 for(const g of GROUPS){
  const daysMap=next.weekSchedules?.[g.key]||{};
  for(const [dow,rows] of Object.entries(daysMap)){
   const seen=new Set();
   for(const row of safeArray(rows)){
    const match=String(row).match(/^(\d{1,2}):(\d{2})/);if(!match)continue;
    const hh=Number(match[1]),mm=Number(match[2]);
    if(hh>23||mm>59)critical.push(g.label+' неверное время');
    const start=hh*60+mm;
    if(seen.has(start))critical.push(g.label+', '+(days[Number(dow)-1]||dow)+': повторяется начало пары');
    seen.add(start);
   }
  }
 }
 if(critical.length)throw Error('Проверь недельное расписание: '+critical.slice(0,3).join('; '));
 return next;
};

let sportsSlide=0,sportsSignature='';
const priorRenderSports=renderSports;
function upcomingEvents(){
 const now=tvDate(),e=parseEvents(current.events).filter(ev=>ev.date>=now).slice(0,3);
 if(!e.length)return '<p class="v5-empty">Предстоящих мероприятий нет</p>';
 return e.map(event=>{
  const daysAway=Math.round((event.date-now)/86400000);
  return '<div class="v5-tv-entry"><strong>'+escapeHtml(event.title)+'</strong><small>'+dateLabel(event.date)+(event.where?' · '+escapeHtml(event.where):'')+' · '+(daysAway===0?'Сегодня':daysAway+' дн.')+'</small></div>';
 }).join('');
}
function achievementEntries(){
 const items=safeArray(current.achievements).slice(-3).reverse();
 const date=new Date(),yy=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Almaty',year:'numeric'}).format(date));
 const mm=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Almaty',month:'numeric'}).format(date));
 const matches=parseWins(current.matches).filter(match=>{const d=new Date(match.date);return d.getUTCFullYear()===yy&&d.getUTCMonth()+1===mm});
 const top=standings(matches);
 const leader=matches.length&&top[0]?.[1]>0?groupName(top[0][0])+' · '+top[0][1]+' очков':'';
 let html=leader?'<div class="v5-tv-entry"><strong>Спортивный лидер месяца: '+escapeHtml(leader)+'</strong></div>':'';
 html+=items.map(i=>{const p=String(i).split('|').map(t=>cap(t,100));return '<div class="v5-tv-entry"><strong>'+escapeHtml(p[0]||'Достижение')+'</strong><small>'+escapeHtml(p.slice(1).join(' · '))+'</small></div>'}).join('');
 return html||'<p class="v5-empty">Подтверждённые достижения пока не добавлены</p>';
}
// Stable five-discipline layout; announcements/events rotate in the bottom ticker instead.
function renderSpotlight(){
 const target=$5('sportSections');if(!target)return;
 target.dataset.view='disciplines';
 priorRenderSports();
}
renderSports=function(){renderSpotlight()};

let lastDow=dayToday();
const priorRotators=renderRotators;
renderRotators=function(animate){
 const g=GROUPS[scheduleIndex];
 if(!g)return priorRotators(animate);
 const d=dayToday(),weekly=current.weekSchedules?.[g.key]?.[String(d)];
 const hasValidDay=Array.isArray(weekly)&&weekly.length>0;
 const previous=current;
 const clonedGroup={...previous.groups[g.key],schedule:hasValidDay?weekly:[]};
 current={...previous,groups:{...previous.groups,[g.key]:clonedGroup}};
 try{
  const result=priorRotators(animate);
  const badge=document.querySelector('#groupGrid .group-top .badge');
  if(badge)badge.textContent=hasValidDay?'ПРОВЕРЕНО НА СЕГОДНЯ':'НЕ ЗАПОЛНЕНО';
  if(!hasValidDay){
   const list=document.querySelector('#groupGrid ul.schedule');
   if(list){list.replaceChildren();const li=document.createElement('li');li.className='academy-no-schedule';li.textContent='Расписание на сегодня ещё не опубликовано';list.appendChild(li)}
  }
  return result;
 }finally{current=previous}
};
setInterval(()=>{const dow=dayToday();if(dow!==lastDow){lastDow=dow;lastScheduleSignature='';renderRotators(false);renderBirthdays();sportsSignature='';renderSpotlight()}},15000);
// Kiosk stability: microscopic shift every 5 minutes, and network revalidation.
let burnShift=0;
setInterval(()=>{
 if(!document.body.classList.contains('wallboard-mode'))return;
 burnShift=(burnShift+1)%4;
 document.documentElement.style.setProperty('--v5-burn-x',[0,1,0,-1][burnShift]+'px');
 document.documentElement.style.setProperty('--v5-burn-y',[0,0,1,0][burnShift]+'px');
},300000);
window.addEventListener('online',()=>{if(window.academySession?.isAuthorized()){load();loadBirthdays()}});
// The Screen Wake Lock API is optional; Samsung browser compatibility varies.
let wakeLock=null;
async function requestWakeLock(){
 if(!document.body.classList.contains('wallboard-mode')||document.hidden||!navigator.wakeLock?.request)return;
 try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}
 catch(e){console.info('Screen wake lock is unavailable on this device')}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestWakeLock()});
setTimeout(requestWakeLock,1600);
render5Fields();renderSpotlight();
})();
