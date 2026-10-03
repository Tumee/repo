import { CATEGORY_LABELS, ORDER_STATUS_LABELS, mnt, esc, imageHtml } from '../common.js';

const $ = (s) => document.querySelector(s);
const view = $('#view');
let currentTab = 'products';

const tokenInput = $('#token');
try { tokenInput.value = localStorage.getItem('adminToken') ?? ''; } catch {}
tokenInput.onchange = () => {
  try { localStorage.setItem('adminToken', tokenInput.value); } catch {}
  render();
};

async function api(path, opts = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...opts,
    headers: { 'content-type': 'application/json', 'x-admin-token': tokenInput.value },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Алдаа');
  return body;
}

// ---------- Бараа ----------
let productStatus = 'candidate';

async function renderProducts() {
  const products = await api(`/products?status=${productStatus}`);
  const statusBtn = (s, label) => `<button class="${productStatus === s ? '' : 'ghost'}" data-status="${s}">${label}</button>`;
  view.innerHTML = `
    <div class="toolbar">
      ${statusBtn('candidate', 'Хүлээгдэж буй')} ${statusBtn('approved', 'Дэлгүүрт байгаа')} ${statusBtn('rejected', 'Татгалзсан')}
      <span style="flex:1"></span>
      <button id="importBtn">⬇ Taobao/PDD-ээс шинээр татах</button>
    </div>
    <pre class="summary" id="importSummary" hidden></pre>
    <div class="table-wrap"><table>
      <thead><tr><th></th><th>Бараа</th><th>Үнэ</th><th>Борлуулалт / үнэлгээ</th><th>Оноо</th><th></th></tr></thead>
      <tbody>${products.map(productRow).join('') || '<tr><td colspan="6">Бараа алга. "Шинээр татах" дарна уу.</td></tr>'}</tbody>
    </table></div>`;

  view.querySelectorAll('[data-status]').forEach((b) => (b.onclick = () => { productStatus = b.dataset.status; renderProducts(); }));
  $('#importBtn').onclick = runImport;
  view.querySelectorAll('[data-act]').forEach((b) => (b.onclick = async () => {
    const tr = b.closest('tr');
    const body = { title_mn: tr.querySelector('[name=title_mn]').value || null, weight_kg: Number(tr.querySelector('[name=weight_kg]').value) || null };
    if (b.dataset.act !== 'save') body.status = b.dataset.act;
    await api(`/products/${tr.dataset.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    renderProducts();
  }));
}

function productRow(p) {
  const d = p.score_detail;
  return `<tr data-id="${p.id}">
    <td>${imageHtml(p, 'mini')}</td>
    <td>
      <div><a href="${esc(p.source_url)}" target="_blank" rel="noopener">${esc(p.title_cn)}</a></div>
      <input name="title_mn" value="${esc(p.title_mn)}" placeholder="Монгол нэр">
      <div class="meta">${esc(p.source)} · ${esc(p.shop_name)} · ${esc(CATEGORY_LABELS[p.category] ?? p.category ?? '')}
        · жин <input name="weight_kg" type="number" step="0.1" value="${p.weight_kg ?? ''}" style="width:70px;min-width:0"> кг</div>
    </td>
    <td>¥${p.price_cny}<br><b>${mnt(p.price_mnt)}</b></td>
    <td>${p.sales.toLocaleString()} ш<br>⭐ ${p.rating ?? '–'} · ${p.positive_rate ? Math.round(p.positive_rate * 100) + '%' : '–'}<br><small>${p.review_count} сэтгэгдэл</small></td>
    <td><span class="score">${p.score}</span><br>
      <small>борл ${d.sales} · үнэл ${d.rating} · эерэг ${d.positive} · амт ${d.taste}</small><br>
      ${(d.tasteMatched ?? []).map((w) => `<span class="tag">${esc(w)}</span>`).join('')}
      ${(d.reasons ?? []).map((r) => `<div class="error"><small>${esc(r)}</small></div>`).join('')}
    </td>
    <td style="white-space:nowrap">
      ${p.status !== 'approved' ? '<button data-act="approved">✓ Гаргах</button>' : ''}
      ${p.status !== 'rejected' ? '<button class="ghost" data-act="rejected">✕</button>' : ''}
      <button class="ghost" data-act="save">Хадгалах</button>
    </td>
  </tr>`;
}

async function runImport() {
  const btn = $('#importBtn');
  btn.disabled = true;
  btn.textContent = 'Татаж байна…';
  try {
    const s = await api('/import', { method: 'POST', body: '{}' });
    await renderProducts();
    const box = $('#importSummary');
    box.hidden = false;
    box.textContent =
      `Нийт ${s.fetched} бараа шалгасан: ${s.accepted} нь шалгуур давсан, ${s.rejected} нь хасагдсан.\n` +
      (s.errors.length ? `\nАлдаа:\n${s.errors.join('\n')}\n` : '') +
      (s.rejectedSamples.length ? `\nХасагдсан жишээ:\n${s.rejectedSamples.map((r) => `• ${r.title} — ${r.reasons.join('; ')}`).join('\n')}` : '');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '⬇ Taobao/PDD-ээс шинээр татах';
    alert(err.message);
  }
}

// ---------- Шалгуур ба амт ----------
const list = (arr) => arr.join(', ');
const parseList = (s) => s.split(/[,，\n]/).map((x) => x.trim()).filter(Boolean);

async function renderCriteria() {
  const { criteria: c, pricing: p, searchQueries } = await api('/settings');
  const num = (name, label, value, step = 'any') => `<label>${label}<input name="${name}" type="number" step="${step}" value="${value}"></label>`;
  view.innerHTML = `<form id="settingsForm">
    <fieldset><legend>Борлуулалт ба үнэлгээний доод хязгаар</legend><div class="form-grid">
      ${num('minSales', 'Хамгийн бага борлуулалт (ш)', c.minSales, 1)}
      ${num('minRating', 'Хамгийн бага үнэлгээ (0–5)', c.minRating, 0.1)}
      ${num('minPositiveRate', 'Эерэг сэтгэгдлийн хувь (0–1)', c.minPositiveRate, 0.01)}
      ${num('minReviews', 'Хамгийн цөөн сэтгэгдэл', c.minReviews, 1)}
      ${num('priceCnyMin', 'Үнэ доод (¥)', c.priceCnyMin)}
      ${num('priceCnyMax', 'Үнэ дээд (¥)', c.priceCnyMax)}
      ${num('minScore', 'Нийт онооны босго (0–100)', c.minScore, 1)}
      <label>Автоматаар дэлгүүрт гаргах<select name="autoApprove"><option value="false">Үгүй — би батална</option><option value="true" ${c.autoApprove ? 'selected' : ''}>Тийм</option></select></label>
    </div></fieldset>

    <fieldset><legend>Миний амт</legend>
      <label>Таалагдах/таалагдахгүй үгс — мөр бүрт <code>үг:жин</code> (жишээ нь <code>木制:15</code>, <code>塑料:-8</code>)
        <textarea name="tasteKeywords" class="tall">${esc(c.tasteKeywords.map((t) => `${t.word}:${t.weight}`).join('\n'))}</textarea></label>
      <div class="form-grid">
        <label>Дуртай дэлгүүрүүд (+15 оноо)<textarea name="preferredShops">${esc(list(c.preferredShops))}</textarea></label>
        <label>Хориглосон дэлгүүрүүд<textarea name="blockedShops">${esc(list(c.blockedShops))}</textarea></label>
      </div>
      <p class="hint">Онооны жин (аль нь илүү чухал вэ):</p>
      <div class="form-grid">
        ${num('w_sales', 'Борлуулалт', c.weights.sales, 0.05)}
        ${num('w_rating', 'Үнэлгээ', c.weights.rating, 0.05)}
        ${num('w_positive', 'Эерэг сэтгэгдэл', c.weights.positive, 0.05)}
        ${num('w_taste', 'Миний амт', c.weights.taste, 0.05)}
      </div>
    </fieldset>

    <fieldset><legend>Хүүхдийн бараа шүүлтүүр</legend><div class="form-grid">
      <label>Хүүхдийн барааг таних үгс (аль нэг нь байх)<textarea name="kidsKeywords">${esc(list(c.kidsKeywords))}</textarea></label>
      <label>Хориотой үгс (аюулгүй байдал г.м.)<textarea name="excludeKeywords">${esc(list(c.excludeKeywords))}</textarea></label>
      <label>Импорт хийх хайлтын үгс<textarea name="searchQueries">${esc(list(searchQueries))}</textarea></label>
    </div></fieldset>

    <fieldset><legend>Үнэ тооцоолол</legend><div class="form-grid">
      ${num('cnyToMnt', '1 юань = ? ₮', p.cnyToMnt)}
      ${num('markupPercent', 'Ашиг (%)', p.markupPercent)}
      ${num('shippingPerKgMnt', 'Карго, кг тутамд (₮)', p.shippingPerKgMnt)}
      ${num('defaultWeightKg', 'Жин тодорхойгүй үед (кг)', p.defaultWeightKg)}
      ${num('fixedFeeMnt', 'Тогтмол шимтгэл (₮)', p.fixedFeeMnt)}
      ${num('roundTo', 'Бүхэлчлэх (₮)', p.roundTo, 1)}
    </div></fieldset>
    <button class="primary">Хадгалах ба бүх барааг дахин үнэлэх</button>
    <p id="saved" class="hint"></p>
  </form>`;

  $('#settingsForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const n = (k) => Number(f[k]);
    const criteria = {
      minSales: n('minSales'), minRating: n('minRating'), minPositiveRate: n('minPositiveRate'), minReviews: n('minReviews'),
      priceCnyMin: n('priceCnyMin'), priceCnyMax: n('priceCnyMax'), minScore: n('minScore'), autoApprove: f.autoApprove === 'true',
      tasteKeywords: f.tasteKeywords.split('\n').map((line) => {
        const [word, weight] = line.split(/[:：]/).map((x) => x.trim());
        return word ? { word, weight: Number(weight) || 0 } : null;
      }).filter(Boolean),
      preferredShops: parseList(f.preferredShops), blockedShops: parseList(f.blockedShops),
      kidsKeywords: parseList(f.kidsKeywords), excludeKeywords: parseList(f.excludeKeywords),
      weights: { sales: n('w_sales'), rating: n('w_rating'), positive: n('w_positive'), taste: n('w_taste') },
    };
    const pricing = {
      cnyToMnt: n('cnyToMnt'), markupPercent: n('markupPercent'), shippingPerKgMnt: n('shippingPerKgMnt'),
      defaultWeightKg: n('defaultWeightKg'), fixedFeeMnt: n('fixedFeeMnt'), roundTo: n('roundTo'),
    };
    await api('/settings', { method: 'PUT', body: JSON.stringify({ criteria, pricing, searchQueries: parseList(f.searchQueries) }) });
    $('#saved').textContent = 'Хадгалагдлаа ✓ Шинэ шалгуураар бараа татахын тулд "Бараа" табаас импорт хийнэ үү.';
  };
}

// ---------- Захиалга ----------
let orderStatus = '';

async function renderOrders() {
  const orders = await api(`/orders${orderStatus ? `?status=${orderStatus}` : ''}`);
  const statusOptions = (cur) => Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v}</option>`).join('');
  view.innerHTML = `
    <div class="toolbar"><label>Төлөв: <select id="orderFilter"><option value="">Бүгд</option>${statusOptions(orderStatus)}</select></label></div>
    ${orders.map((o) => `<div class="order" data-id="${o.id}">
      <header><b>${esc(o.code)}</b> <span>${esc(o.created_at)}</span>
        <span>${esc(o.customer_name)} · ${esc(o.phone)}</span> <b>${mnt(o.total_mnt)}</b>
        <select data-order-status>${statusOptions(o.status)}</select></header>
      <div class="meta">${esc(o.address)} ${o.note ? '· ' + esc(o.note) : ''} · ${o.payment_method === 'qpay' ? 'QPay' : 'Данс'}</div>
      <ul>${o.items.map((i) => `<li><a href="${esc(i.source_url)}" target="_blank" rel="noopener">${esc(i.title)}</a>
        ${esc(Object.values(i.variant ?? {}).join(' / '))} × ${i.qty} — ${mnt(i.subtotal_mnt)} <small>(¥${i.price_cny})</small></li>`).join('')}</ul>
      <input data-supplier-note value="${esc(o.supplier_note)}" placeholder="Хятад дахь захиалгын дугаар, карго трэк…" style="width:100%">
    </div>`).join('') || '<p>Захиалга алга.</p>'}`;

  $('#orderFilter').onchange = (e) => { orderStatus = e.target.value; renderOrders(); };
  view.querySelectorAll('.order').forEach((el) => {
    const patch = (body) => api(`/orders/${el.dataset.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    el.querySelector('[data-order-status]').onchange = (e) => patch({ status: e.target.value });
    el.querySelector('[data-supplier-note]').onchange = (e) => patch({ supplier_note: e.target.value });
  });
}

// ---------- Хятадаас авах жагсаалт ----------
async function renderPurchase() {
  const data = await api('/purchase-list');
  view.innerHTML = `
    <p class="hint">Төлбөр нь орсон (<b>${ORDER_STATUS_LABELS.paid}</b>) захиалгуудын бараа. Линк дээр дарж Taobao/PDD дээр захиалаад доорх товчийг дарна.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Бараа</th><th>Сонголт</th><th>Тоо</th><th>¥</th><th>Захиалгууд</th></tr></thead>
      <tbody>${data.items.map((i) => `<tr>
        <td><a href="${esc(i.source_url)}" target="_blank" rel="noopener">${esc(i.title_cn)}</a><br><small>${esc(i.title)} · ${esc(i.source)}</small></td>
        <td>${esc(Object.entries(i.variant ?? {}).map(([k, v]) => `${k}: ${v}`).join(', '))}</td>
        <td><b>${i.qty}</b></td><td>¥${i.total_cny}</td><td>${i.orders.map(esc).join(', ')}</td></tr>`).join('') || '<tr><td colspan="5">Худалдан авах бараа алга.</td></tr>'}</tbody>
    </table></div>
    <p>Нийт: <b>¥${Math.round(data.total_cny * 100) / 100}</b></p>
    ${data.orderIds.length ? '<button id="markOrdered">Бүгдийг "Хятадаас захиалсан" болгох</button>' : ''}`;
  const btn = $('#markOrdered');
  if (btn) btn.onclick = async () => {
    for (const id of data.orderIds) await api(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ordered' }) });
    renderPurchase();
  };
}

// ---------- Табууд ----------
const tabs = { products: renderProducts, criteria: renderCriteria, orders: renderOrders, purchase: renderPurchase };

async function render() {
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
  try {
    await tabs[currentTab]();
  } catch (err) {
    view.innerHTML = `<p class="error">${esc(err.message)}${err.message === 'Нэвтрэх эрхгүй' ? ' — баруун дээд буланд ADMIN_TOKEN-оо оруулна уу.' : ''}</p>`;
  }
}

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { currentTab = b.dataset.tab; render(); }));
render();
