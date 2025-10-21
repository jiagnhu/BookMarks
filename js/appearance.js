// Appearance sliders and persistence
import { els } from './dom.js';
import { KEYS } from './state.js';

let pendingTailSave = null;
let latestValues = null;

function scheduleSave() {
  clearTimeout(pendingTailSave);
  const payload = { boardAlpha: Number(els.rngBoard.value), cardAlpha: Number(els.rngCard.value), vignette: Number(els.rngVig.value), showcaseWidth: Number(els.rngShow.value), contrast: document.body.classList.contains('contrast') };
  latestValues = payload;
  pendingTailSave = setTimeout(async () => {
    try { if (window.BMApi) await window.BMApi.settings.put(latestValues); } catch (_) { /* ignore */ }
  }, 500);
}

export async function applyAppearance() {
  document.documentElement.style.setProperty('--board-alpha', (Number(els.rngBoard.value) / 100).toFixed(2));
  document.documentElement.style.setProperty('--card-alpha', (Number(els.rngCard.value) / 100).toFixed(2));
  document.documentElement.style.setProperty('--vignette-alpha', (Number(els.rngVig.value) / 100).toFixed(2));
  document.documentElement.style.setProperty('--showcase-width', `${Number(els.rngShow.value)}vw`);
  if (els.valBoard) els.valBoard.textContent = `${els.rngBoard.value}%`;
  if (els.valCard) els.valCard.textContent = `${els.rngCard.value}%`;
  if (els.valVig) els.valVig.textContent = `${els.rngVig.value}%`;
  if (els.valShow) els.valShow.textContent = `${els.rngShow.value}vw`;
  scheduleSave();
  localStorage.setItem(KEYS.ui.boardAlpha, els.rngBoard.value);
  localStorage.setItem(KEYS.ui.cardAlpha, els.rngCard.value);
  localStorage.setItem(KEYS.ui.vignette, els.rngVig.value);
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
        els.rngShow.value = s.showcaseWidth ?? 28;
        document.body.classList.toggle('contrast', !!s.contrast);
      }
    }
  } catch (_) {
    els.rngBoard.value = localStorage.getItem(KEYS.ui.boardAlpha) || 55;
    els.rngCard.value = localStorage.getItem(KEYS.ui.cardAlpha) || 55;
    els.rngVig.value = localStorage.getItem(KEYS.ui.vignette) || 25;
    els.rngShow.value = localStorage.getItem(KEYS.ui.showcase) || 28;
    const contrast = localStorage.getItem(KEYS.ui.contrast) === '1';
    document.body.classList.toggle('contrast', contrast);
  }
  ['input', 'change'].forEach(ev => {
    els.rngBoard.addEventListener(ev, applyAppearance);
    els.rngCard.addEventListener(ev, applyAppearance);
    els.rngVig.addEventListener(ev, applyAppearance);
    els.rngShow.addEventListener(ev, applyAppearance);
  });
  ['pointerup', 'mouseup', 'touchend'].forEach(ev => {
    [els.rngBoard, els.rngCard, els.rngVig, els.rngShow].forEach(el => {
      el.addEventListener(ev, () => { pendingTailSave && scheduleSave(); });
    });
  });
  applyAppearance();
}

export function adaptForLightWallpaper() {
  els.rngBoard.value = 75; els.rngCard.value = 80; els.rngVig.value = 40;
  applyAppearance();
  document.body.classList.add('contrast');
  localStorage.setItem(KEYS.ui.contrast, '1');
}

