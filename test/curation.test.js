import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, hardFilter, tasteScore } from '../src/curation.js';
import { priceMnt } from '../src/pricing.js';
import { defaultSettings } from '../src/config.js';

const criteria = defaultSettings.criteria;
const good = {
  title_cn: '蒙氏早教木制积木 儿童益智玩具', shop_name: 'x', category: 'toys',
  price_cny: 40, sales: 50000, rating: 4.9, positive_rate: 0.99, review_count: 8000,
};

test('сайн хүүхдийн бараа шалгуур давна', () => {
  const r = evaluate(good, criteria);
  assert.equal(r.accepted, true, r.detail.reasons.join());
  assert.ok(r.score > 80);
  assert.deepEqual(r.detail.tasteMatched.sort(), ['木制', '益智', '蒙氏'].sort());
});

test('борлуулалт бага бол хасагдана', () => {
  const r = hardFilter({ ...good, sales: 500 }, criteria);
  assert.equal(r.pass, false);
  assert.match(r.reasons[0], /Борлуулалт/);
});

test('хүүхдийн бус бараа хасагдана', () => {
  assert.equal(hardFilter({ ...good, title_cn: '加厚瑜伽垫' }, criteria).pass, false);
});

test('хориотой үг орсон бараа хасагдана', () => {
  const r = hardFilter({ ...good, title_cn: '儿童磁力珠' }, criteria);
  assert.ok(r.reasons.some((x) => x.includes('磁力珠')));
});

test('сөрөг амтын үг оноог бууруулна', () => {
  const neutral = tasteScore({ title_cn: '儿童玩具' }, criteria).value;
  const disliked = tasteScore({ title_cn: '儿童塑料玩具' }, criteria).value;
  assert.equal(neutral, 0.5);
  assert.ok(disliked < neutral);
});

test('дуртай дэлгүүр амтын оноо нэмнэ', () => {
  const c = { ...criteria, preferredShops: ['好店'] };
  assert.ok(tasteScore({ title_cn: '儿童玩具', shop_name: '好店' }, c).value > 0.5);
});

test('үнэ тооцоолол', () => {
  const pricing = { cnyToMnt: 500, markupPercent: 20, shippingPerKgMnt: 10000, defaultWeightKg: 1, fixedFeeMnt: 1000, roundTo: 100 };
  // 10*500*1.2 + 0.5*10000 + 1000 = 12000
  assert.equal(priceMnt({ price_cny: 10, weight_kg: 0.5 }, pricing), 12000);
  // жингүй үед default 1кг: 6000 + 10000 + 1000 = 17000; 10.01 юань → дээш бүхэлчилнэ
  assert.equal(priceMnt({ price_cny: 10 }, pricing), 17000);
  assert.equal(priceMnt({ price_cny: 10.01, weight_kg: 0.5 }, pricing), 12100);
});
