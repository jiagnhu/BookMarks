// Brand title and motto editable headers
import { els, qsa } from './dom.js';
import { KEYS, DEFAULT_TITLE, DEFAULT_MOTTO, state } from './state.js';

export function initEditableHeaders() {
  const ready = els.brandWrap && els.brandText && els.brandEditBtn && els.brandPanel && els.brandInput && els.brandCancel && els.brandSave
    && els.mottoWrap && els.mottoText && els.mottoEditBtn && els.mottoPanel && els.mottoInput && els.mottoCancel && els.mottoSave;
  if (!ready) return;

  const closeEditor = (wrapper, panel) => { wrapper.classList.remove('editing'); panel.hidden = true; };
  const openEditor = (wrapper, panel, input, initialValue) => {
    qsa('.editable.editing').forEach(el => {
      if (el !== wrapper) {
        el.classList.remove('editing');
        const otherPanel = el.querySelector('.edit-panel');
        if (otherPanel) otherPanel.hidden = true;
      }
    });
    wrapper.classList.add('editing');
    panel.hidden = false;
    input.value = initialValue;
    requestAnimationFrame(() => { input.focus(); input.select(); });
  };

  // Brand
  const openBrand = (e) => {
    e.stopPropagation();
    if (els.brandWrap.classList.contains('editing')) { closeEditor(els.brandWrap, els.brandPanel); return; }
    const stored = localStorage.getItem(KEYS.title(state.page));
    const initial = stored !== null ? stored : els.brandText.textContent;
    openEditor(els.brandWrap, els.brandPanel, els.brandInput, initial);
  };
  els.brandEditBtn.addEventListener('click', openBrand);
  // 在移动端或任何场景，点击文案区域也可开启编辑
  els.brandWrap.addEventListener('click', (e)=>{
    if (!els.brandWrap.classList.contains('editing')) openBrand(e);
  });
  els.brandCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    const stored = localStorage.getItem(KEYS.title(state.page));
    els.brandInput.value = stored !== null ? stored : (els.brandText ? els.brandText.textContent : DEFAULT_TITLE);
    closeEditor(els.brandWrap, els.brandPanel);
  });
  els.brandSave.addEventListener('click', async (e) => {
    e.stopPropagation();
    const value = els.brandInput.value.trim();
    try {
      if (window.BMApi) await window.BMApi.pages.update(state.page, { title: value || null });
      else if (value) { localStorage.setItem(KEYS.title(state.page), value); } else { localStorage.removeItem(KEYS.title(state.page)); }
    } catch (_) {
      if (value) { localStorage.setItem(KEYS.title(state.page), value); } else { localStorage.removeItem(KEYS.title(state.page)); }
    } finally {
      updateBrandDisplay(value);
      els.brandInput.value = els.brandText ? els.brandText.textContent : DEFAULT_TITLE;
      closeEditor(els.brandWrap, els.brandPanel);
    }
  });
  els.brandInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); els.brandSave.click(); }
    else if (e.key === 'Escape') { e.preventDefault(); els.brandCancel.click(); }
  });

  // Motto
  const openMotto = (e) => {
    e.stopPropagation();
    if (els.mottoWrap.classList.contains('editing')) { closeEditor(els.mottoWrap, els.mottoPanel); return; }
    const stored = localStorage.getItem(KEYS.motto(state.page));
    const initial = stored !== null && stored !== undefined ? stored : els.mottoText.textContent;
    openEditor(els.mottoWrap, els.mottoPanel, els.mottoInput, initial);
  };
  els.mottoEditBtn.addEventListener('click', openMotto);
  els.mottoWrap.addEventListener('click', (e)=>{
    if (!els.mottoWrap.classList.contains('editing')) openMotto(e);
  });
  els.mottoCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    const stored = localStorage.getItem(KEYS.motto(state.page));
    els.mottoInput.value = stored !== null && stored !== undefined ? stored : (els.mottoText ? els.mottoText.textContent : DEFAULT_MOTTO);
    closeEditor(els.mottoWrap, els.mottoPanel);
  });
  els.mottoSave.addEventListener('click', async (e) => {
    e.stopPropagation();
    const value = els.mottoInput.value.trim();
    try {
      if (window.BMApi) await window.BMApi.pages.update(state.page, { motto: value || null });
      else if (value) { localStorage.setItem(KEYS.motto(state.page), value); } else { localStorage.removeItem(KEYS.motto(state.page)); }
    } catch (_) {
      if (value) { localStorage.setItem(KEYS.motto(state.page), value); } else { localStorage.removeItem(KEYS.motto(state.page)); }
    } finally {
      updateMottoDisplay(value);
      els.mottoInput.value = els.mottoText ? els.mottoText.textContent : DEFAULT_MOTTO;
      closeEditor(els.mottoWrap, els.mottoPanel);
    }
  });
  els.mottoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); els.mottoSave.click(); }
    else if (e.key === 'Escape') { e.preventDefault(); els.mottoCancel.click(); }
  });

  document.addEventListener('click', e => {
    document.querySelectorAll('.editable.editing').forEach(el => {
      if (!el.contains(e.target)) {
        el.classList.remove('editing');
        const panel = el.querySelector('.edit-panel');
        if (panel) panel.hidden = true;
      }
    });
  });
}

export function updateBrandDisplay(value) {
  const text = value && value.trim() ? value.trim() : DEFAULT_TITLE;
  if (els.brandText) els.brandText.textContent = text;
  document.title = text;
}

export function updateMottoDisplay(value) {
  const text = value && value.trim() ? value.trim() : DEFAULT_MOTTO;
  if (els.mottoText) els.mottoText.textContent = text;
}

export async function initPageTitle() {
  els.pageTag.textContent = state.page + '页';
  let title = '', motto = '';
  try {
    if (window.BMApi) {
      const data = await window.BMApi.pages.get(state.page);
      title = (data && data.title) || '';
      motto = (data && data.motto) || '';
    }
  } catch (_) {
    title = (localStorage.getItem(KEYS.title(state.page)) || '').trim();
    motto = (localStorage.getItem(KEYS.motto(state.page)) || '').trim();
  }
  updateBrandDisplay(title);
  updateMottoDisplay(motto);
  if (els.brandInput) els.brandInput.value = title || (els.brandText ? els.brandText.textContent : DEFAULT_TITLE);
  if (els.mottoInput) els.mottoInput.value = motto || (els.mottoText ? els.mottoText.textContent : DEFAULT_MOTTO);
}
