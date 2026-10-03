// Орчны тохиргоо. Бүх утгыг environment variable-аар дарж болно.
export const config = {
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || 'data/shop.db',
  adminToken: process.env.ADMIN_TOKEN || 'changeme',
  // Бараа татах эх сурвалж: "mock" (жишээ өгөгдөл) эсвэл "http" (гуравдагч API)
  source: process.env.PRODUCT_SOURCE || 'mock',
  http: {
    // Жишээ: https://api.example.com/taobao/item_search?q={q}&page={page}&key=XXX
    taobaoSearchUrl: process.env.TAOBAO_SEARCH_URL || '',
    pddSearchUrl: process.env.PDD_SEARCH_URL || '',
  },
};

// Админ самбараас өөрчлөгддөг анхны тохиргоо (DB-д хадгалагдана).
export const defaultSettings = {
  criteria: {
    // Зөвхөн их зарагдсан, сайн үнэлгээтэй бараа
    minSales: 1000,
    minRating: 4.7,
    minPositiveRate: 0.95,
    minReviews: 100,
    priceCnyMin: 5,
    priceCnyMax: 400,
    // Хүүхдийн бараа мөн эсэхийг шалгах түлхүүр үгс (аль нэг нь байх ёстой)
    kidsKeywords: ['儿童', '宝宝', '婴儿', '童装', '幼儿', '小孩', '男童', '女童', '亲子', '早教', '玩具', '绘本', '奶瓶', '学步'],
    // Эдгээр үг орсон барааг шууд хасна (аюулгүй байдал, хэрэггүй ангилал)
    excludeKeywords: ['成人', '情趣', '电子烟', '磁力珠', '水晶泥', '二手', '仿真枪'],
    // Таны "амт": үг бүрт жин (+ таалагдана, − таалагдахгүй)
    tasteKeywords: [
      { word: '木制', weight: 15 },
      { word: '纯棉', weight: 15 },
      { word: '蒙氏', weight: 12 },
      { word: '益智', weight: 10 },
      { word: '有机', weight: 8 },
      { word: '硅胶', weight: 6 },
      { word: '塑料', weight: -8 },
      { word: '网红', weight: -5 },
    ],
    preferredShops: [],
    blockedShops: [],
    // Нийт оноонд эзлэх жин (нийлбэр нь 1 байх албагүй, автоматаар нормчилно)
    weights: { sales: 0.35, rating: 0.25, positive: 0.15, taste: 0.25 },
    minScore: 60,
    // true бол шалгуур давсан барааг шууд дэлгүүрт гаргана, false бол админ батална
    autoApprove: false,
  },
  pricing: {
    cnyToMnt: 480, // 1 юань = ? төгрөг
    markupPercent: 25, // ашгийн хувь
    shippingPerKgMnt: 12000, // Эрээн → УБ карго, кг тутамд
    defaultWeightKg: 0.5,
    fixedFeeMnt: 2000, // нэг барааны тогтмол шимтгэл (сав баглаа, дотоод хүргэлт)
    roundTo: 100,
  },
  // Импорт хийхэд ашиглах хайлтын үгс
  searchQueries: ['儿童玩具', '婴儿用品', '童装', '儿童绘本', '宝宝餐具'],
};
