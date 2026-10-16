/* Academy Hub 4.0: readable TV, safe admin workflow, resilient synchronization */
(function(){
  'use strict';
  if(!document.getElementById('dashboard') || typeof GROUPS==='undefined')return;
  const byId=id=>document.getElementById(id);
  const create=(tag,attrs={},parent)=>{
    const el=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k==='text')el.textContent=v;
      else if(k==='class')el.className=v;
      else if(k==='type')el.type=v;
      else if(k==='value')el.value=v;
      else el.setAttribute(k,String(v));
    }
    if(parent)parent.appendChild(el);
    return el;
  };
  const makeButton=(text,parent,handler,cls='btn secondary')=>{
    const b=create('button',{text,class:cls,type:'button'},parent);b.addEventListener('click',handler);return b;
  };
  const safePairs=list=>{
    if(!Array.isArray(list))return [];
    return list.filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&x[0].trim()&&Number.isFinite(Number(x[1]))&&Number(x[1])>=0&&Number(x[1])<=100)
      .slice(0,75).map(x=>[x[0].trim().slice(0,120),Number(x[1])]);
  };
  function localClock(){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Almaty',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).split(':');
    return Number(parts[0])*60+Number(parts[1]);
  }
  function readEntry(line){
    const match=String(line).match(/^\s*(\d{1,2}):(\d{2})\s*(?:\||—|–|-|:)\s*(.*?)\s*$/);
    if(!match)return {time:'',title:String(line),minute:null};
    const h=Number(match[1]),m=Number(match[2]);
    if(h>23||m>59)return {time:'',title:String(line),minute:null};
    return {time:match[1].padStart(2,'0')+':'+match[2],title:match[3],minute:h*60+m};
  }
  const priorScheduleHtml=scheduleHtml;
  scheduleHtml=function(lines){
    if(!Array.isArray(lines)||!lines.length)return '<li class="schedule-empty"><span>Расписание пока не внесено</span></li>';
    const entries=lines.slice(0,15).map(readEntry),mins=localClock();
    const lessonMinutes=Math.min(180,Math.max(30,Number(current.lessonMinutes)||90));
    let active=-1,next=-1;
    for(let i=0;i<entries.length;i++){
      const m=entries[i].minute;
      if(m===null)continue;
      if(mins>=m&&mins<m+lessonMinutes)active=i;
      if(mins<m&&(next===-1||m<entries[next].minute))next=i;
    }
    return entries.map((entry,i)=>{
      const css=i===active?'lesson-current':i===next?'lesson-next':entry.minute!==null&&entry.minute+lessonMinutes<=mins?'lesson-past':'';
      const status=i===active?'Сейчас':i===next?'Следующая пара':'';
      const left=i===active?Math.max(1,entry.minute+lessonMinutes-mins):i===next?entry.minute-mins:null;
      const n=left!==null?' · '+left+' мин':'';
      return '<li class="'+css+'"><time>'+esc(entry.time||'—')+'</time><span>'+esc(entry.title)+
        (status?'<small class="lesson-status">'+status+'<span class="lesson-remaining">'+n+'</span></small>':'')+'</span></li>';
    }).join('');
  };

  let gradePages={},lastGradeGroup=null;
  const originalRotators=renderRotators;
  renderRotators=function(animate){
    originalRotators(animate);
    const group=GROUPS[gradeIndex];
    if(!group)return;
    const scores=(current.groupGrades||{})[group.key]||[];
    const perPage=7,pages=Math.max(1,Math.ceil(scores.length/perPage));
    if(lastGradeGroup!==group.key){
      if(Object.prototype.hasOwnProperty.call(gradePages,group.key))gradePages[group.key]=(gradePages[group.key]+1)%pages;
      else gradePages[group.key]=0;
      lastGradeGroup=group.key;
    }
    let page=Math.min(gradePages[group.key]||0,pages-1);
    const list=byId('gradeRotator');
    if(!list)return;
    list.querySelectorAll('.ranking li').forEach((row,i)=>{
      row.style.display=i>=page*perPage&&i<(page+1)*perPage?'grid':'none';
    });
    let paging=list.querySelector('.academy-page-indicator');
    if(!paging)paging=create('div',{class:'academy-page-indicator'},list);
    paging.textContent=pages>1?'Страница '+(page+1)+' / '+pages+' · '+group.label:'';
  };
  const originalOverview=renderOverview;
  renderOverview=function(){
    originalOverview();
    updateNotice();
    setDaypart();
  };
  const originalRender=render;
  render=function(){originalRender();updateNotice();setDaypart();};

  function setDaypart(){
    const mins=localClock(),part=mins<720?'morning':mins<1080?'afternoon':'evening';
    document.body.dataset.daypart=part;
    const sync=byId('tvDaypart');
    if(sync)sync.textContent=part==='morning'?'Учебное утро':part==='afternoon'?'Учебный день':'Вечерняя сводка';
  }
  const header=byId('dashboard')?.querySelector('.topbar .head-panel');
  if(header)create('div',{id:'tvDaypart',class:'tv-daypart'},header);

  function updateNotice(){
    document.body.classList.remove('notice-important','notice-urgent');
    const currentPriority=['normal','important','urgent'].includes(current.noticePriority)?current.noticePriority:'normal';
    let priority=currentPriority;
    const expiry=typeof current.noticeExpires==='string'?Date.parse(current.noticeExpires):NaN;
    const expired=Number.isFinite(expiry)&&expiry<Date.now();
    const wrapper=byId('noticeBox')?.closest('.panel');
    if(!wrapper)return;
    let badge=wrapper.querySelector('.notice-priority');
    if(!badge)badge=create('span',{class:'notice-priority'},wrapper);
    badge.className='notice-priority '+priority;
    badge.textContent=priority==='urgent'?'Срочно':priority==='important'?'Важно':'Объявление';
    badge.hidden=expired||!current.notice;
    if(expired){byId('noticeBox').textContent='Нет действующих объявлений';return;}
    if(priority==='urgent')document.body.classList.add('notice-urgent');
    else if(priority==='important')document.body.classList.add('notice-important');
  }
  // Extra fields stay inside the password-protected editing view.
  const noticeField=byId('noticeEdit')?.closest('.textarea-field');
  if(noticeField){
    const fields=create('div',{class:'fields',style:'margin-top:13px'},noticeField.parentNode);
    const priorityWrap=create('div',{class:'field'},fields);
    create('label',{text:'Приоритет объявления'},priorityWrap);
    const priority=create('select',{id:'noticePriority'},priorityWrap);
    [['normal','Обычное'],['important','Важное'],['urgent','Срочное']].forEach(item=>{
      const opt=create('option',{value:item[0],text:item[1]},priority);
    });
    const expiryWrap=create('div',{class:'field'},fields);
    create('label',{text:'Действует до (необязательно)'},expiryWrap);
    create('input',{id:'noticeExpires',class:'input',type:'datetime-local'},expiryWrap);
    const minutesWrap=create('div',{class:'field'},fields);
    create('label',{text:'Продолжительность пары, мин'},minutesWrap);
    create('input',{id:'lessonMinutes',class:'input',type:'number',min:'30',max:'180',value:'90'},minutesWrap);
  }
  function fromSaved(){
    if(byId('noticePriority'))byId('noticePriority').value=current.noticePriority||'normal';
    if(byId('noticeExpires'))byId('noticeExpires').value=current.noticeExpires?String(current.noticeExpires).slice(0,16):'';
    if(byId('lessonMinutes'))byId('lessonMinutes').value=String(current.lessonMinutes||90);
  }
  const originalFill=fillAdmin;
  fillAdmin=function(){originalFill();fromSaved();};
  const originalRead=readAdminState;
  readAdminState=function(){
    const next=originalRead();
    next.noticePriority=byId('noticePriority')?.value||'normal';
    next.noticeExpires=byId('noticeExpires')?.value||'';
    next.lessonMinutes=Math.min(180,Math.max(30,Number(byId('lessonMinutes')?.value)||90));
    return next;
  };
  fromSaved();
  function message(el,text,error=false){
    el.textContent=text;el.classList.toggle('bad',error);el.classList.toggle('good',!error);
  }
  const adminContent=byId('adminContent');
  if(adminContent){
    const extras=create('div',{class:'panel',id:'academyVersionPanel'},adminContent);
    create('div',{class:'eyebrow',text:'Сохранение и безопасность'},extras);
    create('h2',{class:'section-title',text:'История и резервные копии'},extras);
    create('p',{class:'muted',text:'Предыдущие 50 версий хранятся в закрытой таблице Supabase. Восстановление доступно только администратору.'},extras);
    const controls=create('div',{class:'admin-tools'},extras);
    const status=create('span',{id:'historyStatus',class:'info'},extras);
    const historyArea=create('div',{id:'historyList'},extras);
    makeButton('История изменений',controls,async()=>{
      if(!token){message(status,'Сначала войди как администратор',true);return}
      try{
        message(status,'Загрузка версий…');
        const rr=await fetch(base+'/rest/v1/app_state_history?select=history_id,saved_at,saved_by&order=saved_at.desc&limit=12',{headers:authHeaders()});
        if(!rr.ok)throw Error('Ошибка доступа '+rr.status);
        const rows=await rr.json();historyArea.replaceChildren();
        if(!rows.length){create('p',{class:'muted',text:'Ранних версий пока нет'},historyArea);return}
        for(const row of rows){
          const line=create('div',{class:'admin-history-row'},historyArea);
          create('time',{text:new Date(row.saved_at).toLocaleString('ru-RU')},line);
          makeButton('Восстановить',line,async()=>{
            if(!confirm('Восстановить данные этого сохранения? Текущая версия автоматически попадёт в историю.'))return;
            try{
              const path='app_state_history?history_id=eq.'+encodeURIComponent(row.history_id)+'&select=snapshot';
              const result=await fetch(base+'/rest/v1/'+path,{headers:authHeaders()});
              if(!result.ok)throw Error('Не удалось получить версию');
              const rows2=await result.json();
              if(!rows2[0]?.snapshot)throw Error('Версия не найдена');
              const next=normalizeState(rows2[0].snapshot);
              await saveState(next);current=next;render();fillAdmin();
              message(status,'Версия восстановлена и отправлена на табло');
            }catch(e){message(status,e.message||String(e),true)}
          });
        }
        message(status,'Выбрано версий: '+rows.length);
      }catch(e){message(status,e.message||String(e),true)}
    });
    makeButton('Скачать копию JSON',controls,()=>{
      if(!token){message(status,'Нужен вход администратора',true);return}
      const data=JSON.stringify(buildPayloadFromState(current),null,2);
      const url=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
      const link=create('a',{href:url,download:'academy-hub-backup-'+new Date().toISOString().slice(0,10)+'.json'},extras);
      link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
      message(status,'Копия подготовлена. Храни файл в защищённом месте.');
    });
    makeButton('Шаблон реестра CSV',controls,()=>{
      const header='код,ФИО,группа,дата рождения,имя для табло,показывать';
      const content='\uFEFF'+header+'\r\n'+GROUPS.map(g=>',,'+g.label+',,,нет').join('\r\n');
      const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
      const link=create('a',{href:url,download:'academy-hub-cadets-template.csv'},extras);
      link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
      message(status,'Шаблон скачан. Не публикуй заполненный файл в GitHub.');
    });
  }
  // AI chat can answer about the contents of local Word, Excel, PowerPoint, PDF and images.
  const chatPrompt=byId('chatPrompt');
  if(chatPrompt){
    const div=create('div',{class:'ai-attachment-field'},chatPrompt.closest('.textarea-field').parentNode);
    create('label',{text:'Приложить файлы к вопросу'},div);
    create('input',{class:'input',id:'aiChatFiles',type:'file',accept:'.txt,.csv,.docx,.xlsx,.xls,.pptx,.pdf,.jpg,.jpeg,.png,.webp',multiple:''},div);
    create('p',{class:'ai-help',text:'Поддерживаются текстовые документы, таблицы, презентации и изображения. Сканированные PDF без текстового слоя могут не распознаться. Содержимое выбранных файлов передаётся Gemini после отправки.'},div);
  }
  const chatButton=byId('chatBtn');
  if(chatButton){
    chatButton.onclick=async function(){
      const info=byId('chatInfo');
      const question=chatPrompt.value.trim();
      const files=Array.from(byId('aiChatFiles')?.files||[]);
      if(!question&&!files.length){message(info,'Напиши вопрос или выбери файл',true);return}
      if(!token){message(info,'Войди как администратор',true);return}
      if(files.length>5){message(info,'Не более пяти файлов за раз',true);return}
      chatButton.disabled=true;
      try{
        message(info,'Читаю файлы…');
        const chunks=[];
        for(const f of files){
          if(f.size>12*1024*1024)throw Error('Слишком большой файл: '+f.name+' (макс. 12 МБ)');
          const parsed=await extractText(f);
          if(parsed)chunks.push('Документ '+f.name+':\n'+parsed);
        }
        const images=await extractImages(files);
        if(images.length>4)throw Error('Для изображений максимум 4 файла');
        const response=await callAI({mode:'chat',question:question||'Разбери содержимое приложенных файлов',text:chunks.join('\n\n').slice(0,47000),images,history:chatHistory.slice(-8)});
        byId('chatReply').textContent=response.answer||'Пустой ответ модели';
        chatHistory.push({role:'user',content:question||'[файл]'},{role:'assistant',content:response.answer||''});
        if(chatHistory.length>18)chatHistory=chatHistory.slice(-18);
        message(info,'Готово · '+files.length+' файлов');
      }catch(e){message(info,e.message||String(e),true)}
      finally{chatButton.disabled=false}
    };
  }
  // AI import: explicit consent to publish, preserve untouched groups and ranks.
  const checks=byId('cstudy')?.closest('.checkrow');
  if(checks){
    [['cGroupSchedules','Расписание групп'],['cGroupGrades','Оценки групп'],['cSportSections','Спортивные секции']].forEach(([id,label])=>{
      const lab=create('label',{},checks);
      create('input',{type:'checkbox',id,checked:''},lab);
      lab.appendChild(document.createTextNode(' '+label));
    });
  }
  const publish=byId('publishAiBtn');
  if(publish){
    publish.onclick=async function(){
      if(!token||!importedData){byId('notesBox').textContent='Войди и сначала разбери документ';return}
      const d=importedData;
      if(!confirm('Все распознанные записи проверены? Выбранные разделы сохранятся на всех экранах.'))return;
      publish.disabled=true;
      try{
        const next=normalizeState(current);
        if(byId('cstudy').checked&&Array.isArray(d.study))next.studyTop=safePairs(d.study).slice(0,10);
        if(byId('csport').checked&&Array.isArray(d.sport))next.sportTopOverall=safePairs(d.sport).slice(0,5);
        if(byId('cbirthdays').checked&&Array.isArray(d.birthdays))next.birthdays=d.birthdays.filter(x=>typeof x==='string').slice(0,300);
        if(byId('cnotice').checked&&typeof d.notice==='string')next.notice=d.notice.slice(0,2000);
        if(byId('cGroupSchedules')?.checked&&d.groupSchedules&&typeof d.groupSchedules==='object'){
          for(const g of GROUPS){
            if(Array.isArray(d.groupSchedules[g.key])){
              next.groups[g.key].schedule=d.groupSchedules[g.key].filter(x=>typeof x==='string').slice(0,30);
            }
          }
        }
        if(byId('cGroupGrades')?.checked&&d.groupGrades&&typeof d.groupGrades==='object'){
          next.groupGrades=next.groupGrades||{};
          for(const g of GROUPS)if(Array.isArray(d.groupGrades[g.key]))next.groupGrades[g.key]=safePairs(d.groupGrades[g.key]);
        }
        if(byId('cSportSections')?.checked&&d.sportCategories&&typeof d.sportCategories==='object'){
          for(const sp of SPORTS)if(Array.isArray(d.sportCategories[sp.key]))next.sportCategories[sp.key]=safePairs(d.sportCategories[sp.key]);
        }
        next.study=next.studyTop;next.sport=next.sportTopOverall;
        next.schedule=next.groups.KRD1.schedule;
        next.overviewSchedule=next.schedule;
        await saveState(next);
        current=normalizeState(next);render();fillAdmin();
        byId('notesBox').textContent='Опубликовано. Предыдущая версия сохранена в истории администратора.';
      }catch(e){byId('notesBox').textContent='Ошибка публикации: '+(e.message||String(e))}
      finally{publish.disabled=false}
    };
  }

  // Prevent a full DOM repaint and distracting rotation animation on each poll.
  let synced='',lastSuccessful=Date.now(),fetching=false;
  load=async function(){
    if(!configured){setStatus('Не настроено подключение',false);return}
    if(fetching)return;
    fetching=true;
    try{
      const response=await fetch(base+'/rest/v1/app_state?id=eq.1&select=content',{headers:{apikey:pub,Authorization:'Bearer '+pub},cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const records=await response.json();
      const data=records[0]?.content;
      if(data){
        const signature=JSON.stringify(data);
        if(signature!==synced){
          synced=signature;
          current=normalizeState(data);render();
          if(typeof fromSaved==='function'&&byId('adminContent')&&!byId('adminContent').classList.contains('hidden')){
            // Do not wipe draft fields. Editor is refreshed only on explicit action/login.
          }
        }
      }
      lastSuccessful=Date.now();
      setStatus('Обновлено · '+new Date().toLocaleTimeString('ru-RU'),true);
    }catch(e){
      console.warn('Academy Hub sync:',e.message||e);
      setStatus('Нет связи · показаны последние данные',false);
    }finally{fetching=false}
  };
  let birthdaysSignature='';
  loadBirthdays=async function(){
    if(!configured)return;
    try{
      const r=await fetch(base+'/rest/v1/birthday_public?select=display_name',{headers:{apikey:pub,Authorization:'Bearer '+pub},cache:'no-store'});
      if(!r.ok)throw Error('Birthday API '+r.status);
      const value=await r.json(),signature=JSON.stringify(value);
      if(signature!==birthdaysSignature){
        birthdaysSignature=signature;
        publicBirthdays=value;
        byId('cadetToday').textContent=value.length;
        renderBirthdays();
        byId('sideTodayBirthdays').textContent=value.length;
      }
    }catch(e){console.warn('Birthday sync:',e.message||e)}
  };
  window.addEventListener('online',()=>{load();loadBirthdays()});
  window.addEventListener('offline',()=>setStatus('Нет сети · показаны последние данные',false));
  // Clock and active-lesson highlights refresh without adding slide animations.
  let lastMinute=-1;
  setInterval(()=>{
    setDaypart();
    const m=Math.floor(Date.now()/60000);
    if(m!==lastMinute){
      lastMinute=m;
      lastScheduleSignature='';
      renderRotators(false);
      updateNotice();
    }
    if(lastSuccessful&&Date.now()-lastSuccessful>90000)
      setStatus('Связь потеряна · информация может быть устаревшей',false);
  },1000);
  // Improve TV ranking pages without ever requiring a mouse.
  const gradeExtra=document.createElement('style');
  gradeExtra.textContent='.academy-page-indicator{font-size:12px;color:#dbc28d;text-align:right;margin-top:7px;letter-spacing:.04em}';
  document.head.appendChild(gradeExtra);
  setDaypart();updateNotice();fromSaved();
})();
