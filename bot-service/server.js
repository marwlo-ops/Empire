'use strict';

const express = require('express');
const { Pool } = require('pg');
const crypto = require('node:crypto');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8kb' }));

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.BOT_API_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://marwlo-ops.github.io';
const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false }
}) : null;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin !== ALLOWED_ORIGIN) return res.status(403).json({ error: 'Origin niedozwolony.' });
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function auth(req, res, next) {
  if (!TOKEN) return res.status(503).json({ error: 'Serwer nie ma skonfigurowanego BOT_API_TOKEN.' });
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(supplied);
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Nieprawidłowy klucz dostępu.' });
  }
  next();
}

async function initDb() {
  if (!pool) throw new Error('DATABASE_URL is required for persistent cloud storage.');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_npcs (
      id BIGSERIAL PRIMARY KEY,
      region VARCHAR(24) NOT NULL CHECK (region IN ('glacier','sands','fire_peaks')),
      x INTEGER NOT NULL CHECK (x BETWEEN 0 AND 100000),
      y INTEGER NOT NULL CHECK (y BETWEEN 0 AND 100000),
      npc_type VARCHAR(80) NOT NULL,
      name VARCHAR(120) NOT NULL DEFAULT '',
      level INTEGER,
      source VARCHAR(80) NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(region,x,y,npc_type)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_commands (
      id UUID PRIMARY KEY,
      text VARCHAR(1000) NOT NULL,
      kind VARCHAR(40) NOT NULL,
      status VARCHAR(40) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function classify(text) {
  const value = text.toLocaleLowerCase('pl');
  if (/wyślij|wyslij|atakuj|wojska|arm[iyę]/i.test(value)) {
    return { kind:'game_action', status:'blocked', message:'Wysyłanie wojsk i atakowanie są wyłączone. Brak zweryfikowanego, oficjalnie dozwolonego adaptera gry.' };
  }
  if (/zbierz|zbieranie|surowc/i.test(value)) {
    return { kind:'resource_action', status:'blocked', message:'Zbieranie surowców nie zostało uruchomione. Najpierw potrzebny jest dozwolony interfejs odczytu/akcji gry.' };
  }
  if (/atak|obrona|obl[eę]ż|obl[eę]z/i.test(value)) {
    return { kind:'attack_report', status:'awaiting_connector', message:'Polecenie zapisane. Raport o atakach będzie możliwy po podłączeniu źródła danych gry.' };
  }
  if (/wydarzen|event|kalendarz/i.test(value)) {
    return { kind:'event_report', status:'awaiting_connector', message:'Polecenie zapisane. Raport wydarzeń wymaga skonfigurowanego źródła danych.' };
  }
  if (/status|raport|sprawdź|sprawdz/i.test(value)) {
    return { kind:'status_report', status:'awaiting_connector', message:'Polecenie zapisane. Serwer działa, ale nie ma jeszcze połączenia z danymi konta gry.' };
  }
  return { kind:'assistant', status:'needs_review', message:'Polecenie zapisane do kolejki. Na tym etapie bot klasyfikuje zadania, ale nie wykonuje akcji w grze.' };
}

app.get('/api/health', auth, async (_req, res) => {
  res.json({ ok:true, service:'game-center-bot', version:'0.1.0', storage:pool ? 'postgres' : 'unavailable', gameAdapter:'disconnected' });
});

app.post('/api/commands', auth, async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 1000) return res.status(400).json({ error:'Polecenie musi mieć od 1 do 1000 znaków.' });
  const result = classify(text);
  const id = crypto.randomUUID();
  try {
    await pool.query(
      'INSERT INTO bot_commands (id,text,kind,status,message) VALUES ($1,$2,$3,$4,$5)',
      [id, text, result.kind, result.status, result.message]
    );
    res.status(201).json({ id, text, ...result, createdAt:new Date().toISOString() });
  } catch (error) {
    console.error('command insert failed', error.message);
    res.status(503).json({ error:'Nie udało się zapisać polecenia. Sprawdź bazę danych.' });
  }
});

const MAP_REGIONS = new Set(['glacier','sands','fire_peaks']);

app.get('/api/map/npcs', auth, async (req, res) => {
  const region = String(req.query.region || '');
  if (!MAP_REGIONS.has(region)) return res.status(400).json({ error:'Nieprawidłowa kraina.' });
  try {
    const { rows } = await pool.query('SELECT id,region,x,y,npc_type,name,level,source,observed_at FROM map_npcs WHERE region=$1 ORDER BY y,x LIMIT 5000', [region]);
    res.json({ region, count:rows.length, npcs:rows.map(row => ({...row, observedAt:row.observed_at})) });
  } catch (error) { console.error('map NPC read failed', error.message); res.status(503).json({ error:'Nie udało się pobrać danych mapy.' }); }
});

// Import accepts data only from a verified, permitted adapter; no game login or scraping is performed here.
app.post('/api/map/npcs/import', auth, async (req, res) => {
  const region=String(req.body?.region||''); const source=typeof req.body?.source==='string'?req.body.source.trim().slice(0,80):''; const records=req.body?.npcs;
  if (!MAP_REGIONS.has(region)) return res.status(400).json({error:'Nieprawidłowa kraina.'});
  if (!source || !Array.isArray(records) || records.length>1000) return res.status(400).json({error:'Wymagane source i tablica npcs (maks. 1000 rekordów).'});
  for (const n of records) if (!Number.isInteger(n.x)||!Number.isInteger(n.y)||n.x<0||n.y<0||n.x>100000||n.y>100000||typeof n.npcType!=='string'||!n.npcType.trim()||n.npcType.length>80) return res.status(400).json({error:'Nieprawidłowy rekord NPC.'});
  const client=await pool.connect();
  try { await client.query('BEGIN'); for (const n of records) await client.query('INSERT INTO map_npcs(region,x,y,npc_type,name,level,source,observed_at) VALUES($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT(region,x,y,npc_type) DO UPDATE SET name=EXCLUDED.name,level=EXCLUDED.level,source=EXCLUDED.source,observed_at=NOW()', [region,n.x,n.y,n.npcType.trim(),String(n.name||'').slice(0,120),Number.isInteger(n.level)?n.level:null,source]); await client.query('COMMIT'); res.json({ok:true,region,imported:records.length,source}); }
  catch(error) { await client.query('ROLLBACK'); console.error('map NPC import failed',error.message); res.status(503).json({error:'Import danych mapy nie powiódł się.'}); } finally { client.release(); }
});

app.get('/api/commands', auth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,text,kind,status,message,created_at FROM bot_commands ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ commands:rows.map(row => ({
      id:row.id, text:row.text, kind:row.kind, status:row.status,
      message:row.message, createdAt:row.created_at
    })) });
  } catch (error) {
    console.error('command list failed', error.message);
    res.status(503).json({ error:'Nie udało się pobrać historii poleceń.' });
  }
});

app.get('/', (_req, res) => res.type('text').send('Game Center AI Bot API'));
if (!TOKEN) console.warn('BOT_API_TOKEN is missing; authenticated endpoints will return 503.');
if (!DATABASE_URL) console.warn('DATABASE_URL is missing; persistent storage is unavailable.');

app.listen(PORT, async () => {
  console.log(`Game Center Bot API listening on ${PORT}`);
  if (pool) {
    try { await initDb(); console.log('PostgreSQL schema ready.'); }
    catch (error) { console.error('Database initialization failed:', error.message); process.exit(1); }
  }
});