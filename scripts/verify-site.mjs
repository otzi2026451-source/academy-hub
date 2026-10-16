import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const extJs=readFileSync('academy4.js','utf8');
const css=readFileSync('academy4.css','utf8');
assert.match(html,/<script src="academy4\.js\?v=4\.0\.0"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="academy4\.css\?v=4\.0\.0">/);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1,'expected exactly one inline application script');
new Script(scripts[0],{filename:'index-inline.js'});
new Script(extJs,{filename:'academy4.js'});
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
