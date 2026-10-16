import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const extJs=readFileSync('academy4.js','utf8');
const css=readFileSync('academy4.css','utf8');
const auth=readFileSync('academy-auth.js','utf8');
const planner=readFileSync('academy5.js','utf8');
const controls=readFileSync('academy6.js','utf8');
const controlsCss=readFileSync('academy6.css','utf8');
const tvCss=readFileSync('academy-tv-6.2.css','utf8');
const tvCode=readFileSync('academy-tv-6.2.js','utf8');
const ops7=readFileSync('academy7.js','utf8');
const styles7=readFileSync('academy7.css','utf8');
const plannerCSS=readFileSync('academy5.css','utf8');
assert.match(html,/<script src="academy4\.js\?v=4\.0\.1"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="academy4\.css\?v=4\.0\.1">/);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1,'expected exactly one inline application script');
new Script(scripts[0],{filename:'index-inline.js'});
new Script(extJs,{filename:'academy4.js'});
new Script(auth,{filename:'academy-auth.js'});
new Script(planner,{filename:'academy5.js'});
new Script(controls,{filename:'academy6.js'});
new Script(tvCode,{filename:'academy-tv-6.2.js'});
new Script(ops7,{filename:'academy7.js'});
assert.match(html,/<script src="academy7\.js\?v=7\.0\.1"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="academy7\.css\?v=7\.0\.1">/);
for(const marker of ['academy_admin_device_report','academy_revoke_member','academy_state_backups','academy_restore_state_backup','v6-security7','v6-search7','v6-diagnostics7','v6-calendar7','v6-review7']){
 assert.match(ops7,new RegExp(marker));
}
assert.match(styles7,/a7-diagnostic/);

assert.match(html,/<link rel="stylesheet" href="academy-tv-6\.2\.css\?v=6\.2\.1">/);
assert.match(html,/<script src="academy-tv-6\.2\.js\?v=6\.2\.1"><\/script>/);
assert.match(tvCss,/width:100vw!important/);
assert.match(tvCss,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
assert.match(tvCode,/fillTenPlaces/);
assert.match(tvCode,/readableGrades/);
assert.match(html,/<script src="academy6\.js\?v=6\.2\.0"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="academy6\.css\?v=6\.1\.0">/);
assert.match(controls,/academy_create_publication/);
assert.match(controls,/academy_manage_publication/);
assert.match(controls,/academy_grant_editor/);
assert.match(controls,/academy6PreviewHolder/);
assert.match(controlsCss,/v6-layout/);
assert.match(html,/<script src="academy5\.js\?v=5\.2\.0"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="academy5\.css\?v=5\.1\.0">/);
assert.match(planner,/academy_grant_viewer/);
assert.match(planner,/weekSchedules/);
assert.match(planner,/v5Excel/);
assert.match(planner,/gradeSnapshots/);
assert.match(auth,/academy_role/);
assert.match(plannerCSS,/academy-viewer/);
assert.match(html,/<script src="academy-auth\.js\?v=4\.3\.0"><\/script>/);
assert.match(html,/html:not\(\.academy-authorized\) body \.app/);
assert.match(html,/id="academyLockForm"/);
assert.match(auth,/\/rest\/v1\/rpc\/can_access_academy/);
assert.doesNotMatch(extJs,/Authorization:'Bearer '\+pub/);
assert.doesNotMatch(html,/Authorization:'Bearer '\+pub/);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'duplicate HTML id');
for(const id of ['dashboard','admin','cadets','ai','studyList','sportList','groupGrid','gradeRotator','birthdayList','noticeBox','clock','loginBtn','saveBtn','chatBtn','parseBtn','publishAiBtn']){
  assert.ok(ids.includes(id),'required element missing: '+id);
}
assert.match(extJs,/app_state_history/);
assert.match(extJs,/scheduleHtml=function/);
assert.match(extJs,/loadBirthdays=async function/);
assert.ok(css.includes('.lesson-current'));
assert.ok(css.includes('.wb-birthdays'));
assert.doesNotMatch(html,/sb_secret_|service_role|GEMINI_API_KEY\s*[:=]\s*['"][^'"]+/);
console.log('Academy Hub 4.0 static smoke tests passed; ids='+ids.length+', JS='+extJs.length);
