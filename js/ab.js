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
    const err = qs('#askBErr');
    const inpEl = qs('#askBPwd');
    if (inpEl) {
      inpEl.addEventListener('input', () => { if (err) err.hidden = true; });
      const tog = qs('#toggleAskB');
      if (tog){
        tog.addEventListener('click', ()=>{
          const t = inpEl.getAttribute('type') === 'password' ? 'text' : 'password';
          inpEl.setAttribute('type', t);
          try{
            const svg = tog.querySelector('svg');
            if (svg){
              const path = svg.querySelector('path');
              if (path){
                if (t === 'password') {
                  path.setAttribute('d', 'M12 4.5c-4.97 0-9.16 3.11-10.82 7.5c1.66 4.39 5.85 7.5 10.82 7.5s9.16-3.11 10.82-7.5C21.16 7.61 16.97 4.5 12 4.5Zm0 12.5a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z');
                } else {
                  path.setAttribute('d', 'M2.81 2.81L1.39 4.22l3.02 3.02C2.8 8.65 1.4 10.43 1.18 12c1.66 4.39 5.85 7.5 10.82 7.5c2.08 0 4.02-.52 5.73-1.44l3.88 3.88l1.41-1.41L2.81 2.81zM12 6.5c1.03 0 1.98.31 2.77.84l-1.46 1.46A3 3 0 0 0 9.2 12.9l-1.6 1.6A4.98 4.98 0 0 1 7 12a5 5 0 0 1 5-5zm0 12c-3.97 0-7.64-2.38-9.18-6c.52-1.2 1.34-2.26 2.37-3.14l1.46 1.46A6.98 6.98 0 0 0 5 12c0 1.21.29 2.36.8 3.37l1.54-1.54A5 5 0 0 0 17.5 8.57l1.62-1.62C21.02 8.1 22.2 9.95 22.82 12c-1.54 3.62-5.21 6.5-9.18 6.5z');
                }
              }
            }
          } catch (_){ }
          inpEl.focus();
        });
      }
    }
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
  const err = qs('#askBErr');
  const inpFilter = qs('#askBPwd');
  if (inpFilter) {
    inpFilter.addEventListener('input', () => { if (err) err.hidden = true; });
    const tog = qs('#toggleAskB');
    if (tog){
      tog.addEventListener('click', ()=>{
        const t = inpFilter.getAttribute('type') === 'password' ? 'text' : 'password';
        inpFilter.setAttribute('type', t);
        try{
          const svg = tog.querySelector('svg');
          if (svg){
            const path = svg.querySelector('path');
            if (path){
              if (t === 'password') {
                path.setAttribute('d', 'M12 4.5c-4.97 0-9.16 3.11-10.82 7.5c1.66 4.39 5.85 7.5 10.82 7.5s9.16-3.11 10.82-7.5C21.16 7.61 16.97 4.5 12 4.5Zm0 12.5a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z');
              } else {
                path.setAttribute('d', 'M2.81 2.81L1.39 4.22l3.02 3.02C2.8 8.65 1.4 10.43 1.18 12c1.66 4.39 5.85 7.5 10.82 7.5c2.08 0 4.02-.52 5.73-1.44l3.88 3.88l1.41-1.41L2.81 2.81zM12 6.5c1.03 0 1.98.31 2.77.84l-1.46 1.46A3 3 0 0 0 9.2 12.9l-1.6 1.6A4.98 4.98 0 0 1 7 12a5 5 0 0 1 5-5zm0 12c-3.97 0-7.64-2.38-9.18-6c.52-1.2 1.34-2.26 2.37-3.14l1.46 1.46A6.98 6.98 0 0 0 5 12c0 1.21.29 2.36.8 3.37l1.54-1.54A5 5 0 0 0 17.5 8.57l1.62-1.62C21.02 8.1 22.2 9.95 22.82 12c-1.54 3.62-5.21 6.5-9.18 6.5z');
              }
            }
          }
        }catch(_){ }
        inpFilter.focus();
      });
    }
  }
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
