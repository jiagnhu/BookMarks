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
        if (resp && resp.token) { window.BMApi.setToken(resp.token); state.user = resp.user?.username || username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); els.loginDlg.close(); return; }
      }
      const expected = localStorage.getItem(KEYS.loginPwd) || DEFAULT;
      if (password === expected) { state.user = username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); els.loginDlg.close(); }
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

  els.avatar.onclick = () => {
    if (confirm('确认退出登录？')) {
      state.user = null; localStorage.removeItem(KEYS.user); if (window.BMApi) window.BMApi.setToken(''); renderLoginState(); alert('已退出登录');
    }
  };
  els.btnLogout.onclick = () => { state.user = null; localStorage.removeItem(KEYS.user); if (window.BMApi) window.BMApi.setToken(''); renderLoginState(); alert('已退出登录'); };
  els.btnChangePwd.onclick = () => { els.changeDlg.showModal(); };
  qs('#btnPwdCancel').onclick = () => els.changeDlg.close();
  qs('#btnPwdOk').onclick = async () => {
    const oldp = qs('#oldPwd').value, newp = qs('#newPwd').value;
    const cur = localStorage.getItem(KEYS.loginPwd) || DEFAULT;
    if (oldp !== cur) { alert('旧密码不正确'); return; }
    if (!newp) { alert('新密码不能为空'); return; }
    localStorage.setItem(KEYS.loginPwd, newp);
    els.changeDlg.close(); alert('已修改登录密码');
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
    // 登录态与皮肤联动：未登录时回退到预设壁纸，保持与原 app.js 一致
    try {
      const authed = !!(state.user || localStorage.getItem(KEYS.user));
      if (!authed) {
        const def = '/images/p1.jpeg';
        document.documentElement.style.setProperty('--bg-img', `url(${def})`);
        localStorage.setItem(KEYS.skin(), def);
      } else {
        // 已登录则尽力恢复当前皮肤（若后端可用），否则使用本地存储皮肤
        (async () => {
          try {
            if (window.BMApi) {
              const cur = await window.BMApi.skins.currentGet();
              if (cur && (cur.url || typeof cur === 'string')) {
                const url = cur.url || cur;
                document.documentElement.style.setProperty('--bg-img', `url(${url})`);
                return;
              }
            }
          } catch (_) { /* ignore */ }
          try {
            const local = localStorage.getItem(KEYS.skin());
            if (local) document.documentElement.style.setProperty('--bg-img', `url(${local})`);
          } catch (_) {}
        })();
      }
    } catch (_) {}
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
          try {
            const loginRes = await window.BMApi.auth.login(username, password);
            const token = loginRes?.token || data.token;
            if (token) { window.BMApi.setToken(token); state.user = (loginRes?.user?.username) || username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); els.registerDlg && els.registerDlg.close(); alert('注册并登录成功'); return; }
          } catch (_) {
            window.BMApi.setToken(data.token); state.user = data.user?.username || username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); els.registerDlg && els.registerDlg.close(); alert('注册并登录成功'); return;
          }
        }
      }
      if (err) { err.textContent = '注册失败：后端不可用'; err.hidden = false; }
    } catch (e) { if (err) { err.textContent = '注册失败：' + (e?.message || ''); err.hidden = false; } }
  };
}
