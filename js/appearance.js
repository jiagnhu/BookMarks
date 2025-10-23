// Appearance sliders and persistence
import { els } from './dom.js';
import { KEYS, state } from './state.js';

let pendingTailSave = null;
let latestValues = null;

function scheduleSave() {
  clearTimeout(pendingTailSave);
  const payload = { boardAlpha: Number(els.rngBoard.value), cardAlpha: Number(els.rngCard.value), vignette: Number(els.rngVig.value), headerMask: Number(els.rngHeaderMask?.value || els.rngVig.value), showcaseWidth: Number(els.rngShow.value), contrast: document.body.classList.contains('contrast') };
  latestValues = payload;
  pendingTailSave = setTimeout(async () => {
    try {
      const isUser = !!localStorage.getItem('bm_token');
      if (isUser && window.BMApi) await window.BMApi.settings.put(latestValues);
      else state.dirty.settings = true;
    } catch (_) { /* ignore */ }
  }, 500);
}

export async function applyAppearance() {
  document.documentElement.style.setProperty('--board-alpha', (Number(els.rngBoard.value) / 100).toFixed(2));
  document.documentElement.style.setProperty('--card-alpha', (Number(els.rngCard.value) / 100).toFixed(2));
  document.documentElement.style.setProperty('--vignette-alpha', (Number(els.rngVig.value) / 100).toFixed(2));
  if (els.rngHeaderMask) document.documentElement.style.setProperty('--header-mask-alpha', (Number(els.rngHeaderMask.value) / 100).toFixed(2));
  document.documentElement.style.setProperty('--showcase-width', `${Number(els.rngShow.value)}vw`);
  if (els.valBoard) els.valBoard.textContent = `${els.rngBoard.value}%`;
  if (els.valCard) els.valCard.textContent = `${els.rngCard.value}%`;
  if (els.valVig) els.valVig.textContent = `${els.rngVig.value}%`;
  if (els.valHeaderMask && els.rngHeaderMask) els.valHeaderMask.textContent = `${els.rngHeaderMask.value}%`;
  if (els.valShow) els.valShow.textContent = `${els.rngShow.value}vw`;
  scheduleSave();
  localStorage.setItem(KEYS.ui.boardAlpha, els.rngBoard.value);
  localStorage.setItem(KEYS.ui.cardAlpha, els.rngCard.value);
  localStorage.setItem(KEYS.ui.vignette, els.rngVig.value);
  if (els.rngHeaderMask) localStorage.setItem('bm_ui_headerMask', els.rngHeaderMask.value);
  localStorage.setItem(KEYS.ui.showcase, els.rngShow.value);
}

export async function initAppearance() {
  if (!els.rngBoard || !els.rngCard || !els.rngVig || !els.rngShow) return;
  try {
    if (window.BMApi) {
      const s = await window.BMApi.settings.get();
      if (s) {
        els.rngBoard.value = s.boardAlpha ?? 55;
        els.rngCard.value = s.cardAlpha ?? 55;
        els.rngVig.value = s.vignette ?? 25;
        if (els.rngHeaderMask) els.rngHeaderMask.value = s.headerMask ?? (s.vignette ?? 25);
        els.rngShow.value = s.showcaseWidth ?? 28;
        document.body.classList.toggle('contrast', !!s.contrast);
      }
    }
  } catch (_) {
    els.rngBoard.value = localStorage.getItem(KEYS.ui.boardAlpha) || 55;
    els.rngCard.value = localStorage.getItem(KEYS.ui.cardAlpha) || 55;
    els.rngVig.value = localStorage.getItem(KEYS.ui.vignette) || 25;
    if (els.rngHeaderMask) els.rngHeaderMask.value = localStorage.getItem('bm_ui_headerMask') || els.rngVig.value || 25;
    els.rngShow.value = localStorage.getItem(KEYS.ui.showcase) || 28;
    const contrast = localStorage.getItem(KEYS.ui.contrast) === '1';
    document.body.classList.toggle('contrast', contrast);
  }
  ['input', 'change'].forEach(ev => {
    els.rngBoard.addEventListener(ev, applyAppearance);
    els.rngCard.addEventListener(ev, applyAppearance);
    els.rngVig.addEventListener(ev, applyAppearance);
    if (els.rngHeaderMask) els.rngHeaderMask.addEventListener(ev, applyAppearance);
    els.rngShow.addEventListener(ev, applyAppearance);
  });
  ['pointerup', 'mouseup', 'touchend'].forEach(ev => {
    [els.rngBoard, els.rngCard, els.rngVig, els.rngHeaderMask, els.rngShow].filter(Boolean).forEach(el => {
      el.addEventListener(ev, () => { pendingTailSave && scheduleSave(); });
    });
  });
  applyAppearance();

  // Bind quick actions
  const btnAdapt = els.btnAdaptLight;
  if (btnAdapt) btnAdapt.addEventListener('click', () => {
    adaptForLightWallpaper();
  });
  const btnReset = document.getElementById('btnResetAppearance');
  if (btnReset) btnReset.addEventListener('click', async () => {
    els.rngBoard.value = 55; els.rngCard.value = 55; els.rngVig.value = 25; if (els.rngHeaderMask) els.rngHeaderMask.value = 25; els.rngShow.value = 28;
    document.body.classList.remove('contrast');
    localStorage.setItem(KEYS.ui.contrast, '0');
    await applyAppearance();
    try {
      const isUser = !!localStorage.getItem('bm_token');
      if (isUser && window.BMApi) await window.BMApi.settings.put({ boardAlpha:55, cardAlpha:55, vignette:25, headerMask:25, showcaseWidth:28, contrast:false });
    } catch(_){}
    // no prompt
  });
}

export function adaptForLightWallpaper() {
  els.rngBoard.value = 75; els.rngCard.value = 80; els.rngVig.value = 40; if (els.rngHeaderMask) els.rngHeaderMask.value = 40;
  applyAppearance();
  document.body.classList.add('contrast');
  localStorage.setItem(KEYS.ui.contrast, '1');
}
