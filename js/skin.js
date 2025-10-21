// Skin upload/preset/custom management in drawer
import { els, qs } from './dom.js';
import { KEYS, state } from './state.js';

function roleUsed(role) { return Number(localStorage.getItem(KEYS.roleUsage(role)) || 0); }
function incRole(role) { const n = roleUsed(role) + 1; localStorage.setItem(KEYS.roleUsage(role), String(n)); return n; }

function updateSkinQuotaHint() {
  const role = 'normal'; const quota = state.quotas[role] ?? 3; const used = roleUsed(role); const left = Math.max(0, quota - used);
  if (els.skinQuotaHint) els.skinQuotaHint.textContent = `自定义皮肤剩余上传次数：${left}`;
}

export function initSkin() {
  updateSkinQuotaHint();
  (async () => {
    try {
      if (window.BMApi) {
        try {
          const preset = await window.BMApi.skins.preset();
          if (Array.isArray(preset) && els.presetSkins) {
            const wrap = els.presetSkins;
            let list = wrap.querySelector('ul');
            if (!list) { list = document.createElement('ul'); wrap.appendChild(list); }
            list.innerHTML = '';
            preset.forEach(p => {
              const li = document.createElement('li');
              const btn = document.createElement('button');
              btn.className = 'btn link';
              btn.textContent = p.name || '皮肤';
              btn.addEventListener('click', async () => {
                try {
                  await window.BMApi.skins.currentSet(p.url);
                  const cur = await window.BMApi.skins.currentGet();
                  applySkin(cur);
                } catch (_) {}
              });
              li.appendChild(btn);
              list.appendChild(li);
            });
          }
        } catch (_) { /* ignore */ }

        // 初始尝试应用当前皮肤（登录后可从服务端获取）
        try { const cur = await window.BMApi.skins.currentGet(); if (cur) applySkin(cur); } catch (_) { /* ignore */ }
        try {
          const list = await window.BMApi.skins.customList();
          if (Array.isArray(list) && els.customSkinsList) {
            els.customSkinsList.innerHTML = '';
            list.forEach(item => {
              const li = document.createElement('li');
              const b = document.createElement('button');
              b.className = 'btn link';
              b.textContent = item.name || '自定义';
              b.addEventListener('click', async () => {
                try {
                  await window.BMApi.skins.currentSet(item.url);
                  const cur = await window.BMApi.skins.currentGet();
                  applySkin(cur);
                } catch (_) {}
              });
              li.appendChild(b);
              els.customSkinsList.appendChild(li);
            });
          }
        } catch (_) { /* ignore */ }
      }
    } catch (_) { /* ignore network */ }
  })();

  if (els.btnApplySkin) els.btnApplySkin.addEventListener('click', () => {
    const url = prompt('输入图片 URL 作为背景：');
    if (!url) return;
    try { document.documentElement.style.setProperty('--bg-img', `url(${JSON.stringify(url).slice(1, -1)})`); localStorage.setItem(KEYS.skin(), url); } catch (_) {}
  });

  if (els.skinUpload) els.skinUpload.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const role = 'normal'; const quota = state.quotas[role] ?? 3; const used = roleUsed(role);
    if (used >= quota) { alert('自定义皮肤上传次数用尽'); return; }
    try {
      if (window.BMApi) {
        const form = new FormData(); form.append('file', f);
        // No dedicated upload API in this client; fallback: create object URL locally
        // If backend later provides, swap here accordingly.
        incRole(role); updateSkinQuotaHint();
        const cur = await window.BMApi.skins.currentGet(); if (cur) applySkin(cur);
        const list = await window.BMApi.skins.customList(); if (els.customSkinsList) {
          els.customSkinsList.innerHTML = '';
          list.forEach(item => { const li = document.createElement('li'); const b = document.createElement('button'); b.className='btn link'; b.textContent=item.name||'自定义'; b.addEventListener('click', async()=>{ try{ await window.BMApi.skins.currentSet(item.url); applySkin(await window.BMApi.skins.currentGet()); }catch(_){}}); li.appendChild(b); els.customSkinsList.appendChild(li); });
        }
      } else {
        const reader = new FileReader(); reader.onload = () => {
          const url = reader.result; try { document.documentElement.style.setProperty('--bg-img', `url(${url})`); localStorage.setItem(KEYS.skin(), url); incRole(role); updateSkinQuotaHint(); } catch (_) {}
        }; reader.readAsDataURL(f);
      }
    } catch (err) { alert('上传失败'); }
  });
}

export function applySkin(s) {
  if (!s) return;
  const url = s.url || s;
  document.documentElement.style.setProperty('--bg-img', `url(${url})`);
}
