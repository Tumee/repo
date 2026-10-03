import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import * as mock from '../src/sources/mock.js';

let server, base;
const TOKEN = 'secret';
const admin = (path, opts = {}) =>
  fetch(base + '/api/admin' + path, { ...opts, headers: { 'content-type': 'application/json', 'x-admin-token': TOKEN } }).then(async (r) => ({ status: r.status, body: await r.json() }));
const pub = (path, opts = {}) =>
  fetch(base + path, { ...opts, headers: { 'content-type': 'application/json' } }).then(async (r) => ({ status: r.status, body: await r.json() }));

before(async () => {
  const db = openDb(':memory:');
  const app = createApp({ db, sources: [{ name: 'mock', search: mock.search }], adminToken: TOKEN });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('админ токенгүй бол 401', async () => {
  const r = await pub('/api/admin/settings');
  assert.equal(r.status, 401);
});

test('импорт → батлах → худалдаа → худалдан авах жагсаалт', async () => {
  const imp = await admin('/import', { method: 'POST', body: '{}' });
  assert.equal(imp.status, 200);
  assert.ok(imp.body.accepted > 0);
  assert.ok(imp.body.rejected > 0);

  const candidates = (await admin('/products?status=candidate')).body;
  const titles = candidates.map((p) => p.title_cn).join();
  assert.ok(!titles.includes('瑜伽'), 'насанд хүрэгчдийн бараа орох ёсгүй');
  assert.ok(!titles.includes('磁力珠'), 'хориотой бараа орох ёсгүй');

  // Батлахаас өмнө дэлгүүрт харагдахгүй
  assert.equal((await pub('/api/products')).body.length, 0);

  const target = candidates.find((p) => p.variants.length);
  await admin(`/products/${target.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
  const list = (await pub('/api/products')).body;
  assert.equal(list.length, 1);
  assert.equal(list[0].source_url, undefined, 'эх линкийг худалдан авагчид харуулахгүй');

  const v = target.variants[0];
  const order = await pub('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_name: 'Бат', phone: '99112233', address: 'БЗД 1-р хороо', payment_method: 'qpay',
      items: [{ product_id: target.id, qty: 2, variant: { [v.name]: v.options[0], hack: 'x' } }],
    }),
  });
  assert.equal(order.status, 201);
  assert.equal(order.body.total_mnt, list[0].price_mnt * 2);

  const track = await pub(`/api/orders/${order.body.code}?phone=99112233`);
  assert.equal(track.body.status, 'new');
  assert.equal((await pub(`/api/orders/${order.body.code}?phone=00000000`)).status, 404);

  const orders = (await admin('/orders')).body;
  assert.deepEqual(orders[0].items[0].variant, { [v.name]: v.options[0] });
  await admin(`/orders/${orders[0].id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });

  const purchase = (await admin('/purchase-list')).body;
  assert.equal(purchase.items.length, 1);
  assert.equal(purchase.items[0].qty, 2);
  assert.ok(purchase.items[0].source_url.startsWith('https://'));
});

test('батлаагүй бараа захиалж болохгүй, буруу утас', async () => {
  const cand = (await admin('/products?status=candidate')).body[0];
  const base = { customer_name: 'A', address: 'B', payment_method: 'qpay' };
  let r = await pub('/api/orders', { method: 'POST', body: JSON.stringify({ ...base, phone: '99112233', items: [{ product_id: cand.id, qty: 1 }] }) });
  assert.equal(r.status, 400);
  r = await pub('/api/orders', { method: 'POST', body: JSON.stringify({ ...base, phone: '123', items: [{ product_id: cand.id, qty: 1 }] }) });
  assert.equal(r.status, 400);
});

test('шалгуур өөрчлөхөд оноо дахин бодогдоно', async () => {
  const before = (await admin('/products')).body.find((p) => p.title_cn.includes('木制'));
  const s = (await admin('/settings')).body;
  s.criteria.tasteKeywords = [{ word: '木制', weight: -30 }];
  await admin('/settings', { method: 'PUT', body: JSON.stringify({ criteria: s.criteria }) });
  const afterP = (await admin('/products')).body.find((p) => p.id === before.id);
  assert.ok(afterP.score < before.score);
});
