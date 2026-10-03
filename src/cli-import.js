// Командын мөрөөс импорт ажиллуулах: npm run import -- "儿童玩具" "童装"
// cron-оор өдөр бүр ажиллуулж барааны борлуулалт, үнийг шинэчилж болно.
import { config } from './config.js';
import { openDb, getSettings } from './db.js';
import { getSources } from './sources/index.js';
import { runImport } from './importer.js';

const db = openDb(config.dbPath);
const queries = process.argv.slice(2).length ? process.argv.slice(2) : getSettings(db).searchQueries;
const summary = await runImport(db, getSources(), queries);
console.log(JSON.stringify(summary, null, 2));
