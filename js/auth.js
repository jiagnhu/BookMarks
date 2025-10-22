// Authentication, avatar, login/register/change-password flows
import { els, qs } from './dom.js';
import { KEYS, state } from './state.js';

export function initLogin() {
  const DEFAULT = 'Taich@2022';
  els.btnLoginTop.onclick = () => { els.loginDlg.showModal(); };
  if (els.btnOpenRegister) els.btnOpenRegister.onclick = () => { if (els.registerDlg) { els.loginDlg.close(); els.registerDlg.showModal(); } };
  qs('#btnLoginCancel').onclick = () => els.loginDlg.close();
  qs('#btnLoginOk').onclick = async () => {
    const err = qs('#loginErr'); if (err) { err.hidden = true; err.textContent = ''; }
    const username = (qs('#loginUser').value || 'demo').trim();
    const password = qs('#loginPwd').value || '';
    if (!username) { if (err) { err.textContent = '请输入用户名'; err.hidden = false; } qs('#loginUser').focus(); return; }
    if (!password) { if (err) { err.textContent = '请输入密码'; err.hidden = false; } qs('#loginPwd').focus(); return; }
    try {
      if (window.BMApi) {
        const resp = await window.BMApi.auth.login(username, password);
        if (resp && resp.token) {
          // 登录成功后，如果游客期间本地有链接编辑，询问是否同步到账号
          const guestLinksA = localStorage.getItem(KEYS.links('A'));
          const guestLinksB = localStorage.getItem(KEYS.links('B'));
          window.BMApi.setToken(resp.token);
          try { sessionStorage.removeItem(KEYS.bAuthed); } catch(_){}
          state.user = resp.user?.username || username;
          localStorage.setItem(KEYS.user, state.user);
          localStorage.setItem('bm_token', resp.token);
          state.mode = 'user';
          renderLoginState();
          try { history.replaceState({ page: 'A' }, '', '?page=A'); } catch(_){}
          try { import('./ab.js').then(m=>m.switchToPage && m.switchToPage('A', false)).catch(()=>{}); } catch(_){}
          try { import('./headers.js').then(m=>m.initPageTitle && m.initPageTitle()).catch(()=>{}); } catch(_){}
          if (guestLinksA || guestLinksB) {
            try { await openSyncDialogAndHandle(guestLinksA, guestLinksB); } catch (_) { /* 忽略同步失败 */ }
          }
          clearLocalOverrides();
          // 登录后立即应用用户设置与皮肤，并刷新链接列表
          try { await applyUserSessionAfterLogin(); } catch(_){}
          try { const iu = qs('#loginUser'); const ip = qs('#loginPwd'); if (iu) iu.value=''; if (ip) ip.value=''; } catch(_){}
          els.loginDlg.close();
          return;
        }
      }
      const expected = localStorage.getItem(KEYS.loginPwd) || DEFAULT;
      if (password === expected) { state.user = username; localStorage.setItem(KEYS.user, state.user); state.mode = 'guest'; renderLoginState(); try { const iu = qs('#loginUser'); const ip = qs('#loginPwd'); if (iu) iu.value=''; if (ip) ip.value=''; } catch(_){} els.loginDlg.close(); }
      else { if (err) { err.textContent = '密码不正确'; err.hidden = false; } }
    } catch (e) { if (err) { err.textContent = '登录失败：' + (e?.message || ''); err.hidden = false; } }
  };

  function updateAvatar() {
    const saved = localStorage.getItem(KEYS.user);
    if (saved) {
      els.avatar.textContent = saved.slice(0, 1).toUpperCase();
      els.avatar.classList.add('show');
      els.btnLoginTop.style.display = 'none';
      if (els.btnLogout) els.btnLogout.style.display = 'inline-flex';
    } else {
      els.avatar.classList.remove('show');
      els.btnLoginTop.style.display = 'inline-flex';
      if (els.btnLogout) els.btnLogout.style.display = 'none';
    }
  }
  (function () {
    const saved = localStorage.getItem(KEYS.user);
    if (saved) { state.user = saved; }
    updateAvatar();
  })();
  // 初始渲染一次，以便未登录时隐藏账户/自定义皮肤区
  try { renderLoginState(); } catch (_) {}

  els.avatar.onclick = () => {
    if (confirm('确认退出登录？')) {
      state.user = null; localStorage.removeItem(KEYS.user); localStorage.removeItem('bm_token'); if (window.BMApi) window.BMApi.setToken(''); try { sessionStorage.removeItem(KEYS.bAuthed); } catch(_){} state.mode = 'guest';
      applyGuestDefaults();
      try { import('./headers.js').then(m=>m.initPageTitle && m.initPageTitle()).catch(()=>{}); } catch(_){}
      try { const page = new URLSearchParams(location.search).get('page') || 'A'; import('./links.js').then(m=>m.loadLinks && m.loadLinks(page)).catch(()=>{}); } catch(_){}
      try { history.replaceState({ page: 'A' }, '', '?page=A'); } catch(_){}
      try { import('./ab.js').then(m=>m.switchToPage && m.switchToPage('A', false)).catch(()=>{}); } catch(_){}
      renderLoginState(); alert('已退出登录');
    }
  };
  els.btnLogout.onclick = () => { state.user = null; localStorage.removeItem(KEYS.user); localStorage.removeItem('bm_token'); if (window.BMApi) window.BMApi.setToken(''); try { sessionStorage.removeItem(KEYS.bAuthed); } catch(_){} state.mode = 'guest'; applyGuestDefaults(); try { history.replaceState({ page: 'A' }, '', '?page=A'); } catch(_){} try { import('./ab.js').then(m=>m.switchToPage && m.switchToPage('A', false)); } catch(_){} try { import('./links.js').then(m=>m.loadLinks && m.loadLinks('A')).catch(()=>{}); } catch(_){} try { import('./headers.js').then(m=>m.initPageTitle && m.initPageTitle()).catch(()=>{}); } catch(_){} renderLoginState(); alert('已退出登录'); };
  els.btnChangePwd.onclick = () => { els.changeDlg.showModal(); };
  qs('#btnPwdCancel').onclick = () => els.changeDlg.close();
  qs('#btnPwdOk').onclick = async () => {
    const oldp = qs('#oldPwd').value, newp = qs('#newPwd').value;
    if (!newp) { alert('新密码不能为空'); return; }
    // 必须登录且具备后端 API 才允许修改
    const hasToken = !!(window.BMApi && localStorage.getItem('bm_token'));
    if (!hasToken) { alert('请先登录后再修改密码'); return; }
    try {
      if (window.BMApi) {
        await window.BMApi.auth.changePassword(oldp, newp);
        els.changeDlg.close(); alert('已修改登录密码');
      }
    } catch (e) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('old password') || msg.includes('旧')) alert('旧密码不正确');
      else alert('修改失败：' + (e?.message || ''));
    }
  };
  const btnResetAll = qs('#btnResetAll');
  if (btnResetAll) btnResetAll.onclick = () => {
    if (confirm('确认将登录密码重置为初始值，并清空B页密码？')) {
      localStorage.setItem(KEYS.loginPwd, DEFAULT);
      localStorage.removeItem(KEYS.bPwd);
      alert('已恢复到初始状态');
    }
  };

  function renderLoginState() {
    updateAvatar();
    // 切换“账户”与“自定义皮肤”区在设置面板中的可见性
    try {
      const authed = !!(state.user || localStorage.getItem(KEYS.user));
      const accountSec = document.getElementById('accountSection');
      if (accountSec) accountSec.style.display = authed ? '' : 'none';
      const rowChange = els.btnChangePwd ? els.btnChangePwd.closest('.row') : null;
      const rowLogout = els.btnLogout ? els.btnLogout.closest('.row') || els.btnLogout : null;
      const rowCustom = els.skinUpload ? els.skinUpload.closest('.row') : null;
      const rowApply = els.btnApplySkin ? els.btnApplySkin.closest('.row') : null;
      const rowQuota = els.skinQuotaHint ? els.skinQuotaHint.closest('.row') : null;
      const rowMine = els.customSkins;
      const disp = authed ? '' : 'none';
      rowChange && (rowChange.style.display = disp);
      rowLogout && (rowLogout.style.display = disp);
      rowCustom && (rowCustom.style.display = disp);
      rowApply && (rowApply.style.display = disp);
      rowQuota && (rowQuota.style.display = disp);
      rowMine && (rowMine.style.display = disp);
    } catch (_) {}
    // 登录态与皮肤联动：未登录时回退到预设壁纸，保持与原 app.js 一致
    try {
      const authed = !!(state.user || localStorage.getItem(KEYS.user));
      if (!authed) {
        const def = '/images/p1.jpeg';
        // 仅在本地没有已选择皮肤时才回退，避免覆盖用户刚设置的本地皮肤
        const local = localStorage.getItem(KEYS.skin());
        if (!local) {
          document.documentElement.style.setProperty('--bg-img', `url(${def})`);
          document.body.style.backgroundImage = `url(${def})`;
          localStorage.setItem(KEYS.skin(), def);
        } else {
          document.documentElement.style.setProperty('--bg-img', `url(${local})`);
          document.body.style.backgroundImage = `url(${local})`;
        }
      } else {
        // 已登录则尽力恢复当前皮肤（若后端可用），否则使用本地存储皮肤
        (async () => {
          try {
            if (window.BMApi) {
              const cur = await window.BMApi.skins.currentGet();
              if (cur && (cur.url || typeof cur === 'string')) {
                const url = cur.url || cur;
                document.documentElement.style.setProperty('--bg-img', `url(${url})`);
                document.body.style.backgroundImage = `url(${url})`;
                return;
              }
            }
          } catch (_) { /* ignore */ }
          try {
            const local = localStorage.getItem(KEYS.skin());
            if (local) {
              document.documentElement.style.setProperty('--bg-img', `url(${local})`);
              document.body.style.backgroundImage = `url(${local})`;
            }
          } catch (_) {}
        })();
      }
    } catch (_) {}
  }

  function clearLocalOverrides(){
    try{
      // 以服务端为准：清理本地覆写 & 脏标记
      ['A','B'].forEach(p=>{
        localStorage.removeItem(KEYS.title(p));
        localStorage.removeItem(KEYS.motto(p));
        localStorage.removeItem(KEYS.links(p));
      });
      Object.assign(state.dirty, { pageA:false, pageB:false, settings:false, skin:false });
      // 外观与皮肤
      Object.values(KEYS.ui).forEach(k=> localStorage.removeItem(k));
      localStorage.removeItem(KEYS.skin());
    }catch(_){ }
  }

  // 登录成功后的会话应用：拉取并应用用户设置与皮肤，并刷新当前页链接
  async function applyUserSessionAfterLogin(){
    try{
      // 1) 外观设置：强制从后端获取并应用
      try{
        const mod = await import('./appearance.js');
        if (mod && mod.initAppearance) await mod.initAppearance();
      }catch(_){ }
      // 2) 当前皮肤
      try{
        if (window.BMApi){
          const cur = await window.BMApi.skins.currentGet();
          const url = (cur && (cur.url || cur)) ? (cur.url || cur) : (localStorage.getItem(KEYS.skin()) || '/images/p1.jpeg');
          document.documentElement.style.setProperty('--bg-img', `url(${url})`);
          document.body.style.backgroundImage = `url(${url})`;
          localStorage.setItem(KEYS.skin(), url);
        }
      }catch(_){ }
      // 3) 刷新当前页链接（登录态切换为 /links 源）
      try{
        const page = new URLSearchParams(location.search).get('page') || 'A';
        const { loadLinks } = await import('./links.js');
        await loadLinks(page);
      }catch(_){ }
    }catch(_){ }
  }

  async function applyGuestDefaults(){
    try{
      if (window.BMApi){
        // 公共设置（未登录时 settings.get 会访问 /settings/public）
        const s = await window.BMApi.settings.get();
        if (s){
          const rngB = document.getElementById('rngBoard'); const rngC = document.getElementById('rngCard'); const rngV = document.getElementById('rngVignette'); const rngS = document.getElementById('rngShowcase');
          if (rngB) rngB.value = s.boardAlpha ?? 55;
          if (rngC) rngC.value = s.cardAlpha ?? 55;
          if (rngV) rngV.value = s.vignette ?? 25;
          if (rngS) rngS.value = s.showcaseWidth ?? 28;
          document.body.classList.toggle('contrast', !!s.contrast);
          try { (await import('./appearance.js')).applyAppearance(); } catch(_){}
        }
        // 设置皮肤为第一个预设
        try{
          const preset = await window.BMApi.skins.preset();
          const first = Array.isArray(preset) ? preset[0] : null;
          const url = first?.url || '/images/p1.jpeg';
          document.documentElement.style.setProperty('--bg-img', `url(${url})`);
          document.body.style.backgroundImage = `url(${url})`;
          localStorage.setItem(KEYS.skin(), url);
        }catch(_){
          const def = '/images/p1.jpeg';
          document.documentElement.style.setProperty('--bg-img', `url(${def})`);
          document.body.style.backgroundImage = `url(${def})`;
          localStorage.setItem(KEYS.skin(), def);
        }
      }
    }catch(_){ }
  }

  // Register
  const btnRegCancel = qs('#btnRegCancel');
  const btnRegOk = qs('#btnRegOk');
  if (btnRegCancel) btnRegCancel.onclick = () => { const e = qs('#regErr'); if (e) { e.hidden = true; e.textContent = ''; } els.registerDlg && els.registerDlg.close(); };
  if (btnRegOk) btnRegOk.onclick = async () => {
    const err = qs('#regErr'); if (err) { err.hidden = true; err.textContent = ''; }
    const username = (qs('#regUser').value || '').trim();
    const password = (qs('#regPwd').value || '');
    if (!username) { if (err) { err.textContent = '请输入用户名（3-20位）'; err.hidden = false; } qs('#regUser').focus(); return; }
    if (username.length < 3 || username.length > 20 || !/^\w+$/.test(username)) { if (err) { err.textContent = '用户名需为3-20位字母数字或下划线'; err.hidden = false; } qs('#regUser').focus(); return; }
    if (!password) { if (err) { err.textContent = '请输入密码（至少6位）'; err.hidden = false; } qs('#regPwd').focus(); return; }
    if (password.length < 6) { if (err) { err.textContent = '密码至少6位'; err.hidden = false; } qs('#regPwd').focus(); return; }
    try {
      if (window.BMApi) {
        const resp = await fetch((window.API_BASE || '/api/v1') + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        if (!resp.ok) { const msg = await resp.text(); throw new Error(msg || '注册失败'); }
        const data = await resp.json();
        if (data && data.token) {
          // 统一走与登录相同的后续逻辑（含游客链接同步提示）
          try {
            const loginRes = await window.BMApi.auth.login(username, password);
            const token = loginRes?.token || data.token;
            if (token) {
              const guestLinksA = localStorage.getItem(KEYS.links('A'));
              const guestLinksB = localStorage.getItem(KEYS.links('B'));
              window.BMApi.setToken(token);
              try { sessionStorage.removeItem(KEYS.bAuthed); } catch(_){}
              state.user = (loginRes?.user?.username) || username;
              localStorage.setItem(KEYS.user, state.user);
              localStorage.setItem('bm_token', token);
              state.mode = 'user';
              renderLoginState();
              try { history.replaceState({ page: 'A' }, '', '?page=A'); } catch(_){}
              try { import('./ab.js').then(m=>m.switchToPage && m.switchToPage('A', false)).catch(()=>{}); } catch(_){}
              try { import('./headers.js').then(m=>m.initPageTitle && m.initPageTitle()).catch(()=>{}); } catch(_){}
              if (guestLinksA || guestLinksB) { try { await openSyncDialogAndHandle(guestLinksA, guestLinksB); } catch(_){} }
              clearLocalOverrides();
              try { await applyUserSessionAfterLogin(); } catch(_){}
              els.registerDlg && els.registerDlg.close();
              alert('注册并登录成功');
              return;
            }
          } catch (_) {
            const token = data.token;
            window.BMApi.setToken(token);
            try { sessionStorage.removeItem(KEYS.bAuthed); } catch(_){}
            state.user = data.user?.username || username;
            localStorage.setItem(KEYS.user, state.user);
            localStorage.setItem('bm_token', token);
            state.mode = 'user';
            renderLoginState();
            try { history.replaceState({ page: 'A' }, '', '?page=A'); } catch(_){}
            try { import('./ab.js').then(m=>m.switchToPage && m.switchToPage('A', false)).catch(()=>{}); } catch(_){}
            try { import('./headers.js').then(m=>m.initPageTitle && m.initPageTitle()).catch(()=>{}); } catch(_){}
            try { import('./headers.js').then(m=>m.initPageTitle && m.initPageTitle()).catch(()=>{}); } catch(_){}
            const guestLinksA = localStorage.getItem(KEYS.links('A'));
            const guestLinksB = localStorage.getItem(KEYS.links('B'));
            if (guestLinksA || guestLinksB) { try { await openSyncDialogAndHandle(guestLinksA, guestLinksB); } catch(_){} }
            clearLocalOverrides();
            try { await applyUserSessionAfterLogin(); } catch(_){}
            els.registerDlg && els.registerDlg.close();
            alert('注册并登录成功');
            return;
          }
        }
      }
      if (err) { err.textContent = '注册失败：后端不可用'; err.hidden = false; }
    } catch (e) { if (err) { err.textContent = '注册失败：' + (e?.message || ''); err.hidden = false; } }
  };
}

// 将游客 A/B 两页的本地链接合并为 20 槽位数组（A在前，B在后，超出截断，不足补空）
function mergeGuestLinksToUser(rawA, rawB){
  try{
    const a = rawA ? JSON.parse(rawA) : [];
    const b = rawB ? JSON.parse(rawB) : [];
    const list = [...a, ...b]
      .map((it, idx) => ({ name: it?.name || `链接 ${idx+1}`, url: it?.url || '' }))
      .slice(0, 20);
    while (list.length < 20) list.push({ name: `链接 ${list.length+1}`, url: '' });
    return list;
  }catch(_){ return null; }
}

// 仅追加非空：不覆盖已有用户有值项，只把游客非空链接按序填入空槽位
function appendGuestIntoUser(userLinks, rawA, rawB){
  try{
    const guest = mergeGuestLinksToUser(rawA, rawB) || [];
    const user = Array.isArray(userLinks) && userLinks.length ? userLinks.slice(0,20) : Array.from({length:20},(_,i)=>({name:`链接 ${i+1}`, url:''}));
    let gi = 0;
    for (let i=0;i<user.length && gi<guest.length;i++){
      if (!user[i].url) { // 空槽位
        // 找到下一个guest非空
        while (gi<guest.length && !guest[gi].url) gi++;
        if (gi<guest.length) { user[i] = { name: guest[gi].name || user[i].name, url: guest[gi].url || '' }; gi++; }
      }
    }
    return user;
  }catch(_){ return null; }
}

async function openSyncDialogAndHandle(rawA, rawB){
  try{
    if (localStorage.getItem('bm_sync_links_never') === '1') return false;
  }catch(_){ }
  const dlg = document.getElementById('dlgSyncLinks');
  if (!dlg) return;
  const btnAppend = document.getElementById('btnSyncAppend');
  const btnOverwrite = document.getElementById('btnSyncOverwrite');
  const btnCancel = document.getElementById('btnSyncCancel');
  const chkNever = document.getElementById('chkSyncNever');
  return new Promise((resolve)=>{
    const cleanup = ()=>{
      btnAppend.onclick = null; btnOverwrite.onclick = null; btnCancel.onclick = null; try{ dlg.close(); }catch(_){}
    };
    btnAppend.onclick = async ()=>{
      try{
        if (chkNever && chkNever.checked) try{ localStorage.setItem('bm_sync_links_never','1'); }catch(_){ }
        // 分别拉取 A/B，按“仅追加非空”策略各自合并
        let curA = [];
        let curB = [];
        try { curA = await window.BMApi.links.get('A'); } catch(_) { curA = []; }
        try { curB = await window.BMApi.links.get('B'); } catch(_) { curB = []; }
        const mergedA = appendGuestIntoUser(curA, rawA, null);
        const mergedB = appendGuestIntoUser(curB, null, rawB);
        if (mergedA) await window.BMApi.links.put('A', mergedA.map(it=>({ name: it.name||'', url: it.url||'' })));
        if (mergedB) await window.BMApi.links.put('B', mergedB.map(it=>({ name: it.name||'', url: it.url||'' })));
        localStorage.removeItem(KEYS.links('A')); localStorage.removeItem(KEYS.links('B'));
      } finally { cleanup(); resolve(true); }
    };
    btnOverwrite.onclick = async ()=>{
      try{
        if (chkNever && chkNever.checked) try{ localStorage.setItem('bm_sync_links_never','1'); }catch(_){ }
        const mergedA = mergeGuestLinksToUser(rawA, null);
        const mergedB = mergeGuestLinksToUser(null, rawB);
        if (mergedA) await window.BMApi.links.put('A', mergedA.map(it=>({ name: it.name||'', url: it.url||'' })));
        if (mergedB) await window.BMApi.links.put('B', mergedB.map(it=>({ name: it.name||'', url: it.url||'' })));
        localStorage.removeItem(KEYS.links('A')); localStorage.removeItem(KEYS.links('B'));
      } finally { cleanup(); resolve(true); }
    };
    btnCancel.onclick = ()=>{ if (chkNever && chkNever.checked) try{ localStorage.setItem('bm_sync_links_never','1'); }catch(_){ } cleanup(); resolve(false); };
    try{ dlg.showModal(); }catch(_){ /* 如果不支持 <dialog> 则忽略 */ resolve(false); }
  });
}

// 导出以便必要时从外部触发
export function renderLoginStateExternal(){}
