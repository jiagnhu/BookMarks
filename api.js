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
    console.log(API_BASE + path, Object.assign({}, opts, { headers }));
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
      me: ()=> request('/auth/me')
    },
    pages:{
      get: (code)=> request(`/pages/${code}`),
      update: (code, payload)=> request(`/pages/${code}`, { method:'PUT', body: JSON.stringify(payload) }),
      verifyB: (password)=> request('/pages/B/verify',{ method:'POST', body: JSON.stringify({ password }) }),
      setBPassword: (password)=> request('/pages/B/password',{ method:'POST', body: JSON.stringify({ password }) }),
      bookmarks:{
        list: (code)=> request(`/pages/${code}/bookmarks`),
        saveAll: (code, items)=> request(`/pages/${code}/bookmarks`, { method:'PUT', body: JSON.stringify({ items }) }),
      }
    },
    skins:{
      preset: ()=> request('/skins/preset'),
      currentGet: ()=> request('/skins/current'),
      currentSet: (url)=> request('/skins/current',{ method:'POST', body: JSON.stringify({ url }) }),
      customList: ()=> request('/skins/custom'),
    },
    settings:{
      get: ()=> request('/settings'),
      put: (payload)=> request('/settings',{ method:'PUT', body: JSON.stringify(payload) }),
    },
    quotas:{
      skinUpload: ()=> request('/quotas/skin-upload'),
    },
  };

  window.BMApi = api;
})();

