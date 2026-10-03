export const CATEGORY_LABELS = {
  toys: 'Тоглоом',
  clothing: 'Хувцас',
  shoes: 'Гутал',
  books: 'Ном',
  feeding: 'Хооллолт',
  'baby-care': 'Нярайн арчилгаа',
  outdoor: 'Гадаа',
};
// Ангиллын дүрс (stroke SVG, currentColor) ба зөөлөн дэвсгэр өнгө
const ICON_PATHS = {
  toys: '<circle cx="12" cy="13" r="6"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><path d="M10 15c1 1 3 1 4 0"/>',
  clothing: '<path d="M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c0 2-1.5 3-4 3S8 6 8 4z"/>',
  shoes: '<path d="M3 16V8h5l2 4 6 1c3 .5 5 1.5 5 3v1H3z"/><path d="M3 19h18"/>',
  books: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  feeding: '<path d="M10 2h4v3h-4z"/><path d="M9 5h6l1 4v11H8V9z"/><path d="M8 12h8M8 16h8"/>',
  'baby-care': '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
  outdoor: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l4-7h5l3 7M9 6h3"/>',
  default: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1z"/>',
};
export function categoryIcon(category, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[category] ?? ICON_PATHS.default}</svg>`;
}
const TINTS = { toys: 'sun', clothing: 'peach', shoes: 'lilac', books: 'sky', feeding: 'mint', 'baby-care': 'peach', outdoor: 'mint' };
export const categoryTint = (category) => TINTS[category] ?? 'sand';

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
  return `<div class="${cls} placeholder tint-${categoryTint(p.category)}">${categoryIcon(p.category, cls === 'mini' ? 22 : 56)}</div>`;
}

export function salesText(n) {
  return n >= 10000 ? `${Math.floor(n / 1000)}k+ зарагдсан` : `${n}+ зарагдсан`;
}
