import { config } from '../config.js';
import * as mock from './mock.js';
import { makeHttpSource } from './http.js';

// Идэвхтэй эх сурвалжуудын жагсаалт: [{ name, search(query) }]
export function getSources() {
  if (config.source === 'http') {
    const list = [];
    if (config.http.taobaoSearchUrl) list.push({ name: 'taobao', search: makeHttpSource('taobao', config.http.taobaoSearchUrl) });
    if (config.http.pddSearchUrl) list.push({ name: 'pdd', search: makeHttpSource('pdd', config.http.pddSearchUrl) });
    return list;
  }
  return [{ name: 'mock', search: mock.search }];
}
