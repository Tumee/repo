import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defaultSettings } from './config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,              -- taobao | pdd
  source_id TEXT NOT NULL,
  source_url TEXT,
  title_cn TEXT NOT NULL,
  title_mn TEXT,
  description_mn TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  variants TEXT NOT NULL DEFAULT '[]',
  category TEXT,
  shop_name TEXT,
  price_cny REAL NOT NULL,
  sales INTEGER NOT NULL DEFAULT 0,
  rating REAL,
  positive_rate REAL,
  review_count INTEGER NOT NULL DEFAULT 0,
  age_min_months INTEGER,
  age_max_months INTEGER,
  weight_kg REAL,
  score REAL NOT NULL DEFAULT 0,
  score_detail TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'candidate', -- candidate | approved | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source, source_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  note TEXT,
  payment_method TEXT NOT NULL,
  items TEXT NOT NULL,
  total_mnt INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  supplier_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

export function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return {
    criteria: { ...defaultSettings.criteria, ...stored.criteria },
    pricing: { ...defaultSettings.pricing, ...stored.pricing },
    searchQueries: stored.searchQueries ?? defaultSettings.searchQueries,
  };
}

export function saveSettings(db, partial) {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  for (const key of ['criteria', 'pricing', 'searchQueries']) {
    if (partial[key] !== undefined) stmt.run(key, JSON.stringify(partial[key]));
  }
  return getSettings(db);
}

const JSON_COLUMNS = ['images', 'variants', 'score_detail'];

export function rowToProduct(row) {
  if (!row) return row;
  const p = { ...row };
  for (const c of JSON_COLUMNS) p[c] = JSON.parse(p[c]);
  return p;
}

export function rowToOrder(row) {
  if (!row) return row;
  return { ...row, items: JSON.parse(row.items) };
}
