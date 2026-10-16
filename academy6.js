/* Academy Hub 6.0 — modular, accessible admin workspace and signage enhancements */
(function(){
'use strict';
const q=id=>document.getElementById(id);
const node=(tag,cls,text,parent)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined&&text!==null)el.textContent=text;if(parent)parent.appendChild(el);return el};
const btn=(parent,text,handler,cls='btn secondary')=>{const b=node('button',cls,text,parent);b.type='button';b.addEventListener('click',handler);return b};
const info=(parent,text)=>node('p','v6-note',text,parent);
const safeText=s=>String(s||'').slice(0,1800);
const panelIds=['overview','schedule','grades','sports','events','achievements','birthdays','cadets','ai','import','quality','drafts','access','history','preview'];
const names={overview:'Обзор',schedule:'Расписание',grades:'Оценки и лидеры',sports:'Спорт',events:'Мероприятия',achievements:'Достижения',birthdays:'Дни рождения',cadets:'Курсанты',ai:'ИИ-центр',import:'Excel',quality:'Контроль качества',drafts:'Черновики',access:'Права доступа',history:'История',preview:'Предпросмотр ТВ'};
const icons={overview:'◫',schedule:'▦',grades:'▤',sports:'◉',events:'◷',achievements:'✦',birthdays:'◇',cadets:'♙',ai:'✳',import:'⇪',quality:'✓',drafts:'▧',access:'⚿',history:'↺',preview:'▣'};
let editorDraftForm=null,activeTab='overview';
const adminSection=q('admin'),adminContent=q('adminContent');
if(!adminSection||!adminContent)return;
const wrap=adminSection.querySelector('.wrap');
const legacyGrid=wrap?.querySelector('.admin-grid');
if(legacyGrid)legacyGrid.classList.add('v6-legacy-hidden');
const originalChildren=[...adminContent.children];
const workspace=node('div','v6-layout',null,wrap);
workspace.id='academy6Workspace';
const side=node('aside','v6-sidebar',null,workspace);
node('div','v6-eyebrow','ACADEMY HUB / CONTROL',side);
node('h2','v6-side-title','Панель управления',side);
const searchWrap=node('label','v6-search-wrap',null,side);
node('span','v6-sr','Поиск по разделам и группам',searchWrap);
const search=node('input','v6-search',null,searchWrap);search.placeholder='Найти раздел или группу…';search.type='search';search.id='academy6Search';
const nav=node('nav','v6-nav',null,side);
const main=node('main','v6-main',null,workspace);
const top=node('div','v6-top',null,main);
const heading=node('div','',null,top);
node('span','v6-eyebrow','Система управления',heading);
const title=node('h2','v6-title','Обзор',heading);
const topBtns=node('div','v6-top-actions',null,top);
btn(topBtns,'ТВ-экран',()=>location.assign('?tv=1#dashboard'));
btn(topBtns,'Сохранить изменения',()=>q('saveBtn')?.click(),'btn primary');
main.appendChild(adminContent);
adminContent.classList.add('v6-content');
const screens={};
for(const k of panelIds){
 const sc=node('section','v6-screen',null,adminContent);
 sc.dataset.section=k;sc.id='v6-'+k;
 const head=node('div','v6-section-heading',null,sc);
 node('span','v6-eyebrow','РАЗДЕЛ / '+String(panelIds.indexOf(k)+1).padStart(2,'0'),head);
 node('h3','v6-h3',names[k],head);
 screens[k]=sc;
 const link=btn(nav,icons[k]+'  '+names[k],()=>showTab(k),'v6-nav-item');
 link.dataset.tab=k;
}
const bar=node('div','v6-fixed-actions',null,main);
node('span','v6-small','Данные меняются только после сохранения или публикации.',bar);
const fixedSave=btn(bar,'Сохранить на табло',()=>q('saveBtn')?.click(),'btn primary');
const feedback=node('span','v6-feedback','',bar);
function showTab(key){
 if(!screens[key])key='overview';
 activeTab=key;title.textContent=names[key];
 Object.entries(screens).forEach(([k,el])=>el.classList.toggle('v6-active',k===key));
 [...nav.querySelectorAll('[data-tab]')].forEach(b=>b.classList.toggle('is-active',b.dataset.tab===key));
 if(key==='overview')drawOverview();
 if(key==='preview')openPreview();
 if(key==='drafts')refreshDrafts();
 /* Keep unsaved award field edits when switching sections. */
 if(key==='quality')drawQuality();
 if(key==='access')drawAccess();
}
window.academy6ShowTab=showTab;
function sectionFor(heading){
 const text=heading?.textContent||'';
 if(/Основные рейтинги/i.test(text))return'grades';
 if(/Календарь и объявление/i.test(text))return'birthdays';
 if(/Спортивные секции/i.test(text))return'sports';
 if(/Расписание 6 групп/i.test(text))return'schedule';
 return'overview';
}
let target='overview';
for(const el of originalChildren){
 if(el.classList.contains('section-header'))target=sectionFor(el);
 if(el.id==='academyVersionPanel'){
  screens.history.appendChild(el);continue;
 }
 if(el.id==='academy5Admin'){
  for(const details of [...el.querySelectorAll(':scope > details')]){
   const summary=details.querySelector('summary')?.textContent||'';
   const tab=/Недельное расписание/i.test(summary)?'schedule'
      :/Матчи|результаты и лучшая/i.test(summary)?'sports'
      :/Мероприятия/i.test(summary)?'events'
      :/Достижения/i.test(summary)?'achievements'
      :/Динамика/i.test(summary)?'grades'
      :/Проверка расписаний/i.test(summary)?'quality'
      :/Права Samsung TV/i.test(summary)?'access'
      :/Массовый импорт/i.test(summary)?'import':'overview';
   screens[tab].appendChild(details);
   details.open=true;
  }
  continue;
 }
 if(el.contains(q('saveBtn'))||el.id==='logoutBtn') {
  el.classList.add('v6-original-save');bar.appendChild(el);continue;
 }
 screens[target].appendChild(el);
}
// Reuse the original cadet management and Gemini UI rather than duplicating IDs or logic.
const cadetArea=q('cadetArea');
if(cadetArea){screens.cadets.appendChild(cadetArea);cadetArea.classList.add('v6-cadet-area')}
const aiPage=q('ai'),aiGrid=aiPage?.querySelector('.grid-2');
if(aiGrid){screens.ai.appendChild(aiGrid);aiGrid.classList.add('v6-ai-grid')}
const legacySidebar=document.querySelector('.sidebar .nav');
if(legacySidebar){
 for(const [dest,key]of [['admin','overview'],['cadets','cadets'],['ai','ai']]){
  const b=legacySidebar.querySelector('[data-go="'+dest+'"]');
  if(b){b.addEventListener('click',()=>{if(window.academySession?.canEdit())showTab(key)});}
 }
}
const oldGo=go;
go=function(id){
 if(id==='cadets'||id==='ai'){if(window.academySession?.canEdit()){showTab(id);id='admin'}else id='dashboard'}
 if(id==='editor6'){if(!q('editor6'))id='dashboard'}
 if(id==='admin'&&!window.academySession?.canEdit())id='dashboard';
 return oldGo(id);
};
const editorPage=node('section','page v6-editor-page',null,adminSection.parentElement);
editorPage.id='editor6';
const editorBox=node('div','v6-editor-box',null,editorPage);
node('span','v6-eyebrow','РОЛЬ / РЕДАКТОР',editorBox);
node('h2','v6-title','Подготовка черновиков',editorBox);
info(editorBox,'Редактор готовит изменения, но не может самостоятельно публиковать их или открывать персональный реестр.');
const edTitle=node('input','input',null,editorBox);edTitle.placeholder='Название изменения';edTitle.id='v6EditorTitle';
const edNotice=node('textarea','input',null,editorBox);edNotice.placeholder='Текст объявления для проверки администратором';edNotice.id='v6EditorNotice';
const edEvents=node('textarea','input',null,editorBox);edEvents.placeholder='Мероприятия: ДД.ММ.ГГГГ | Название | Место';edEvents.id='v6EditorEvents';
const edStatus=node('p','v6-note','',editorBox);
btn(editorBox,'Отправить черновик администратору',async()=>{
 try{
  const title=edTitle.value.trim(),notice=edNotice.value.trim(),events=edEvents.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const patch={};if(notice)patch.notice=notice.slice(0,2000);if(events.length)patch.events=events.slice(0,150);
  if(!title||!Object.keys(patch).length)throw Error('Укажи название и текст объявления или мероприятия.');
  await rpc('academy_create_publication',{p_title:title,p_patch:patch});
  edStatus.textContent='Черновик отправлен администратору. Он появится после одобрения.';
  edTitle.value='';edNotice.value='';edEvents.value='';
 }catch(e){edStatus.textContent='Ошибка: '+e.message}
},'btn primary');
const editorNav=btn(legacySidebar||side,'✎ Кабинет редактора',()=>go('editor6'),'v6-editor-nav');
editorNav.dataset.go='editor6';
const goOriginal=oldGo; // q('editor6') is a fully-fledged application page.
search.addEventListener('input',()=>{
 const v=search.value.trim().toLowerCase();
 [...nav.querySelectorAll('[data-tab]')].forEach(b=>b.hidden=!!v&&!b.textContent.toLowerCase().includes(v));
 const groups=q('groupEditors')?.querySelectorAll('details')||[];
 groups.forEach(d=>d.style.display=v&&/КРД|ОТЗИ|\bKRD\b|\bOTZI\b/i.test(v)&&!d.textContent.toLowerCase().includes(v)?'none':'');
});
// Overview contains only essential information instead of a long essay.
const overviewCards=node('div','v6-kpis',null,screens.overview);
const groupStatus=node('div','v6-table-wrap',null,screens.overview);
function makeTable(parent,headers){
 const table=node('table','v6-table',null,parent),head=node('thead','',null,table),row=node('tr','',null,head);
 headers.forEach(t=>node('th','',t,row));const body=node('tbody','',null,table);return body;
}
function drawOverview(){
 overviewCards.replaceChildren();groupStatus.replaceChildren();
 const groups=GROUPS.map(g=>({
   ...g,lessonCount:(current.weekSchedules?.[g.key]?.[String(dayNumber())]||current.groups?.[g.key]?.schedule||[]).length,
   gradeCount:(current.groupGrades?.[g.key]||[]).length
 }));
 const warnings=groups.filter(g=>!g.lessonCount||!g.gradeCount).length;
 for(const [label,num,desc]of [['Группы',6,'КРД и ОТЗИ'],['Расписания',groups.filter(g=>g.lessonCount).length+'/6','Заполнены на сегодня'],['Оценки',groups.filter(g=>g.gradeCount).length+'/6','Есть результаты'],['Нужна проверка',warnings,'Группы без данных']]){
  const item=node('div','v6-kpi',null,overviewCards);node('strong','',num,item);node('span','',label,item);node('small','',desc,item);
 }
 const tbody=makeTable(groupStatus,['Группа','Направление','Пар на сегодня','Оценок','Открыть']);
 for(const g of groups){
  const tr=node('tr','',null,tbody);
  node('td','',g.label,tr);node('td','',g.direction,tr);
  node('td','',String(g.lessonCount),tr);node('td','',String(g.gradeCount),tr);
  const td=node('td','',null,tr);btn(td,'Расписание',()=>{showTab('schedule');document.getElementById('v5Group')?.dispatchEvent(new Event('change'))},'v6-link');
 }
}
function dayNumber(extra=0){
 const wd=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'Asia/Almaty'}).format(new Date()).toLowerCase();
 return (({mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:7})[wd]+extra-1)%7+1;
}
function getAlmatyHour(){return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Almaty',hour:'2-digit',hour12:false}).format(new Date()))}
async function rpc(name,body={}){
 const token=await window.academySession?.getToken();
 if(!token)throw Error('Сессия закончилась');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:pub,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const v=await r.json().catch(()=>null);
 if(!r.ok)throw Error(v?.message||v?.hint||'HTTP '+r.status);
 return v;
}
const awardsArea=node('div','v6-awards-editor',null,screens.grades);
node('h4','v6-subtitle','Лидеры недели и месяца',awardsArea);
info(awardsArea,'Указывай только подтверждённые результаты. Сами по себе оценки без дат не подтверждают лидерство за неделю.');
const weeklyInput=node('input','input',null,awardsArea);weeklyInput.placeholder='Курсант недели — ФИО / группа';
weeklyInput.id='academy6Weekly';
const monthlyInput=node('input','input',null,awardsArea);monthlyInput.placeholder='Курсант месяца — ФИО / группа';
monthlyInput.id='academy6Monthly';
const bestGroupInput=node('input','input',null,awardsArea);bestGroupInput.placeholder='Учебная группа месяца';
bestGroupInput.id='academy6BestGroup';
function drawAwards(){
 weeklyInput.value=current.awardsWeekly||'';
 monthlyInput.value=current.awardsMonthly||'';
 bestGroupInput.value=current.awardsGroup||'';
}
const originalFillAdmin=fillAdmin;
fillAdmin=function(){originalFillAdmin();drawAwards();drawOverview()};
const originalReadAdmin=readAdminState;
readAdminState=function(){
 const next=originalReadAdmin();
 next.awardsWeekly=weeklyInput.value.trim().slice(0,180);
 next.awardsMonthly=monthlyInput.value.trim().slice(0,180);
 next.awardsGroup=bestGroupInput.value.trim().slice(0,180);
 return next;
};
const qualityArea=node('div','v6-quality-box',null,screens.quality);
const qualityStatus=node('p','v6-note','',qualityArea);
btn(qualityArea,'Проверить заполнение всех шести групп',()=>{
 const found=[];
 for(const g of GROUPS){
  for(let d=1;d<=7;d++){
   if(!Array.isArray(current.weekSchedules?.[g.key]?.[d]))found.push(g.label+' — '+['','Пн','Вт','Ср','Чт','Пт','Сб','Вс'][d]+' без недельного расписания');
  }
  if(!(current.groupGrades?.[g.key]||[]).length)found.push(g.label+' — нет оценок');
 }
 qualityStatus.textContent=found.length?found.slice(0,18).join('\n'):'Недельное расписание и оценки заполнены для всех групп.';
});
const grants=node('div','v6-grants',null,screens.access);
node('h4','v6-subtitle','Роль редактора',grants);
info(grants,'Редактор может сохранять черновики для одобрения. Публикация, права доступа и реестр остаются у администратора.');
const grantEmail=node('input','input',null,grants);grantEmail.type='email';grantEmail.placeholder='Подтверждённый email редактора';
const grantText=node('p','v6-note','',grants);
const grantButtons=node('div','v6-btns',null,grants);
for(const [enabled,text]of [[true,'Назначить редактором'],[false,'Отозвать роль редактора']]){
 btn(grantButtons,text,async()=>{
  try{
   const addr=grantEmail.value.trim();
   if(!addr.includes('@'))throw Error('Укажи email существующей подтверждённой учётной записи');
   if(!confirm((enabled?'Назначить':'Отозвать')+' редактора '+addr+'?'))return;
   await rpc('academy_grant_editor',{target_email:addr,enable_access:enabled});
   grantText.textContent=enabled?'Доступ редактора выдан':'Доступ редактора отозван';
  }catch(e){grantText.textContent='Ошибка: '+e.message}
 });
}
const draftArea=node('div','v6-draft-area',null,screens.drafts);
info(draftArea,'Готовь изменения заранее и публикуй вручную или автоматически в назначенный день. Только администратор может отправлять данные на табло.');
const draftTitle=node('input','input',null,draftArea);draftTitle.placeholder='Название черновика, например «Расписание понедельника»';
const draftTime=node('input','input',null,draftArea);draftTime.type='datetime-local';draftTime.title='Дата и время публикации по Алматы';
const actions=node('div','v6-btns',null,draftArea);
const draftMsg=node('p','v6-note','',draftArea);
const draftsList=node('div','v6-drafts-list',null,draftArea);
const allowedPatch=['studyTop','sportTopOverall','sportCategories','groups','groupGrades','weekSchedules','birthdays','notice','noticePriority','noticeExpires','events','matches','achievements','lessonMinutes','gradeSnapshots','awardsWeekly','awardsMonthly','awardsGroup'];
function buildPatch(){
 const st=readAdminState(),patch={};
 for(const k of allowedPatch)if(Object.prototype.hasOwnProperty.call(st,k))patch[k]=st[k];
 return patch;
}
async function createDraft(schedule){
 try{
  const title=draftTitle.value.trim();if(!title)throw Error('Введи название черновика');
  const patch=buildPatch(),id=await rpc('academy_create_publication',{p_title:title,p_patch:patch});
  draftMsg.textContent='Черновик создан. ID '+String(id).slice(0,8);
  if(schedule){
   if(!draftTime.value)throw Error('Выбери дату и время');
   const iso=new Date(draftTime.value+':00+05:00').toISOString();
   await rpc('academy_manage_publication',{p_id:id,p_action:'schedule',p_publish_at:iso});
   draftMsg.textContent='Публикация запланирована на '+draftTime.value+' (Алматы).';
  }
  await refreshDrafts();
 }catch(e){draftMsg.textContent='Ошибка: '+e.message}
}
btn(actions,'Сохранить черновик',()=>createDraft(false));
btn(actions,'Опубликовать по времени',()=>createDraft(true),'btn primary');
btn(actions,'Обновить список',refreshDrafts);
async function refreshDrafts(){
 if(!window.academySession?.canEdit())return;
 draftsList.replaceChildren();
 try{
  const token=await window.academySession.getToken();
  const r=await fetch(base+'/rest/v1/academy_publications?select=id,title,status,publish_at,created_at&order=created_at.desc&limit=30',{headers:{apikey:pub,Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('Не удалось загрузить черновики '+r.status);
  const rows=await r.json();
  if(!rows.length)info(draftsList,'Черновиков пока нет');
  for(const d of rows){
   const item=node('div','v6-draft',null,draftsList);
   const left=node('div','',null,item);
   node('strong','',d.title,left);
   node('small','',d.status+(d.publish_at?' · '+new Date(d.publish_at).toLocaleString('ru-RU',{timeZone:'Asia/Almaty'}):''),left);
   if(['draft','scheduled'].includes(d.status)){
    const right=node('div','v6-btns',null,item);
    btn(right,'Опубликовать',async()=>{
     if(!confirm('Опубликовать «'+d.title+'» сейчас?'))return;
     try{await rpc('academy_manage_publication',{p_id:d.id,p_action:'publish'});draftMsg.textContent='Опубликовано';await refreshDrafts()}catch(e){draftMsg.textContent=e.message}
    });
    btn(right,'Отменить',async()=>{
     if(!confirm('Отменить публикацию?'))return;
     try{await rpc('academy_manage_publication',{p_id:d.id,p_action:'cancel'});await refreshDrafts()}catch(e){draftMsg.textContent=e.message}
    });
   }
  }
 }catch(e){draftMsg.textContent='Ошибка: '+e.message}
}
const previewArea=node('div','v6-preview',null,screens.preview);
info(previewArea,'Настоящий вид Samsung TV (16:9), с теми же данными и разрешениями. Просмотр не публикует черновики.');
const previewHolder=node('div','v6-preview-holder',null,previewArea);previewHolder.id='academy6PreviewHolder';
let tvFrame=null;
function openPreview(){
 if(tvFrame)return;
 const stage=node('div','v6-preview-stage',null,previewHolder);
 tvFrame=node('iframe','v6-preview-frame',null,stage);
 tvFrame.title='Предпросмотр информационного табло 1920 на 1080';
 tvFrame.src='?tv=1#dashboard';
 const resize=()=>{stage.style.transform='scale('+(previewHolder.clientWidth/1920)+')'};
 resize();window.addEventListener('resize',resize,{passive:true});
}
const ticker={
 index:0,lastSignature:'',lastValue:'',tick:()=>{}
};
function getTicker(){
 if(current.noticePriority==='urgent'&&current.notice)return [safeText(current.notice)];
 const lines=[];
 if(current.notice)lines.push(safeText(current.notice));
 const events=(Array.isArray(current.events)?current.events:[]).slice(0,8);
 for(const entry of events){
  const fields=String(entry).split('|').map(s=>s.trim());
  if(fields.length>1)lines.push('Календарь: '+fields.slice(0,2).join(' — '));
 }
 if(current.awardsWeekly)lines.push('Курсант недели: '+current.awardsWeekly);
 if(current.awardsMonthly)lines.push('Курсант месяца: '+current.awardsMonthly);
 if(current.awardsGroup)lines.push('Лучшая учебная группа: '+current.awardsGroup);
 if(Array.isArray(current.achievements)&&current.achievements.length)lines.push('Достижение: '+current.achievements[current.achievements.length-1]);
 return lines.filter(Boolean);
}
const formerNoticeUpdate=typeof updateNotice==='function'?updateNotice:null;
function updateTicker(force=false){
 if(!document.documentElement.classList.contains('academy-authorized'))return;
 const elem=q('noticeBox');if(!elem)return;
 const lines=getTicker(),signature=JSON.stringify(lines);
 if(signature!==ticker.lastSignature){ticker.lastSignature=signature;ticker.index=0;force=true}
 const next=lines.length?lines[ticker.index%lines.length]:'Нет действующих объявлений';
 if(next!==ticker.lastValue||force){elem.textContent=next;ticker.lastValue=next}
}
setInterval(()=>{const lines=getTicker();if(lines.length>1&&current.noticePriority!=='urgent')ticker.index++;updateTicker()},12000);
const currentRender=render;
render=function(){const a=currentRender();updateTicker(true);return a};
setInterval(()=>{
 if(!document.documentElement.classList.contains('academy-authorized'))return;
 updateTicker();
},3000);
const priorRotators=renderRotators;
renderRotators=function(animate){
 const nextDay=getAlmatyHour()>=19,day=dayNumber(),key=GROUPS[scheduleIndex]?.key;
 if(!nextDay||!key||!current.weekSchedules?.[key]?.[String(dayNumber(1))])return priorRotators(animate);
 const st=current,week=st.weekSchedules,merged={...week,[key]:{...week[key],[String(day)]:week[key][String(dayNumber(1))]}};
 current={...st,weekSchedules:merged};
 try{const ret=priorRotators(animate);const label=q('groupGrid')?.querySelector('.badge');if(label)label.textContent='Завтра';return ret}
 finally{current=st}
};
const originalSave=q('saveBtn');
originalSave?.addEventListener('click',()=>{feedback.textContent='Сохранение…';setTimeout(()=>{feedback.textContent=q('saveInfo')?.textContent||'';drawOverview()},1300)});
window.addEventListener('hashchange',()=>{if(location.hash==='#admin'){showTab('overview')}});
showTab('overview');
})();
