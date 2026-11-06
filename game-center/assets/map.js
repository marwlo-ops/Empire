(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DEFAULT_API = 'https://game-center-bot.onrender.com';
  const cleanUrl = value => String(value || '').trim().replace(/\/+$/, '');
  const storageGet = key => { try { return localStorage.getItem(key) || sessionStorage.getItem(key) || ''; } catch (_) { return ''; } };
  const storageSet = (key,value) => { try { localStorage.setItem(key,value); } catch (_) {} try { sessionStorage.setItem(key,value); } catch (_) {} };
  const labels = { glacier:'Lodowe Rubieże', sands:'Płonące Piaski', fire_peaks:'Ogniste Szczyty' };

  function init() {
    const urlInput=$('mapApiUrl'), tokenInput=$('mapApiToken'), statusBox=$('status');
    const saveButton=$('saveMapConfig'), loadButton=$('load'), regionSelect=$('region');
    if (!urlInput || !tokenInput || !statusBox || !saveButton || !loadButton || !regionSelect) return;
    let base=cleanUrl(storageGet('gc-bot-url')) || DEFAULT_API;
    let token=storageGet('gc-bot-token');
    urlInput.value=base; tokenInput.value=token;
    const status=message => { statusBox.textContent=message; };
    const cell=value => { const td=document.createElement('td'); td.textContent=value ?? '—'; return td; };

    async function api(path) {
      const response=await fetch(base+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
      const raw=await response.text(); let data={};
      try { data=raw ? JSON.parse(raw) : {}; } catch (_) { throw new Error('Nieprawidłowa odpowiedź serwera (HTTP '+response.status+').'); }
      if(!response.ok) throw new Error(data.error || 'HTTP '+response.status);
      return data;
    }
    async function load() {
      base=cleanUrl(urlInput.value); token=tokenInput.value.trim();
      if(!/^https:\/\//i.test(base)) { status('Adres musi zaczynać się od https://'); return; }
      if(!token) { status('Wpisz klucz BOT_API_TOKEN.'); return; }
      status('Łączę się z API…');
      $('count').textContent='…'; $('updated').textContent='…'; $('source').textContent='…';
      try {
        const health=await api('/api/health');
        if(!health.ok) throw new Error('API nie potwierdziło gotowości.');
        status('API odpowiada. Sprawdzam rekordy NPC…');
        const region=regionSelect.value;
        const data=await api('/api/map/npcs?region='+encodeURIComponent(region));
        $('count').textContent=String(data.count ?? data.npcs?.length ?? 0);
        $('source').textContent=data.count ? [...new Set(data.npcs.map(n=>n.source).filter(Boolean))].join(', ') : 'brak zaimportowanych danych';
        $('updated').textContent=data.npcs?.length ? new Date(Math.max(...data.npcs.map(n=>new Date(n.observedAt).getTime()))).toLocaleString('pl-PL') : '—';
        $('rows').replaceChildren();
        if(!data.npcs?.length) {
          const tr=document.createElement('tr'),td=cell('API i baza odpowiadają, ale nie ma jeszcze rekordów NPC dla '+labels[region]+'.');
          td.colSpan=6; td.className='map-empty'; tr.append(td); $('rows').append(tr);
          status('Połączenie poprawne. API i PostgreSQL odpowiadają; brak danych NPC dla wybranej krainy.'); return;
        }
        data.npcs.forEach(n=>{ const tr=document.createElement('tr'); [n.x,n.y,n.npc_type,n.name,n.level ?? '—',n.observedAt ? new Date(n.observedAt).toLocaleString('pl-PL') : '—'].forEach(v=>tr.append(cell(v))); $('rows').append(tr); });
        status('Pobrano '+data.npcs.length+' rekordów NPC.');
      } catch(error) { status('BŁĄD API: '+error.message); $('count').textContent='—'; $('updated').textContent='—'; $('source').textContent='—'; }
    }
    saveButton.addEventListener('click',event=>{
      event.preventDefault();
      base=cleanUrl(urlInput.value); token=tokenInput.value.trim();
      if(!base || !token) { status('Uzupełnij adres API i klucz dostępu.'); return; }
      storageSet('gc-bot-url',base); storageSet('gc-bot-token',token);
      status('Ustawienia zapisane. Testuję połączenie…'); load();
    });
    loadButton.addEventListener('click',event=>{event.preventDefault();load();});
    regionSelect.addEventListener('change',load);
    status('Panel mapy gotowy. Wpisz klucz i kliknij „Zapisz w tej sesji”.');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();