// Minimal API client for backend integration
(function(){
  const API_BASE = (window.API_BASE || '/api/v1');
  const storageTokenKey = 'bm_token';

  function getToken(){ return localStorage.getItem(storageTokenKey)||''; }
  function setToken(t){ if(t) localStorage.setItem(storageTokenKey,t); else localStorage.removeItem(storageTokenKey); }

  async function request(path, opts={}){
    const headers = Object.assign({ 'Content-Type':'application/json' }, opts.headers||{});
    const token = getToken();
    if(token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
    if(!res.ok){
      const text = await res.text().catch(()=>res.statusText);
      throw new Error(text || ('HTTP '+res.status));
    }
    const ct = res.headers.get('content-type')||'';
    if(ct.includes('application/json')) return res.json();
    return res.text();
  }

  const api = {
    setToken,
    auth:{
      login: (username,password)=> request('/auth/login',{ method:'POST', body: JSON.stringify({ username, password }) }),
      me: ()=> request('/auth/me'),
      changePassword: (oldPassword,newPassword)=> request('/auth/change-password',{ method:'POST', body: JSON.stringify({ oldPassword, newPassword }) }),
    },
    pages:{
      // 若有 token 则走用户端；否则访问公共端
      get: (code)=> getToken() ? request(`/pages/${code}`) : request(`/pages/public/${code}`),
      update: (code, payload)=> request(`/pages/${code}`, { method:'PUT', body: JSON.stringify(payload) }),
      verifyB: (password)=> request('/pages/B/verify',{ method:'POST', body: JSON.stringify({ password }) }),
      setBPassword: (password)=> request('/pages/B/password',{ method:'POST', body: JSON.stringify({ password }) }),
      bookmarks:{
        list: (code)=> getToken() ? request(`/pages/${code}/bookmarks`) : request(`/public/pages/${code}/bookmarks`),
        saveAll: (code, items)=> request(`/pages/${code}/bookmarks`, { method:'PUT', body: JSON.stringify({ items }) }),
      }
    },
    skins:{
      preset: ()=> request('/skins/preset'),
      currentGet: ()=> getToken() ? request('/skins/current') : request('/skins/public/current'),
      // 上传新自定义皮肤（dataURL 或 URL），会进行配额校验
      currentSet: (url)=> request('/skins/current',{ method:'POST', body: JSON.stringify({ url }) }),
      // 仅标记当前（不扣配额）：预设传 url，自定义传 id
      markCurrentPreset: (url)=> request('/skins/current',{ method:'PUT', body: JSON.stringify({ type:'preset', url }) }),
      markCurrentCustom: (id)=> request('/skins/current',{ method:'PUT', body: JSON.stringify({ type:'custom', id }) }),
      customList: ()=> request('/skins/custom'),
      deleteCustom: (id)=> request(`/skins/custom/${id}`, { method:'DELETE' }),
    },
    settings:{
      get: ()=> getToken() ? request('/settings') : request('/settings/public'),
      put: (payload)=> request('/settings',{ method:'PUT', body: JSON.stringify(payload) }),
    },
    links:{
      get: (page='A')=> request('/links?page=' + encodeURIComponent(page||'A')),
      put: (page='A', items)=> request('/links?page=' + encodeURIComponent(page||'A'),{ method:'PUT', body: JSON.stringify(items) }),
    },
    quotas:{
      skinUpload: ()=> request('/quotas/skin-upload'),
    },
  };

  window.BMApi = api;
})();
