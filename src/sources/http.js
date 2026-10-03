// Гуравдагч талын Taobao / Pinduoduo API-тай холбох adapter.
// Taobao, PDD нь шууд нээлттэй API өгдөггүй тул ихэвчлэн data provider ашигладаг
// (Taobao Open Platform, 多多进宝, эсвэл item_search үйлчилгээ санал болгодог provider-ууд).
// Provider бүрийн хариу өөр өөр бүтэцтэй тул доорх `normalize` функцийг өөрийн
// provider-ийн JSON-д тааруулж засна.

export function makeHttpSource(source, urlTemplate) {
  return async function search(query, page = 1) {
    if (!urlTemplate) throw new Error(`${source}: хайлтын URL тохируулаагүй байна`);
    const url = urlTemplate.replace('{q}', encodeURIComponent(query)).replace('{page}', String(page));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
    const body = await res.json();
    const items = body?.items?.item ?? body?.items ?? body?.data ?? [];
    return items.map((raw) => normalize(source, raw)).filter(Boolean);
  };
}

const num = (v) => (v == null || v === '' ? null : Number(String(v).replace(/[^\d.]/g, '')));

// Түгээмэл талбарын нэрсийг хамруулсан анхны mapping. Шаардлагатай бол засна.
export function normalize(source, raw) {
  const id = raw.num_iid ?? raw.item_id ?? raw.goods_id ?? raw.id;
  const title = raw.title ?? raw.goods_name;
  const price = num(raw.promotion_price ?? raw.price ?? raw.min_group_price);
  if (!id || !title || price == null) return null;
  const img = raw.pic_url ?? raw.goods_image_url ?? raw.image;
  const positive = num(raw.positive_rate ?? raw.good_rate);
  return {
    source,
    source_id: String(id),
    source_url:
      raw.detail_url ??
      (source === 'taobao'
        ? `https://item.taobao.com/item.htm?id=${id}`
        : `https://mobile.yangkeduo.com/goods.html?goods_id=${id}`),
    title_cn: title,
    category: raw.category ?? raw.category_name ?? null,
    shop_name: raw.nick ?? raw.seller_nick ?? raw.mall_name ?? null,
    price_cny: price,
    sales: num(raw.sales ?? raw.sales_tip ?? raw.volume) ?? 0,
    rating: num(raw.rating ?? raw.score),
    positive_rate: positive == null ? null : positive > 1 ? positive / 100 : positive,
    review_count: num(raw.comment_count ?? raw.review_count) ?? 0,
    images: img ? [img.startsWith('//') ? `https:${img}` : img] : [],
    variants: [],
  };
}
