// Жишээ өгөгдөл: бодит API холбохоос өмнө системийг турших зориулалттай.
// Зарим нь шалгуурыг давна, зарим нь санаатайгаар унана (борлуулалт бага, хориотой үг гэх мэт).
const ITEMS = [
  { source: 'taobao', source_id: 'tb1001', title_cn: '蒙氏早教木制积木 儿童益智玩具 1-3岁', title_mn: 'Монтессори модон шоо, 1-3 нас', category: 'toys', shop_name: '木童旗舰店', price_cny: 39.9, sales: 52000, rating: 4.9, positive_rate: 0.99, review_count: 8200, age_min_months: 12, age_max_months: 36, weight_kg: 0.8, variants: [{ name: 'Хэмжээ', options: ['50 ширхэг', '100 ширхэг'] }] },
  { source: 'pdd', source_id: 'pdd2001', title_cn: '婴儿纯棉连体衣 新生儿哈衣 春秋款', title_mn: 'Нярайн цэвэр хөвөн комбинезон', category: 'clothing', shop_name: '棉宝贝', price_cny: 25.5, sales: 98000, rating: 4.8, positive_rate: 0.98, review_count: 21000, age_min_months: 0, age_max_months: 12, weight_kg: 0.25, variants: [{ name: 'Хэмжээ', options: ['59', '66', '73', '80'] }, { name: 'Өнгө', options: ['Цагаан', 'Шар', 'Цэнхэр'] }] },
  { source: 'taobao', source_id: 'tb1002', title_cn: '儿童绘本 0-3岁 宝宝启蒙认知 全10册', title_mn: 'Хүүхдийн зурагт ном 0-3 нас, 10 боть', category: 'books', shop_name: '童书馆', price_cny: 49, sales: 31000, rating: 4.9, positive_rate: 0.98, review_count: 5400, age_min_months: 0, age_max_months: 36, weight_kg: 1.2, variants: [] },
  { source: 'pdd', source_id: 'pdd2002', title_cn: '宝宝硅胶吸盘碗 儿童辅食餐具套装', title_mn: 'Хүүхдийн силикон соруултай аяга, хоолны багц', category: 'feeding', shop_name: '小食客', price_cny: 29.9, sales: 64000, rating: 4.8, positive_rate: 0.97, review_count: 12000, age_min_months: 6, age_max_months: 48, weight_kg: 0.4, variants: [{ name: 'Өнгө', options: ['Ногоон', 'Ягаан', 'Саарал'] }] },
  { source: 'taobao', source_id: 'tb1003', title_cn: '儿童平衡车 无脚踏 2-6岁 学步滑行车', title_mn: 'Хүүхдийн тэнцвэрийн дугуй 2-6 нас', category: 'outdoor', shop_name: '酷骑童车', price_cny: 189, sales: 15000, rating: 4.8, positive_rate: 0.97, review_count: 3100, age_min_months: 24, age_max_months: 72, weight_kg: 3.5, variants: [{ name: 'Өнгө', options: ['Улаан', 'Цэнхэр'] }] },
  { source: 'pdd', source_id: 'pdd2003', title_cn: '网红解压玩具 儿童塑料捏捏乐', title_mn: 'Стресс тайлах хуванцар тоглоом', category: 'toys', shop_name: '潮玩铺', price_cny: 6.8, sales: 230000, rating: 4.6, positive_rate: 0.93, review_count: 40000, age_min_months: 36, age_max_months: 144, weight_kg: 0.1, variants: [] },
  { source: 'taobao', source_id: 'tb1004', title_cn: '儿童磁力珠 益智玩具', title_mn: 'Соронзон бөмбөлөг', category: 'toys', shop_name: '某玩具店', price_cny: 15, sales: 8000, rating: 4.7, positive_rate: 0.96, review_count: 900, weight_kg: 0.2, variants: [] },
  { source: 'pdd', source_id: 'pdd2004', title_cn: '女童纯棉连衣裙 夏季 公主裙', title_mn: 'Охидын цэвэр хөвөн даашинз', category: 'clothing', shop_name: '小公主童装', price_cny: 45, sales: 27000, rating: 4.8, positive_rate: 0.97, review_count: 6000, age_min_months: 24, age_max_months: 120, weight_kg: 0.3, variants: [{ name: 'Хэмжээ', options: ['90', '100', '110', '120', '130'] }] },
  { source: 'taobao', source_id: 'tb1005', title_cn: '婴儿有机棉口水巾 6条装', title_mn: 'Нярайн органик хөвөн шүлсний алчуур, 6 ш', category: 'baby-care', shop_name: '有机宝宝', price_cny: 32, sales: 18000, rating: 4.9, positive_rate: 0.99, review_count: 4200, age_min_months: 0, age_max_months: 24, weight_kg: 0.2, variants: [] },
  { source: 'pdd', source_id: 'pdd2005', title_cn: '儿童遥控车 越野 充电', title_mn: 'Хүүхдийн удирдлагатай машин', category: 'toys', shop_name: '飞驰玩具', price_cny: 79, sales: 600, rating: 4.5, positive_rate: 0.9, review_count: 80, age_min_months: 36, age_max_months: 144, weight_kg: 1.0, variants: [] },
  { source: 'taobao', source_id: 'tb1006', title_cn: '宝宝木制拼图 蒙氏形状认知板', title_mn: 'Хүүхдийн модон пазл, хэлбэр таних самбар', category: 'toys', shop_name: '木童旗舰店', price_cny: 22, sales: 41000, rating: 4.9, positive_rate: 0.99, review_count: 7600, age_min_months: 12, age_max_months: 48, weight_kg: 0.5, variants: [] },
  { source: 'pdd', source_id: 'pdd2006', title_cn: '男童运动套装 纯棉 春秋', title_mn: 'Хөвгүүдийн цэвэр хөвөн спорт иж бүрдэл', category: 'clothing', shop_name: '酷童', price_cny: 59, sales: 22000, rating: 4.7, positive_rate: 0.96, review_count: 3800, age_min_months: 36, age_max_months: 144, weight_kg: 0.5, variants: [{ name: 'Хэмжээ', options: ['100', '110', '120', '130', '140'] }] },
  { source: 'taobao', source_id: 'tb1007', title_cn: '婴儿奶瓶 宽口径 PPSU 防胀气', title_mn: 'Нярайн сүүний сав, өргөн амсартай PPSU', category: 'feeding', shop_name: '贝亲专营', price_cny: 68, sales: 76000, rating: 4.9, positive_rate: 0.98, review_count: 15000, age_min_months: 0, age_max_months: 24, weight_kg: 0.3, variants: [{ name: 'Хэмжээ', options: ['160ml', '240ml'] }] },
  { source: 'pdd', source_id: 'pdd2007', title_cn: '成人瑜伽垫 加厚', title_mn: 'Насанд хүрэгчдийн иогийн дэвсгэр', category: 'sports', shop_name: '运动家', price_cny: 35, sales: 120000, rating: 4.8, positive_rate: 0.97, review_count: 30000, weight_kg: 1.0, variants: [] },
  { source: 'taobao', source_id: 'tb1008', title_cn: '儿童益智磁力片 积木 100片', title_mn: 'Хүүхдийн соронзон хавтан барилгын тоглоом, 100 ш', category: 'toys', shop_name: '磁力乐园', price_cny: 89, sales: 26000, rating: 4.8, positive_rate: 0.97, review_count: 5200, age_min_months: 36, age_max_months: 120, weight_kg: 1.5, variants: [] },
  { source: 'pdd', source_id: 'pdd2008', title_cn: '宝宝学步鞋 软底 防滑', title_mn: 'Хүүхдийн алхаж сурах зөөлөн уланцартай гутал', category: 'shoes', shop_name: '小脚丫', price_cny: 39, sales: 47000, rating: 4.7, positive_rate: 0.96, review_count: 9800, age_min_months: 6, age_max_months: 30, weight_kg: 0.3, variants: [{ name: 'Хэмжээ', options: ['12', '13', '14', '15'] }] },
];

export async function search(query) {
  const q = (query || '').trim();
  // Жишээ эх сурвалж тул хайлтын үгийн аль нэг тэмдэгт гарчигт таарсан бүхнийг буцаана
  const chars = [...q].filter((c) => !/\s/.test(c));
  return ITEMS.filter((it) => !chars.length || chars.some((c) => it.title_cn.includes(c))).map((it) => ({
    ...it,
    source_url:
      it.source === 'taobao'
        ? `https://item.taobao.com/item.htm?id=${it.source_id}`
        : `https://mobile.yangkeduo.com/goods.html?goods_id=${it.source_id}`,
    images: [],
  }));
}
