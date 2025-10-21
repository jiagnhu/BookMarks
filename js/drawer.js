// Settings drawer open/close interactions
import { els } from './dom.js';

export function initDrawer(){
  if(!els.drawer) return;
  const lockScroll = ()=>{ document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; };
  const unlockScroll = ()=>{ document.body.style.overflow = ''; document.documentElement.style.overflow = ''; };
  const open = ()=>{ els.drawer.classList.add('open'); if(els.drawerMask){ els.drawerMask.classList.add('show'); } lockScroll(); };
  const close = ()=>{ els.drawer.classList.remove('open'); if(els.drawerMask){ els.drawerMask.classList.remove('show'); } unlockScroll(); };
  if(els.btnSettings) els.btnSettings.addEventListener('click', open);
  if(els.btnCloseDrawer) els.btnCloseDrawer.addEventListener('click', close);
  if(els.drawerMask) els.drawerMask.addEventListener('click', close);
}
