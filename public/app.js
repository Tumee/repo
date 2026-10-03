import { CATEGORY_LABELS, ORDER_STATUS_LABELS, mnt, esc, ageText, imageHtml, salesText, categoryIcon, categoryTint } from './common.js';

const $ = (s) => document.querySelector(s);
const state = { category: '', products: [], categories: [] };

const ICON_CLOSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICON_STAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>';
const closeBtn = (attrs = '') => `<button type="button" class="close" aria-label="Хаах" ${attrs}>${ICON_CLOSE}</button>`;

// ---------- Сагс (localStorage) ----------
const cart = {
  load() {
    try { return JSON.parse(localStorage.getItem('cart')) ?? []; } catch { return []; }
  },
  save(items) {
    try { localStorage.setItem('cart', JSON.stringify(items)); } catch {}
    const n = items.reduce((s, i) => s + i.qty, 0);
    $('#cartCount').textContent = n;
    $('#cartBtn').setAttribute('aria-label', `Сагс, ${n} бараа`);
  },
  add(product, variant, qty) {
    const items = cart.load();
    const key = JSON.stringify(variant);
    const found = items.find((i) => i.product_id === product.id && JSON.stringify(i.variant) === key);
    if (found) found.qty += qty;
    else items.push({ product_id: product.id, title: product.title, price_mnt: product.price_mnt, variant, qty, category: product.category, images: product.images });
    cart.save(items);
  },
};

async function api(path, opts) {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Алдаа гарлаа');
  return body;
}

const catLabel = (c) => CATEGORY_LABELS[c] ?? c;

// ---------- Ангилал ----------
async function loadCategories() {
  state.categories = await api('/api/categories');
  renderCategories();
}

function renderCategories() {
  const chip = (value, label) =>
    `<button type="button" class="chip ${state.category === value ? 'active' : ''}" data-cat="${esc(value)}" aria-pressed="${state.category === value}">${esc(label)}</button>`;
  $('#categories').innerHTML = chip('', 'Бүгд') + state.categories.map((c) => chip(c.category, catLabel(c.category))).join('');
  $('#catTiles').innerHTML = state.categories.map((c) => `
    <button type="button" class="cat-tile" data-cat="${esc(c.category)}">
      <span class="cat-circle tint-${categoryTint(c.category)}">${categoryIcon(c.category, 44)}</span>
      <b>${esc(catLabel(c.category))}</b>
      <span class="muted">${c.count} бараа</span>
    </button>`).join('');
}

function setCategory(cat, scroll = true) {
  state.category = cat;
  renderCategories();
  loadProducts();
  if (scroll) $('#shop').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Жагсаалт ----------
async function loadProducts() {
  const params = new URLSearchParams();
  if ($('#search').value) params.set('q', $('#search').value);
  if (state.category) params.set('category', state.category);
  if ($('#age').value) params.set('ageMonths', $('#age').value);
  if ($('#sort').value) params.set('sort', $('#sort').value);
  state.products = await api(`/api/products?${params}`);
  $('#shop-h').textContent = state.category ? catLabel(state.category) : 'Бүх бараа';
  $('#resultCount').textContent = `${state.products.length} бараа`;
  $('#grid').innerHTML = state.products.length
    ? state.products.map(cardHtml).join('')
    : '<p class="empty">Бараа олдсонгүй. Шүүлтүүрээ өөрчлөөд үзээрэй.</p>';
}

function cardHtml(p) {
  const age = ageText(p);
  return `<article class="card" data-id="${p.id}">
    <div class="card-media tint-${categoryTint(p.category)}">
      ${imageHtml(p)}
      ${p.sales >= 30000 ? '<span class="card-badge">Их зарагдсан</span>' : ''}
    </div>
    <div class="card-body">
      ${age ? `<span class="card-age">${age}</span>` : ''}
      <h3><button type="button" class="card-link">${esc(p.title)}</button></h3>
      <div class="meta"><span class="star">${ICON_STAR}</span> ${p.rating ?? '–'} · ${salesText(p.sales)}</div>
      <div class="price">${mnt(p.price_mnt)}</div>
    </div>
  </article>`;
}

// ---------- Hero ----------
async function loadHero() {
  let picks = [];
  try {
    picks = (await api('/api/products?sort=popular')).slice(0, 3);
  } catch {}
  const tints = ['sky', 'sun', 'peach'];
  const tiles = [0, 1, 2].map((i) => {
    const p = picks[i];
    const tint = p ? categoryTint(p.category) : tints[i];
    const inner = p?.images?.length
      ? `<img src="${esc(p.images[0])}" alt="" referrerpolicy="no-referrer">`
      : categoryIcon(p?.category ?? ['toys', 'books', 'clothing'][i], i === 0 ? 96 : 56);
    return `<div class="hero-tile hero-tile-${i} tint-${tint}">${inner}</div>`;
  });
  $('#heroVisual').innerHTML = tiles.join('') + `
    <div class="hero-badge"><span class="perk-icon tint-mint"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg></span>
      <span><b>Өндөр үнэлгээтэй</b><small>Эцэг эхчүүдийн сонголт</small></span></div>`;
}

// ---------- Барааны дэлгэрэнгүй ----------
function openProduct(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const dlg = $('#productDlg');
  const age = ageText(p);
  dlg.innerHTML = `<form method="dialog" class="product">
    ${closeBtn('value="cancel" formnovalidate')}
    <div class="product-media tint-${categoryTint(p.category)}">${imageHtml(p, 'big')}</div>
    <div class="product-info">
      <div class="pill-row">
        <span class="pill pill-sun">${esc(catLabel(p.category))}</span>
        ${age ? `<span class="pill pill-mint">${age}</span>` : ''}
      </div>
      <h2>${esc(p.title)}</h2>
      <div class="meta"><span class="star">${ICON_STAR}</span> ${p.rating ?? '–'} · ${p.positive_rate ? Math.round(p.positive_rate * 100) + '% эерэг сэтгэгдэл · ' : ''}${salesText(p.sales)}</div>
      <div class="price price-lg">${mnt(p.price_mnt)}</div>
      ${p.description_mn ? `<p class="desc">${esc(p.description_mn)}</p>` : ''}
      ${p.variants.map((v) => `<fieldset class="variant">
        <legend>${esc(v.name)}</legend>
        <div class="options">${v.options.map((o, i) => `<label class="opt"><input type="radio" name="v:${esc(v.name)}" value="${esc(o)}" ${i === 0 ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>
      </fieldset>`).join('')}
      <div class="buy-row">
        <div class="stepper">
          <button type="button" data-step="-1" aria-label="Тоог хасах"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
          <label class="sr" for="qty">Тоо ширхэг</label>
          <input id="qty" name="qty" type="number" min="1" max="50" value="1" inputmode="numeric">
          <button type="button" data-step="1" aria-label="Тоог нэмэх"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
        </div>
        <button value="add" class="btn btn-primary grow">Сагсанд нэмэх</button>
      </div>
      <div class="info-box">
        <span><b>Үнэд</b> Хятадаас УБ хүртэлх тээвэр багтсан.</span>
        <span><b>Хүргэлт:</b> ихэвчлэн 7–14 хоног.</span>
      </div>
    </div>
  </form>`;
  const qty = dlg.querySelector('#qty');
  dlg.querySelectorAll('[data-step]').forEach((b) => (b.onclick = () => {
    qty.value = Math.min(50, Math.max(1, (Number(qty.value) || 1) + Number(b.dataset.step)));
  }));
  dlg.onclose = () => {
    if (dlg.returnValue !== 'add') return;
    const fd = new FormData(dlg.querySelector('form'));
    const variant = {};
    for (const [k, v] of fd) if (k.startsWith('v:')) variant[k.slice(2)] = v;
    cart.add(p, variant, Math.max(1, Number(fd.get('qty')) || 1));
    toast('Сагсанд нэмэгдлээ');
  };
  dlg.returnValue = '';
  dlg.showModal();
}

// ---------- Сагс ба захиалга ----------
function openCart() {
  const items = cart.load();
  const total = items.reduce((s, i) => s + i.price_mnt * i.qty, 0);
  const dlg = $('#cartDlg');
  dlg.innerHTML = `<div class="cart">
    ${closeBtn('data-close')}
    <h2>Сагс</h2>
    ${items.length === 0 ? '<p class="muted">Сагс хоосон байна.</p>' : `
      <ul class="lines">${items.map((i, idx) => `<li>
        ${imageHtml(i, 'mini')}
        <div><b>${esc(i.title)}</b><br><small class="muted">${esc(Object.values(i.variant).join(' / '))}</small></div>
        <div>${i.qty} × ${mnt(i.price_mnt)}</div>
        <button type="button" class="btn-text" data-remove="${idx}">Хасах</button>
      </li>`).join('')}</ul>
      <p class="total">Нийт: <b>${mnt(total)}</b></p>
      <form id="checkout" class="checkout">
        <label>Нэр <input name="customer_name" required autocomplete="name"></label>
        <label>Утас <input name="phone" placeholder="8 оронтой" required pattern="\\d{8}" inputmode="numeric" autocomplete="tel"></label>
        <label>Хүргэлтийн хаяг <textarea name="address" placeholder="Дүүрэг, хороо, байр, тоот" required></textarea></label>
        <label>Нэмэлт тайлбар <textarea name="note"></textarea></label>
        <label>Төлбөр
          <select name="payment_method"><option value="qpay">QPay</option><option value="bank_transfer">Дансаар шилжүүлэх</option></select>
        </label>
        <button class="btn btn-primary">Захиалах</button>
        <p class="error" id="checkoutErr"></p>
      </form>`}
  </div>`;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  dlg.querySelectorAll('[data-remove]').forEach((b) => (b.onclick = () => {
    const list = cart.load();
    list.splice(Number(b.dataset.remove), 1);
    cart.save(list);
    openCart();
  }));
  const form = dlg.querySelector('#checkout');
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ ...data, items: items.map(({ product_id, variant, qty }) => ({ product_id, variant, qty })) }),
      });
      cart.save([]);
      dlg.innerHTML = `<div class="cart">${closeBtn('data-close')}
        <h2>Захиалга амжилттай</h2>
        <p>Захиалгын код: <b class="code">${esc(res.code)}</b></p>
        <p>Нийт дүн: <b>${mnt(res.total_mnt)}</b></p>
        <p>Төлбөр төлөхдөө гүйлгээний утга дээр захиалгын кодоо бичнэ үү. Төлбөр баталгаажмагц бид Хятадаас захиалга хийнэ.</p>
      </div>`;
      dlg.querySelector('[data-close]').onclick = () => dlg.close();
    } catch (err) {
      $('#checkoutErr').textContent = err.message;
    }
  };
  if (!dlg.open) dlg.showModal();
}

function openTrack() {
  const dlg = $('#trackDlg');
  dlg.innerHTML = `<form class="cart checkout" id="trackForm">
    ${closeBtn('data-close')}
    <h2>Захиалга шалгах</h2>
    <label>Захиалгын код <input name="code" placeholder="HD123456" required></label>
    <label>Утас <input name="phone" required inputmode="numeric"></label>
    <button class="btn btn-primary">Шалгах</button>
    <div id="trackResult"></div>
  </form>`;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  dlg.querySelector('#trackForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const o = await api(`/api/orders/${encodeURIComponent(fd.get('code').trim())}?phone=${encodeURIComponent(fd.get('phone').trim())}`);
      $('#trackResult').innerHTML = `<p>Төлөв: <b>${esc(ORDER_STATUS_LABELS[o.status] ?? o.status)}</b></p>
        <ul>${o.items.map((i) => `<li>${esc(i.title)} × ${i.qty}</li>`).join('')}</ul><p>Нийт: ${mnt(o.total_mnt)}</p>`;
    } catch (err) {
      $('#trackResult').innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  };
  dlg.showModal();
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2000);
}

// ---------- Үйл явдлууд ----------
let searchTimer;
$('#search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadProducts, 300); };
$('#age').onchange = loadProducts;
$('#sort').onchange = loadProducts;
document.addEventListener('click', (e) => {
  const cat = e.target.closest('[data-cat]');
  if (cat) return setCategory(cat.dataset.cat, !cat.closest('#categories'));
  const ageBtn = e.target.closest('[data-age]');
  if (ageBtn) {
    $('#age').value = ageBtn.dataset.age;
    loadProducts();
    return $('#shop').scrollIntoView({ behavior: 'smooth' });
  }
  if (e.target.closest('[data-cat-link]')) return setCategory('', false);
  if (e.target.closest('[data-open-track]')) return openTrack();
  const card = e.target.closest('.card');
  if (card) openProduct(Number(card.dataset.id));
});
$('#cartBtn').onclick = openCart;
$('#trackBtn').onclick = openTrack;

cart.save(cart.load());
loadCategories();
loadProducts();
loadHero();
