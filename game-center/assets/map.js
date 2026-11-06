(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DEFAULT_API = 'https://game-center-bot.onrender.com';
  const cleanUrl = value => String(value || '').trim().replace(/\/+$/, '');
  let base = cleanUrl(localStorage.getItem('gc-bot-url') || sessionStorage.getItem('gc-bot-url') || DEFAULT_API);
  let token = localStorage.getItem('gc-bot-token') || sessionStorage.getItem('gc-bot-token') || '';
  const urlInput = $('mapApiUrl');
  const tokenInput = $('mapApiToken');
  const statusBox = $('status');
  const labels = { glacier:'Lodowe Rubieże', sands:'Płonące Piaski', fire_peaks:'Ogniste Szczyty' };
  if (urlInput) urlInput.value = base;
  if (tokenInput) tokenInput.value = token;

  function status(message) { statusBox.textContent = message; }
  function cell(value) { const td=document.createElement('td'); td.textContent=value ?? '—'; return td; }

  async function api(path) {
    const response = await fetch(base + path, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { throw new Error('Serwer zwrócił nieprawidłową odpowiedź (HTTP ' + response.status + ').'); }
    if (!response.ok) throw new Error(data.error || ('Błąd HTTP ' + response.status));
    return data;
  }

  async function load() {
    if (!base || !/^https:\/\//i.test(base)) { status('Wpisz prawidłowy adres serwera zaczynający się od https://.'); return; }
    if (!token) { status('Wpisz BOT_API_TOKEN w ustawieniach połączenia i kliknij „Zapisz w tej sesji”.'); return; }
    const region = $('region').value;
    $('rows').replaceChildren();
    $('count').textContent = '…'; $('updated').textContent = '…'; $('source').textContent = '…';
    status('Sprawdzam autoryzację API i połączenie z bazą…');
    try {
      const health = await api('/api/health');
      if (!health.ok) throw new Error('Serwer nie potwierdził gotowości.');
      status('API działa. Pobieram rekordy NPC z PostgreSQL…');
      const data = await api('/api/map/npcs?region=' + encodeURIComponent(region));
      $('count').textContent = data.count;
      $('source').textContent = data.count ? [...new Set(data.npcs.map(n => n.source))].join(', ') : 'brak zaimportowanych danych';
      $('updated').textContent = data.npcs.length ? new Date(Math.max(...data.npcs.map(n => new Date(n.observedAt).getTime()))).toLocaleString('pl-PL') : '—';
      if (!data.npcs.length) {
        const tr=document.createElement('tr'); const td=cell('API i baza działają. Brak zaimportowanych rekordów NPC dla ' + labels[region] + '.');
        td.colSpan=6; td.className='map-empty'; tr.append(td); $('rows').append(tr);
        status('Połączenie poprawne: API odpowiada, PostgreSQL działa. Dla tej krainy nie ma jeszcze danych NPC.');
        return;
      }
      data.npcs.forEach(n => {
        const tr=document.createElement('tr');
        [n.x,n.y,n.npc_type,n.name,n.level ?? '—',new Date(n.observedAt).toLocaleString('pl-PL')].forEach(v=>tr.append(cell(v)));
        $('rows').append(tr);
      });
      status('Połączenie poprawne. Pobrano ' + data.count + ' rekordów NPC dla ' + labels[region] + '.');
    } catch (error) {
      $('count').textContent='—'; $('updated').textContent='—'; $('source').textContent='—';
      status('BŁĄD POŁĄCZENIA: ' + error.message + ' Sprawdź adres API i klucz dostępu.');
    }
  }

  $('saveMapConfig').addEventListener('click', () => {
    base = cleanUrl(urlInput.value);
    token = tokenInput.value.trim();
    if (!base || !token) { status('Uzupełnij adres API i klucz dostępu.'); return; }
    localStorage.setItem('gc-bot-url', base);
    localStorage.setItem('gc-bot-token', token);
    sessionStorage.setItem('gc-bot-url', base);
    sessionStorage.setItem('gc-bot-token', token);
    status('Konfiguracja zapisana w pamięci tej przeglądarki. Testuję połączenie…');
    load();
  });
  $('load').addEventListener('click', load);
  $('region').addEventListener('change', load);
  load();
})();