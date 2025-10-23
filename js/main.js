// Entry point that wires modules together. Mirrors original logic.
import { bindElements, els, qs } from './dom.js';
import { KEYS, state } from './state.js';
import { initServiceWorker } from './serviceWorker.js';
import { initEditableHeaders, initPageTitle } from './headers.js';
import { loadLinks } from './links.js';
import { initAB, switchToPage } from './ab.js';
import { initLogin } from './auth.js';
import { initSkin } from './skin.js';
import { initAppearance } from './appearance.js';
import { initBPassDialog } from './bpass.js';
import { runSelfTests } from './selftest.js';
import { initDrawer } from './drawer.js';

(function(){
  bindElements();

  // Cleanup potential blank B password
  try { const raw = localStorage.getItem(KEYS.bPwd); if (raw && raw.trim() === '') { localStorage.removeItem(KEYS.bPwd); } } catch(_){}

  // 探测是否登录，设置模式
  const hasToken = !!localStorage.getItem('bm_token');
  state.mode = hasToken ? 'user' : 'guest';

  initServiceWorker();
  initEditableHeaders();
  initPageTitle();
  loadLinks(state.page);
  initAB();
  initLogin();
  // 再次确保根据当前登录态隐藏/显示设置区内容
  try { const ev = new Event('bm_login_state_applied'); window.dispatchEvent(ev); } catch(_){}
  initDrawer();
  initBPassDialog();
  initSkin();
  initAppearance();
  runSelfTests({ rngBoard: els.rngBoard, rngCard: els.rngCard, rngVig: els.rngVig, rngShow: els.rngShow });

  // Fit link cards to one screen on desktop (equal per-card height)
  function fitCardsToViewport(){
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const grid = document.getElementById('linksGrid');
    if (!grid) return;
    if (!isDesktop) {
      const root = document.documentElement;
      root.style.removeProperty('--card-font');
      root.style.removeProperty('--card-pad');
      root.style.removeProperty('--card-height');
      root.style.removeProperty('--card-min-height');
      return;
    }
    const left = document.getElementById('colLeft');
    const right = document.getElementById('colRight');
    if (!left || !right) return;
    const cards = [...left.querySelectorAll('.link-card'), ...right.querySelectorAll('.link-card')];
    if (cards.length === 0) return;
    // Compute height budget: board area height (index.html sets board height to calc(100vh - 180px))
    const board = document.querySelector('.board');
    // Compute inner usable height = board height - board padding - panel padding (top+bottom)
    const boardRectH = board ? board.getBoundingClientRect().height : window.innerHeight;
    const boardStyle = board ? getComputedStyle(board) : null;
    const boardPaddingV = boardStyle ? (parseFloat(boardStyle.paddingTop)||0) + (parseFloat(boardStyle.paddingBottom)||0) : 0;
    // Panels wrap the columns
    const anyPanel = document.querySelector('.panel');
    const panelStyle = anyPanel ? getComputedStyle(anyPanel) : null;
    const panelPaddingV = panelStyle ? (parseFloat(panelStyle.paddingTop)||0) + (parseFloat(panelStyle.paddingBottom)||0) : 0;
    const usableH = Math.max(0, Math.floor(boardRectH - boardPaddingV - panelPaddingV));
    const root = document.documentElement;
    const GAP = 8; // matches .col gap
    const rows = 10; // fixed rows per column on desktop
    const totalGaps = Math.max(rows - 1, 0) * GAP;
    let perCard = Math.floor((usableH - totalGaps) / rows);
    if (!Number.isFinite(perCard) || perCard <= 0) perCard = 1;
    // Strict equal division: derive font proportionally, without clamps
    const font = Math.min(14, Math.round(perCard * 0.45));
    root.style.setProperty('--card-height', perCard + 'px');
    root.style.setProperty('--card-min-height', perCard + 'px');
    root.style.setProperty('--card-font', font + 'px');
  }
  // After links render, run fit (event-driven only)
  window.addEventListener('bm_links_rendered', fitCardsToViewport);
  window.addEventListener('resize', ()=>{ setTimeout(fitCardsToViewport, 0); });

  window.addEventListener('popstate', (e)=>{
    const p = (e.state && e.state.page) || new URLSearchParams(location.search).get('page') || 'A';
    switchToPage(p, false);
  });

  if(!localStorage.getItem(KEYS.loginPwd)){ localStorage.setItem(KEYS.loginPwd, 'Taich@2022'); }
})();
