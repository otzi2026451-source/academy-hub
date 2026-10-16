/* Academy Hub 8.0 — admin-only import wizard, synthetic QA, TV heartbeat, Gemini diagnostics. */
(function(){
'use strict';
const el=id=>document.getElementById(id),admin=()=>!!window.academySession?.canEdit?.();
const sections={import:el('v6-import8'),monitor:el('v6-monitor8'),test:el('v6-testing8'),ai:el('v6-ai8')};
if(Object.values(sections).some(x=>!x))return;
const element=(tag,parent,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;if(parent)parent.appendChild(e);return e};
const btn=(parent,caption,callback,primary=false)=>{const e=element('button',parent,caption,primary?'btn primary':'btn secondary');e.type='button';e.addEventListener('click',callback);return e};
const text=(parent,copy)=>element('p',parent,copy,'a8-hint');
function title(parent,t,detail){element('h4',parent,t,'a8-title');text(parent,detail)}
function result(parent){return element('pre',parent,'','a8-result')}
async function secure(path,body,method='POST'){
 const token=await window.academySession?.getToken?.();
 if(!token||!admin())throw Error('Нужен вход администратора');
 const response=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:pub,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const value=await response.json().catch(()=>null);
 if(!response.ok)throw Error(value?.message||value?.hint||'HTTP '+response.status);
 return value;
}
const rpc=(name,data)=>secure('rpc/'+name,data||{});
const groups={KRD1:25,KRD2:25,KRD3:25,KRD4:25,OTZI1:14,OTZI2:18};
const clean=s=>String(s??'').trim();
const trim=s=>clean(s).replace(/\s+/g,' ');
const normalGroup=s=>{
 const x=clean(s).toUpperCase().replace(/[\s_-]/g,'').replace(/КРД/g,'KRD').replace(/ОТЗИ/g,'OTZI');
 return Object.hasOwn(groups,x)?x:null;
};
const normalizeDate=value=>{
 const v=clean(value);if(!v)return null;
 if(/^\d{4}-\d\d-\d\d$/.test(v))return v;
 const m=v.match(/^(\d\d?)[.\/-](\d\d?)[.\/-](\d{4})$/);
 if(!m)return null;
 return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
};
const heading=(v,names)=>v.findIndex(cell=>names.some(x=>trim(cell).toLocaleLowerCase('ru-RU').includes(x)));
const safeCsv=rows=>rows.length&&rows.every(r=>Array.isArray(r));
let parsed=[],pendingBatch=null;

// Two-phase import: prepare in protected Supabase table, show server validation, commit only by explicit phrase.
title(sections.import,'Защищённая загрузка 132 курсантов','Один XLSX/CSV с листами KRD1–KRD4, OTZI1–OTZI2 либо колонкой «Группа». Режим не заменяет существующий реестр.');
const selection=element('input',sections.import,null,'input');selection.type='file';selection.accept='.xlsx,.xls,.csv';selection.id='academy8RosterFile';
const actions=element('div',sections.import,null,'a8-actions');
const importStatus=result(sections.import);importStatus.textContent='Данные пока не загружены.';
const preview=element('div',sections.import,null,'a8-preview');
let lastValid=false;
async function parseRoster(){
 pendingBatch=null;lastValid=false;parsed=[];preview.replaceChildren();
 const file=selection.files?.[0];if(!file)throw Error('Выбери файл');
 if(file.size>6*1024*1024)throw Error('Максимальный размер файла — 6 МБ');
 if(typeof lib!=='function')throw Error('Библиотека импорта ещё не загружена');
 await lib('xlsx','XLSX');
 if(typeof XLSX==='undefined')throw Error('Не удалось загрузить Excel-модуль');
 const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',raw:false});
 const problem=[],codes=new Set(),names=new Set(),count=Object.fromEntries(Object.keys(groups).map(k=>[k,0]));
 for(const sheet of workbook.SheetNames.slice(0,16)){
  const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[sheet],{header:1,raw:false,defval:''});
  if(matrix.length<2)continue;
  const hdr=matrix[0],codeIdx=heading(hdr,['код','code','id курсант']),nameIdx=heading(hdr,['фио','ф.и.о','full_name','полное имя']),
        groupIdx=heading(hdr,['группа','group']),birthIdx=heading(hdr,['рождение','birth_date','дата рождения']),
        displayIdx=heading(hdr,['отображаемое имя','display_name']);
  if(codeIdx<0||nameIdx<0){problem.push('Лист '+sheet+': обязательны колонки «Код» и «ФИО»');continue}
  const sheetGroup=normalGroup(sheet);
  for(const [idx,line] of matrix.slice(1,250).entries()){
   if(!line.some(x=>clean(x)))continue;
   const num=idx+2,code=trim(line[codeIdx]),name=trim(line[nameIdx]);
   const group=normalGroup(groupIdx>=0?line[groupIdx]:sheetGroup)||sheetGroup;
   const birth=birthIdx>=0?normalizeDate(line[birthIdx]):null;
   if(!/^[A-Za-z0-9_-]{3,32}$/.test(code))problem.push(sheet+' строка '+num+': некорректный код');
   if(name.length<3||name.length>120)problem.push(sheet+' строка '+num+': некорректное ФИО');
   if(!group)problem.push(sheet+' строка '+num+': неизвестная группа');
   if(birthIdx>=0&&clean(line[birthIdx])&&!birth)problem.push(sheet+' строка '+num+': дата ДР в формате ГГГГ-ММ-ДД');
   if(codes.has(code.toLowerCase()))problem.push(sheet+' строка '+num+': повтор кода');
   if(names.has(name.toLowerCase()))problem.push(sheet+' строка '+num+': повтор ФИО');
   codes.add(code.toLowerCase());names.add(name.toLowerCase());
   if(group){count[group]++;if(count[group]>groups[group])problem.push('Группа '+group+' превышает '+groups[group]+' человек')}
   parsed.push({cadet_code:code,full_name:name,group_key:group,birth_date:birth,display_name:displayIdx>=0?trim(line[displayIdx]):''});
  }
 }
 if(!parsed.length)throw Error(problem[0]||'Не найдены строки курсантов');
 if(parsed.length>132)problem.push('В файле больше 132 курсантов');
 const table=element('table',preview,null,'a8-table');
 const thead=element('thead',table),th=element('tr',thead);
 ['Группа','В файле','Лимит'].forEach(v=>element('th',th,v));
 const tbody=element('tbody',table);
 for(const [k,n]of Object.entries(count)){
  const row=element('tr',tbody);element('td',row,k);element('td',row,n);element('td',row,groups[k]);
 }
 const checks=element('p',preview,null,'a8-hint');
 checks.textContent=problem.length?'Найдены ошибки:\n'+problem.slice(0,30).join('\n'):'Локальные проверки пройдены. До импорта осталось два подтверждения.';
 lastValid=!problem.length;
 importStatus.textContent='Распознано '+parsed.length+' записей из '+workbook.SheetNames.length+' листов. '+(problem.length?'Ошибок: '+problem.length:'Ошибок не обнаружено.');
}
btn(actions,'1. Проверить файл',async()=>{try{await parseRoster()}catch(e){importStatus.textContent='Ошибка: '+e.message}});
btn(actions,'2. Подготовить защищённый импорт',async()=>{
 if(!lastValid||!parsed.length){importStatus.textContent='Сначала проверь файл без ошибок';return}
 if(!confirm('Передать '+parsed.length+' строк в защищённый черновик Supabase? Существующий реестр пока не изменится.'))return;
 try{
  const data=await rpc('academy_prepare_roster_import',{p_rows:parsed});
  pendingBatch=data.batch_id;
  importStatus.textContent='Сервер проверил '+data.rows+' записей. Черновик '+pendingBatch.slice(0,8)+' создан. Реестр НЕ изменён.';
 }catch(e){importStatus.textContent='Проверка Supabase: '+e.message}
});
btn(actions,'3. Подтвердить и импортировать',async()=>{
 if(!pendingBatch){importStatus.textContent='Нет подготовленного черновика';return}
 const typed=prompt('Это внесёт '+parsed.length+' курсантов в закрытую базу. Введи IMPORT_CONFIRMED:');
 if(typed!=='IMPORT_CONFIRMED')return;
 if(!confirm('Последнее подтверждение: импортировать новые записи? Импорт остановится, если реестр уже не пустой.'))return;
 try{
  const r=await rpc('academy_commit_roster_import',{p_batch_id:pendingBatch,p_confirmation:typed});
  importStatus.textContent='Добавлено записей: '+r.imported+'. Закрытый реестр обновлён.';
  pendingBatch=null;parsed=[];lastValid=false;selection.value='';
  if(typeof loadRoster==='function')await loadRoster();
 }catch(e){importStatus.textContent='Импорт отклонён: '+e.message}
},true);

// Structured grades — stored separately and only written by admin RPC.
const grades=element('div',sections.import,null,'a8-panel');
title(grades,'Результат по дисциплине','Оценка сохраняется в отдельной таблице и привязывается к существующему коду курсанта.');
const gradeGrid=element('div',grades,null,'a8-fields');
const inp=(placeholder,type='text')=>{const e=element('input',gradeGrid,null,'input');e.placeholder=placeholder;e.type=type;return e};
const gradeCode=inp('Код курсанта'),subject=inp('Дисциплина'),grade=inp('Баллы 0–100','number'),date=inp('Дата YYYY-MM-DD','date');
grade.min='0';grade.max='100';grade.step='0.01';
const gradeInfo=result(grades);
btn(grades,'Сохранить результат',async()=>{
 try{
  const value=Number(grade.value);
  if(!gradeCode.value||subject.value.length<2||!grade.value||!Number.isFinite(value)||value<0||value>100||!date.value)throw Error('Заполни код, дисциплину, балл и дату');
  const id=await rpc('academy_record_grade',{p_cadet_code:gradeCode.value.trim(),p_subject:subject.value.trim(),p_grade:value,p_date:date.value});
  gradeInfo.textContent='Оценка сохранена в защищённой таблице · запись '+id;
 }catch(e){gradeInfo.textContent='Ошибка: '+e.message}
});

// TV browser heartbeat, not dependent on administrator tab remaining open.
title(sections.monitor,'Мониторинг Samsung TV','Табло отправляет сердцебиение примерно раз в минуту. Если прошло больше пяти минут, устройство помечается как недоступное.');
const tvInfo=result(sections.monitor);
const tvList=element('div',sections.monitor,null,'a8-preview');
function deviceId(){
 const key='academy-hub-client-id-v7';
 try{return localStorage.getItem(key)||null}catch{return null}
}
let lastPing=0;
async function ping(){
 if(!new URLSearchParams(location.search).has('tv')||!window.academySession?.isAuthorized?.())return;
 if(Date.now()-lastPing<50000)return;lastPing=Date.now();
 const id=deviceId();if(!id)return;
 try{
  const tok=await window.academySession.getToken();
  const request=await fetch(base+'/rest/v1/rpc/academy_tv_ping',{method:'POST',headers:{apikey:pub,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({p_device_id:id,p_width:innerWidth,p_height:innerHeight,p_version:'8.0',p_visible:!document.hidden})});
  if(!request.ok)console.info('TV heartbeat: HTTP '+request.status);
 }catch{ /* Dashboard continues displaying last known information offline. */ }
}
setInterval(ping,60000);
window.addEventListener('online',()=>{lastPing=0;ping()});
async function refreshMonitor(){
 if(!admin())return;
 try{
  const rows=await rpc('academy_tv_health_report');
  tvInfo.textContent=rows.length?'Устройств: '+rows.length+' · обновлено '+new Date().toLocaleTimeString('ru-RU'):'ТВ-устройств ещё нет. После входа на Samsung TV они появятся здесь.';
  tvList.replaceChildren();
  if(!rows.length)return;
  const table=element('table',tvList,null,'a8-table'),head=element('tr',element('thead',table));
  ['Состояние','Экран','Версия','Последнее обращение'].forEach(v=>element('th',head,v));
  const body=element('tbody',table);
  rows.forEach(d=>{
   const row=element('tr',body);
   element('td',row,d.online?'На связи':'Нет сигнала >5 минут',d.online?'a8-ok':'a8-warning');
   element('td',row,d.screen_width+'×'+d.screen_height);
   element('td',row,d.app_version||'—');
   element('td',row,Math.max(0,Number(d.seconds_since_ping))+' сек. назад');
  });
 }catch(e){tvInfo.textContent='Мониторинг недоступен: '+e.message}
}
btn(sections.monitor,'Проверить состояние телевизора',refreshMonitor,true);

// Dedicated test fixture, read-only server-side; synthetic records stay in hidden schema.
title(sections.test,'Изолированный тестовый стенд','Вымышленные 132 курсанта находятся в недоступной извне схеме academy_sandbox. Рабочая база и рейтинги ими не заполняются.');
const testInfo=result(sections.test);
btn(sections.test,'Проверить тестовый набор',async()=>{
 try{
  const report=await rpc('academy_sandbox_report');
  testInfo.textContent='Тестовые записи: '+report.total+'\nГруппы: '+JSON.stringify(report.groups)+'\nПовторы: '+report.duplicates+'\nОтделено от рабочей базы: '+(report.isolated?'да':'нет');
 }catch(e){testInfo.textContent='Ошибка: '+e.message}
},true);
const link=element('a',sections.test,'Открыть автономный демонстрационный стенд ↗','a8-sandbox-link');
link.href='academy8-sandbox.html';link.target='_blank';link.rel='noopener noreferrer';
text(sections.test,'На демонстрационной странице нет запросов к Supabase и нет реальных имён.');

// Gemini availability check and safe import instructions
title(sections.ai,'Диагностика Gemini и документов','Проверка доступных моделей без передачи персональных данных и без генерации ответа. Импорт AI остаётся черновиком до одобрения администратора.');
const aiInfo=result(sections.ai);
btn(sections.ai,'Проверить ключ и доступные модели',async()=>{
 try{
  const token=await window.academySession?.getToken?.();
  if(!token||!admin())throw Error('Требуются права администратора');
  const r=await fetch(base+'/functions/v1/parse-document',{method:'POST',headers:{apikey:pub,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({mode:'probe'}),cache:'no-store'});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw Error(data?.error||'HTTP '+r.status);
  aiInfo.textContent=data.connected?'Gemini доступен.\nМодели: '+data.models.join(', '):'Gemini недоступен: '+(data.error||'не найдено подходящих моделей');
 }catch(e){aiInfo.textContent='Ошибка диагностики: '+e.message}
},true);
btn(sections.ai,'Открыть чат и загрузку документов',()=>window.academy6ShowTab?.('ai'));

document.querySelectorAll('.v6-nav-item').forEach(button=>button.addEventListener('click',()=>{
 if(!admin())return;
 if(button.dataset.tab==='monitor8')refreshMonitor();
 if(button.dataset.tab==='testing8')testInfo.textContent='Нажми «Проверить тестовый набор».';
}));
window.academy8OnAuthorized=()=>{setTimeout(ping,500)};
})();
