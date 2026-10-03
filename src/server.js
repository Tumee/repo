import { config } from './config.js';
import { openDb } from './db.js';
import { getSources } from './sources/index.js';
import { createApp } from './app.js';

if (config.adminToken === 'changeme') {
  console.warn('⚠️  ADMIN_TOKEN тохируулаагүй байна — production-д заавал солино уу.');
}

const db = openDb(config.dbPath);
const app = createApp({ db, sources: getSources(), adminToken: config.adminToken });
app.listen(config.port, () => {
  console.log(`Дэлгүүр: http://localhost:${config.port}`);
  console.log(`Админ:   http://localhost:${config.port}/admin/`);
});
