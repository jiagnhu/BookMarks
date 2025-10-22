// Links list render/edit/persist for A/B pages
import { els, qs } from './dom.js';
import { KEYS, state } from './state.js';

export async function loadLinks(page) {
  let arr = [];
  try {
    if (window.BMApi) {
      const token = localStorage.getItem('bm_token');
      let data;
      if (token) {
        // 登录用户使用 /links JSON 存储（统一20槽位）
        data = await window.BMApi.links.get(page);
        arr = Array.isArray(data) ? data.map((it, idx) => ({ name: it.name || `链接 ${idx + 1}`, url: it.url || '' })) : [];
      } else {
        // 游客沿用公共接口（A/B各自的公共列表，已seed 6条）
        data = await window.BMApi.pages.bookmarks.list(page);
        arr = Array.isArray(data)
          ? data
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((it, idx) => ({ id: it.id, name: it.name || `链接 ${idx + 1}`, url: it.url || '' }))
          : [];
      }
    }
  } catch (_) {
    const raw = localStorage.getItem(KEYS.links(page));
    arr = raw ? JSON.parse(raw) : [];
  }
  if (!arr || arr.length === 0) {
    arr = Array.from({ length: 20 }, (_, i) => ({ name: `链接 ${i + 1}`, url: '' }));
  }

  els.colLeft.innerHTML = '';
  els.colRight.innerHTML = '';

  arr.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'link-card';
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '0';

    const a = document.createElement('a');
    a.href = item.url || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = item.name || `链接 ${idx + 1}`;
    a.addEventListener('click', (e) => { if (!item.url) { e.preventDefault(); return; } });

    // 不再显示 URL，仅显示名称
    left.appendChild(a);

    const actions = document.createElement('div'); actions.className = 'link-actions';
    const edit = document.createElement('button'); edit.className = 'btn'; edit.setAttribute('title','编辑'); edit.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83l3.75 3.75l1.84-1.82Z"/></svg>';
    edit.addEventListener('click', () => openEdit(idx, item));
    const clear = document.createElement('button'); clear.className = 'btn danger'; clear.setAttribute('title','清空'); clear.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7h12l-1 14H7L6 7Zm3-3h6l1 2H8l1-2ZM9 9v10h2V9H9Zm4 0v10h2V9h-2Z"/></svg>';
    clear.addEventListener('click', () => { arr[idx] = { name: `链接 ${idx + 1}`, url: '' }; saveLinks(arr); render(); });
    actions.appendChild(edit); actions.appendChild(clear);

    card.appendChild(left); card.appendChild(actions);

    // Mobile: tap to toggle actions without hover
    const isTouch = matchMedia('(hover: none)').matches || 'ontouchstart' in window;
    if (isTouch) {
      card.addEventListener('click', (e) => {
        // Avoid toggling when clicking buttons/links themselves
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'BUTTON' || tag === 'A' || e.target.closest('button') || e.target.closest('a')) return;
        const wasOpen = card.classList.contains('open');
        document.querySelectorAll('.link-card.open').forEach(el => { if (el !== card) el.classList.remove('open'); });
        if (!wasOpen) card.classList.add('open'); else card.classList.remove('open');
      });
      // Tapping outside closes any open card
      setTimeout(()=>{
        document.addEventListener('click', (ev) => {
          const anyOpen = document.querySelector('.link-card.open');
          if (!anyOpen) return;
          const inside = ev.target.closest && ev.target.closest('.link-card');
          if (!inside) document.querySelectorAll('.link-card.open').forEach(el => el.classList.remove('open'));
        });
      }, 0);
    }
    (idx < 10 ? els.colLeft : els.colRight).appendChild(card);
  });

  async function persistAll(newArr) {
    try {
      const token = localStorage.getItem('bm_token');
      if (token) {
        // 用户：直接PUT /links 保存整个数组
        const items = newArr.map((it) => ({ name: it.name || '', url: it.url || '' }));
        await window.BMApi.links.put(page, items);
      } else {
        // 游客：只在本地保存（只读公共端，不再尝试PUT服务端）
        localStorage.setItem(KEYS.links(page), JSON.stringify(newArr));
      }
    } catch (err) {
      localStorage.setItem(KEYS.links(page), JSON.stringify(newArr));
      console.warn('[bm] saveAll fallback local only:', err?.message || err);
    }
  }
  function render() { persistAll(arr).then(() => loadLinks(page)); }
  function saveLinks(newArr) { arr = newArr; render(); }
  function openEdit(i, item) {
    state.linkIdxEditing = i;
    qs('#linkName').value = item.name || '';
    qs('#linkUrl').value = item.url || '';
    // 绑定一次性校验（失焦即时提示）
    try{
      const urlInput = qs('#linkUrl');
      const hintId = 'linkUrlErr';
      let hint = document.getElementById(hintId);
      if (!hint) {
        hint = document.createElement('div');
        hint.id = hintId;
        hint.className = 'hint error';
        hint.hidden = true;
        // 插入到对话框 body 内，紧随 URL 行之后
        const row = urlInput && urlInput.closest('.dlg-row');
        const body = row && row.parentElement;
        if (row && body) body.insertBefore(hint, row.nextSibling);
      }
      const isValidHttpUrl = (val) => {
        try{
          const u = new URL(val);
          const host = u.hostname || '';
          const ascii = /^[A-Za-z0-9.-]+$/.test(host);
          const hasLetterOrDigit = /[A-Za-z0-9]/.test(host);
          const isIPv4 = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/.test(host);
          const isLocalhost = host === 'localhost';
          const hasDot = host.includes('.');
          return (ascii && hasLetterOrDigit && (hasDot || isIPv4 || isLocalhost));
        }catch(_){ return false; }
      };
      const validate = ()=>{
        if (!urlInput) return true;
        let v = (urlInput.value || '').trim();
        if (!v) { hint && (hint.hidden = true); return true; }
        if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
        const ok = isValidHttpUrl(v);
        if (hint) { hint.textContent = '请输入正确的网址（例如：https://example.com）'; hint.hidden = ok; }
        return ok;
      };
      if (urlInput) {
        urlInput.removeEventListener('blur', validate);
        urlInput.addEventListener('blur', validate);
        urlInput.addEventListener('input', ()=>{ if (hint && !hint.hidden) validate(); });
      }
    }catch(_){ }
    els.linkDlg.showModal();
  }
  qs('#btnLinkCancel').onclick = () => els.linkDlg.close();
  qs('#btnLinkSave').onclick = () => {
    const name = qs('#linkName').value.trim();
    let url = qs('#linkUrl').value.trim();
    // 若输入了 URL，则进行格式校验；未输入则允许为空
    if (url) {
      // 若缺少协议，先补全 https:// 再校验
      if (!/^https?:\/\//i.test(url)) { url = 'https://' + url; }
      const isValidHttpUrl = (val) => {
        try{
          const u = new URL(val);
          const host = u.hostname || '';
          const ascii = /^[A-Za-z0-9.-]+$/.test(host);
          const hasLetterOrDigit = /[A-Za-z0-9]/.test(host);
          const isIPv4 = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/.test(host);
          const isLocalhost = host === 'localhost';
          const hasDot = host.includes('.');
          return (ascii && hasLetterOrDigit && (hasDot || isIPv4 || isLocalhost));
        }catch(_){ return false; }
      };
      if (!isValidHttpUrl(url)) {
        const hint = document.getElementById('linkUrlErr');
        if (hint){ hint.textContent = '请输入正确的网址（例如：https://example.com）'; hint.hidden = false; }
        else { alert('请输入正确的网址（例如：https://example.com）'); }
        const inp = qs('#linkUrl'); if (inp) inp.focus();
        return;
      }
    }
    arr[state.linkIdxEditing] = { name: name || `链接 ${state.linkIdxEditing + 1}`, url };
    persistAll(arr).then(() => { els.linkDlg.close(); loadLinks(page); });
  };
}
