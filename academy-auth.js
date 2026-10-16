/* Academy Hub access gate: authenticate before fetching any protected data. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const storageKey='academy-hub-session-v1';
let session=null,refreshPending=null,ready=false,adminRole=false,editorRole=false;
const lock=el('academyLock'),form=el('academyLockForm'),error=el('academyLockError'),submit=el('academyLockSubmit');
const label=el('academyLockStatus'),email=el('academyLockEmail'),password=el('academyLockPassword');
function msg(s,isError=false){if(error){error.textContent=s;error.classList.toggle('bad',isError)}}
function wipeStorage(){try{localStorage.removeItem(storageKey)}catch{}}
function storeSession(s){
  session={access_token:s.access_token,refresh_token:s.refresh_token,expires_at:Date.now()+Math.max(60,s.expires_in||3600)*1000};
  try{localStorage.setItem(storageKey,JSON.stringify(session))}catch{}
  token=session.access_token;
}
async function authFetch(url,{method='POST',body,authorization}={}){
 const response=await fetch(base+url,{method,headers:{'apikey':pub,'Content-Type':'application/json',...(authorization?{'Authorization':'Bearer '+authorization}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error((data&&[data.msg,data.error_description,data.error].find(x=>typeof x==='string'))||'Ошибка авторизации '+response.status);
 return data;
}
async function verifyRole(jwt){
 const role=await authFetch('/rest/v1/rpc/academy_role',{body:{},authorization:jwt});
 adminRole=role==='admin';editorRole=role==='editor';
}
async function verifyAccess(jwt){
 const result=await authFetch('/rest/v1/rpc/can_access_academy',{body:{},authorization:jwt});
 if(result!==true)throw Error('У этой учётной записи нет доступа к Academy Hub.');
 await verifyRole(jwt);
}
async function refresh(s){
 const result=await authFetch('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:s.refresh_token}});
 await verifyAccess(result.access_token);
 storeSession(result);
 return result.access_token;
}
async function getToken(){
 if(!ready||!session)return null;
 if(session.expires_at-Date.now()<120000){
  if(!refreshPending)refreshPending=refresh(session).finally(()=>{refreshPending=null});
  try{await refreshPending}catch(e){logout('Сеанс истёк. Войдите снова.');return null}
 }
 return session.access_token;
}
function authorize(){
 ready=true;
 document.documentElement.classList.add('academy-authorized');
 document.documentElement.classList.toggle('academy-viewer',!adminRole&&!editorRole);
 document.documentElement.classList.toggle('academy-admin',adminRole);
 document.documentElement.classList.toggle('academy-editor',editorRole);
 if(lock)lock.hidden=true;
 if(el('loginBox'))el('loginBox').classList.add('hidden');
 if(el('adminContent'))el('adminContent').classList.toggle('hidden',!adminRole);
 if(el('cadetLocked'))el('cadetLocked').classList.add('hidden');
 if(el('cadetArea'))el('cadetArea').classList.toggle('hidden',!adminRole);
 if(el('password'))el('password').value='';
 if(password)password.value='';
 if(adminRole&&typeof fillAdmin==='function')fillAdmin();
 if(adminRole&&typeof window.academy6ShowTab==='function')window.academy6ShowTab('overview');
 if(editorRole&&typeof go==='function')go('editor6');
 else if(!adminRole&&typeof go==='function')go('dashboard');
 if(typeof load==='function')load();
 if(typeof loadBirthdays==='function')loadBirthdays();
 if(typeof window.academy7OnAuthorized==='function')window.academy7OnAuthorized();
 if(adminRole&&typeof loadRoster==='function')loadRoster();
}
function logout(message='Вы вышли из системы.'){
 const old=session?.access_token;
 ready=false;adminRole=false;editorRole=false;session=null;token='';wipeStorage();
 document.documentElement.classList.remove('academy-authorized','academy-viewer','academy-admin','academy-editor');
 if(lock)lock.hidden=false;
 if(el('loginBox'))el('loginBox').classList.remove('hidden');
 if(el('adminContent'))el('adminContent').classList.add('hidden');
 if(el('cadetLocked'))el('cadetLocked').classList.remove('hidden');
 if(el('cadetArea'))el('cadetArea').classList.add('hidden');
 if(el('password'))el('password').value='';
 if(password)password.value='';
 roster=[];pendingRoster=[];publicBirthdays=[];
 current=normalizeState({});
 if(typeof render==='function')render();
 msg(message);
 if(typeof go==='function' && !location.search.includes('tv=1'))go('dashboard');
 if(old&&configured)fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:pub,Authorization:'Bearer '+old}}).catch(()=>{});
}
async function signIn(usr,pwd){
 if(!configured)throw Error('Подключение Supabase не настроено');
 if(!usr||!pwd)throw Error('Введите email и пароль');
 const result=await authFetch('/auth/v1/token?grant_type=password',{body:{email:usr,password:pwd}});
 try{await verifyAccess(result.access_token)}
 catch(e){return Promise.reject(e)}
 storeSession(result);authorize();msg('');
}
async function start(){
 if(!configured){msg('Не настроен config.js. Обратитесь к администратору.',true);return}
 let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null')}catch{}
 if(saved?.refresh_token){
  if(label)label.textContent='Восстановление сеанса…';
  try{await refresh(saved);authorize();return}catch(e){wipeStorage();session=null;token='';}
 }
 if(label)label.textContent='Вход в защищённый информационный центр';
 msg('Требуется авторизация.');
}
if(form)form.addEventListener('submit',async evt=>{
 evt.preventDefault();submit.disabled=true;msg('Проверка доступа…');
 try{await signIn(email.value.trim(),password.value)}
 catch(e){msg(e.message||'Вход не выполнен',true)}
 finally{submit.disabled=false}
});
const legacyLogin=el('loginBtn');
if(legacyLogin)legacyLogin.onclick=async()=>{
 const status=el('loginInfo');legacyLogin.disabled=true;
 try{await signIn(el('email').value.trim(),el('password').value);status.textContent=''}
 catch(e){status.textContent=e.message||'Вход не выполнен'}
 finally{legacyLogin.disabled=false}
};
const legacyLogout=el('logoutBtn');if(legacyLogout)legacyLogout.onclick=()=>logout();
const originalLoad=load,originalBirthdayLoad=loadBirthdays;
load=async function(){if(!ready)return;const fresh=await getToken();if(!fresh)return;return originalLoad()};
loadBirthdays=async function(){if(!ready)return;const fresh=await getToken();if(!fresh)return;return originalBirthdayLoad()};
window.academySession={getToken,signOut:()=>logout(),isAuthorized:()=>ready,canEdit:()=>ready&&adminRole,canDraft:()=>ready&&(adminRole||editorRole),role:()=>adminRole?'admin':editorRole?'editor':ready?'viewer':'none'};
setInterval(async()=>{if(!ready||!session)return;try{await verifyAccess(await getToken())}catch{logout('Доступ отозван. Пожалуйста, войдите снова.')}},60000);
let latestRefresh=0;
setInterval(async()=>{
 if(!ready)return;
 if(Date.now()-latestRefresh<30000)return;
 latestRefresh=Date.now();
 await getToken();
},30000);
start();
})();
