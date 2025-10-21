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
    left.style.gap = '2px';

    const a = document.createElement('a');
    a.href = item.url || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = item.name || `链接 ${idx + 1}`;
    a.addEventListener('click', (e) => { if (!item.url) { e.preventDefault(); return; } });

    const sm = document.createElement('small');
    if (item.url) {
      const urlA = document.createElement('a');
      urlA.href = item.url; urlA.target = '_blank'; urlA.rel = 'noopener noreferrer'; urlA.textContent = item.url;
      sm.appendChild(urlA);
    } else { sm.textContent = '未设置 URL'; }

    left.appendChild(a); left.appendChild(sm);

    const actions = document.createElement('div'); actions.className = 'link-actions';
    const edit = document.createElement('button'); edit.className = 'btn'; edit.textContent = '✏️';
    edit.addEventListener('click', () => openEdit(idx, item));
    const clear = document.createElement('button'); clear.className = 'btn danger'; clear.textContent = '清空';
    clear.addEventListener('click', () => { arr[idx] = { name: `链接 ${idx + 1}`, url: '' }; saveLinks(arr); render(); });
    actions.appendChild(edit); actions.appendChild(clear);

    card.appendChild(left); card.appendChild(actions);
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
    els.linkDlg.showModal();
  }
  qs('#btnLinkCancel').onclick = () => els.linkDlg.close();
  qs('#btnLinkSave').onclick = () => {
    const name = qs('#linkName').value.trim();
    const url = qs('#linkUrl').value.trim();
    arr[state.linkIdxEditing] = { name: name || `链接 ${state.linkIdxEditing + 1}`, url };
    persistAll(arr).then(() => { els.linkDlg.close(); loadLinks(page); });
  };
}
