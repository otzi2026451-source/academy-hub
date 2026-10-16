/* Academy Hub 7.0 — restricted operations, quality review and diagnostics */
(function(){
'use strict';
const $7=id=>document.getElementById(id);
const panels={security:$7('v6-security7'),diagnostics:$7('v6-diagnostics7'),calendar:$7('v6-calendar7'),review:$7('v6-review7'),search:$7('v6-search7'),backup:$7('v6-backups7')};
if(Object.values(panels).some(v=>!v))return;
const elem=(tag,cls,text,parent)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined&&text!==null)e.textContent=String(text);
 if(parent)parent.appendChild(e);
 return e;
};
const button=(parent,label,cb,primary=false)=>{
 const b=elem('button',primary?'btn primary':'btn secondary',label,parent);
 b.type='button';b.addEventListener('click',cb);return b;
};
const note=(parent,text)=>elem('p','a7-note',text,parent);
const resultBox=(parent)=>elem('div','a7-status',null,parent);
const canAdmin=()=>!!window.academySession?.canEdit?.();
const safeList=value=>Array.isArray(value)?value:[];
const safeText=(v,n=200)=>String(v??'').trim().slice(0,n);
const toDate=iso=>new Date(iso).toLocaleString('ru-RU',{timeZone:'Asia/Almaty',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const rootUrl=()=>base+'/rest/v1/';
async function jwt(){const t=await window.academySession?.getToken?.();if(!t)throw Error('Нужно войти как администратор');return t}
async function rest(path,opts={}){
 const t=await jwt();
 const r=await fetch(rootUrl()+path,{...opts,cache:'no-store',headers:{apikey:pub,Authorization:'Bearer '+t,'Content-Type':'application/json',...(opts.headers||{})}});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Error(data?.message||data?.hint||('Supabase HTTP '+r.status));
 return data;
}
async function rpc(name,values){return rest('rpc/'+name,{method:'POST',body:JSON.stringify(values||{})})}
const makeHead=(screen,title,description)=>{
 const h=elem('div','a7-head',null,screen);
 elem('h4','a7-title',title,h);note(h,description);
 return h;
};
const cleanName=s=>safeText(s,120).toLocaleLowerCase('ru-RU').replace(/\s+/g,' ');
const currentYear=new Date().getFullYear();
const eventPattern=/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/;
function parseEvents7(raw){
 const list=[];
 for(const [index,entry] of safeList(raw).entries()){
  const pieces=String(entry).split('|').map(x=>x.trim());
  const m=pieces[0]?.match(eventPattern);
  if(!m||!pieces[1])continue;
  const day=+m[1],month=+m[2],year=+m[3];
  const value=Date.UTC(year,month-1,day);
  if(new Date(value).getUTCDate()!==day||new Date(value).getUTCMonth()+1!==month)continue;
  const hour=pieces[3]&&/^\d\d:\d\d$/.test(pieces[3])?pieces[3]:null;
  let stamp=value;if(hour){const [hh,mm]=hour.split(':').map(Number);if(hh>23||mm>59)continue;stamp+=((hh-5)*60+mm)*60000;}
  const title=pieces[1].slice(0,160);
  const lower=title.toLowerCase();
  const category=/экзамен|зачет|зачёт|контрольн|рубежн/i.test(lower)?'Экзамены и зачёты':/турнир|футбол|волейбол|спорт|соревнован/i.test(lower)?'Спорт':'Мероприятия';
  list.push({id:index,stamp:hour?stamp:value,title,place:safeText(pieces[2],120),hour,category});
 }
 return list.sort((a,b)=>a.stamp-b.stamp);
}
// 1. Security: observed Academy Hub client activity, not fabricated global Auth sessions.
makeHead(panels.security,'Устройства и роли','Это журнал подключений именно к Academy Hub. Он не показывает все сессии Supabase или IP-адреса.');
const securityBtns=elem('div','a7-actions',null,panels.security);
const securityCount=elem('div','a7-stats',null,panels.security);
const securityState=resultBox(panels.security);
const deviceList=elem('div','a7-table-wrap',null,panels.security);
const securityDetail=note(panels.security,'Отзыв доступа отключает выбранную учётную запись на всех устройствах. Отзыв одного отдельного токена не поддерживается.');
function deviceClientId(){
 const key='academy-hub-client-id-v7';
 try{
  let value=localStorage.getItem(key);
  if(value&&/^[0-9a-f-]{36}$/i.test(value))return value;
  value=makeId();localStorage.setItem(key,value);return value;
 }catch{return makeId()}
}
function makeId(){
 if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
 const arr=new Uint8Array(16);
 if(typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function')crypto.getRandomValues(arr);
 else for(let i=0;i<16;i++)arr[i]=Math.floor(Math.random()*256);
 arr[6]=(arr[6]&15)|64;arr[8]=(arr[8]&63)|128;
 const h=Array.from(arr,b=>b.toString(16).padStart(2,'0')).join('');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);

}
const clientId=deviceClientId();
const deviceLabel=()=>{
 const ua=navigator.userAgent.toLowerCase();
 const type=/tizen|smart-tv|smarttv|hbbtv|samsung/.test(ua)?'Samsung TV':/android|iphone|mobile/.test(ua)?'Телефон':'Компьютер';
 return type+' · Academy Hub';
};
let lastHeartbeat=0;
async function reportDevice(){
 if(!window.academySession?.isAuthorized?.()||Date.now()-lastHeartbeat<30000)return;
 lastHeartbeat=Date.now();
 try{await rpc('academy_record_device',{p_device_id:clientId,p_device_label:deviceLabel()})}
 catch(e){console.info('Device presence unavailable',String(e))}
}
window.academy7OnAuthorized=()=>{reportDevice();refreshTvHealth()};
setInterval(reportDevice,120000);
async function refreshSecurity(){
 if(!canAdmin())return;
 securityState.textContent='Загрузка сведений об устройствах…';
 try{
  const [devices,viewers,editors]=await Promise.all([
   rpc('academy_admin_device_report',{}),
   rest('academy_viewers?select=user_id,granted_at&limit=200'),
   rest('academy_editors?select=user_id,granted_at&limit=200')
  ]);
  securityCount.replaceChildren();
  for(const [name,value]of [['Подключений',devices.length],['TV-аккаунтов',viewers.length],['Редакторов',editors.length]]){
   const p=elem('div','a7-stat',null,securityCount);elem('strong','',value,p);elem('small','',name,p);
  }
  deviceList.replaceChildren();
  const table=elem('table','a7-table',null,deviceList);
  const hd=elem('thead','',null,table),tr=elem('tr','',null,hd);
  ['Учётная запись','Роль','Устройство','Первый вход','Последняя активность','Действие'].forEach(x=>elem('th','',x,tr));
  const tbody=elem('tbody','',null,table);
  for(const d of devices){
   const row=elem('tr','',null,tbody);
   elem('td','',d.email||String(d.user_id).slice(0,8),row);
   elem('td','',d.role,row);elem('td','',d.device_label,row);
   elem('td','',toDate(d.first_seen),row);
   elem('td','',toDate(d.last_seen),row);
   const action=elem('td','',null,row);
   if(d.role==='admin')elem('span','a7-muted','Владелец',action);
   else if(d.role==='revoked')elem('span','a7-muted','Отозван',action);
   else button(action,'Отозвать аккаунт',async()=>{
    if(!confirm('Отозвать ВСЕ права учётной записи '+d.email+'? Доступ со всех устройств прекратится после следующей проверки.'))return;
    try{await rpc('academy_revoke_member',{p_user_id:d.user_id});await refreshSecurity()}
    catch(e){securityState.textContent=e.message}
   });
  }
  if(!devices.length)note(deviceList,'Подключения пока не зарегистрированы. Они появятся после входа устройств.');
  securityState.textContent='Проверено · '+new Date().toLocaleTimeString('ru-RU');
 }catch(e){securityState.textContent='Ошибка: '+e.message}
}
button(securityBtns,'Обновить устройства и роли',refreshSecurity,true);

// 2. Diagnostics: true API checks, opt-in Gemini test, local error capture.
makeHead(panels.diagnostics,'Состояние сервисов','Здесь проверяется доступность базы, авторизация, свежесть табло и ответ модели Gemini. Проверка Gemini выполняется только по нажатию.');
const diagBtns=elem('div','a7-actions',null,panels.diagnostics);
const diagTable=elem('div','a7-diagnostics',null,panels.diagnostics);
const diagStatus=resultBox(panels.diagnostics);
const diagErrors=elem('div','a7-log',null,panels.diagnostics);
const errors=[];
function addError(context,error){
 if(!canAdmin())return;
 const text=context+': '+safeText(error?.message||error,180);
 errors.unshift({at:new Date().toLocaleTimeString('ru-RU'),text});
 if(errors.length>12)errors.pop();
 drawErrorLog();
}
function drawErrorLog(){
 diagErrors.replaceChildren();elem('h4','a7-subtitle','Последние ошибки этого браузера',diagErrors);
 if(!errors.length){note(diagErrors,'За текущий сеанс ошибок не зарегистрировано. Серверные журналы Supabase здесь не копируются.');return}
 for(const e of errors)note(diagErrors,e.at+' · '+e.text);
}
window.addEventListener('error',e=>addError('JavaScript',e.message));
window.addEventListener('unhandledrejection',e=>addError('Асинхронная ошибка',e.reason));
for(const id of ['notesBox','chatInfo','v5XlsxStatus']){
 const target=$7(id);if(!target)continue;
 new MutationObserver(()=>{
  const msg=target.textContent||'';
  if(/ошибка|error|не удалось/i.test(msg))addError(id,msg);
 }).observe(target,{subtree:true,childList:true,characterData:true});
}
function statusRow(name,text,good){
 const row=elem('div','a7-diagnostic',null,diagTable);
 elem('strong','',name,row);elem('span',good===true?'a7-pass':good===false?'a7-fail':'a7-muted',text,row);
}
async function checkServices(){
 if(!canAdmin())return;
 diagTable.replaceChildren();diagStatus.textContent='Проверка Supabase…';
 statusRow('Интернет',navigator.onLine?'Подключён':'Офлайн',navigator.onLine);
 const start=performance.now();
 try{
  const data=await rest('app_state?select=id&id=eq.1');
  statusRow('Supabase','Доступно · '+Math.round(performance.now()-start)+' мс',true);
  statusRow('Авторизация','Администратор; база разрешила чтение',true);
  if(!data.length)statusRow('Данные табло','Основная запись не найдена',false);
 }catch(e){statusRow('Supabase',e.message,false)}
 const date=current?.lastContentUpdate?Date.parse(current.lastContentUpdate):NaN;
 const fresh=Number.isFinite(date)?Math.round((Date.now()-date)/86400000):null;
 statusRow('Содержимое табло',fresh===null?'Дата изменения не указана':'Изменено '+fresh+' дн. назад',fresh===null?null:fresh<=14);
 const sync=$7('status')?.textContent||'Нет сведений';
 statusRow('Синхронизация TV',safeText(sync,100),/обновлено|синхронизировано/i.test(sync));
 statusRow('Gemini','Не проверен: нажми «Проверить Gemini»',null);
 diagStatus.textContent='Диагностика выполнена в '+new Date().toLocaleTimeString('ru-RU');
 drawErrorLog();
}
button(diagBtns,'Проверить все соединения',checkServices,true);
button(diagBtns,'Проверить Gemini',async()=>{
 if(!canAdmin())return;
 diagStatus.textContent='Проверяю ответ Gemini (не передаю данные курсантов)…';
 try{
  const response=await callAI({mode:'chat',question:'Проверка соединения. Ответь коротко: OK',text:'',images:[],history:[]});
  if(!response?.answer)throw Error('Ответ пустой');
  diagStatus.textContent='Gemini отвечает · '+new Date().toLocaleTimeString('ru-RU');
 }catch(e){addError('Gemini',e);diagStatus.textContent='Gemini недоступен: '+e.message}
});
drawErrorLog();

// 3. Calendar: real dates only, countdown and categorized list.
makeHead(panels.calendar,'Ближайшие экзамены и события','Используются уже внесённые мероприятия. Для времени укажи четвёртую часть строки: ДД.ММ.ГГГГ | Название | Место | ЧЧ:ММ (Алматы).');
const eventFilter=elem('select','input a7-filter',null,panels.calendar);
['Все','Экзамены и зачёты','Спорт','Мероприятия'].forEach(x=>{const o=elem('option','',x,eventFilter);o.value=x});
const eventList=elem('div','a7-calendar',null,panels.calendar);
const eventBtns=elem('div','a7-actions',null,panels.calendar);
button(eventBtns,'Открыть редактор мероприятий',()=>window.academy6ShowTab?.('events'));
const nowLocal=()=>Date.now();
function renderCalendar(){
 eventList.replaceChildren();
 const rows=parseEvents7(current.events).filter(v=>eventFilter.value==='Все'||v.category===eventFilter.value).filter(v=>v.stamp>nowLocal()-86400000);
 if(!rows.length){note(eventList,'Нет ближайших событий в этом разделе. Добавь дату в редакторе мероприятий.');return}
 for(const e of rows.slice(0,35)){
  const row=elem('div','a7-event',null,eventList);
  const when=elem('div','a7-date',null,row);
  const date=new Date(e.stamp);
  elem('strong','',new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Almaty',day:'2-digit',month:'short'}).format(date),when);
  elem('small','',e.hour||'Время не указано',when);
  const name=elem('div','a7-event-label',null,row);
  elem('strong','',e.title,name);
  elem('small','',e.category+(e.place?' · '+e.place:''),name);
  const days=Math.max(0,Math.ceil((e.stamp-Date.now())/86400000));
  elem('span','a7-pill',days===0?'Сегодня':'Через '+days+' дн.',row);
 }
}
eventFilter.addEventListener('change',renderCalendar);

// 4. Review: intercept original save before it publishes; offer per-section changes.
makeHead(panels.review,'Предварительная проверка изменений','Сравни изменения с опубликованной версией, проверь дубликаты и выбери разделы для сохранения.');
const reviewInfo=resultBox(panels.review);
const reviewAlerts=elem('div','a7-warnings',null,panels.review);
const reviewDiff=elem('div','a7-changes',null,panels.review);
const reviewBtns=elem('div','a7-actions',null,panels.review);
const publishedKeys=['studyTop','sportTopOverall','groupGrades','groups','weekSchedules','sportCategories','birthdays','notice','noticePriority','noticeExpires','events','matches','achievements','lessonMinutes','awardsWeekly','awardsMonthly','awardsGroup'];
const keyTitles={studyTop:'Общий учебный рейтинг',sportTopOverall:'Общий спорт',groupGrades:'Оценки групп',groups:'Расписания и группы',weekSchedules:'Недельное расписание',sportCategories:'Спортивные секции',birthdays:'Дни рождения',notice:'Объявление',noticePriority:'Приоритет',noticeExpires:'Срок объявления',events:'Мероприятия',matches:'Матчи',achievements:'Достижения',lessonMinutes:'Длительность пары',awardsWeekly:'Курсант недели',awardsMonthly:'Курсант месяца',awardsGroup:'Лучшая группа'};
let pending=null;
const normalize=v=>JSON.stringify(v??null);
function audit(next){
 const warnings=[],fatals=[];
 for(const [key,rows] of Object.entries(next.groupGrades||{})){
  const seen=new Set();
  for(const value of safeList(rows)){
   const name=cleanName(value?.[0]);
   if(!name)continue;
   if(seen.has(name))warnings.push('Оценки '+key+': повторяется '+safeText(value[0],45));
   seen.add(name);
  }
 }
 for(const [key,days] of Object.entries(next.weekSchedules||{})){
  for(const [day,rows] of Object.entries(days||{})){
   const seen=new Set();
   for(const line of safeList(rows)){
    const m=String(line).match(/^\s*(\d{1,2}):(\d{2})/);
    if(!m){warnings.push('Расписание '+key+' ('+day+'): отсутствует время');continue}
    const hh=+m[1],mm=+m[2],time=hh*60+mm;
    if(hh>23||mm>59)fatals.push('Неверное время: '+key+' '+String(line).slice(0,40));
    if(seen.has(time))fatals.push('Конфликт пар: '+key+' · день '+day+' · '+m[0]);
    seen.add(time);
   }
  }
 }
 for(const e of safeList(next.events)){
  if(!parseEvents7([e]).length)warnings.push('Неверная строка календаря: '+safeText(e,75));
 }
 const birthdays=new Set();
 for(const b of safeList(next.birthdays)){
  const k=cleanName(b);
  if(birthdays.has(k))warnings.push('Повтор дня рождения: '+safeText(b,65));
  birthdays.add(k);
 }
 return {warnings:[...new Set(warnings)].slice(0,24),fatals:[...new Set(fatals)].slice(0,12)};
}
function showReview(){
 reviewDiff.replaceChildren();reviewAlerts.replaceChildren();
 let next;
 try{next=readAdminState()}catch(e){reviewInfo.textContent='Ошибка чтения формы: '+e.message;return false}
 const changes=publishedKeys.filter(key=>normalize(current[key])!==normalize(next[key]));
 const findings=audit(next);
 pending={next,changes,findings};
 if(!changes.length){reviewInfo.textContent='Нет изменений для публикации';return false}
 reviewInfo.textContent='Изменено разделов: '+changes.length+'. Выбери, что сохранить.';
 for(const warning of findings.fatals)elem('p','a7-error','Критично: '+warning,reviewAlerts);
 for(const warning of findings.warnings)elem('p','a7-warning','Проверь: '+warning,reviewAlerts);
 for(const key of changes){
  const label=elem('label','a7-change',null,reviewDiff);
  const box=elem('input','',null,label);box.type='checkbox';box.checked=true;box.value=key;
  const span=elem('span','',null,label);
  elem('strong','',keyTitles[key]||key,span);
  let detail='Значение изменено';
  if(key==='groupGrades'){
   detail=GROUPS.filter(g=>normalize(current.groupGrades?.[g.key])!==normalize(next.groupGrades?.[g.key])).map(g=>g.label).join(' · ');
  }else if(key==='groups'||key==='weekSchedules'){
   detail=GROUPS.filter(g=>normalize(current[key]?.[g.key])!==normalize(next[key]?.[g.key])).map(g=>g.label).join(' · ');
  }else if(Array.isArray(next[key])){
   detail='Записей: '+next[key].length+' · было: '+safeList(current[key]).length;
  }else if(typeof next[key]==='string'){
   detail='Было: '+safeText(current[key],70)+' → станет: '+safeText(next[key],70);
  }
  elem('small','',detail,span);
 }
 return true;
}
let saving=false;
async function saveReview(){
 if(!pending||saving)return;
 if(pending.findings.fatals.length){reviewInfo.textContent='Сначала исправь критические конфликты расписания.';return}
 const selected=[...reviewDiff.querySelectorAll('input:checked')].map(x=>x.value);
 if(!selected.length){reviewInfo.textContent='Выбери хотя бы один раздел';return}
 if(!confirm('Сохранить выбранные разделы ('+selected.length+') на все экраны?'))return;
 saving=true;
 try{
  const next=normalizeState(current);
  for(const key of selected)next[key]=structuredClone(pending.next[key]);
  // Preserve legacy mirror fields when common ranking or overview schedule changes.
  if(selected.includes('studyTop'))next.study=next.studyTop;
  if(selected.includes('sportTopOverall'))next.sport=next.sportTopOverall;
  if(selected.includes('groups')){next.overviewSchedule=next.groups[GROUPS[0].key].schedule;next.schedule=next.overviewSchedule}
  next.lastContentUpdate=new Date().toISOString();
  await saveState(next);
  current=normalizeState(next);
  render();fillAdmin();pending=null;
  reviewInfo.textContent='Сохранено. Предыдущая версия доступна в истории.';
  reviewDiff.replaceChildren();reviewAlerts.replaceChildren();
  if($7('saveInfo'))$7('saveInfo').textContent='✓ Сохранено после проверки';
 }catch(e){reviewInfo.textContent='Не удалось сохранить: '+e.message}
 finally{saving=false}
}
button(reviewBtns,'Проверить текущую форму',showReview);
button(reviewBtns,'Сохранить выбранные разделы',saveReview,true);
const saveButton=$7('saveBtn');
if(saveButton){
 saveButton.addEventListener('click',event=>{
  if(!canAdmin())return;
  event.preventDefault();event.stopImmediatePropagation();
  if(showReview())window.academy6ShowTab?.('review7');
 },true);
}
// Independent preview of XLSX duplicates without uploading private rows.
const importTab=$7('v6-import');
if(importTab){
 const duplicateHead=elem('div','a7-import-check',null,importTab);
 elem('h4','a7-subtitle','Проверка Excel на повторы',duplicateHead);
 note(duplicateHead,'Дополнительная локальная проверка: повторяющиеся ФИО в одном листе или одинаковые строки. Перед импортом используй «Проверить Excel».');
 const duplicateStatus=resultBox(duplicateHead);
 button(duplicateHead,'Найти дубликаты в выбранном Excel',async()=>{
  const f=$7('v5Excel')?.files?.[0];
  if(!f){duplicateStatus.textContent='Выбери Excel-файл';return}
  if(f.size>6*1024*1024){duplicateStatus.textContent='Максимум 6 МБ';return}
  try{
   if(typeof lib==='function')await lib('xlsx','XLSX');
   if(typeof XLSX==='undefined')throw Error('Библиотека Excel не загружена');
   const wb=XLSX.read(await f.arrayBuffer(),{type:'array',raw:false});
   const found=[];
   for(const sheet of wb.SheetNames.slice(0,12)){
    const matrix=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{header:1,raw:false,defval:''});
    if(matrix.length<2)continue;
    const names=matrix[0].map(v=>cleanName(v));
    const idx=names.findIndex(v=>/фио|имя|name/.test(v));
    const seen=new Set(),rowSeen=new Set();
    for(const [i,row] of matrix.slice(1,501).entries()){
     const value=idx>=0?cleanName(row[idx]):'';
     if(value&&seen.has(value))found.push(sheet+', строка '+(i+2)+': повтор ФИО');
     if(value)seen.add(value);
     const sig=JSON.stringify(row);
     if(rowSeen.has(sig))found.push(sheet+', строка '+(i+2)+': полностью совпадает');
     rowSeen.add(sig);
    }
   }
   duplicateStatus.textContent=found.length?'Найдено '+found.length+' совпадений:\n'+found.slice(0,20).join('\n'):'Повторы в проверенных листах не найдены.';
  }catch(e){duplicateStatus.textContent='Ошибка проверки: '+e.message}
 });
}
// 5. Cadet search: existing RLS-protected roster in admin memory, never in TV.
makeHead(panels.search,'Поиск курсантов','Поиск работает только после входа администратора. Здесь используются записи закрытого реестра и уже внесённые результаты.');
const searchTools=elem('div','a7-search-tools',null,panels.search);
const searchInput=elem('input','input',null,searchTools);searchInput.type='search';searchInput.placeholder='ФИО, группа или код курсанта';
const groupSelect=elem('select','input',null,searchTools);
elem('option','','Все группы',groupSelect).value='';
for(const g of GROUPS)elem('option','',g.label,groupSelect).value=g.label;
const searchStatus=resultBox(panels.search);
const searchRows=elem('div','a7-table-wrap',null,panels.search);
const lookupScore=(fullName)=>{
 const name=cleanName(fullName);
 const match=[];
 for(const [key,values] of Object.entries(current.groupGrades||{}))
  for(const pair of safeList(values))if(cleanName(pair?.[0])===name)match.push(GROUPS.find(x=>x.key===key)?.label+': '+pair[1]);
 return match.slice(0,2).join(', ');
};
const lookupSport=fullName=>{
 const name=cleanName(fullName),out=[];
 for(const sp of SPORTS)for(const pair of safeList(current.sportCategories?.[sp.key]))if(cleanName(pair?.[0])===name)out.push(sp.label+': '+pair[1]);
 return out.slice(0,2).join(', ');
};
function doSearch(){
 if(!canAdmin())return;
 searchRows.replaceChildren();
 const query=cleanName(searchInput.value);
 const group=groupSelect.value;
 const normalizeGroup=v=>safeText(v,30).toLocaleUpperCase('ru-RU').replace(/КРД/g,'KRD').replace(/ОТЗИ/g,'OTZI').replace(/[\s_\-]/g,'');
 const people=safeList(roster).filter(v=>{
  const g=v.group_name||'';
  if(group&&normalizeGroup(g)!==normalizeGroup(group))return false;
  return !query||cleanName([v.full_name,v.group_name,v.cadet_code].join(' ')).includes(query);
 });
 searchStatus.textContent='Найдено: '+people.length+' из '+safeList(roster).length;
 if(!people.length){note(searchRows,'Совпадений нет. Проверь заполнение реестра.');return}
 const table=elem('table','a7-table',null,searchRows),head=elem('tr','',null,elem('thead','',null,table));
 ['ФИО','Группа','Оценки','Спорт'].forEach(t=>elem('th','',t,head));
 const body=elem('tbody','',null,table);
 for(const person of people.slice(0,132)){
  const row=elem('tr','',null,body);
  elem('td','',person.full_name,row);elem('td','',person.group_name||'—',row);
  elem('td','',lookupScore(person.full_name)||'—',row);
  elem('td','',lookupSport(person.full_name)||'—',row);
 }
}
searchInput.addEventListener('input',doSearch);groupSelect.addEventListener('change',doSearch);
button(panels.search,'Обновить защищённый реестр',async()=>{await loadRoster();doSearch()});

// 6. TV: last successful sync shown WITHOUT persisting personal data locally.
let lastLive=null,lastSyncStatus='';
function refreshTvHealth(){
 if(!document.body.classList.contains('wallboard-mode'))return;
 let badge=$7('tvHealth7');
 if(!badge){
  const host=$7('dashboard')?.querySelector('.topbar .head-panel');
  if(!host)return;
  badge=elem('div','a7-tv-health',null,host);badge.id='tvHealth7';
 }
 const label=$7('status')?.textContent||'';
 const online=navigator.onLine&&!/нет связи|потеряна|нет сети/i.test(label);
 if(online&&/обновлено|синхронизировано/i.test(label)&&label!==lastSyncStatus){lastLive=Date.now();lastSyncStatus=label;}
 const age=lastLive?Math.floor((Date.now()-lastLive)/60000):null;
 badge.classList.toggle('a7-offline',!online);
 badge.textContent=online?(age===null?'Подключение к базе…':'Синхронизация '+(age===0?'сейчас':age+' мин. назад')):'Нет связи · данные на экране';
 if(age!==null&&age>5)badge.classList.add('a7-offline');
 else if(online)badge.classList.remove('a7-offline');
 let upcoming=$7('nextEvent7');
 const dates=parseEvents7(current.events);
 const soon=dates.find(e=>e.stamp>Date.now()-(e.hour?0:86400000));
 if(soon){
   if(!upcoming){upcoming=elem('div','a7-tv-upcoming',null,badge.parentElement);upcoming.id='nextEvent7'}
   const minutes=Math.max(0,Math.ceil((soon.stamp-Date.now())/60000));
   const days=Math.ceil(minutes/1440);
   const left=minutes<60?minutes+' мин':minutes<1440?Math.ceil(minutes/60)+' ч':days+' дн';
   upcoming.textContent='Ближайшее: '+safeText(soon.title,42)+' · '+(minutes===0?'сегодня':'через '+left);
 }else if(upcoming)upcoming.remove();
}
setInterval(refreshTvHealth,30000);
window.addEventListener('online',()=>{refreshTvHealth();if(window.academySession?.isAuthorized?.()){load();loadBirthdays()}});
window.addEventListener('offline',refreshTvHealth);
function checkClipping(){
 if(!document.body.classList.contains('wallboard-mode'))return;
 const containers=[...document.querySelectorAll('#dashboard .wallboard-grid>.panel')].filter(el=>!el.classList.contains('wb-notice'));
 const overflow=containers.some(el=>el.scrollHeight>el.clientHeight+22);
 document.body.classList.toggle('tv-tight',overflow);
}
window.addEventListener('resize',()=>{refreshTvHealth();checkClipping()},{passive:true});
setInterval(checkClipping,60000);

// 7. Backups: daily app_state snapshot; no additional cadet roster copy.
makeHead(panels.backup,'Автоматические резервные копии','Каждые сутки сервер создаёт защищённый снимок состояния табло. Последние 35 копий доступны только администратору. Закрытый реестр курсантов не дублируется.');
const backupTools=elem('div','a7-actions',null,panels.backup);
const backupStatus=resultBox(panels.backup),backupList=elem('div','a7-table-wrap',null,panels.backup);
async function listBackups(){
 if(!canAdmin())return;
 backupList.replaceChildren();backupStatus.textContent='Загрузка копий…';
 try{
  const copies=await rest('academy_state_backups?select=backup_id,created_at&order=created_at.desc&limit=35');
  const table=elem('table','a7-table',null,backupList);
  const head=elem('tr','',null,elem('thead','',null,table));
  ['Сохранено','Номер','Действия'].forEach(t=>elem('th','',t,head));
  const tbody=elem('tbody','',null,table);
  for(const item of copies){
   const row=elem('tr','',null,tbody);
   elem('td','',toDate(item.created_at),row);
   elem('td','',item.backup_id,row);
   const actions=elem('td','a7-actions',null,row);
   button(actions,'Скачать JSON',async()=>{
    if(!confirm('JSON-копия может содержать имена и оценки. Скачивать только на защищённый компьютер. Продолжить?'))return;
    try{
     const list=await rest('academy_state_backups?select=snapshot&backup_id=eq.'+encodeURIComponent(item.backup_id));
     if(!list[0]?.snapshot)throw Error('Копия не найдена');
     const file=new Blob([JSON.stringify(list[0].snapshot,null,2)],{type:'application/json'});
     const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='academy-state-'+item.backup_id+'.json';a.click();
     setTimeout(()=>URL.revokeObjectURL(url),800);
    }catch(e){backupStatus.textContent=e.message}
   });
   button(actions,'Восстановить',async()=>{
    if(!confirm('Восстановить копию №'+item.backup_id+'? Текущие данные сначала сохранятся в отдельную резервную копию.'))return;
    try{
     await rpc('academy_restore_state_backup',{p_backup_id:item.backup_id});
     await load();fillAdmin();backupStatus.textContent='Копия восстановлена. Данные табло обновлены.';await listBackups();
    }catch(e){backupStatus.textContent='Ошибка: '+e.message}
   },false);
  }
  if(!copies.length)note(backupList,'Резервных копий пока нет');
  backupStatus.textContent='Копий: '+copies.length+' · автоматическое сохранение ежедневно';
 }catch(e){backupStatus.textContent='Ошибка: '+e.message}
}
button(backupTools,'Показать сохранённые копии',listBackups,true);

// Tab visibility hooks: refresh only after explicit open.
document.querySelectorAll('.v6-nav-item').forEach(b=>b.addEventListener('click',()=>{
 const k=b.dataset.tab;
 if(k==='security7')refreshSecurity();
 if(k==='diagnostics7')checkServices();
 if(k==='calendar7')renderCalendar();
 if(k==='search7')doSearch();
 if(k==='backups7')listBackups();
}));
window.academy7CheckDraft=showReview;
refreshTvHealth();
})();
