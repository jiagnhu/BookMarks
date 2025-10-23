// Skin upload/preset/custom management in drawer
import { els, qs } from './dom.js';
import { KEYS, state } from './state.js';

// 确保事件只绑定一次，避免重复提交
let skinInited = false;
// 全局提交互斥与去重指纹（跨多次 init 共享）
let submitInFlight = false;
let lastSubmittedHash = null;
const COOLDOWN_MS = 3000;

async function updateSkinQuotaHint() {
  const role = 'normal';
  let left = null;
  try {
    const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
    if (isUser && window.BMApi?.quotas) {
      const q = await window.BMApi.quotas.skinUpload();
      if (q && typeof q.left === 'number') left = q.left;
      // 登录态：根据配额禁用/启用文件选择与应用按钮
      try {
        if (els.skinUpload) els.skinUpload.disabled = (left === 0);
        if (els.btnApplySkin) els.btnApplySkin.disabled = (left === 0);
      } catch(_) {}
    }
  } catch (_) { /* ignore and leave left as null */ }
  // 若无法获取服务端配额信息，不渲染剩余提示（游客不应上传自定义皮肤）
  if (left == null) {
    // 无法获取配额时：若登录状态，保守禁用上传入口与按钮；提示留空
    try {
      const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
      if (isUser) {
        if (els.skinUpload) els.skinUpload.disabled = true;
        if (els.btnApplySkin) els.btnApplySkin.disabled = true;
      }
    } catch(_){}
    if (els.skinQuotaHint) els.skinQuotaHint.textContent = '';
    return;
  }
  if (els.skinQuotaHint) els.skinQuotaHint.textContent = `自定义皮肤剩余上传次数：${left}`;
}

function renderCustomSkins(list){
  if (!els.customSkinsList) return;
  els.customSkinsList.innerHTML = '';
  if (!Array.isArray(list)) return;
  list.forEach(item => {
    const thumb = document.createElement('div');
    thumb.className = 'preset-thumb';
    thumb.title = item.name || '自定义皮肤';
    thumb.style.backgroundImage = `url('${item.url}')`;
    thumb.setAttribute('data-skin', item.url);
    // 点击缩略图：设为当前
    thumb.addEventListener('click', async (e) => {
      // 若点击的是删除按钮，不触发设为当前
      if (e.target && e.target.closest && e.target.closest('.thumb-delete')) return;
      try {
        const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
        if (isUser && window.BMApi && item.id != null) {
          await window.BMApi.skins.markCurrentCustom(item.id);
          applySkin(await window.BMApi.skins.currentGet());
        }
      } catch(_) { }
      try {
        document.documentElement.style.setProperty('--bg-img', `url(${item.url})`);
        document.body.style.backgroundImage = `url(${item.url})`;
        localStorage.setItem(KEYS.skin(), item.url);
      } catch(_) {}
    });
    // 删除按钮（右上角，hover 显示；移动端常显且用长按确认）
    const del = document.createElement('button');
    del.className = 'thumb-delete';
    del.type = 'button';
    del.title = '删除';
    del.innerHTML = '×';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const ok = confirm('确定删除该皮肤吗？删除后配额将归还 1 次。');
      if (!ok) return;
      try {
        await window.BMApi.skins.deleteCustom(item.id);
      } catch (err) { alert('删除失败'); return; }
      // 刷新列表与配额、当前皮肤
      try {
        const list = await window.BMApi.skins.customList();
        renderCustomSkins(list);
      } catch(_) {}
      try { updateSkinQuotaHint(); } catch(_){}
      try {
        const cur = await window.BMApi.skins.currentGet();
        applySkin(cur);
        if (cur && cur.url) {
          document.documentElement.style.setProperty('--bg-img', `url(${cur.url})`);
          document.body.style.backgroundImage = `url(${cur.url})`;
          localStorage.setItem(KEYS.skin(), cur.url);
        }
      } catch(_){}
    });
    thumb.appendChild(del);
    els.customSkinsList.appendChild(thumb);
  });
}

export function initSkin() {
  updateSkinQuotaHint();
  try { console.debug('[skin] initSkin called. inited=%s', skinInited); } catch(_){}
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
        try { console.debug('[skin] BMApi available, rendering presets and fetching current'); } catch(_){}
        // 预设皮肤在前端写死，不通过接口获取
        try {
          if (els.presetSkins) {
            const V = import.meta.env.VITE_ASSET_VER || '';
            const q = V ? `?v=${V}` : '';
            console.log('qqqq', q)
            const presets = [
              { name: 'p1', url: `/images/p1.jpeg${q}` },
              { name: 'p2', url: `/images/p2.jpeg${q}` },
              { name: 'p3', url: `/images/p3.jpeg${q}` },
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
        try { const cur = await window.BMApi.skins.currentGet(); if (cur) applySkin(cur); } catch (e) { try{ console.debug('[skin] currentGet error', e); }catch(_){} }
        try {
          const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
          if (!isUser) throw new Error('guest-mode-no-custom');
          const list = await window.BMApi.skins.customList();
          renderCustomSkins(list);
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
  // 规则：
  //  - 同一张图片（按内容指纹）只能提交一次（去重）
  //  - 提交中互斥 + 完成后冷却 3 秒

  // 去重逻辑取消：不再计算指纹，允许重复选择同一图片由后端判定

  async function handleApplyClick(){
    if (submitInFlight) return;
    const btn = els.btnApplySkin;
    const fileInput = els.skinUpload;
    const picked = fileInput && fileInput.files && fileInput.files[0];
    const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));

    // 未选择文件或未登录直接处理
    if (!picked) return;
    if (!isUser) { alert('请登录后再上传自定义皮肤'); fileInput.value=''; return; }

    // 取消“同图只提交一次”的前端判定，统一交由后端校验

    // 进入互斥 + 冷却
    submitInFlight = true;
    const prevDisabled = btn ? btn.disabled : undefined;
    if (btn) btn.disabled = true;

    // 读取为 dataURL 发送到后端
    try {
      const dataUrl = await new Promise((resolve, reject)=>{
        const r = new FileReader();
        r.onerror = () => reject(new Error('read-error'));
        r.onload = () => resolve(String(r.result||''));
        r.readAsDataURL(picked);
      });
      await window.BMApi.skins.currentSet(String(dataUrl));
      const cur = await window.BMApi.skins.currentGet();
      applySkin(cur);
      updateSkinQuotaHint();
      try { const list = await window.BMApi.skins.customList(); renderCustomSkins(list); } catch(_){}
      // 保留占位：如需记录成功状态，可在此更新 UI
    } catch(_) {
      // 失败也进入冷却，避免用户疯狂触发
    } finally {
      if (fileInput) fileInput.value = '';
      setTimeout(()=>{ submitInFlight = false; if (btn) btn.disabled = prevDisabled ?? false; }, COOLDOWN_MS);
    }
  }

  // 仅首次初始化时绑定事件，避免多次绑定造成一次点击触发多次
  if (!skinInited) {
    if (els.btnApplySkin) {
      els.btnApplySkin.addEventListener('click', handleApplyClick);
      try { console.debug('[skin] bind apply click once'); } catch(_){}
    }
    skinInited = true;
  }

  // 选择文件时不做本地配额判断，真正的限制由服务端执行
  if (els.skinUpload) els.skinUpload.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const isUser = state.mode === 'user' && !!(window.BMApi && localStorage.getItem('bm_token'));
    if (!isUser) {
      alert('请登录后再上传自定义皮肤');
      e.target.value = '';
      return;
    }
    // 不在 change 时直接上传，等待“应用”按钮提交，避免误触
  });
}

export function applySkin(s) {
  if (!s) return;
  const url = s.url || s;
  // 防抖：连续调用时合并
  if (!applySkin._timer) {
    applySkin._pendingUrl = url;
    applySkin._timer = setTimeout(() => {
      try {
        const u = applySkin._pendingUrl;
        document.documentElement.style.setProperty('--bg-img', `url(${u})`);
        document.body.style.backgroundImage = `url(${u})`;
      } finally {
        applySkin._timer = null; applySkin._pendingUrl = null;
      }
    }, 200);
  } else {
    applySkin._pendingUrl = url;
  }
}
