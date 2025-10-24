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
  // 加载链接放在权限判断后
  const linkA = qs('#linkA'); const linkB = qs('#linkB');
  if (linkA && linkB) { linkA.classList.toggle('active', state.page === 'A'); linkB.classList.toggle('active', state.page === 'B'); }
  if (state.page === 'B') {
    // 新规则：B 页仅登录可用，且不再使用本地保存密码
    const token = localStorage.getItem('bm_token');
    if (!token) {
      alert('请先登录后再访问 B 页');
      // 回退到 A 页并终止后续逻辑：同时应用 A 页标题与副标题
      state.page = 'A';
      if (pushState) history.pushState({ page: 'A' }, '', `?page=A`);
      document.querySelectorAll('dialog')
        .forEach(d => { try { if (d && d.open) d.close(); } catch (_) {} });
      els.pageTag.textContent = 'A页';
      initPageTitle();
      if (linkA && linkB) { linkA.classList.add('active'); linkB.classList.remove('active'); }
      els.btnSetBPass.classList.add('hidden');
      loadLinks('A');
      return;
    }
    // 登录态下进入 B 页：每次弹窗校验后端密码，通过后再加载数据
    els.btnSetBPass.classList.remove('hidden');
    positionLockIcon();
    updateBPassButtonText();
    // 弹出验证对话框
    const dlg = els.askBDlg;
    if (!dlg) { loadLinks('B'); return; }
    dlg.showModal();
    const inp = qs('#askBPwd');
    const err = qs('#askBErr');
    try { if (inp) { inp.value=''; inp.focus(); } } catch(_){}
    if (inp && err) {
      // 避免重复绑定
      inp.oninput = () => { err.hidden = true; };
    }
    const btnCancel = qs('#btnAskBCancel');
    const btnOk = qs('#btnAskBOk');
    if (btnCancel) btnCancel.onclick = () => { dlg.close(); switchToPage('A'); };
    if (btnOk) btnOk.onclick = async () => {
      const v = (inp && inp.value ? inp.value.trim() : '');
      try {
        const r = await window.BMApi?.pages.verifyB(v);
        if (r && (r.ok === true || r.ok === 'true')) {
          dlg.close();
          loadLinks('B');
        } else { alert('密码不正确'); }
      } catch (_) { alert('验证失败'); }
    };
    if (inp) {
      inp.onkeydown = (e)=>{ if (e.key === 'Enter') { e.preventDefault(); btnOk && btnOk.click(); }};
    }
  } else {
    sessionStorage.removeItem(KEYS.bAuthed);
    els.btnSetBPass.classList.add('hidden');
    loadLinks('A');
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
  // 不再依赖本地口令状态，仅在显示时保持按钮可见
  els.btnSetBPass.classList.remove('lock-set');
}

export function requireBAuth() {
  // 按新规则，此函数不再需要任何本地或后端校验逻辑，保留空壳以兼容现有调用处
  return;
}
