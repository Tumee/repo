import { CATEGORY_LABELS, ORDER_STATUS_LABELS, mnt, esc, ageText, imageHtml, salesText } from './common.js';

const $ = (s) => document.querySelector(s);
const state = { category: '', products: [] };

// ---------- Сагс (localStorage) ----------
const cart = {
  load() {
    try { return JSON.parse(localStorage.getItem('cart')) ?? []; } catch { return []; }
  },
  save(items) {
    try { localStorage.setItem('cart', JSON.stringify(items)); } catch {}
    $('#cartCount').textContent = items.reduce((s, i) => s + i.qty, 0);
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

// ---------- Жагсаалт ----------
async function loadCategories() {
  const cats = await api('/api/categories');
  const chip = (value, label) => `<button class="chip ${state.category === value ? 'active' : ''}" data-cat="${esc(value)}">${esc(label)}</button>`;
  $('#categories').innerHTML = chip('', 'Бүгд') + cats.map((c) => chip(c.category, CATEGORY_LABELS[c.category] ?? c.category)).join('');
}

async function loadProducts() {
  const params = new URLSearchParams();
  if ($('#search').value) params.set('q', $('#search').value);
  if (state.category) params.set('category', state.category);
  if ($('#age').value) params.set('ageMonths', $('#age').value);
  if ($('#sort').value) params.set('sort', $('#sort').value);
  state.products = await api(`/api/products?${params}`);
  $('#grid').innerHTML = state.products.length
    ? state.products.map(cardHtml).join('')
    : '<p class="empty">Бараа олдсонгүй.</p>';
}

function cardHtml(p) {
  return `<article class="card" data-id="${p.id}">
    ${imageHtml(p)}
    <div class="card-body">
      <h3>${esc(p.title)}</h3>
      <div class="meta">⭐ ${p.rating ?? '–'} · ${salesText(p.sales)}</div>
      ${ageText(p) ? `<div class="meta">👶 ${ageText(p)}</div>` : ''}
      <div class="price">${mnt(p.price_mnt)}</div>
    </div>
  </article>`;
}

// ---------- Барааны дэлгэрэнгүй ----------
function openProduct(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const dlg = $('#productDlg');
  dlg.innerHTML = `<form method="dialog" class="product">
    <button class="close" value="cancel">✕</button>
    ${imageHtml(p, 'big')}
    <div>
      <h2>${esc(p.title)}</h2>
      <div class="meta">⭐ ${p.rating ?? '–'} · ${p.positive_rate ? Math.round(p.positive_rate * 100) + '% эерэг сэтгэгдэл · ' : ''}${salesText(p.sales)}</div>
      ${ageText(p) ? `<div class="meta">👶 Нас: ${ageText(p)}</div>` : ''}
      ${p.description_mn ? `<p>${esc(p.description_mn)}</p>` : ''}
      ${p.variants.map((v) => `<label>${esc(v.name)}
        <select name="v:${esc(v.name)}">${v.options.map((o) => `<option>${esc(o)}</option>`).join('')}</select></label>`).join('')}
      <label>Тоо ширхэг <input name="qty" type="number" min="1" max="50" value="1"></label>
      <div class="price big">${mnt(p.price_mnt)}</div>
      <p class="hint">Үнэд Хятадаас УБ хүртэлх тээвэр багтсан.</p>
      <button value="add" class="primary">Сагсанд нэмэх</button>
    </div>
  </form>`;
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
    <button class="close" data-close>✕</button>
    <h2>Сагс</h2>
    ${items.length === 0 ? '<p>Сагс хоосон байна.</p>' : `
      <ul class="lines">${items.map((i, idx) => `<li>
        ${imageHtml(i, 'mini')}
        <div><b>${esc(i.title)}</b><br><small>${esc(Object.values(i.variant).join(' / '))}</small></div>
        <div>${i.qty} × ${mnt(i.price_mnt)}</div>
        <button class="ghost" data-remove="${idx}">Хасах</button>
      </li>`).join('')}</ul>
      <p class="total">Нийт: <b>${mnt(total)}</b></p>
      <form id="checkout" class="checkout">
        <input name="customer_name" placeholder="Нэр" required>
        <input name="phone" placeholder="Утас (8 оронтой)" required pattern="\\d{8}" inputmode="numeric">
        <textarea name="address" placeholder="Хүргэлтийн хаяг (дүүрэг, хороо, байр, тоот)" required></textarea>
        <textarea name="note" placeholder="Нэмэлт тайлбар"></textarea>
        <label>Төлбөр:
          <select name="payment_method"><option value="qpay">QPay</option><option value="bank_transfer">Дансаар шилжүүлэх</option></select>
        </label>
        <button class="primary">Захиалах</button>
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
      dlg.innerHTML = `<div class="cart"><button class="close" data-close>✕</button>
        <h2>Захиалга амжилттай ✅</h2>
        <p>Захиалгын код: <b class="code">${esc(res.code)}</b></p>
        <p>Нийт дүн: <b>${mnt(res.total_mnt)}</b></p>
        <p>Төлбөр төлөхдөө гүйлгээний утга дээр захиалгын кодоо бичнэ үү. Төлбөр баталгаажмагц бид Хятадаас захиалга хийнэ.</p>
      </div>`;
      dlg.querySelector('[data-close]').onclick = () => dlg.close();
    } catch (err) {
      $('#checkoutErr').textContent = err.message;
    }
  };
  dlg.showModal();
}

function openTrack() {
  const dlg = $('#trackDlg');
  dlg.innerHTML = `<form class="cart" id="trackForm">
    <button type="button" class="close" data-close>✕</button>
    <h2>Захиалга шалгах</h2>
    <input name="code" placeholder="Захиалгын код (HD123456)" required>
    <input name="phone" placeholder="Утас" required>
    <button class="primary">Шалгах</button>
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
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2000);
}

// ---------- Үйл явдлууд ----------
let searchTimer;
$('#search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadProducts, 300); };
$('#age').onchange = loadProducts;
$('#sort').onchange = loadProducts;
$('#categories').onclick = (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  state.category = b.dataset.cat;
  loadCategories();
  loadProducts();
};
$('#grid').onclick = (e) => {
  const card = e.target.closest('.card');
  if (card) openProduct(Number(card.dataset.id));
};
$('#cartBtn').onclick = openCart;
$('#trackBtn').onclick = openTrack;

cart.save(cart.load());
loadCategories();
loadProducts();
