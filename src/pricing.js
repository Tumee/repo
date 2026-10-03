// Юанийн үнээс Монгол дахь зарах үнийг (₮) тооцоолно.
export function priceMnt(product, pricing) {
  const weight = product.weight_kg ?? pricing.defaultWeightKg;
  const base = product.price_cny * pricing.cnyToMnt;
  const raw = base * (1 + pricing.markupPercent / 100) + weight * pricing.shippingPerKgMnt + pricing.fixedFeeMnt;
  const step = pricing.roundTo || 1;
  return Math.ceil(raw / step) * step;
}
