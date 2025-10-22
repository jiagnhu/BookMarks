// B page password dialog handlers
import { els, qs } from './dom.js';
import { KEYS } from './state.js';
import { updateBPassButtonText } from './ab.js';

export function initBPassDialog() {
  if (!els.bpassDlg) return;
  const btnCancel = qs('#btnBPassCancel');
  const btnSave = qs('#btnBPassSave');
  const input = qs('#bPass');
  const err = qs('#bPassErr');
  // 不强制格式：移除数字过滤与长度校验，仅在有错误提示时隐藏
  if (input) {
    input.addEventListener('input', () => { if (err) err.hidden = true; });
  }
  if (btnCancel) btnCancel.onclick = () => { els.bpassDlg.close(); };
  if (btnSave) btnSave.onclick = async () => {
    const v = (input && input.value ? input.value.trim() : '');
    // 不做格式限制：空值表示清空，其它任意字符串均可
    const token = localStorage.getItem('bm_token');
    try{
      if (token && window.BMApi) {
        await window.BMApi.pages.setBPassword(v);
        // 登录态下不再使用本地口令
        localStorage.removeItem(KEYS.bPwd);
      } else {
        // 游客仅本地保存
        if (v) localStorage.setItem(KEYS.bPwd, v); else localStorage.removeItem(KEYS.bPwd);
      }
      sessionStorage.removeItem(KEYS.bAuthed);
      updateBPassButtonText();
      alert(v ? '已保存独立密码' : '已清空独立密码');
      els.bpassDlg.close();
    }catch(e){ alert('保存失败：' + (e?.message || '')); }
  };
  // toggle eye
  const toggle = qs('#toggleBPass');
  if (toggle && input){
    toggle.addEventListener('click', ()=>{
      const t = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', t);
      try{
        const svg = toggle.querySelector('svg');
        if (svg){
          // 切换为开/关眼图标（通过替换 path）
          const path = svg.querySelector('path');
          if (path){
            if (t === 'password') {
              path.setAttribute('d', 'M12 4.5c-4.97 0-9.16 3.11-10.82 7.5c1.66 4.39 5.85 7.5 10.82 7.5s9.16-3.11 10.82-7.5C21.16 7.61 16.97 4.5 12 4.5Zm0 12.5a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z');
            } else {
              // eye-off 图标
              path.setAttribute('d', 'M2.81 2.81L1.39 4.22l3.02 3.02C2.8 8.65 1.4 10.43 1.18 12c1.66 4.39 5.85 7.5 10.82 7.5c2.08 0 4.02-.52 5.73-1.44l3.88 3.88l1.41-1.41L2.81 2.81zM12 6.5c1.03 0 1.98.31 2.77.84l-1.46 1.46A3 3 0 0 0 9.2 12.9l-1.6 1.6A4.98 4.98 0 0 1 7 12a5 5 0 0 1 5-5zm0 12c-3.97 0-7.64-2.38-9.18-6c.52-1.2 1.34-2.26 2.37-3.14l1.46 1.46A6.98 6.98 0 0 0 5 12c0 1.21.29 2.36.8 3.37l1.54-1.54A5 5 0 0 0 17.5 8.57l1.62-1.62C21.02 8.1 22.2 9.95 22.82 12c-1.54 3.62-5.21 6.5-9.18 6.5z');
            }
          }
        }
      }catch(_){ }
      input.focus();
    });
  }
}
