// Minimal self-tests kept same as in original
import { qs } from './dom.js';
import { KEYS } from './state.js';
import { adaptForLightWallpaper } from './appearance.js';

export function runSelfTests(rngs){
  const { rngBoard, rngCard, rngVig, rngShow } = rngs;
  const results = []; const ok = (name, pass, detail='')=>{ results.push({name, pass, detail}); };
  try{
    const key = KEYS.loginPwd; const DEFAULT = 'Taich@2022';
    const before = localStorage.getItem(key); localStorage.removeItem(key);
    if(!localStorage.getItem(key)) localStorage.setItem(key, DEFAULT);
    ok('默认登录密码初始化', localStorage.getItem(key)===DEFAULT);
    if(before==null) localStorage.removeItem(key); else localStorage.setItem(key,before);
  }catch(e){ ok('默认登录密码初始化', false, e.message); }
  try{ const arr = Array.from({length:20}, (_,i)=>({name:`链接 ${i+1}`, url:''})); ok('链接容量为20', arr.length===20); }catch(e){ ok('链接容量为20', false, e.message); }
  try{ sessionStorage.removeItem(KEYS.bAuthed); localStorage.setItem(KEYS.bPwd, ''); const authed = sessionStorage.getItem(KEYS.bAuthed)==='1'; ok('B页未验证前为未授权', authed===false); }catch(e){ ok('B页未验证前为未授权', false, e.message); }
  try{ const role='normal'; localStorage.setItem(KEYS.roleUsage(role), '1'); const quota = 3; const used = Number(localStorage.getItem(KEYS.roleUsage(role))||0); ok('皮肤上传剩余=2', (quota-used)===2); }catch(e){ ok('皮肤上传剩余=2', false, e.message); }
  try{
    const prev = {b: rngBoard.value, c: rngCard.value, v: rngVig.value, s: rngShow.value};
    adaptForLightWallpaper();
    ok('一键适配设置', rngBoard.value==75 && rngCard.value==80 && rngVig.value==40);
    rngBoard.value = prev.b; rngCard.value = prev.c; rngVig.value = prev.v; rngShow.value = prev.s;
  }catch(e){ ok('一键适配设置', false, e.message); }

  const allPass = results.every(r=>r.pass); const tag = qs('#selfTestTag');
  if(allPass){ tag.textContent=''; tag.style.background='transparent'; tag.style.borderColor='transparent'; tag.style.padding='0'; tag.style.margin='0'; }
  else { tag.textContent='自检有失败，详见控制台'; tag.style.background='rgba(239,68,68,.15)'; tag.style.borderColor='#7f1d1d'; tag.style.padding=''; tag.style.margin=''; }
  console.group('%c[My BookMarks] 自检结果','color:#60a5fa'); results.forEach(r=>console.log(`${r.pass?'✅':'❌'} ${r.name}${r.detail?(' - '+r.detail):''}`)); console.groupEnd();
}

