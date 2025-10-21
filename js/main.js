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

  initServiceWorker();
  initEditableHeaders();
  initPageTitle();
  loadLinks(state.page);
  initAB();
  initLogin();
  initDrawer();
  initBPassDialog();
  initSkin();
  initAppearance();
  runSelfTests({ rngBoard: els.rngBoard, rngCard: els.rngCard, rngVig: els.rngVig, rngShow: els.rngShow });

  window.addEventListener('popstate', (e)=>{
    const p = (e.state && e.state.page) || new URLSearchParams(location.search).get('page') || 'A';
    switchToPage(p, false);
  });

  if(!localStorage.getItem(KEYS.loginPwd)){ localStorage.setItem(KEYS.loginPwd, 'Taich@2022'); }
})();
