(() => {
  'use strict';
  const STORAGE_KEY = 'game-center-library-v1';
  const defaultGames = [{
    id:'goodgame-empire',
    name:'Goodgame Empire',
    category:'strategy',
    url:'https://play.google.com/store/search?q=Goodgame%20Empire&c=apps',
    icon:'🏰',
    description:'Strategia • Buduj swoje imperium',
    official:true
  }];
  const $ = (id) => document.getElementById(id);
  let games = loadGames();
  let activeFilter = 'all';
  let deferredInstall = null;

  function loadGames() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : defaultGames.slice();
    } catch (_) { return defaultGames.slice(); }
  }
  function saveGames() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(games)); }
    catch (_) { alert('Nie udało się zapisać biblioteki na tym urządzeniu.'); }
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function render() {
    const query = $('searchInput').value.trim().toLocaleLowerCase('pl');
    const visible = games.filter(game => {
      const matchesFilter = activeFilter === 'all' || game.category === activeFilter;
      return matchesFilter && game.name.toLocaleLowerCase('pl').includes(query);
    });
    $('gameCount').textContent = String(games.length).padStart(2,'0');
    $('gameGrid').innerHTML = visible.map((game,index) => {
      const icon = game.icon || '🎮';
      const category = game.category === 'strategy' ? 'STRATEGICZNA' : 'GRA MOBILNA';
      return `<article class="game-card" style="--glow:${index % 2 ? '#42d6c1' : '#8270ff'}">
        <div class="card-top"><div class="game-icon ${game.official ? '' : 'custom'}">${escapeHTML(icon)}</div><span class="card-tag">${category}</span></div>
        <h3>${escapeHTML(game.name)}</h3><div class="game-meta">${escapeHTML(game.description || 'Gra mobilna')}</div>
        <div class="card-actions"><a class="play-link" href="${escapeHTML(game.url)}" target="_blank" rel="noopener noreferrer">Google Play <span>↗</span></a>
        ${game.official ? '<span class="card-tag">STARTOWA</span>' : `<button class="remove-button" data-remove="${escapeHTML(game.id)}" aria-label="Usuń ${escapeHTML(game.name)}">Usuń ×</button>`}</div>
      </article>`;
    }).join('');
    $('emptyState').hidden = visible.length !== 0;
  }
  function openDialog() { $('addDialog').showModal(); $('gameName').focus(); }
  function closeDialog() { $('addDialog').close(); $('addForm').reset(); }
  $('openAdd').addEventListener('click', openDialog);
  $('closeAdd').addEventListener('click', closeDialog);
  $('cancelAdd').addEventListener('click', closeDialog);
  $('addDialog').addEventListener('click', event => { if (event.target === $('addDialog')) closeDialog(); });
  $('searchInput').addEventListener('input', render);
  $('filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
    render();
  });
  $('gameGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const game = games.find(item => item.id === button.dataset.remove);
    if (!game || !confirm(`Usunąć „${game.name}” z biblioteki na tym urządzeniu?`)) return;
    games = games.filter(item => item.id !== game.id);
    saveGames(); render();
  });
  $('addForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('gameName').value.trim();
    const rawUrl = $('gameUrl').value.trim();
    let parsed;
    try { parsed = new URL(rawUrl); } catch (_) { alert('Wpisz poprawny adres URL.'); return; }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'play.google.com' || !parsed.pathname.startsWith('/store/')) {
      alert('Dozwolone są wyłącznie bezpieczne linki https://play.google.com/store/...'); return;
    }
    if (!name) return;
    games.push({
      id: 'game-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      name, category:$('gameCategory').value, url:parsed.href,
      icon:$('gameCategory').value === 'strategy' ? '⚔️' : '🎮',
      description:$('gameCategory').value === 'strategy' ? 'Strategia • Twoja nowa przygoda' : 'Gra mobilna'
    });
    saveGames(); closeDialog(); activeFilter = 'all';
    document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item.dataset.filter === 'all'));
    $('searchInput').value = ''; render();
  });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); deferredInstall = event; $('installBtn').hidden = false;
  });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt(); await deferredInstall.userChoice;
    deferredInstall = null; $('installBtn').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
  render();
})();