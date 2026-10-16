/* Academy Hub 6.2: non-destructive wallboard quality pass */
(function(){
'use strict';
const tv=()=>document.body.classList.contains('wallboard-mode');
const byId=id=>document.getElementById(id);
function fillTenPlaces(){
 if(!tv())return;
 const list=byId('studyList');
 if(!list)return;
 const actual=Math.min(10,Array.isArray(current.studyTop)?current.studyTop.length:0);
 const rows=[...list.querySelectorAll(':scope > li')];
 // A single "No data" list item is a status, not a scored cadet.
 if(actual===0)list.innerHTML='';
 else if(rows.some(row=>row.classList.contains('rank-empty')))rows.filter(row=>row.classList.contains('rank-empty')).forEach(row=>row.remove());
 for(let rank=actual+1;rank<=10;rank++){
  const li=document.createElement('li');
  li.className='rank-empty';
  li.innerHTML='<div class="rank-no">'+rank+'</div><div class="rank-name"><b>Место свободно</b></div><div class="score">—</div>';
  list.append(li);
 }
}
function readableGrades(){
 if(!tv())return;
 const wrapper=byId('gradeRotator');
 if(!wrapper)return;
 const key=GROUPS[gradeIndex]?.key;
 const list=wrapper.querySelector('ol.ranking');
 if(!list)return;
 const grades=Array.isArray(current.groupGrades?.[key])?current.groupGrades[key]:[];
 if(grades.length){
  if(list.querySelector('.rank-empty-state')){
   list.innerHTML=rankHtml(grades,'Результат группы');
  }
  return;
 }
 list.innerHTML='<li class="rank-empty-state"><strong>Оценки не внесены</strong>Для этой группы пока нет подтверждённых результатов.</li>';
}
function compactEmptySports(){
 if(!tv())return;
 const sections=byId('sportSections');
 if(!sections)return;
 for(const card of sections.querySelectorAll('.sport-card')){
  const rank=card.querySelector('.mini-rank');
  if(!rank||rank.children.length!==1)continue;
  const only=rank.children[0];
  if(only.textContent.includes('Нет данных')){
   only.classList.add('no-records');
   const title=only.querySelector('b');if(title)title.textContent='Результаты ожидаются';
   const score=only.querySelector('span');if(score)score.remove();
  }
 }
}
const previousOverview=renderOverview;
renderOverview=function(){
 previousOverview();
 fillTenPlaces();
 compactEmptySports();
 readableGrades();
};
const previousRotators=renderRotators;
renderRotators=function(animate){
 const result=previousRotators(animate);
 readableGrades();
 return result;
};
function refreshHealth(){
 if(!tv())return;
 let pill=byId('tvHealth');
 if(!pill){
  const header=byId('dashboard')?.querySelector('.topbar .head-panel');
  if(!header)return;
  pill=document.createElement('div');pill.className='tv-health';pill.id='tvHealth';header.append(pill);
 }
 const saved=current?.lastContentUpdate||current?.updatedAt;
 const timestamp=saved?Date.parse(saved):NaN;
 const stale=Number.isFinite(timestamp)&&Date.now()-timestamp>14*86400000;
 pill.classList.toggle('aged',stale);
 pill.textContent=stale?'Данные старше 14 дней':'Табло · автоматическое обновление';
}
const previousRender=render;
render=function(){const result=previousRender();fillTenPlaces();compactEmptySports();readableGrades();refreshHealth();return result};
setInterval(()=>{if(tv()&&document.documentElement.classList.contains('academy-authorized'))refreshHealth()},10000);
if(tv()){fillTenPlaces();compactEmptySports();readableGrades();refreshHealth()}
})();