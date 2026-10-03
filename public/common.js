export const CATEGORY_LABELS = {
  toys: 'Тоглоом',
  clothing: 'Хувцас',
  shoes: 'Гутал',
  books: 'Ном',
  feeding: 'Хооллолт',
  'baby-care': 'Нярайн арчилгаа',
  outdoor: 'Гадаа',
};
export const CATEGORY_EMOJI = { toys: '🧸', clothing: '👕', shoes: '👟', books: '📚', feeding: '🍼', 'baby-care': '🧷', outdoor: '🚲' };

export const ORDER_STATUS_LABELS = {
  new: 'Шинэ (төлбөр хүлээгдэж буй)',
  paid: 'Төлбөр орсон',
  ordered: 'Хятадаас захиалсан',
  in_transit: 'Замд яваа',
  arrived: 'Монголд ирсэн',
  delivered: 'Хүргэгдсэн',
  cancelled: 'Цуцалсан',
};

export const mnt = (n) => `${Number(n).toLocaleString('en-US')}₮`;

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function ageText(p) {
  if (p.age_min_months == null && p.age_max_months == null) return '';
  const f = (m) => (m === 0 ? 'Нярай' : m < 24 ? `${m} сар` : `${Math.round(m / 12)} нас`);
  return `${f(p.age_min_months ?? 0)} – ${p.age_max_months != null ? f(p.age_max_months) : '…'}`;
}

export function imageHtml(p, cls = 'thumb') {
  if (p.images?.length) return `<img class="${cls}" src="${esc(p.images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  return `<div class="${cls} placeholder">${CATEGORY_EMOJI[p.category] ?? '🎁'}</div>`;
}

export function salesText(n) {
  return n >= 10000 ? `${Math.floor(n / 1000)}k+ зарагдсан` : `${n}+ зарагдсан`;
}
