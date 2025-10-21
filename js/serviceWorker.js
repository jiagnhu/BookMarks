// Service worker registration and update prompt handling
import { els } from './dom.js';

let swNewWorker = null;
let swRefreshPending = false;

export function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swRefreshPending) location.reload();
  });
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showSWUpdatePrompt(newWorker);
        }
      });
    });
  }).catch(()=>{});

  if (els.swUpdateApply) {
    els.swUpdateApply.addEventListener('click', () => {
      if (swNewWorker) {
        swNewWorker.postMessage({ type: 'SKIP_WAITING' });
        swRefreshPending = true;
      }
      hideSWUpdatePrompt();
      swNewWorker = null;
    });
  }
  if (els.swUpdateDismiss) {
    els.swUpdateDismiss.addEventListener('click', () => hideSWUpdatePrompt());
  }
}

function showSWUpdatePrompt(worker) {
  if (!worker || !els.swUpdateBanner) return;
  swNewWorker = worker;
  els.swUpdateBanner.hidden = false;
}
function hideSWUpdatePrompt() {
  if (!els.swUpdateBanner) return;
  els.swUpdateBanner.hidden = true;
}

