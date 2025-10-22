// A/B page switching and B-password auth
import { els, qs } from './dom.js';
import { KEYS, state } from './state.js';
import { initPageTitle } from './headers.js';
import { loadLinks } from './links.js';

export function initAB() {
  const linkA = qs('#linkA'); const linkB = qs('#linkB');
  if (linkA) linkA.addEventListener('click', e => { e.preventDefault(); switchToPage('A'); });
  if (linkB) linkB.addEventListener('click', e => { e.preventDefault(); switchToPage('B'); });
  window.addEventListener('resize', () => positionLockIcon());
  if (els.btnSetBPass) els.btnSetBPass.addEventListener('click', () => { els.bpassDlg && els.bpassDlg.showModal(); });
  switchToPage(state.page, false);
}

export function switchToPage(p, pushState = true) {
  if (p !== 'A' && p !== 'B') p = 'A';
  if (p === state.page && pushState === true) return;
  state.page = p;
  if (pushState) history.pushState({ page: p }, '', `?page=${p}`);
  document.querySelectorAll('dialog')
    .forEach(d => { try { if (d && d.open) d.close(); } catch (_) {} });
  els.pageTag.textContent = state.page + '页';
  initPageTitle();
  loadLinks(state.page);
  const linkA = qs('#linkA'); const linkB = qs('#linkB');
  if (linkA && linkB) { linkA.classList.toggle('active', state.page === 'A'); linkB.classList.toggle('active', state.page === 'B'); }
  if (state.page === 'B') {
    els.btnSetBPass.classList.remove('hidden');
    positionLockIcon();
    updateBPassButtonText();
    const token = localStorage.getItem('bm_token');
    const authed = sessionStorage.getItem(KEYS.bAuthed) === '1';
    if (!token) {
      // 游客：仅在本地设置了口令时要求验证
      const stored = (localStorage.getItem(KEYS.bPwd) || '').trim();
      if (stored && !authed) { requireBAuth(); }
    } else {
      // 登录：统一走后端验证（是否设置口令由后端决定）
      if (!authed) { requireBAuth(); }
    }
  } else {
    sessionStorage.removeItem(KEYS.bAuthed);
    els.btnSetBPass.classList.add('hidden');
  }
}

export function positionLockIcon() {
  const b = qs('#linkB');
  const btn = els.btnSetBPass;
  const wrap = b && b.parentElement;
  if (!(b && btn && wrap)) return;
  const bRect = b.getBoundingClientRect();
  const wRect = wrap.getBoundingClientRect();
  const left = (bRect.right - wRect.left) + 12;
  const top = (bRect.top - wRect.top) + bRect.height / 2;
  btn.style.left = left + 'px';
  btn.style.top = top + 'px';
  btn.style.transform = 'translateY(-50%)';
}

export function updateBPassButtonText() {
  if (!els.btnSetBPass) return;
  const token = localStorage.getItem('bm_token');
  if (!token) {
    const has = !!(localStorage.getItem(KEYS.bPwd) || '').trim();
    els.btnSetBPass.classList.toggle('lock-set', has);
  } else {
    // 登录态下无法即时知道后端是否设置了口令，这里保持样式不强依赖；可按需调用后端获取 hasBPassword
    els.btnSetBPass.classList.remove('hidden');
  }
}

export function requireBAuth() {
  const backend = !!window.BMApi;
  if (!backend) {
    const stored = (localStorage.getItem(KEYS.bPwd) || '').trim();
    if (!stored) { localStorage.removeItem(KEYS.bPwd); sessionStorage.setItem(KEYS.bAuthed, '1'); return; }
    if (sessionStorage.getItem(KEYS.bAuthed) === '1') { return; }
    els.askBDlg.showModal();
    try { const i = qs('#askBPwd'); if (i) { i.value=''; i.focus(); } } catch(_){}
    qs('#btnAskBCancel').onclick = () => { const i = qs('#askBPwd'); if (i) i.value=''; els.askBDlg.close(); location.href='?page=A'; };
    qs('#btnAskBOk').onclick = () => {
      const i = qs('#askBPwd');
      const v = (i && i.value ? i.value.trim() : '');
      if (!stored) { if (i) i.value=''; els.askBDlg.close(); return; }
      if (v === stored) { sessionStorage.setItem(KEYS.bAuthed, '1'); if (i) i.value=''; els.askBDlg.close(); }
      else alert('密码不正确');
    };
    return;
  }
  if (sessionStorage.getItem(KEYS.bAuthed) === '1') { return; }
  els.askBDlg.showModal();
  try { const i = qs('#askBPwd'); if (i) { i.value=''; i.focus(); } } catch(_){}
  qs('#btnAskBCancel').onclick = () => { els.askBDlg.close(); location.href='?page=A'; };
  qs('#btnAskBOk').onclick = async () => {
    const inp = qs('#askBPwd');
    const v = (inp && inp.value ? inp.value.trim() : '');
    try {
      const r = await window.BMApi.pages.verifyB(v);
      if (r && (r.ok === true || r.ok === 'true')) { sessionStorage.setItem(KEYS.bAuthed, '1'); if (inp) inp.value = ''; els.askBDlg.close(); }
      else alert('密码不正确');
    } catch (_) { alert('验证失败'); }
  };
}
