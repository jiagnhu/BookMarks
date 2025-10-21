// Skin upload/preset/custom management in drawer
import { els, qs } from './dom.js';
import { KEYS, state } from './state.js';

function roleUsed(role) { return Number(localStorage.getItem(KEYS.roleUsage(role)) || 0); }
function incRole(role) { const n = roleUsed(role) + 1; localStorage.setItem(KEYS.roleUsage(role), String(n)); return n; }

async function updateSkinQuotaHint() {
  const role = 'normal';
  let left = null;
  try {
    const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
    if (isUser && window.BMApi?.quotas) {
      const q = await window.BMApi.quotas.skinUpload();
      if (q && typeof q.left === 'number') left = q.left;
    }
  } catch (_) { /* fallback to local */ }
  if (left == null) {
    const quota = state.quotas[role] ?? 3; const used = roleUsed(role); left = Math.max(0, quota - used);
  }
  if (els.skinQuotaHint) els.skinQuotaHint.textContent = `自定义皮肤剩余上传次数：${left}`;
}

export function initSkin() {
  updateSkinQuotaHint();
  // 未登录隐藏自定义皮肤区（精确定位到对应的行容器）
  try {
    const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
    const rowCustom = els.skinUpload ? els.skinUpload.closest('.row') : null;
    const rowApply = els.btnApplySkin ? els.btnApplySkin.closest('.row') : null;
    const rowQuota = els.skinQuotaHint ? els.skinQuotaHint.closest('.row') : null;
    const rowMine = els.customSkins; // 整块区域
    if (!isUser) {
      rowCustom && (rowCustom.style.display = 'none');
      rowApply && (rowApply.style.display = 'none');
      rowQuota && (rowQuota.style.display = 'none');
      rowMine && (rowMine.style.display = 'none');
    } else {
      rowCustom && (rowCustom.style.display = '');
      rowApply && (rowApply.style.display = '');
      rowQuota && (rowQuota.style.display = '');
      rowMine && (rowMine.style.display = '');
    }
  } catch (_) {}
  (async () => {
    try {
      if (window.BMApi) {
        // 预设皮肤在前端写死，不通过接口获取
        try {
          if (els.presetSkins) {
            const presets = [
              { name: 'p1', url: '/images/p1.jpeg' },
              { name: 'p2', url: '/images/p2.jpeg' },
              { name: 'p3', url: '/images/p3.jpeg' },
            ];
            const wrap = els.presetSkins;
            let list = wrap.querySelector('.preset-skins');
            if (!list) { list = document.createElement('div'); list.className = 'preset-skins'; wrap.appendChild(list); }
            list.innerHTML = '';
            presets.forEach(p => {
              const thumb = document.createElement('div');
              thumb.className = 'preset-thumb';
              thumb.title = p.name || '皮肤';
              thumb.style.backgroundImage = `url('${p.url}')`;
              thumb.setAttribute('data-skin', p.url);
              thumb.addEventListener('click', async () => {
                // 登录：使用 PUT 标记当前预设；未登录：仅本地应用
                try {
                  const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
                  if (isUser && window.BMApi) {
                    await window.BMApi.skins.markCurrentPreset(p.url);
                  }
                } catch(_) { /* 忽略接口错误 */ }
                try {
                  state.dirty.skin = true;
                  document.documentElement.style.setProperty('--bg-img', `url(${p.url})`);
                  document.body.style.backgroundImage = `url(${p.url})`;
                  localStorage.setItem(KEYS.skin(), p.url);
                } catch(_) {}
              });
              list.appendChild(thumb);
            });
          }
        } catch (_) { /* ignore */ }

        // 初始尝试应用当前皮肤（登录后可从服务端获取）
        try { const cur = await window.BMApi.skins.currentGet(); if (cur) applySkin(cur); } catch (_) { /* ignore */ }
        try {
          const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
          if (!isUser) throw new Error('guest-mode-no-custom');
          const list = await window.BMApi.skins.customList();
          if (Array.isArray(list) && els.customSkinsList) {
            els.customSkinsList.innerHTML = '';
            list.forEach(item => {
              const thumb = document.createElement('div');
              thumb.className = 'preset-thumb';
              thumb.title = item.name || '自定义皮肤';
              thumb.style.backgroundImage = `url('${item.url}')`;
              thumb.setAttribute('data-skin', item.url);
              thumb.addEventListener('click', async () => {
                // 登录：PUT 标记当前自定义（按 id）；未登录：仅本地
                try {
                  const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
                  if (isUser && window.BMApi && item.id != null) {
                    await window.BMApi.skins.markCurrentCustom(item.id);
                  }
                } catch(_) { /* 忽略接口错误 */ }
                try {
                  state.dirty.skin = true;
                  document.documentElement.style.setProperty('--bg-img', `url(${item.url})`);
                  document.body.style.backgroundImage = `url(${item.url})`;
                  localStorage.setItem(KEYS.skin(), item.url);
                } catch(_) {}
              });
              els.customSkinsList.appendChild(thumb);
            });
          }
        } catch (_) { /* ignore */ }
      }
    } catch (_) { /* ignore network */ }
  })();

  // 无后端时，绑定现有预设缩略图的点击事件（index.html 内置的 .preset-thumb）
  try {
    if (els.presetSkins) {
      const thumbs = els.presetSkins.querySelectorAll('.preset-thumb[data-skin]');
      thumbs.forEach(el => {
        el.addEventListener('click', () => {
          const url = el.getAttribute('data-skin');
          if (!url) return;
          try {
            // 同步两种方式，确保样式立即可见
            document.documentElement.style.setProperty('--bg-img', `url(${url})`);
            document.body.style.backgroundImage = `url(${url})`;
            localStorage.setItem(KEYS.skin(), url);
          } catch (_) {}
        });
      });
    }
  } catch (_) {}

  // 应用按钮应提交当前选择的文件/URL，不再弹出输入框
  if (els.btnApplySkin) els.btnApplySkin.addEventListener('click', async () => {
    try {
      const fileInput = els.skinUpload;
      const picked = fileInput && fileInput.files && fileInput.files[0];
      const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));

      if (picked) {
        // 读取为 dataURL 并尝试提交到后端作为自定义皮肤
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result;
          try {
            if (isUser && window.BMApi) {
              await window.BMApi.skins.currentSet(String(dataUrl));
              const cur = await window.BMApi.skins.currentGet();
              applySkin(cur);
              updateSkinQuotaHint();
            } else {
              // 游客本地生效
              document.documentElement.style.setProperty('--bg-img', `url(${dataUrl})`);
              document.body.style.backgroundImage = `url(${dataUrl})`;
              localStorage.setItem(KEYS.skin(), String(dataUrl));
            }
          } catch (_) { /* 静默失败 */ }
          if (fileInput) fileInput.value = '';
        };
        reader.readAsDataURL(picked);
        return;
      }

      // 若未选择文件，则不做任何弹窗，仅忽略
    } catch (_) { /* no-op */ }
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
        const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
        if (!isUser) return;
          const list = await window.BMApi.skins.customList(); if (els.customSkinsList) {
            els.customSkinsList.innerHTML = '';
            list.forEach(item => {
              const thumb = document.createElement('div');
              thumb.className = 'preset-thumb';
              thumb.title = item.name || '自定义皮肤';
              thumb.style.backgroundImage = `url('${item.url}')`;
              thumb.setAttribute('data-skin', item.url);
              thumb.addEventListener('click', async () => {
              try{ await window.BMApi.skins.markCurrentCustom(item.id); applySkin(await window.BMApi.skins.currentGet()); }catch(_){ /* 忽略错误，本地仍可应用 */ }
              });
              els.customSkinsList.appendChild(thumb);
            });
          }
      } else {
        const reader = new FileReader(); reader.onload = () => {
          const url = reader.result; try { document.documentElement.style.setProperty('--bg-img', `url(${url})`); document.body.style.backgroundImage = `url(${url})`; localStorage.setItem(KEYS.skin(), url); incRole(role); updateSkinQuotaHint(); } catch (_) {}
        }; reader.readAsDataURL(f);
      }
    } catch (err) { alert('上传失败'); }
  });
}

export function applySkin(s) {
  if (!s) return;
  const url = s.url || s;
  document.documentElement.style.setProperty('--bg-img', `url(${url})`);
  document.body.style.backgroundImage = `url(${url})`;
}
