import { config } from './config.js';
import { openDb } from './db.js';
import { getSources } from './sources/index.js';
import { runImport } from './importer.js';
import { createApp } from './app.js';

if (config.adminToken === 'changeme') {
  console.warn('⚠️  ADMIN_TOKEN тохируулаагүй байна — production-д заавал солино уу.');
}

const db = openDb(config.dbPath);
const sources = getSources();

// Жишээ горимд анх асаахад дэлгүүр хоосон байхгүйн тулд жишээ барааг татаж шууд гаргана
if (config.source === 'mock' && db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) {
  const s = await runImport(db, sources, ['儿童', '婴儿', '宝宝']);
  db.prepare("UPDATE products SET status = 'approved'").run();
  console.log(`Жишээ бараа нэмэгдлээ: ${s.accepted} бараа дэлгүүрт гарлаа.`);
}

const app = createApp({ db, sources, adminToken: config.adminToken });
app.listen(config.port, () => {
  console.log(`Дэлгүүр: http://localhost:${config.port}`);
  console.log(`Админ:   http://localhost:${config.port}/admin/  (нууц үг: ADMIN_TOKEN)`);
});
