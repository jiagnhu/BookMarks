// Restored single-file app.js (original logic) so index.html can load it directly.
(function(){
  const qs = (s,p=document)=>p.querySelector(s);
  const qsa = (s,p=document)=>Array.from(p.querySelectorAll(s));

  const state = {
    page: new URLSearchParams(location.search).get('page') === 'B' ? 'B' : 'A',
    user: null,
    linkIdxEditing: null,
    skinImage: null,
    quotas: { normal:3 },
  };

  const KEYS = {
    title: p=>`bm_${p}_title`, motto: p=>`bm_${p}_motto`, links: p=>`bm_${p}_links`,
    skin: p=>`bm_skin_img`, roleUsage: r=>`bm_role_${r}_used`,
    loginPwd: `bm_login_pwd`, bPwd: `bm_B_pwd`, bAuthed: `bm_B_authed_session`, user: `bm_user`,
    ui: { boardAlpha: 'bm_ui_board_alpha', cardAlpha: 'bm_ui_card_alpha', vignette: 'bm_ui_vignette', showcase: 'bm_ui_showcase_w', contrast:'bm_ui_contrast' }
  };

  const DEFAULT_TITLE = 'My BookMarks';
  const DEFAULT_MOTTO = '简洁 · 可编辑 · 可离线加载';

  // Elements
  const brandWrap = qs('.brand.editable');
  const brandText = qs('#brandText');
  const brandEditBtn = qs('#editBrand');
  const brandPanel = qs('#brandEditPanel');
  const brandInput = qs('#brandInput');
  const brandCancel = qs('#brandCancel');
  const brandSave = qs('#brandSave');

  const mottoWrap = qs('.subtitle.editable');
  const mottoText = qs('#subtitleText');
  const mottoEditBtn = qs('#editSubtitle');
  const mottoPanel = qs('#subtitleEditPanel');
  const mottoInput = qs('#subtitleInput');
  const mottoCancel = qs('#subtitleCancel');
  const mottoSave = qs('#subtitleSave');

  const swUpdateBanner = qs('#swUpdate');
  const swUpdateApply = qs('#swUpdateApply');
  const swUpdateDismiss = qs('#swUpdateDismiss');

  const colLeft = qs('#colLeft');
  const colRight = qs('#colRight');
  const pageTag = qs('#pageTag');
  const btnSetBPass = qs('#btnSetBPass');
  const linkDlg = qs('#dlgLink');
  const loginDlg = qs('#dlgLogin');
  const registerDlg = qs('#dlgRegister');
  const changeDlg = qs('#dlgChangePwd');
  const bpassDlg = qs('#dlgBPass');
  const askBDlg = qs('#dlgAskB');

  // Top actions
  const avatar = qs('#avatar');
  const btnLoginTop = qs('#btnLoginTop');
  const btnSettings = qs('#btnSettings');
  const btnOpenRegister = qs('#btnOpenRegister');

  // Settings drawer
  const drawer = qs('#drawer');
  const drawerMask = qs('#drawerMask');
  const btnCloseDrawer = qs('#btnCloseDrawer');
  const btnAdaptLight = qs('#btnAdaptLight');

  // Skin controls (in drawer)
  const skinUpload = qs('#skinUpload');
  const btnApplySkin = qs('#btnApplySkin');
  const presetSkins = qs('#presetSkins');
  const customSkins = qs('#customSkins');
  const customSkinsList = qs('#customSkinsList');
  const skinQuotaHint = qs('#skinQuotaHint');

  // Auth controls (in drawer)
  const btnLogout = qs('#btnLogout');
  const btnChangePwd = qs('#btnChangePwd');

  // Appearance controls
  const rngBoard = qs('#rngBoard'); const valBoard = qs('#valBoard');
  const rngCard = qs('#rngCard'); const valCard = qs('#valCard');
  const rngVig = qs('#rngVignette'); const valVig = qs('#valVignette');
  const rngShow = qs('#rngShowcase'); const valShow = qs('#valShowcase');

  let swNewWorker = null;
  let swRefreshPending = false;

  async function loadLinks(page){
    let arr = [];
    try{
      if(window.BMApi){
        const data = await window.BMApi.pages.bookmarks.list(page);
        // expecting [{ id, order, name, url }]
        arr = Array.isArray(data) ? data
          .sort((a,b)=> (a.order??0)-(b.order??0))
          .map((it,idx)=>({ id: it.id, name: it.name||`链接 ${idx+1}`, url: it.url||'' })) : [];
      }
    }catch(e){
      // fallback to localStorage
      const raw = localStorage.getItem(KEYS.links(page));
      arr = raw ? JSON.parse(raw) : [];
    }
    if(!arr || arr.length===0){
      arr = Array.from({length:20}, (_,i)=>({name:`链接 ${i+1}`, url:''}));
    }
    colLeft.innerHTML = ''; colRight.innerHTML = '';
    arr.forEach((item, idx)=>{
      const card = document.createElement('div'); card.className = 'link-card';
      const left = document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column'; left.style.gap='2px';
      const a = document.createElement('a');
      a.href = item.url || '#';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = item.name || `链接 ${idx+1}`;
      a.addEventListener('click', (e)=>{
        if(!item.url){ e.preventDefault(); return; }
      });
      const sm = document.createElement('small');
      if(item.url){
        const urlA = document.createElement('a');
        urlA.href = item.url;
        urlA.target = '_blank';
        urlA.rel = 'noopener noreferrer';
        urlA.textContent = item.url;
        sm.appendChild(urlA);
      } else {
        sm.textContent = '未设置 URL';
      }
      left.appendChild(a); left.appendChild(sm);
      const actions = document.createElement('div'); actions.className='link-actions';
      const edit = document.createElement('button'); edit.className='btn'; edit.textContent='✏️';
      edit.addEventListener('click', ()=> openEdit(idx, item));
      const clear = document.createElement('button'); clear.className='btn danger'; clear.textContent='清空';
      clear.addEventListener('click', ()=> { arr[idx] = {name:`链接 ${idx+1}`, url:''}; saveLinks(arr); render(); });
      actions.appendChild(edit); actions.appendChild(clear);
      card.appendChild(left); card.appendChild(actions);
      (idx<10?colLeft:colRight).appendChild(card);
    });
    async function persistAll(newArr){
      // try backend bulk save; keep local backup on success as cache
      try{
        const items = newArr.map((it,idx)=>({ id: it.id, order: idx, name: it.name||`链接 ${idx+1}`, url: it.url||'' }));
        if(window.BMApi) await window.BMApi.pages.bookmarks.saveAll(page, items);
        localStorage.setItem(KEYS.links(page), JSON.stringify(newArr));
      }catch(err){
        // network/auth error; still store locally for UX continuity
        localStorage.setItem(KEYS.links(page), JSON.stringify(newArr));
        console.warn('[bm] saveAll fallback local only:', err?.message||err);
      }
    }
    function render(){ persistAll(arr).then(()=> loadLinks(page)); }
    function saveLinks(newArr){ arr = newArr; render(); }
    function openEdit(i, item){
      state.linkIdxEditing = i;
      qs('#linkName').value = item.name || '';
      qs('#linkUrl').value = item.url || '';
      linkDlg.showModal();
    }
    qs('#btnLinkCancel').onclick = ()=> linkDlg.close();
    qs('#btnLinkSave').onclick = ()=>{
      const name = qs('#linkName').value.trim();
      const url = qs('#linkUrl').value.trim();
      arr[state.linkIdxEditing] = { name: name||`链接 ${state.linkIdxEditing+1}`, url };
      persistAll(arr).then(()=>{ linkDlg.close(); loadLinks(page); });
    };
  }

  function updateBrandDisplay(value){
    const text = value && value.trim() ? value.trim() : DEFAULT_TITLE;
    if(brandText) brandText.textContent = text;
    document.title = text;
  }

  function updateMottoDisplay(value){
    const text = value && value.trim() ? value.trim() : DEFAULT_MOTTO;
    if(mottoText) mottoText.textContent = text;
  }

  function showSWUpdatePrompt(worker){
    if(!worker || !swUpdateBanner) return;
    swNewWorker = worker;
    swUpdateBanner.hidden = false;
  }

  function hideSWUpdatePrompt(){
    if(!swUpdateBanner) return;
    swUpdateBanner.hidden = true;
  }

  if(swUpdateApply){
    swUpdateApply.addEventListener('click', ()=>{
      if(swNewWorker){
        swNewWorker.postMessage({type:'SKIP_WAITING'});
        swRefreshPending = true;
      }
      hideSWUpdatePrompt();
      swNewWorker = null;
    });
  }

  if(swUpdateDismiss){
    swUpdateDismiss.addEventListener('click', ()=>{
      hideSWUpdatePrompt();
    });
  }

  function initEditableHeaders(){
    if(!(brandWrap && brandText && brandEditBtn && brandPanel && brandInput && brandCancel && brandSave)) return;
    if(!(mottoWrap && mottoText && mottoEditBtn && mottoPanel && mottoInput && mottoCancel && mottoSave)) return;

    const closeEditor = (wrapper, panel)=>{
      wrapper.classList.remove('editing');
      panel.hidden = true;
    };
    const openEditor = (wrapper, panel, input, initialValue)=>{
      qsa('.editable.editing').forEach(el=>{
        if(el!==wrapper){
          el.classList.remove('editing');
          const otherPanel = el.querySelector('.edit-panel');
          if(otherPanel) otherPanel.hidden = true;
        }
      });
      wrapper.classList.add('editing');
      panel.hidden = false;
      input.value = initialValue;
      requestAnimationFrame(()=>{ input.focus(); input.select(); });
    };

    brandEditBtn.addEventListener('click', e=>{
      e.stopPropagation();
      if(brandWrap.classList.contains('editing')){ closeEditor(brandWrap, brandPanel); return; }
      const stored = localStorage.getItem(KEYS.title(state.page));
      const initial = stored !== null ? stored : brandText.textContent;
      openEditor(brandWrap, brandPanel, brandInput, initial);
    });
    brandCancel.addEventListener('click', ()=>{
      const stored = localStorage.getItem(KEYS.title(state.page));
      brandInput.value = stored !== null ? stored : (brandText ? brandText.textContent : DEFAULT_TITLE);
      closeEditor(brandWrap, brandPanel);
    });
    brandSave.addEventListener('click', async ()=>{
      const value = brandInput.value.trim();
      try{
        if(window.BMApi) await window.BMApi.pages.update(state.page,{ title: value||null });
        else if(value){ localStorage.setItem(KEYS.title(state.page), value); } else { localStorage.removeItem(KEYS.title(state.page)); }
      }catch(e){
        if(value){ localStorage.setItem(KEYS.title(state.page), value); } else { localStorage.removeItem(KEYS.title(state.page)); }
      } finally {
        updateBrandDisplay(value);
        brandInput.value = brandText ? brandText.textContent : DEFAULT_TITLE;
        closeEditor(brandWrap, brandPanel);
      }
    });
    brandInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); brandSave.click(); }
      else if(e.key==='Escape'){ e.preventDefault(); brandCancel.click(); }
    });

    mottoEditBtn.addEventListener('click', e=>{
      e.stopPropagation();
      if(mottoWrap.classList.contains('editing')){ closeEditor(mottoWrap, mottoPanel); return; }
      const stored = localStorage.getItem(KEYS.motto(state.page));
      const initial = stored !== null && stored !== undefined ? stored : mottoText.textContent;
      openEditor(mottoWrap, mottoPanel, mottoInput, initial);
    });
    mottoCancel.addEventListener('click', ()=>{
      const stored = localStorage.getItem(KEYS.motto(state.page));
      mottoInput.value = stored !== null && stored !== undefined ? stored : (mottoText ? mottoText.textContent : DEFAULT_MOTTO);
      closeEditor(mottoWrap, mottoPanel);
    });
    mottoSave.addEventListener('click', async ()=>{
      const value = mottoInput.value.trim();
      try{
        if(window.BMApi) await window.BMApi.pages.update(state.page,{ motto: value||null });
        else if(value){ localStorage.setItem(KEYS.motto(state.page), value); } else { localStorage.removeItem(KEYS.motto(state.page)); }
      }catch(e){
        if(value){ localStorage.setItem(KEYS.motto(state.page), value); } else { localStorage.removeItem(KEYS.motto(state.page)); }
      } finally {
        updateMottoDisplay(value);
        mottoInput.value = mottoText ? mottoText.textContent : DEFAULT_MOTTO;
        closeEditor(mottoWrap, mottoPanel);
      }
    });
    mottoInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); mottoSave.click(); }
      else if(e.key==='Escape'){ e.preventDefault(); mottoCancel.click(); }
    });

    document.addEventListener('click', e=>{
      qsa('.editable.editing').forEach(el=>{
        if(!el.contains(e.target)){
          el.classList.remove('editing');
          const panel = el.querySelector('.edit-panel');
          if(panel) panel.hidden = true;
        }
      });
    });
  }

  async function initPageTitle(){
    pageTag.textContent = state.page + '页';
    let title='', motto='';
    try{
      if(window.BMApi){
        const data = await window.BMApi.pages.get(state.page);
        title = (data && data.title)||''; motto = (data && data.motto)||'';
      }
    }catch(e){
      title = (localStorage.getItem(KEYS.title(state.page)) || '').trim();
      motto = (localStorage.getItem(KEYS.motto(state.page)) || '').trim();
    }
    updateBrandDisplay(title);
    updateMottoDisplay(motto);
    if(brandInput) brandInput.value = title || (brandText ? brandText.textContent : DEFAULT_TITLE);
    if(mottoInput) mottoInput.value = motto || (mottoText ? mottoText.textContent : DEFAULT_MOTTO);
  }

  function initServiceWorker(){
    if(!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(reg=>{
      if(reg.waiting && navigator.serviceWorker.controller){
        showSWUpdatePrompt(reg.waiting);
      }
      reg.addEventListener('updatefound', ()=>{
        const installing = reg.installing;
        if(!installing) return;
        installing.addEventListener('statechange', ()=>{
          if(installing.state === 'installed' && navigator.serviceWorker.controller){
            showSWUpdatePrompt(reg.waiting || installing);
          }
        });
      });
    }).catch(()=>{});

    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if(swRefreshPending){
        swRefreshPending = false;
        window.location.reload();
      }
    });
  }

  function initAB(){
    const linkA = qs('#linkA'); const linkB = qs('#linkB');
    // ensure icon style and svg inside the button (from lock.svg)
    linkA.classList.toggle('active', state.page==='A');
    linkB.classList.toggle('active', state.page==='B');
    if(state.page==='B'){
      btnSetBPass.classList.remove('hidden');
      positionLockIcon();
      updateBPassButtonText();
      const stored = (localStorage.getItem(KEYS.bPwd)||'').trim();
      const authed = sessionStorage.getItem(KEYS.bAuthed)==='1';
      if(stored && !authed){ requireBAuth(); }
    } else {
      sessionStorage.removeItem(KEYS.bAuthed);
      btnSetBPass.classList.add('hidden');
    }
    btnSetBPass.addEventListener('click', ()=> bpassDlg.showModal());
    window.addEventListener('resize', positionLockIcon);

    // SPA-style switching for A/B without full reload
    const handleClick = (targetPage)=> (e)=>{
      e.preventDefault();
      if(state.page === targetPage) return;
      switchToPage(targetPage, true);
    };
    if(linkA) linkA.addEventListener('click', handleClick('A'));
    if(linkB) linkB.addEventListener('click', handleClick('B'));
  }

  function updateBPassButtonText(){
    if(!btnSetBPass) return;
    const has = !!((localStorage.getItem(KEYS.bPwd)||'').trim());
    // toggle lock visual state via class and title
    btnSetBPass.classList.toggle('lock-set', has);
    btnSetBPass.setAttribute('aria-label', has ? '修改/清空独立密码' : '设置独立密码');
    btnSetBPass.title = has ? '修改/清空独立密码' : '设置独立密码';
  }

  function switchToPage(nextPage, push){
    state.page = nextPage === 'B' ? 'B' : 'A';
    if(push){
      const url = new URL(location.href);
      url.searchParams.set('page', state.page);
      history.pushState({page: state.page}, '', url.toString());
    }
    // 关闭可能打开的编辑面板/对话框，避免跨页残留
    qsa('.editable.editing').forEach(el=>{ el.classList.remove('editing'); const p = el.querySelector('.edit-panel'); if(p) p.hidden = true; });
    [qs('#dlgLink'), qs('#dlgLogin'), qs('#dlgChangePwd'), qs('#dlgBPass'), qs('#dlgAskB')]
      .forEach(d=>{ try{ if(d && d.open) d.close(); }catch(e){} });
    pageTag.textContent = state.page + '页';
    initPageTitle();
    loadLinks(state.page);
    // Re-init A/B active + B password visibility/auth
    const linkA = qs('#linkA'); const linkB = qs('#linkB');
    if(linkA && linkB){
      linkA.classList.toggle('active', state.page==='A');
      linkB.classList.toggle('active', state.page==='B');
    }
    if(state.page==='B'){
      btnSetBPass.classList.remove('hidden');
      positionLockIcon();
      updateBPassButtonText();
      const stored = (localStorage.getItem(KEYS.bPwd)||'').trim();
      const authed = sessionStorage.getItem(KEYS.bAuthed)==='1';
      if(stored && !authed){ requireBAuth(); }
    } else {
      sessionStorage.removeItem(KEYS.bAuthed);
      btnSetBPass.classList.add('hidden');
    }
  }

  function positionLockIcon(){
    const b = qs('#linkB');
    const btn = btnSetBPass;
    const wrap = b && b.parentElement; // .ab
    if(!(b && btn && wrap)) return;
    const bRect = b.getBoundingClientRect();
    const wRect = wrap.getBoundingClientRect();
    const left = (bRect.right - wRect.left) + 12; // 12px gap to the right of B
    const top = (bRect.top - wRect.top) + bRect.height/2; // center vertically to B
    btn.style.left = left + 'px';
    btn.style.top = top + 'px';
    btn.style.transform = 'translateY(-50%)';
  }

  function requireBAuth(){
    btnSetBPass.style.display='inline-flex';
    let backend = !!window.BMApi;
    if(!backend){
      let stored = (localStorage.getItem(KEYS.bPwd)||'').trim();
      if(!stored){ localStorage.removeItem(KEYS.bPwd); sessionStorage.setItem(KEYS.bAuthed,'1'); return; }
      if(sessionStorage.getItem(KEYS.bAuthed)==='1'){ return; }
      askBDlg.showModal();
      qs('#btnAskBCancel').onclick = ()=>{ askBDlg.close(); location.href='?page=A'; };
      qs('#btnAskBOk').onclick = ()=>{
        const v = (qs('#askBPwd').value || '').trim();
        if(!stored){ askBDlg.close(); return; }
        if(v===stored){ sessionStorage.setItem(KEYS.bAuthed,'1'); askBDlg.close(); }
        else alert('密码不正确');
      };
      return;
    }
    if(sessionStorage.getItem(KEYS.bAuthed)==='1'){ return; }
    askBDlg.showModal();
    qs('#btnAskBCancel').onclick = ()=>{ askBDlg.close(); location.href='?page=A'; };
    qs('#btnAskBOk').onclick = async ()=>{
      const v = (qs('#askBPwd').value || '').trim();
      try{
        const r = await window.BMApi.pages.verifyB(v);
        if(r && (r.ok===true || r.ok==='true')){ sessionStorage.setItem(KEYS.bAuthed,'1'); askBDlg.close(); }
        else alert('密码不正确');
      }catch(e){ alert('验证失败'); }
    };
  }

  function initLogin(){
    const DEFAULT = 'Taich@2022';
    btnLoginTop.onclick = ()=>{ loginDlg.showModal(); };
    if(btnOpenRegister) btnOpenRegister.onclick = ()=>{ if(registerDlg){ loginDlg.close(); registerDlg.showModal(); } };
    qs('#btnLoginCancel').onclick = ()=> loginDlg.close();
    qs('#btnLoginOk').onclick = async ()=>{
      const err = qs('#loginErr'); if(err){ err.hidden = true; err.textContent=''; }
      const username = (qs('#loginUser').value || 'demo').trim();
      const password = qs('#loginPwd').value || '';
      if(!username){ if(err){ err.textContent='请输入用户名'; err.hidden=false; } qs('#loginUser').focus(); return; }
      if(!password){ if(err){ err.textContent='请输入密码'; err.hidden=false; } qs('#loginPwd').focus(); return; }
      try{
        if(window.BMApi){
          const resp = await window.BMApi.auth.login(username, password);
          if(resp && resp.token){ window.BMApi.setToken(resp.token); state.user = resp.user?.username || username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); loginDlg.close(); return; }
        }
        // fallback local check
        const expected = localStorage.getItem(KEYS.loginPwd) || DEFAULT;
        if(password===expected){ state.user = username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); loginDlg.close(); }
        else { if(err){ err.textContent='密码不正确'; err.hidden=false; } }
      }catch(e){ if(err){ err.textContent='登录失败：'+(e?.message||''); err.hidden=false; } }
    };
    function updateAvatar(){
      const saved = localStorage.getItem(KEYS.user);
      if(saved){
        avatar.textContent = saved.slice(0,1).toUpperCase();
        avatar.classList.add('show');
        btnLoginTop.style.display='none';
        if(btnLogout) btnLogout.style.display = 'inline-flex';
      } else {
        avatar.classList.remove('show');
        btnLoginTop.style.display='inline-flex';
        if(btnLogout) btnLogout.style.display = 'none';
      }
    }
    (()=>{
      const saved = localStorage.getItem(KEYS.user);
      if(saved){ state.user = saved; }
      updateAvatar();
    })();
    avatar.onclick = ()=>{
      if(confirm('确认退出登录？')){
        state.user = null; localStorage.removeItem(KEYS.user); if(window.BMApi) window.BMApi.setToken(''); renderLoginState(); alert('已退出登录');
      }
    };
    btnLogout.onclick = ()=>{ state.user = null; localStorage.removeItem(KEYS.user); if(window.BMApi) window.BMApi.setToken(''); renderLoginState(); alert('已退出登录'); };
    btnChangePwd.onclick = ()=>{ changeDlg.showModal(); };
    qs('#btnPwdCancel').onclick = ()=> changeDlg.close();
    qs('#btnPwdOk').onclick = async ()=>{
      // If server exposes change password later, call it; for now keep local fallback
      const oldp = qs('#oldPwd').value, newp = qs('#newPwd').value;
      const cur = localStorage.getItem(KEYS.loginPwd) || DEFAULT;
      if(oldp!==cur){ alert('旧密码不正确'); return; }
      if(!newp){ alert('新密码不能为空'); return; }
      localStorage.setItem(KEYS.loginPwd, newp);
      changeDlg.close(); alert('已修改登录密码');
    };
    const btnResetAll = qs('#btnResetAll');
    if(btnResetAll) btnResetAll.onclick = ()=>{
      if(confirm('确认将登录密码重置为初始值，并清空B页密码？')){
        localStorage.setItem(KEYS.loginPwd, DEFAULT);
        localStorage.removeItem(KEYS.bPwd);
        alert('已恢复到初始状态');
      }
    };

    // 登录对话框按钮已在上方绑定（带后端优先）。

    function setSkinUIForAuth(isAuthed){
      if(customSkins) customSkins.style.display = isAuthed ? '' : 'none';
      if(skinUpload) skinUpload.disabled = !isAuthed;
      if(btnApplySkin) btnApplySkin.disabled = !isAuthed;
      if(!isAuthed){
        const def = '/images/p1.jpeg';
        document.body.style.backgroundImage = `url(${def})`;
        localStorage.setItem(KEYS.skin, def);
        if(presetSkins){
          qsa('.preset-thumb', presetSkins).forEach(el=> el.classList.toggle('active', el.getAttribute('data-skin')===def));
        }
      }
    }
    function renderLoginState(){
      updateAvatar();
      const isAuthed = !!localStorage.getItem(KEYS.user);
      setSkinUIForAuth(isAuthed);
    }

    // 注册对话框
    const btnRegCancel = qs('#btnRegCancel');
    const btnRegOk = qs('#btnRegOk');
    if(btnRegCancel) btnRegCancel.onclick = ()=> { const e = qs('#regErr'); if(e){ e.hidden=true; e.textContent=''; } registerDlg && registerDlg.close(); };
    if(btnRegOk) btnRegOk.onclick = async ()=>{
      const err = qs('#regErr'); if(err){ err.hidden = true; err.textContent=''; }
      const username = (qs('#regUser').value||'').trim();
      const password = (qs('#regPwd').value||'');
      if(!username){ if(err){ err.textContent='请输入用户名（3-20位）'; err.hidden=false; } qs('#regUser').focus(); return; }
      if(username.length<3 || username.length>20 || !/^\w+$/.test(username)){ if(err){ err.textContent='用户名需为3-20位字母数字或下划线'; err.hidden=false; } qs('#regUser').focus(); return; }
      if(!password){ if(err){ err.textContent='请输入密码（至少6位）'; err.hidden=false; } qs('#regPwd').focus(); return; }
      if(password.length<6){ if(err){ err.textContent='密码至少6位'; err.hidden=false; } qs('#regPwd').focus(); return; }
      try{
        if(window.BMApi){
          const resp = await fetch((window.API_BASE||'/api/v1') + '/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
          if(!resp.ok){ const msg = await resp.text(); throw new Error(msg||'注册失败'); }
          const data = await resp.json();
          if(data && data.token){
            // 注册成功后直接调用登录接口，确保和登录流程一致（也可直接复用 token）
            try{
              const loginRes = await window.BMApi.auth.login(username, password);
              const token = loginRes?.token || data.token;
              if(token){ window.BMApi.setToken(token); state.user = (loginRes?.user?.username)||username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); registerDlg && registerDlg.close(); alert('注册并登录成功'); return; }
            }catch(_){
              // 回退：使用注册返回的 token
              window.BMApi.setToken(data.token); state.user = data.user?.username || username; localStorage.setItem(KEYS.user, state.user); renderLoginState(); registerDlg && registerDlg.close(); alert('注册并登录成功'); return;
            }
          }
        }
        if(err){ err.textContent='注册失败：后端不可用'; err.hidden=false; }
      }catch(e){ if(err){ err.textContent='注册失败：'+(e?.message||''); err.hidden=false; } }
    };
  }

  // B 页密码设置对话框逻辑
  if(bpassDlg){
    const btnCancel = qs('#btnBPassCancel');
    const btnSave = qs('#btnBPassSave');
    const input = qs('#bPass');
    if(btnCancel) btnCancel.onclick = ()=>{ bpassDlg.close(); };
    if(btnSave) btnSave.onclick = ()=>{
      const v = (input && input.value ? input.value.trim() : '');
      if(v){ localStorage.setItem(KEYS.bPwd, v); }
      else { localStorage.removeItem(KEYS.bPwd); }
      sessionStorage.removeItem(KEYS.bAuthed); // 改动后下次进入需按规则重新验证
      updateBPassButtonText();
      alert(v? '已保存独立密码' : '已清空独立密码');
      bpassDlg.close();
    };
  }

  // ============ Skin (in drawer) ============
  function initSkin(){
    updateSkinQuotaHint();
    // 后端优先加载预设/当前/自定义皮肤
    (async ()=>{
      try{
        if(window.BMApi){
          try{
            const preset = await window.BMApi.skins.preset();
            if(Array.isArray(preset) && presetSkins){
              const wrap = presetSkins.querySelector('.preset-skins');
              if(wrap){
                wrap.innerHTML = '';
                preset.forEach(p=>{
                  const d = document.createElement('div'); d.className='preset-thumb'; d.title=p.name||''; d.style.backgroundImage=`url('${p.url}')`; d.setAttribute('data-skin', p.url); wrap.appendChild(d);
                });
              }
            }
          }catch(_){/* ignore */}
          try{
            const cur = await window.BMApi.skins.currentGet();
            if(cur && cur.url){ document.body.style.backgroundImage = `url(${cur.url})`; }
          }catch(_){ const saved = localStorage.getItem(KEYS.skin); if(saved) document.body.style.backgroundImage = `url(${saved})`; }
          try{
            const customs = await window.BMApi.skins.customList();
            if(Array.isArray(customs) && customSkinsList){
              customSkinsList.innerHTML = '';
              customs.forEach(c=>{
                const d = document.createElement('div'); d.className='preset-thumb'; d.title=c.name||''; d.style.backgroundImage=`url('${c.url}')`; d.setAttribute('data-skin', c.url); customSkinsList.appendChild(d);
              });
            }
          }catch(_){ renderCustomSkins(localStorage.getItem(KEYS.skin)||''); }
        }
      }catch(_){/* ignore */}
    })();
    btnApplySkin.onclick = ()=>{
      const file = skinUpload.files && skinUpload.files[0];
      if(!file){ alert('请先选择图片'); return; }
      const role = 'normal';
      const used = Number(localStorage.getItem(KEYS.roleUsage(role))||0);
      const quota = state.quotas[role];
      if(used >= quota){ alert('已达上传次数上限'); return; }
      const reader = new FileReader();
      reader.onload = async e=>{
        const dataUrl = e.target.result;
        document.body.style.backgroundImage = `url(${dataUrl})`;
        try{ if(window.BMApi) await window.BMApi.skins.currentSet(dataUrl); }catch(_){ }
        localStorage.setItem(KEYS.skin, dataUrl);
        localStorage.setItem(KEYS.roleUsage(role), String(used+1));
        saveCustomSkin(dataUrl);
        renderCustomSkins(dataUrl);
        // 清空文件选中，避免同一文件无法再次触发变更
        if(skinUpload) skinUpload.value = '';
        updateSkinQuotaHint();
      };
      reader.readAsDataURL(file);
    };
    // preset skins click
    if(presetSkins){
      presetSkins.addEventListener('click', async (e)=>{
        const item = e.target.closest('[data-skin]');
        if(!item) return;
        const url = item.getAttribute('data-skin');
        try{
          if(window.BMApi){
            const res = await window.BMApi.request('/skins/current',{ method:'POST', body: JSON.stringify({ type:'preset', url }) });
            const newUrl = (res && res.url) ? res.url : url;
            document.body.style.backgroundImage = `url(${newUrl})`;
            localStorage.setItem(KEYS.skin, newUrl);
          } else {
            document.body.style.backgroundImage = `url(${url})`;
            localStorage.setItem(KEYS.skin, url);
          }
        }catch(_){
          document.body.style.backgroundImage = `url(${url})`;
          localStorage.setItem(KEYS.skin, url);
        }
        // active state
        qsa('.preset-thumb', presetSkins).forEach(el=> el.classList.toggle('active', el===item));
        if(skinUpload) skinUpload.value = '';
      });
    }

    const saved = localStorage.getItem(KEYS.skin);
    renderCustomSkins(saved || '');
    if(saved){
      document.body.style.backgroundImage = `url(${saved})`;
      qsa('.preset-thumb', presetSkins).forEach(el=> el.classList.toggle('active', el.getAttribute('data-skin')===saved));
    } else {
      // 与后端默认一致的占位
      const def = '/images/p1.jpeg';
      document.body.style.backgroundImage = `url(${def})`;
      localStorage.setItem(KEYS.skin, def);
      qsa('.preset-thumb', presetSkins).forEach(el=> el.classList.toggle('active', el.getAttribute('data-skin')===def));
    }
  }

  function updateSkinQuotaHint(){
    if(!skinQuotaHint) return;
    const role = 'normal';
    (async ()=>{
      try{
        if(window.BMApi){
          const q = await window.BMApi.quotas.skinUpload();
          const left = Math.max((q.quota||3) - (q.used||0), 0);
          skinQuotaHint.textContent = `提示：自定义皮肤剩余 ${left} 次上传机会`;
          return;
        }
      }catch(_){/* ignore */}
      const used = Number(localStorage.getItem(KEYS.roleUsage(role))||0);
      const quota = state.quotas[role];
      const left = Math.max(quota - used, 0);
      skinQuotaHint.textContent = `提示：自定义皮肤剩余 ${left} 次上传机会`;
    })();
  }

  async function refreshSkinQuota(){
    try{
      if(window.BMApi && skinQuotaHint){
        const q = await window.BMApi.quotas.skinUpload();
        const left = Math.max((q.quota||3) - (q.used||0), 0);
        skinQuotaHint.textContent = `提示：自定义皮肤剩余 ${left} 次上传机会`;
      }
    }catch(_){/* ignore */}
  }

  function loadCustomSkins(){
    try{ return JSON.parse(localStorage.getItem('bm_custom_skins')||'[]'); }catch(_){ return []; }
  }
  function saveCustomSkin(url){
    const list = loadCustomSkins().filter(u=>u!==url);
    list.unshift(url);
    const trimmed = list.slice(0,3);
    localStorage.setItem('bm_custom_skins', JSON.stringify(trimmed));
  }
  function renderCustomSkins(activeUrl){
    if(!customSkinsList) return;
    const list = loadCustomSkins();
    customSkinsList.innerHTML = list.map(u=>`<div class="preset-thumb${u===activeUrl?' active':''}" data-skin="${u}" title="自定义皮肤" style="background-image:url('${u}')"></div>`).join('');
    customSkinsList.onclick = (e)=>{
      const item = e.target.closest('[data-skin]');
      if(!item) return;
      const url = item.getAttribute('data-skin');
      document.body.style.backgroundImage = `url(${url})`;
      localStorage.setItem(KEYS.skin, url);
      qsa('.preset-thumb', customSkinsList).forEach(el=> el.classList.toggle('active', el===item));
      // 取消预设的active标记，避免双选
      qsa('.preset-thumb', presetSkins).forEach(el=> el.classList.remove('active'));
      if(skinUpload) skinUpload.value = '';
    };
  }

  async function refreshCustomSkins(){
    try{
      if(window.BMApi && customSkinsList){
        const list = await window.BMApi.skins.customList();
        if(Array.isArray(list)){
          customSkinsList.innerHTML = list.map(c=>`<div class=\"preset-thumb\" data-skin=\"${c.url}\" title=\"自定义皮肤\" style=\"background-image:url('${c.url}')\"></div>`).join('');
        }
      }
    }catch(_){/* ignore */}
  }

  // ============ Settings Drawer logic ============
  let appearanceBound = false;
  function ensureAppearanceBound(){
    if(!appearanceBound){
      initAppearance();
      appearanceBound = true;
    }
  }
  function openDrawer(){ 
    drawer.classList.add('open'); drawerMask.classList.add('show'); 
    ensureAppearanceBound();
    void refreshCustomSkins();
    void refreshSkinQuota();
  }
  function closeDrawer(){ drawer.classList.remove('open'); drawerMask.classList.remove('show'); }
  btnSettings.addEventListener('click', openDrawer);
  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerMask.addEventListener('click', closeDrawer);
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawer(); });

  // ============ Appearance logic ============
  let saveSettingsTimer = null;
  let lastSaveAt = 0;
  let pendingTailSave = false;
  const SAVE_THROTTLE_MS = 300;

  async function saveAppearance(){
    try{
      if(window.BMApi){
        await window.BMApi.settings.put({
          boardAlpha: Number(rngBoard.value),
          cardAlpha: Number(rngCard.value),
          vignette: Number(rngVig.value),
          showcaseWidth: Number(rngShow.value),
          contrast: document.body.classList.contains('contrast'),
        });
      }
    }catch(_){/* ignore network */}
  }

  function scheduleSave(){
    const now = Date.now();
    const elapsed = now - lastSaveAt;
    if(elapsed >= SAVE_THROTTLE_MS){
      lastSaveAt = now;
      pendingTailSave = false;
      void saveAppearance();
    } else {
      pendingTailSave = true;
      if(saveSettingsTimer) clearTimeout(saveSettingsTimer);
      saveSettingsTimer = setTimeout(()=>{
        lastSaveAt = Date.now();
        pendingTailSave = false;
        void saveAppearance();
      }, SAVE_THROTTLE_MS - elapsed + 50);
    }
  }

  async function applyAppearance(){
    console.log('applyAppearance');
    if(!rngBoard || !rngCard || !rngVig || !rngShow) return;
    document.documentElement.style.setProperty('--board-alpha', (Number(rngBoard.value)/100).toFixed(2));
    document.documentElement.style.setProperty('--card-alpha', (Number(rngCard.value)/100).toFixed(2));
    document.documentElement.style.setProperty('--vignette-alpha', (Number(rngVig.value)/100).toFixed(2));
    document.documentElement.style.setProperty('--showcase-width', `${Number(rngShow.value)}vw`);
    if(valBoard) valBoard.textContent = `${rngBoard.value}%`;
    if(valCard) valCard.textContent = `${rngCard.value}%`;
    if(valVig) valVig.textContent = `${rngVig.value}%`;
    if(valShow) valShow.textContent = `${rngShow.value}vw`;
    scheduleSave();
    localStorage.setItem(KEYS.ui.boardAlpha, rngBoard.value);
    localStorage.setItem(KEYS.ui.cardAlpha, rngCard.value);
    localStorage.setItem(KEYS.ui.vignette, rngVig.value);
    localStorage.setItem(KEYS.ui.showcase, rngShow.value);
  }
  async function initAppearance(){
    if(!rngBoard || !rngCard || !rngVig || !rngShow) return; // 元素缺失则不绑定
    try{
      if(window.BMApi){
        const s = await window.BMApi.settings.get();
        if(s){
          rngBoard.value = s.boardAlpha ?? 55;
          rngCard.value = s.cardAlpha ?? 55;
          rngVig.value = s.vignette ?? 25;
          rngShow.value = s.showcaseWidth ?? 28;
          document.body.classList.toggle('contrast', !!s.contrast);
        }
      }
    }catch(_){
      rngBoard.value = localStorage.getItem(KEYS.ui.boardAlpha) || 55;
      rngCard.value = localStorage.getItem(KEYS.ui.cardAlpha) || 55;
      rngVig.value = localStorage.getItem(KEYS.ui.vignette) || 25;
      rngShow.value = localStorage.getItem(KEYS.ui.showcase) || 28;
      const contrast = localStorage.getItem(KEYS.ui.contrast)==='1';
      document.body.classList.toggle('contrast', contrast);
    }
    ['input','change'].forEach(ev=>{
      rngBoard.addEventListener(ev, applyAppearance);
      rngCard.addEventListener(ev, applyAppearance);
      rngVig.addEventListener(ev, applyAppearance);
      rngShow.addEventListener(ev, applyAppearance);
    });
    // 拖动结束时补发一次保存
    ['pointerup','mouseup','touchend'].forEach(ev=>{
      [rngBoard, rngCard, rngVig, rngShow].forEach(el=>{
        el.addEventListener(ev, ()=>{ pendingTailSave && scheduleSave(); });
      });
    });
    applyAppearance();
  }

  // 一键适配浅色壁纸：提高面板/卡片不透明度、加深暗角、增强文字对比
  function adaptForLightWallpaper(){
    rngBoard.value = 75; rngCard.value = 80; rngVig.value = 40; // 推荐值
    applyAppearance();
    document.body.classList.add('contrast');
    localStorage.setItem(KEYS.ui.contrast,'1');
  }
  btnAdaptLight.addEventListener('click', ()=>{
    adaptForLightWallpaper();
    alert('已应用适配浅色壁纸：提高对比度与可读性');
  });

  // 恢复外观默认值
  const btnResetAppearance = qs('#btnResetAppearance');
  if(btnResetAppearance){
    btnResetAppearance.addEventListener('click', async ()=>{
      rngBoard.value = 55; rngCard.value = 55; rngVig.value = 25; rngShow.value = 28;
      document.body.classList.remove('contrast');
      localStorage.setItem(KEYS.ui.contrast,'0');
      await applyAppearance();
      try{
        if(window.BMApi){
          await window.BMApi.settings.put({ boardAlpha:55, cardAlpha:55, vignette:25, showcaseWidth:28, contrast:false });
        }
      }catch(_){/* ignore */}
      alert('已恢复外观到初始值');
    });
  }

  // --- Minimal self-test runner ---
  function runSelfTests(){
    const results = []; const ok = (name, pass, detail='')=>{ results.push({name, pass, detail}); };
    try{
      const key = KEYS.loginPwd; const DEFAULT = 'Taich@2022';
      const before = localStorage.getItem(key); localStorage.removeItem(key);
      if(!localStorage.getItem(key)) localStorage.setItem(key, DEFAULT);
      ok('默认登录密码初始化', localStorage.getItem(key)===DEFAULT);
      if(before==null) localStorage.removeItem(key); else localStorage.setItem(key,before);
    }catch(e){ ok('默认登录密码初始化', false, e.message); }
    try{ const arr = Array.from({length:20}, (_,i)=>({name:`链接 ${i+1}`, url:''})); ok('链接容量为20', arr.length===20); }catch(e){ ok('链接容量为20', false, e.message); }
    try{ sessionStorage.removeItem(KEYS.bAuthed); localStorage.setItem(KEYS.bPwd, ''); const authed = sessionStorage.getItem(KEYS.bAuthed)==='1'; ok('B页未验证前为未授权', authed===false); }catch(e){ ok('B页未验证前为未授权', false, e.message); }
    try{ const role='normal'; localStorage.setItem(KEYS.roleUsage(role), '1'); const quota = 3; const used = Number(localStorage.getItem(KEYS.roleUsage(role))||0); ok('皮肤上传剩余=2', (quota-used)===2); }catch(e){ ok('皮肤上传剩余=2', false, e.message); }
    try{
      const prev = {b: rngBoard.value, c: rngCard.value, v: rngVig.value, s: rngShow.value};
      adaptForLightWallpaper();
      ok('一键适配设置', rngBoard.value==75 && rngCard.value==80 && rngVig.value==40);
      rngBoard.value = prev.b; rngCard.value = prev.c; rngVig.value = prev.v; rngShow.value = prev.s; applyAppearance();
    }catch(e){ ok('一键适配设置', false, e.message); }

    const allPass = results.every(r=>r.pass); const tag = qs('#selfTestTag');
    if(allPass){
      tag.textContent = '';
      tag.style.background = 'transparent';
      tag.style.borderColor = 'transparent';
      tag.style.padding = '0';
      tag.style.margin = '0';
    } else {
      tag.textContent = '自检有失败，详见控制台';
      tag.style.background = 'rgba(239,68,68,.15)';
      tag.style.borderColor = '#7f1d1d';
      tag.style.padding = '';
      tag.style.margin = '';
    }
    console.group('%c[My BookMarks] 自检结果','color:#60a5fa'); results.forEach(r=>console.log(`${r.pass?'✅':'❌'} ${r.name}${r.detail?(' - '+r.detail):''}`)); console.groupEnd();
  }

  function boot(){
    // 清理可能存在的 B 页密码脏值（全空白当作未设置）
    try{
      const raw = localStorage.getItem(KEYS.bPwd);
      if(raw && raw.trim()===''){ localStorage.removeItem(KEYS.bPwd); }
    }catch(_){}
    initServiceWorker();
    initEditableHeaders();
    initPageTitle();
    loadLinks(state.page);
    initAB();
    initLogin();
    initSkin();
    // 初始根据登录态调整皮肤UI
    try{
      const isAuthed = !!localStorage.getItem(KEYS.user);
      const customSkins = qs('#customSkins'); // shadowed safe
      if(customSkins){ /* no-op, setSkinUIForAuth called in renderLoginState after initLogin */ }
      // 若未登录且当前为自定义皮肤，强制回退到预设
      if(!isAuthed){
        const def = '/images/p1.jpeg';
        document.body.style.backgroundImage = `url(${def})`;
        localStorage.setItem(KEYS.skin, def);
      }
    }catch(_){}
    initAppearance();
    runSelfTests();
    window.addEventListener('popstate', (e)=>{
      const p = (e.state && e.state.page) || new URLSearchParams(location.search).get('page') || 'A';
      switchToPage(p, false);
    });
  }

  if(!localStorage.getItem(KEYS.loginPwd)){ localStorage.setItem(KEYS.loginPwd, 'Taich@2022'); }

  boot();

})();
