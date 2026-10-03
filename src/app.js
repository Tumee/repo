import express from 'express';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { getSettings, saveSettings, rowToProduct, rowToOrder } from './db.js';
import { priceMnt } from './pricing.js';
import { runImport, rescoreAll } from './importer.js';

export const ORDER_STATUSES = ['new', 'paid', 'ordered', 'in_transit', 'arrived', 'delivered', 'cancelled'];
const PAYMENT_METHODS = ['qpay', 'bank_transfer'];

export function createApp({ db, sources, adminToken }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static('public'));

  const withPrice = (p, pricing) => ({ ...p, price_mnt: priceMnt(p, pricing) });

  // ---------- Нийтийн API ----------

  app.get('/api/products', (req, res) => {
    const { pricing } = getSettings(db);
    const where = ["status = 'approved'"];
    const params = [];
    if (req.query.q) {
      where.push('(title_mn LIKE ? OR title_cn LIKE ?)');
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    if (req.query.category) {
      where.push('category = ?');
      params.push(req.query.category);
    }
    const age = Number(req.query.ageMonths);
    if (req.query.ageMonths && Number.isFinite(age)) {
      where.push('(age_min_months IS NULL OR age_min_months <= ?) AND (age_max_months IS NULL OR age_max_months >= ?)');
      params.push(age, age);
    }
    const order = { popular: 'sales DESC', price: 'price_cny ASC', new: 'created_at DESC' }[req.query.sort] ?? 'score DESC';
    const rows = db.prepare(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 200`).all(...params);
    res.json(rows.map((r) => toPublic(withPrice(rowToProduct(r), pricing))));
  });

  app.get('/api/categories', (_req, res) => {
    res.json(db.prepare("SELECT category, COUNT(*) AS count FROM products WHERE status = 'approved' GROUP BY category").all());
  });

  app.get('/api/products/:id', (req, res) => {
    const row = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'approved'").get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Бараа олдсонгүй' });
    res.json(toPublic(withPrice(rowToProduct(row), getSettings(db).pricing)));
  });

  app.post('/api/orders', (req, res) => {
    const { customer_name, phone, address, note, payment_method, items } = req.body ?? {};
    if (!customer_name?.trim() || !address?.trim()) return res.status(400).json({ error: 'Нэр, хаягаа бөглөнө үү' });
    if (!/^\d{8}$/.test(String(phone ?? '').replace(/\s/g, ''))) return res.status(400).json({ error: 'Утасны дугаар 8 оронтой байх ёстой' });
    if (!PAYMENT_METHODS.includes(payment_method)) return res.status(400).json({ error: 'Төлбөрийн хэлбэр буруу' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Сагс хоосон байна' });

    // Үнийг клиентээс авахгүй, сервер дээр дахин тооцно
    const { pricing } = getSettings(db);
    const getProduct = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'approved'");
    const lines = [];
    for (const it of items) {
      const qty = Number(it.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) return res.status(400).json({ error: 'Тоо ширхэг буруу' });
      const p = rowToProduct(getProduct.get(Number(it.product_id)));
      if (!p) return res.status(400).json({ error: `Бараа (${it.product_id}) зарагдахгүй байна` });
      const unit = priceMnt(p, pricing);
      lines.push({
        product_id: p.id,
        title: p.title_mn || p.title_cn,
        title_cn: p.title_cn,
        source: p.source,
        source_url: p.source_url,
        price_cny: p.price_cny,
        variant: sanitizeVariant(it.variant, p.variants),
        qty,
        unit_mnt: unit,
        subtotal_mnt: unit * qty,
      });
    }
    const total = lines.reduce((s, l) => s + l.subtotal_mnt, 0);
    const code = `HD${randomInt(100000, 999999)}`;
    db.prepare(
      'INSERT INTO orders (code, customer_name, phone, address, note, payment_method, items, total_mnt) VALUES (?,?,?,?,?,?,?,?)',
    ).run(code, customer_name.trim(), String(phone).replace(/\s/g, ''), address.trim(), note ?? null, payment_method, JSON.stringify(lines), total);
    res.status(201).json({ code, total_mnt: total });
  });

  // Захиалгын төлөв шалгах (код + утас хоёулаа таарах ёстой)
  app.get('/api/orders/:code', (req, res) => {
    const row = db.prepare('SELECT * FROM orders WHERE code = ? AND phone = ?').get(req.params.code, String(req.query.phone ?? ''));
    if (!row) return res.status(404).json({ error: 'Захиалга олдсонгүй' });
    const o = rowToOrder(row);
    res.json({
      code: o.code,
      status: o.status,
      total_mnt: o.total_mnt,
      created_at: o.created_at,
      items: o.items.map(({ title, variant, qty, subtotal_mnt }) => ({ title, variant, qty, subtotal_mnt })),
    });
  });

  // ---------- Админ API ----------

  const admin = express.Router();
  admin.use((req, res, next) => {
    const given = Buffer.from(String(req.get('x-admin-token') ?? ''));
    const expected = Buffer.from(adminToken);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return res.status(401).json({ error: 'Нэвтрэх эрхгүй' });
    }
    next();
  });

  admin.get('/settings', (_req, res) => res.json(getSettings(db)));

  admin.put('/settings', (req, res) => {
    const settings = saveSettings(db, req.body ?? {});
    rescoreAll(db);
    res.json(settings);
  });

  admin.post('/import', async (req, res, next) => {
    try {
      const queries = req.body?.queries?.length ? req.body.queries : getSettings(db).searchQueries;
      res.json(await runImport(db, sources, queries));
    } catch (err) {
      next(err);
    }
  });

  admin.get('/products', (req, res) => {
    const { pricing } = getSettings(db);
    const status = req.query.status;
    const rows = status
      ? db.prepare('SELECT * FROM products WHERE status = ? ORDER BY score DESC').all(status)
      : db.prepare('SELECT * FROM products ORDER BY score DESC').all();
    res.json(rows.map((r) => withPrice(rowToProduct(r), pricing)));
  });

  admin.patch('/products/:id', (req, res) => {
    const allowed = ['status', 'title_mn', 'description_mn', 'weight_kg', 'category', 'age_min_months', 'age_max_months'];
    const body = req.body ?? {};
    if (body.status && !['candidate', 'approved', 'rejected'].includes(body.status)) {
      return res.status(400).json({ error: 'Төлөв буруу' });
    }
    const fields = allowed.filter((k) => body[k] !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Өөрчлөх талбар алга' });
    const info = db
      .prepare(`UPDATE products SET ${fields.map((f) => `${f} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
      .run(...fields.map((f) => body[f]), Number(req.params.id));
    if (!info.changes) return res.status(404).json({ error: 'Бараа олдсонгүй' });
    res.json(rowToProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id))));
  });

  admin.get('/orders', (req, res) => {
    const rows = req.query.status
      ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC').all(req.query.status)
      : db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    res.json(rows.map(rowToOrder));
  });

  admin.patch('/orders/:id', (req, res) => {
    const { status, supplier_note } = req.body ?? {};
    if (status && !ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Төлөв буруу' });
    const info = db
      .prepare(
        "UPDATE orders SET status = COALESCE(?, status), supplier_note = COALESCE(?, supplier_note), updated_at = datetime('now') WHERE id = ?",
      )
      .run(status ?? null, supplier_note ?? null, Number(req.params.id));
    if (!info.changes) return res.status(404).json({ error: 'Захиалга олдсонгүй' });
    res.json(rowToOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id))));
  });

  // Төлбөр нь орсон захиалгуудаас Хятадаас худалдан авах жагсаалтыг бараа+сонголтоор нэгтгэнэ
  admin.get('/purchase-list', (_req, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE status = 'paid' ORDER BY id").all().map(rowToOrder);
    const map = new Map();
    for (const o of orders) {
      for (const l of o.items) {
        const key = `${l.product_id}|${JSON.stringify(l.variant)}`;
        const entry = map.get(key) ?? { ...pick(l, ['product_id', 'title', 'title_cn', 'source', 'source_url', 'price_cny', 'variant']), qty: 0, orders: [] };
        entry.qty += l.qty;
        entry.orders.push(o.code);
        map.set(key, entry);
      }
    }
    const list = [...map.values()].map((e) => ({ ...e, total_cny: Math.round(e.price_cny * e.qty * 100) / 100 }));
    res.json({ orderIds: orders.map((o) => o.id), items: list, total_cny: list.reduce((s, e) => s + e.total_cny, 0) });
  });

  app.use('/api/admin', admin);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  });

  return app;
}

function toPublic(p) {
  const { title_cn, shop_name, source_url, score_detail, status, price_cny, ...rest } = p;
  return { ...rest, title: p.title_mn || title_cn };
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}

// Клиентээс ирсэн сонголтыг зөвхөн тухайн барааны боломжит сонголтоор хязгаарлана
function sanitizeVariant(variant, variants) {
  if (!variant || typeof variant !== 'object') return {};
  const out = {};
  for (const v of variants) {
    if (v.options.includes(variant[v.name])) out[v.name] = variant[v.name];
  }
  return out;
}
