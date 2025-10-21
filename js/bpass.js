// B page password dialog handlers
import { els, qs } from './dom.js';
import { KEYS } from './state.js';
import { updateBPassButtonText } from './ab.js';

export function initBPassDialog() {
  if (!els.bpassDlg) return;
  const btnCancel = qs('#btnBPassCancel');
  const btnSave = qs('#btnBPassSave');
  const input = qs('#bPass');
  if (btnCancel) btnCancel.onclick = () => { els.bpassDlg.close(); };
  if (btnSave) btnSave.onclick = async () => {
    const v = (input && input.value ? input.value.trim() : '');
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
}
