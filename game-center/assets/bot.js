(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = { url: sessionStorage.getItem('gc-bot-url') || '', token: sessionStorage.getItem('gc-bot-token') || '' };
  $('apiUrl').value = config.url;
  $('apiToken').value = config.token;
  function setReply(message, error=false) {
    $('botReply').textContent = message;
    $('botReply').classList.toggle('is-error', error);
  }
  function apiUrl(path) { return config.url.replace(/\/+$/, '') + path; }
  async function request(path, options={}) {
    if (!config.url || !config.token) throw new Error('Uzupełnij adres API i klucz dostępu.');
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+config.token, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Błąd serwera ('+response.status+').');
    return data;
  }
  $('saveBotConfig').addEventListener('click', async () => {
    config.url = $('apiUrl').value.trim();
    config.token = $('apiToken').value.trim();
    sessionStorage.setItem('gc-bot-url', config.url);
    sessionStorage.setItem('gc-bot-token', config.token);
    await checkConnection();
  });
  async function checkConnection() {
    if (!config.url || !config.token) {
      $('connectionStatus').textContent = 'Serwer nie skonfigurowany';
      return;
    }
    try {
      const health = await request('/api/health');
      $('connectionStatus').textContent = health.gameAdapter === 'connected' ? 'Serwer online · adapter gry połączony' : 'Serwer online · adapter gry niepodłączony';
      await refreshCommands();
    } catch (error) {
      $('connectionStatus').textContent = 'Brak połączenia z serwerem';
      setReply(error.message, true);
    }
  }
  async function sendCommand(command) {
    if (!command.trim()) return;
    $('sendCommand').disabled = true;
    setReply('Analizuję polecenie i zapisuję je w chmurze…');
    try {
      const result = await request('/api/commands', { method:'POST', body:JSON.stringify({ text:command.trim() }) });
      setReply(result.message || 'Polecenie przyjęte.');
      $('botCommand').value = '';
      await refreshCommands();
    } catch (error) { setReply(error.message, true); }
    finally { $('sendCommand').disabled = false; }
  }
  $('sendCommand').addEventListener('click', () => sendCommand($('botCommand').value));
  $('botCommand').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) sendCommand($('botCommand').value);
  });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
    $('botCommand').value = button.dataset.command;
    $('botCommand').focus();
  }));
  async function refreshCommands() {
    try {
      const data = await request('/api/commands');
      $('commandList').innerHTML = '';
      if (!data.commands?.length) {
        $('commandList').textContent = 'Brak poleceń. Napisz pierwszą wiadomość do bota.';
        return;
      }
      data.commands.forEach(item => {
        const row = document.createElement('article');
        row.className = 'command-row';
        const main = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = item.text;
        const detail = document.createElement('small');
        detail.textContent = new Date(item.createdAt).toLocaleString('pl-PL') + ' · ' + item.kind;
        main.append(title, detail);
        const status = document.createElement('span');
        status.className = 'command-state ' + (item.status === 'blocked' ? 'blocked' : 'pending');
        status.textContent = item.status;
        row.append(main, status);
        $('commandList').append(row);
      });
    } catch (error) { $('commandList').textContent = error.message; }
  }
  $('refreshCommands').addEventListener('click', refreshCommands);
  checkConnection();
})();