// Барааг шалгуураар шүүж, "амт"-ын дагуу оноо өгөх цэвэр функцууд.
// Бүх бараа нь normalize хийгдсэн хэлбэртэй байна (sources/*.js-ийг үзнэ үү).

const SALES_CEILING = 100_000; // Үүнээс их зарагдсан бол борлуулалтын оноо дээд хэмжээндээ хүрнэ

const clamp01 = (x) => Math.max(0, Math.min(1, x));

function containsAny(text, words) {
  return words.filter((w) => w && text.includes(w));
}

// Хатуу шүүлтүүр: аль нэг нь таарахгүй бол бараа огт орохгүй.
export function hardFilter(product, criteria) {
  const reasons = [];
  const text = `${product.title_cn} ${product.category ?? ''}`;

  if (containsAny(text, criteria.kidsKeywords).length === 0) reasons.push('Хүүхдийн бараа биш');
  const banned = containsAny(text, criteria.excludeKeywords);
  if (banned.length) reasons.push(`Хориотой үг: ${banned.join(', ')}`);
  if (criteria.blockedShops.includes(product.shop_name)) reasons.push('Хориглосон дэлгүүр');
  if (product.sales < criteria.minSales) reasons.push(`Борлуулалт бага (${product.sales} < ${criteria.minSales})`);
  if (product.rating != null && product.rating < criteria.minRating) {
    reasons.push(`Үнэлгээ бага (${product.rating} < ${criteria.minRating})`);
  }
  if (product.positive_rate != null && product.positive_rate < criteria.minPositiveRate) {
    reasons.push(`Эерэг сэтгэгдэл бага (${Math.round(product.positive_rate * 100)}%)`);
  }
  if (product.review_count < criteria.minReviews) {
    reasons.push(`Сэтгэгдэл цөөн (${product.review_count} < ${criteria.minReviews})`);
  }
  if (product.price_cny < criteria.priceCnyMin || product.price_cny > criteria.priceCnyMax) {
    reasons.push(`Үнэ хязгаараас гадуур (¥${product.price_cny})`);
  }
  return { pass: reasons.length === 0, reasons };
}

// Амтын оноо: таалагдсан үг бүрийн жинг нэмээд 0..1 болгоно.
// Жингүй (0) бараа = 0.5 (саармаг), нийт +30 ба түүнээс дээш = 1, −30 = 0.
export function tasteScore(product, criteria) {
  const text = product.title_cn;
  const matched = criteria.tasteKeywords.filter((t) => t.word && text.includes(t.word));
  let sum = matched.reduce((s, t) => s + Number(t.weight || 0), 0);
  if (criteria.preferredShops.includes(product.shop_name)) sum += 15;
  return { value: clamp01(0.5 + sum / 60), matched: matched.map((t) => t.word) };
}

export function scoreProduct(product, criteria) {
  const w = criteria.weights;
  const totalWeight = (w.sales + w.rating + w.positive + w.taste) || 1;

  // Борлуулалтыг логарифм хуваариар: 1000 → 0.6, 10000 → 0.8, 100000 → 1
  const sales = clamp01(Math.log10(Math.max(product.sales, 1)) / Math.log10(SALES_CEILING));
  // Үнэлгээ 4.0 → 0, 5.0 → 1 (мэдээлэлгүй бол саармаг)
  const rating = product.rating == null ? 0.5 : clamp01(product.rating - 4);
  // Эерэг хувь 90% → 0, 100% → 1
  const positive = product.positive_rate == null ? 0.5 : clamp01((product.positive_rate - 0.9) / 0.1);
  const taste = tasteScore(product, criteria);

  const score =
    (100 * (w.sales * sales + w.rating * rating + w.positive * positive + w.taste * taste.value)) / totalWeight;

  return {
    score: Math.round(score * 10) / 10,
    detail: {
      sales: round2(sales),
      rating: round2(rating),
      positive: round2(positive),
      taste: round2(taste.value),
      tasteMatched: taste.matched,
    },
  };
}

const round2 = (x) => Math.round(x * 100) / 100;

// Нэг барааг бүрэн үнэлэх: шүүлтүүр + оноо + шийдвэр.
export function evaluate(product, criteria) {
  const filter = hardFilter(product, criteria);
  const { score, detail } = scoreProduct(product, criteria);
  const reasons = [...filter.reasons];
  if (filter.pass && score < criteria.minScore) reasons.push(`Оноо бага (${score} < ${criteria.minScore})`);
  return { accepted: reasons.length === 0, score, detail: { ...detail, reasons } };
}
