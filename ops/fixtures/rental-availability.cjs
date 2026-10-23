// Offsets are inclusive calendar days from the caller's explicit 2026-10-22 anchor.
// These products and holds are create-only additions; existing catalog stock is untouched.
const PRODUCTS = [
  {
    key: 'peachAoDai',
    name: 'Áo dài lụa đào',
    description:
      'Áo dài lụa màu đào, phom suông nhẹ và tay dài. Phù hợp ảnh chân dung, kỷ yếu và chụp cùng gia đình; gồm áo và quần đồng bộ.',
    typeName: 'Áo dài kỷ yếu',
    gender: 'female',
    itemKind: 'clothing',
    rentalDailyPrice: 135000,
    inventory: [
      { size: 'M', quantity: 2, condition: 'good' },
      { size: 'L', quantity: 1, condition: 'good' },
    ],
  },
  {
    key: 'mossAoDai',
    name: 'Áo dài linen xanh rêu',
    description:
      'Áo dài linen xanh rêu có bề mặt vải mộc và cổ đứng. Dễ phối phụ kiện tông kem cho bộ ảnh ngoài trời; gồm áo và quần đồng bộ.',
    typeName: 'Áo dài kỷ yếu',
    gender: 'female',
    itemKind: 'clothing',
    rentalDailyPrice: 145000,
    inventory: [
      { size: 'S', quantity: 1, condition: 'good' },
      { size: 'M', quantity: 2, condition: 'good' },
      { size: 'L', quantity: 1, condition: 'good' },
    ],
  },
  {
    key: 'charcoalVest',
    name: 'Vest xám than',
    description:
      'Bộ vest xám than hai nút, phom gọn cho ảnh tốt nghiệp và dịp trang trọng. Gồm áo vest và quần âu; sơ mi và cà vạt có thể chọn thuê riêng.',
    typeName: 'Vest và âu phục',
    gender: 'male',
    itemKind: 'clothing',
    rentalDailyPrice: 175000,
    inventory: [
      { size: 'M', quantity: 1, condition: 'good' },
      { size: 'L', quantity: 1, condition: 'good' },
      { size: 'XL', quantity: 1, condition: 'good' },
    ],
  },
  {
    key: 'sageBaBa',
    name: 'Bộ bà ba xanh lá nhạt',
    description:
      'Bộ bà ba xanh lá nhạt bằng vải mềm, phom thoải mái cho ảnh nhóm phong cách hoài niệm. Gồm áo và quần, phù hợp phối nón lá hoặc mũ cói.',
    typeName: 'Trang phục hoài niệm',
    gender: 'unisex',
    itemKind: 'clothing',
    rentalDailyPrice: 95000,
    inventory: [
      { size: 'M', quantity: 2, condition: 'good' },
      { size: 'L', quantity: 2, condition: 'good' },
    ],
  },
  {
    key: 'pleatedSkirt',
    name: 'Chân váy xếp ly xanh navy',
    description:
      'Chân váy xanh navy dáng xếp ly, cạp gọn và chiều dài ngang gối. Phù hợp phối sơ mi trắng cho bộ ảnh học đường; sơ mi được chọn riêng.',
    typeName: 'Trang phục học đường',
    gender: 'female',
    itemKind: 'clothing',
    rentalDailyPrice: 65000,
    inventory: [
      { size: 'S', quantity: 1, condition: 'good' },
      { size: 'M', quantity: 2, condition: 'good' },
      { size: 'L', quantity: 1, condition: 'good' },
    ],
  },
  {
    key: 'beigeBeret',
    name: 'Mũ nồi dạ màu be',
    description:
      'Mũ nồi dạ màu be, nhẹ và dễ phối cùng áo dài hoặc trang phục hoài niệm. Một cỡ dùng chung; nên thử độ vừa khi nhận.',
    typeName: 'Phụ kiện chụp ảnh',
    gender: 'unisex',
    itemKind: 'accessory',
    rentalDailyPrice: 25000,
    inventory: [{ size: 'FREE', quantity: 3, condition: 'good' }],
  },
  {
    key: 'laceParasol',
    name: 'Ô ren trắng cầm tay',
    description:
      'Ô ren trắng dùng làm phụ kiện cầm tay cho ảnh chân dung và concept dịu nhẹ. Phù hợp tạo dáng trong điều kiện khô ráo; không dùng che mưa.',
    typeName: 'Phụ kiện chụp ảnh',
    gender: 'unisex',
    itemKind: 'accessory',
    rentalDailyPrice: 35000,
    inventory: [{ size: 'FREE', quantity: 2, condition: 'good' }],
  },
  {
    key: 'ribbonHat',
    name: 'Mũ cói phối nơ kem',
    description:
      'Mũ cói vành vừa với nơ màu kem, phù hợp ảnh dã ngoại và trang phục tông sáng. Một cỡ dùng chung; bảo quản khô ráo và tránh gập vành.',
    typeName: 'Phụ kiện chụp ảnh',
    gender: 'unisex',
    itemKind: 'accessory',
    rentalDailyPrice: 20000,
    inventory: [{ size: 'FREE', quantity: 4, condition: 'good' }],
  },
];

const HOLDS = [
  {
    key: 'oct22-24',
    startOffset: 0,
    endOffset: 2,
    lines: [
      { product: 'peachAoDai', size: 'M', quantity: 2 },
      { product: 'peachAoDai', size: 'L', quantity: 1 },
      { product: 'mossAoDai', size: 'S', quantity: 1 },
      { product: 'mossAoDai', size: 'M', quantity: 1 },
      { product: 'beigeBeret', size: 'FREE', quantity: 2 },
    ],
  },
  {
    key: 'oct25-27',
    startOffset: 3,
    endOffset: 5,
    lines: [
      { product: 'mossAoDai', size: 'M', quantity: 1 },
      { product: 'mossAoDai', size: 'L', quantity: 1 },
      { product: 'charcoalVest', size: 'M', quantity: 1 },
      { product: 'charcoalVest', size: 'L', quantity: 1 },
      { product: 'charcoalVest', size: 'XL', quantity: 1 },
      { product: 'beigeBeret', size: 'FREE', quantity: 1 },
    ],
  },
  {
    key: 'oct28-30',
    startOffset: 6,
    endOffset: 8,
    lines: [
      { product: 'sageBaBa', size: 'M', quantity: 1 },
      { product: 'pleatedSkirt', size: 'S', quantity: 1 },
      { product: 'pleatedSkirt', size: 'M', quantity: 2 },
      { product: 'pleatedSkirt', size: 'L', quantity: 1 },
    ],
  },
  {
    key: 'oct31-nov02',
    startOffset: 9,
    endOffset: 11,
    lines: [{ product: 'laceParasol', size: 'FREE', quantity: 2 }],
  },
  {
    key: 'nov05-07',
    startOffset: 14,
    endOffset: 16,
    lines: [{ product: 'ribbonHat', size: 'FREE', quantity: 4 }],
  },
];

const fullStock = {
  peachAoDai: { M: 2, L: 1 },
  mossAoDai: { S: 1, M: 2, L: 1 },
  charcoalVest: { M: 1, L: 1, XL: 1 },
  sageBaBa: { M: 2, L: 2 },
  pleatedSkirt: { S: 1, M: 2, L: 1 },
  beigeBeret: { FREE: 3 },
  laceParasol: { FREE: 2 },
  ribbonHat: { FREE: 4 },
};

const WINDOWS = [
  {
    key: 'oct22-24',
    label: '22–24/10: hết mẫu, còn một phần kích cỡ và số lượng',
    startOffset: 0,
    endOffset: 2,
    expected: {
      ...fullStock,
      peachAoDai: { M: 0, L: 0 },
      mossAoDai: { S: 0, M: 1, L: 1 },
      beigeBeret: { FREE: 1 },
    },
  },
  {
    key: 'oct24-26',
    label: '24–26/10: giao ngày trả và giao hai kỳ thuê',
    startOffset: 2,
    endOffset: 4,
    expected: {
      ...fullStock,
      peachAoDai: { M: 0, L: 0 },
      mossAoDai: { S: 0, M: 1, L: 0 },
      charcoalVest: { M: 0, L: 0, XL: 0 },
      beigeBeret: { FREE: 1 },
    },
  },
  {
    key: 'oct25-27',
    label: '25–27/10: mẫu kỳ trước trở lại và mẫu mới hết hàng',
    startOffset: 3,
    endOffset: 5,
    expected: {
      ...fullStock,
      mossAoDai: { S: 1, M: 1, L: 0 },
      charcoalVest: { M: 0, L: 0, XL: 0 },
      beigeBeret: { FREE: 2 },
    },
  },
  {
    key: 'oct28-30',
    label: '28–30/10: chân váy hết, bà ba còn một phần',
    startOffset: 6,
    endOffset: 8,
    expected: {
      ...fullStock,
      sageBaBa: { M: 1, L: 2 },
      pleatedSkirt: { S: 0, M: 0, L: 0 },
    },
  },
  {
    key: 'oct31-nov02',
    label: '31/10–02/11: kỳ thuê ba ngày xuyên tháng',
    startOffset: 9,
    endOffset: 11,
    expected: { ...fullStock, laceParasol: { FREE: 0 } },
  },
  {
    key: 'nov05-07',
    label: '05–07/11: mũ cói hết hàng ở kỳ thuê tháng sau',
    startOffset: 14,
    endOffset: 16,
    expected: { ...fullStock, ribbonHat: { FREE: 0 } },
  },
  {
    key: 'nov08-10',
    label: '08–10/11: toàn bộ mẫu và kích cỡ sẵn sàng',
    startOffset: 17,
    endOffset: 19,
    expected: { ...fullStock },
  },
  {
    key: 'oct22-27',
    label: '22–27/10: tồn nhỏ nhất từng ngày, không cộng hai kỳ thuê rời nhau',
    startOffset: 0,
    endOffset: 5,
    expected: {
      ...fullStock,
      peachAoDai: { M: 0, L: 0 },
      mossAoDai: { S: 0, M: 1, L: 0 },
      charcoalVest: { M: 0, L: 0, XL: 0 },
      beigeBeret: { FREE: 1 },
    },
  },
];

module.exports = { PRODUCTS, HOLDS, WINDOWS };
