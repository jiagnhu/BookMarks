// Service worker registration and update prompt handling
import { els } from './dom.js';

let swNewWorker = null;
let swRefreshPending = false;

export function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // controller 切换后：仅在用户确认更新时刷新
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swRefreshPending) {
      try { swRefreshPending = false; } catch {}
      location.reload();
    }
  });
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        // 用户手动更新：仅显示横幅，不自动应用
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showSWUpdatePrompt(newWorker);
        }
      });
    });
  }).catch(()=>{});

  if (els.swUpdateApply) {
    els.swUpdateApply.addEventListener('click', () => {
      console.log('swUpdateApply clicked');
      if (swNewWorker) {
        // 与 sw.js 的消息协议保持一致
        try { swNewWorker.postMessage({ type: 'SKIP_WAITING' }); } catch {}
        try { swNewWorker.postMessage('SKIP_WAITING'); } catch {}
        swRefreshPending = true;
        console.log('swRefreshPending', swRefreshPending);
        // 兜底：若 3 秒内未触发 controllerchange，强制刷新一次
        setTimeout(() => {
          if (swRefreshPending) {
            try { swRefreshPending = false; } catch {}
            location.reload();
          }
        }, 3000);
      }
      hideSWUpdatePrompt();
      swNewWorker = null;
    });
  }
  if (els.swUpdateDismiss) {
    els.swUpdateDismiss.addEventListener('click', () => hideSWUpdatePrompt());
  }

  // 启动后检测是否已有 waiting 的 SW，如有则展示横幅（不自动更新）
  setTimeout(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const waiting = reg && reg.waiting;
      if (waiting) showSWUpdatePrompt(waiting);
    } catch {}
  }, 1000);
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
