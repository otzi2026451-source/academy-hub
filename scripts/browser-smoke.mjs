import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:8765/';
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const grades=Array.from({length:25},(_,i)=>['Тестовый курсант '+String(i+1),Math.max(50,100-i)]);
 const groups=Object.fromEntries(['KRD1','KRD2','KRD3','KRD4','OTZI1','OTZI2'].map(k=>[k,{label:k,direction:k.startsWith('OTZI')?'ОТЗИ':'КРД',cadets:25,schedule:['08:30 | Математика','10:20 | Физика','12:10 | Информатика','14:30 | Физическая подготовка']}]));
 const state={studyTop:grades.slice(0,10),sportTopOverall:grades.slice(0,5),groupGrades:Object.fromEntries(Object.keys(groups).map(k=>[k,grades])),groups,birthdays:['20.11 — Тестовый курсант А','27.11 — Тестовый курсант Б'],notice:'Тестовое объявление — проверка интерфейса',noticePriority:'important'};
 let lastWrite=null;
 await page.route('**/rest/v1/app_state**',route=>{
  if(route.request().method()==='PATCH'){lastWrite=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{content:lastWrite.content||state}])});}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{content:state}])});
 });
 await page.route('**/rest/v1/birthday_public**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/rest/v1/cadets**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/auth/v1/token**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'mock-test-jwt',refresh_token:'mock-refresh',expires_in:3600})}));
 await page.route('**/rest/v1/rpc/can_access_academy**',route=>route.fulfill({status:200,contentType:'application/json',body:'true'}));
 await page.route('**/rest/v1/rpc/academy_role**',route=>route.fulfill({status:200,contentType:'application/json',body:'"admin"'}));
 await page.goto(base+'?tv=1#dashboard',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#dashboard.wallboard .wallboard-grid',{state:'attached'});
 assert(await page.locator('#academyLock').isVisible(),'Unauthorized screen must display login gate');
 assert(!(await page.locator('#dashboard').isVisible()),'Private dashboard must be hidden before login');
 await page.locator('#academyLockEmail').fill('test@example.invalid');
 await page.locator('#academyLockPassword').fill('fictional-test-password');
 await page.locator('#academyLockSubmit').click();
 await page.waitForSelector('html.academy-authorized');
 await page.waitForTimeout(1800);
 const tv=await page.evaluate(()=>{
  const board=document.querySelector('#dashboard'),birth=document.querySelector('.wb-birthdays');
  return {bodyClass:document.body.className,rect:board.getBoundingClientRect().toJSON(),w:innerWidth,h:innerHeight,birthHeight:birth.clientHeight,birthScrollHeight:birth.scrollHeight,scriptLoaded:!!document.querySelector('#academyVersionPanel'),cssLoaded:[...document.styleSheets].some(x=>String(x.href||'').includes('academy4.css')),date:document.querySelector('#clock')?.textContent};
 });
 assert(tv.bodyClass.includes('wallboard-mode'),'TV mode not active');
 assert(tv.scriptLoaded,'Academy 4 JS not loaded');
 assert(tv.cssLoaded,'Academy 4 CSS not loaded');
 assert(tv.rect.width<=tv.w+3,'TV board wider than viewport');
 assert(tv.rect.height<=tv.h+3,'TV board taller than viewport');
 assert(tv.birthScrollHeight<=tv.birthHeight+8,'Birthday panel is clipped');
 assert(/\d{2}:\d{2}:\d{2}/.test(tv.date),'Clock not updating');
 await page.screenshot({path:'/tmp/academy-tv-1920.png'});
 await page.setViewportSize({width:1366,height:768});
 await page.waitForTimeout(400);
 const scaled=await page.evaluate(()=>({rect:document.querySelector('#dashboard').getBoundingClientRect().toJSON(),w:innerWidth,h:innerHeight}));
 assert(scaled.rect.width<=scaled.w+3&&scaled.rect.height<=scaled.h+3,'TV exceeds smaller viewport');
 await page.screenshot({path:'/tmp/academy-tv-1366.png'});
 await page.goto(base+'#admin',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(500);
 assert(await page.locator('.sidebar').isVisible(),'Sidebar hidden in desktop mode');
 await page.waitForSelector('html.academy-authorized');
 assert(!(await page.locator('#academyLock').isVisible()),'Existing session should auto-restore');
 assert(!(await page.locator('#loginBox').isVisible()),'Legacy login should be hidden after sign-in');
 await page.waitForTimeout(600);
 assert(await page.locator('#adminContent').isVisible(),'Admin content did not unlock with mocked auth');
 assert(await page.locator('#academy6Workspace').isVisible(),'Academy 6 workspace is missing');
 assert(await page.locator('#v6-overview').isVisible(),'Overview tab not visible');
 await page.locator('[data-tab="schedule"]').click();
 assert(await page.locator('#v6-schedule').isVisible(),'Schedules tab missing');
 assert(await page.locator('#v5Group').count()===1,'Week group selector missing');
 assert(await page.locator('#v5Excel').count()===1,'Excel bulk import missing');
 assert(await page.locator('#v5ViewerEmail').count()===1,'TV read-only account management missing');
 assert(await page.locator('#academy6Workspace').isVisible(),'Academy 6 admin console not visible');
 const overviewDebug=await page.locator('#v6-overview').evaluate(el=>({className:el.className,style:getComputedStyle(el).display,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,parent:el.parentElement?.id,adminVisible:document.querySelector('#admin')?.className}));
 console.log('ACADEMY6_OVERVIEW',JSON.stringify(overviewDebug));
 console.log('ACADEMY6_PAGE_ERRORS',JSON.stringify(errors));
 await page.locator('[data-tab="overview"]').click();
 assert(await page.locator('#v6-overview').isVisible(),'Academy 6 overview did not open through tab navigation');
 await page.locator('[data-tab="drafts"]').click();
 assert(await page.locator('#v6-drafts').isVisible(),'Drafts tab missing');
 assert(await page.locator('.v6-draft-area input[type="datetime-local"]').count()===1,'Scheduled publication time missing');
 await page.locator('[data-tab="preview"]').click();
 assert(await page.locator('#academy6PreviewHolder iframe').count()===1,'Samsung TV preview missing');
 await page.locator('[data-tab="schedule"]').click();

  await page.locator('#v5Group').selectOption('KRD1');
 await page.locator('#v5Day').selectOption('2');
 await page.locator('#v5Schedule').fill('09:00 | Тестовая физика · кабинет 204');
 await page.locator('.v6-top-actions .btn.primary').click();
 await page.waitForTimeout(850);
 assert(lastWrite&&lastWrite.content,'Saving weekly schedule should write data');
 assert.deepEqual(lastWrite.content.weekSchedules.KRD1['2'],['09:00 | Тестовая физика · кабинет 204'],'Weekly Tuesday schedule not saved');



 // End-to-end simulated Gemini chat from the new administrator AI tab.
 let aiRequest=null;
 await page.route('**/functions/v1/parse-document',route=>{
  aiRequest=JSON.parse(route.request().postData()||'{}');
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'Тестовый ответ Gemini'})});
 });
 await page.locator('[data-tab="ai"]').click();
 assert(await page.locator('#v6-ai').isVisible(),'AI tab not available from administrator workspace');
 await page.locator('#chatPrompt').fill('Проверить AI чат');
 await page.locator('#chatBtn').click();
 await page.waitForTimeout(550);
 assert(aiRequest?.mode==='chat','AI request missing or invalid mode');
 assert(await page.locator('#chatReply').textContent()==='Тестовый ответ Gemini','AI chat response not displayed');
 // Simulate server-managed scheduled publication without touching real data.
 let draftCreated=null,draftScheduled=null;
 await page.route('**/rest/v1/rpc/academy_create_publication',route=>{
  draftCreated=JSON.parse(route.request().postData()||'{}');
  return route.fulfill({status:200,contentType:'application/json',body:'"00000000-0000-0000-0000-000000000006"'});
 });
 await page.route('**/rest/v1/rpc/academy_manage_publication',route=>{
  draftScheduled=JSON.parse(route.request().postData()||'{}');
  return route.fulfill({status:200,contentType:'application/json',body:'"scheduled"'});
 });
 await page.route('**/rest/v1/academy_publications**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.locator('[data-tab="drafts"]').click();
 await page.locator('.v6-draft-area input[type="text"]').first().fill('Тестовая публикация');
 await page.locator('.v6-draft-area input[type="datetime-local"]').fill('2030-10-20T10:00');
 await page.locator('#v6-drafts .v6-btns .btn.primary').click();
 await page.waitForTimeout(600);
 assert(draftCreated?.p_title==='Тестовая публикация','Draft creation missing');
 assert(draftScheduled?.p_action==='schedule','Scheduled publication RPC not called');
 assert(draftScheduled?.p_publish_at?.includes('2030-10-20'),'Publication timestamp invalid');
 await page.locator('[data-tab="overview"]').click();
 await page.screenshot({path:'/tmp/academy-admin.png'});


 const editorCtx=await browser.newContext({viewport:{width:1366,height:768}});
 const editorPage=await editorCtx.newPage();
 try {
  const editorErr=[];editorPage.on('pageerror',e=>editorErr.push(e.message));
  await editorPage.route('**/rest/v1/app_state**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{content:state}])}));
  await editorPage.route('**/rest/v1/birthday_public**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await editorPage.route('**/rest/v1/rpc/can_access_academy**',route=>route.fulfill({status:200,contentType:'application/json',body:'true'}));
  await editorPage.route('**/rest/v1/rpc/academy_role**',route=>route.fulfill({status:200,contentType:'application/json',body:'"editor"'}));
  await editorPage.route('**/auth/v1/token**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'editor-mock-jwt',refresh_token:'editor-refresh',expires_in:3600})}));
  let receivedDraft=null;
  await editorPage.route('**/rest/v1/rpc/academy_create_publication**',route=>{
   receivedDraft=JSON.parse(route.request().postData()||'{}');
   return route.fulfill({status:200,contentType:'application/json',body:'"00000000-0000-0000-0000-000000000006"'});
  });
  await editorPage.goto(base+'#editor6',{waitUntil:'domcontentloaded'});
  await editorPage.locator('#academyLockEmail').fill('editor@example.invalid');
  await editorPage.locator('#academyLockPassword').fill('test-role');
  await editorPage.locator('#academyLockSubmit').click();
  await editorPage.waitForSelector('html.academy-editor');
  console.log('EDITOR_DEBUG',JSON.stringify(await editorPage.locator('#editor6').evaluate(e=>({className:e.className,display:getComputedStyle(e).display,parent:e.parentElement?.className,hash:location.hash,adminClass:document.documentElement.className}))));
  assert(await editorPage.locator('#editor6').isVisible(),'Editor cabinet not visible');
  assert(!(await editorPage.locator('#admin').isVisible()),'Editor cannot access admin workspace');
  await editorPage.locator('#v6EditorTitle').fill('Тестовое объявление');
  await editorPage.locator('#v6EditorNotice').fill('Тестовая учебная информация');
  await editorPage.locator('#editor6 .btn.primary').click();
  await editorPage.waitForTimeout(350);
  assert(receivedDraft?.p_patch?.notice==='Тестовая учебная информация','Editor draft not submitted');
  assert.equal(editorErr.length,0,'Editor script exceptions: '+editorErr.join(' | '));
 }finally{await editorCtx.close()}

 const viewerContext=await browser.newContext({viewport:{width:1920,height:1080}});
 const viewerPage=await viewerContext.newPage();
 try{
  const responses=[];
  viewerPage.on('pageerror',e=>responses.push(e.message));
  await viewerPage.route('**/rest/v1/app_state**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{content:state}])}));
  await viewerPage.route('**/rest/v1/birthday_public**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await viewerPage.route('**/rest/v1/rpc/can_access_academy**',route=>route.fulfill({status:200,contentType:'application/json',body:'true'}));
  await viewerPage.route('**/rest/v1/rpc/academy_role**',route=>route.fulfill({status:200,contentType:'application/json',body:'"viewer"'}));
  await viewerPage.route('**/auth/v1/token**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'viewer-mock-jwt',refresh_token:'viewer-refresh',expires_in:3600})}));
  await viewerPage.goto(base+'?tv=1#dashboard',{waitUntil:'domcontentloaded'});
  await viewerPage.waitForSelector('#academyLockForm');
  await viewerPage.locator('#academyLockEmail').fill('viewer@example.invalid');
  await viewerPage.locator('#academyLockPassword').fill('viewer-test-only');
  await viewerPage.locator('#academyLockSubmit').click();
  await viewerPage.waitForSelector('html.academy-viewer');
  assert(await viewerPage.locator('#dashboard').isVisible(),'Viewer needs TV access');
  assert(!(await viewerPage.locator('#admin').isVisible()),'Viewer must not see admin page');
  assert(!(await viewerPage.locator('#cadets').isVisible()),'Viewer must not see cadet registry');
  assert(!(await viewerPage.locator('#ai').isVisible()),'Viewer must not see AI center');
  assert(!(await viewerPage.locator('#academy6Workspace').isVisible()),'Viewer must not see management workspace');
  assert(!(await viewerPage.locator('.nav button[data-go="admin"]').isVisible()),'Viewer must not see admin navigation');
  assert.equal(responses.length,0,'Viewer script exceptions: '+responses.join(' | '));
 }finally{await viewerContext.close()}
 assert.equal(errors.length,0,'Browser exceptions: '+errors.join(' | '));
 console.log(JSON.stringify({ok:true,checks:['TV1920','TV1366','birthdays','clock','sidebar','login','history','JavaScript'],tv,scaled},null,2));
}finally{await browser.close();}
