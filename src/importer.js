import { evaluate } from './curation.js';
import { getSettings, rowToProduct } from './db.js';

// Эх сурвалжуудаас бараа татаж, шалгуураар шүүгээд DB-д хадгална.
// Шалгуур давсан бараа л хадгалагдана; давсан ч өмнө нь админ татгалзсан бол дахин гарахгүй.
export async function runImport(db, sources, queries) {
  const { criteria } = getSettings(db);
  const summary = { fetched: 0, accepted: 0, rejected: 0, errors: [], rejectedSamples: [] };
  const seen = new Set();

  for (const source of sources) {
    for (const q of queries) {
      let items;
      try {
        items = await source.search(q);
      } catch (err) {
        summary.errors.push(`${source.name} "${q}": ${err.message}`);
        continue;
      }
      for (const item of items) {
        const key = `${item.source}:${item.source_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        summary.fetched++;
        const result = evaluate(item, criteria);
        if (!result.accepted) {
          summary.rejected++;
          if (summary.rejectedSamples.length < 20) {
            summary.rejectedSamples.push({ title: item.title_cn, reasons: result.detail.reasons });
          }
          continue;
        }
        upsertProduct(db, item, result, criteria.autoApprove ? 'approved' : 'candidate');
        summary.accepted++;
      }
    }
  }
  return summary;
}

function upsertProduct(db, item, result, status) {
  db.prepare(
    `INSERT INTO products (source, source_id, source_url, title_cn, title_mn, description_mn, images, variants,
       category, shop_name, price_cny, sales, rating, positive_rate, review_count,
       age_min_months, age_max_months, weight_kg, score, score_detail, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(source, source_id) DO UPDATE SET
       source_url = excluded.source_url, title_cn = excluded.title_cn,
       title_mn = COALESCE(products.title_mn, excluded.title_mn),
       images = excluded.images, price_cny = excluded.price_cny, sales = excluded.sales,
       rating = excluded.rating, positive_rate = excluded.positive_rate, review_count = excluded.review_count,
       score = excluded.score, score_detail = excluded.score_detail, updated_at = datetime('now')`,
  ).run(
    item.source,
    item.source_id,
    item.source_url ?? null,
    item.title_cn,
    item.title_mn ?? null,
    item.description_mn ?? null,
    JSON.stringify(item.images ?? []),
    JSON.stringify(item.variants ?? []),
    item.category ?? null,
    item.shop_name ?? null,
    item.price_cny,
    item.sales ?? 0,
    item.rating ?? null,
    item.positive_rate ?? null,
    item.review_count ?? 0,
    item.age_min_months ?? null,
    item.age_max_months ?? null,
    item.weight_kg ?? null,
    result.score,
    JSON.stringify(result.detail),
    status,
  );
}

// Шалгуур өөрчлөгдсөний дараа одоо байгаа бүх барааны оноог дахин бодно.
export function rescoreAll(db) {
  const { criteria } = getSettings(db);
  const rows = db.prepare('SELECT * FROM products').all().map(rowToProduct);
  const update = db.prepare('UPDATE products SET score = ?, score_detail = ? WHERE id = ?');
  for (const p of rows) {
    const r = evaluate(p, criteria);
    update.run(r.score, JSON.stringify(r.detail), p.id);
  }
  return rows.length;
}
