// Fictional daily rates and product inclusions for the local project presentation.
// Existing period prices, inventory, category IDs and historical snapshots stay unchanged.
const CATALOG_PRESENTATION = [
  {
    key: 'whiteAoDai',
    id: '342e9828520f4b249de4db7b',
    previousName: 'Áo dài trắng lụa ngọc trai',
    name: 'Áo dài trắng lụa ngọc trai',
    description:
      'Gồm 1 áo dài trắng lụa ngọc trai và 1 quần trắng, cổ cao truyền thống; không kèm nón lá.',
    rentalDailyPrice: 125000,
  },
  {
    key: 'ivoryAoDai',
    id: '2a1fa12aa0d5b262de725aca',
    previousName: 'Áo dài kem thêu sen',
    name: 'Áo dài kem thêu sen',
    description:
      'Gồm 1 áo dài kem thêu sen và 1 quần trắng, phù hợp chụp ngoại cảnh; không kèm phụ kiện.',
    rentalDailyPrice: 135000,
  },
  {
    key: 'pinkAoDai',
    id: 'bc0a8b424bb7e830a07e88a6',
    previousName: 'Áo dài hồng phấn tay lỡ',
    name: 'Áo dài hồng phấn tay lỡ',
    description: 'Gồm 1 áo dài hồng phấn tay lỡ và 1 quần trắng; không kèm nón lá.',
    rentalDailyPrice: 115000,
  },
  {
    key: 'blueAoDai',
    id: 'a5148fd7290cc97e8abd925b',
    previousName: 'Áo dài xanh thiên thanh',
    name: 'Áo dài xanh thiên thanh',
    description: 'Gồm 1 áo dài xanh thiên thanh voan hai lớp và 1 quần trắng; không kèm phụ kiện.',
    rentalDailyPrice: 115000,
  },
  {
    key: 'navyVest',
    id: '83cd48a16e1d16f0408745d4',
    previousName: 'Vest nam xanh navy hai nút',
    name: 'Vest nam xanh navy hai nút',
    description:
      'Gồm 1 áo vest xanh navy hai nút và 1 quần âu đồng màu; không kèm sơ mi, cà vạt hoặc giày.',
    rentalDailyPrice: 160000,
  },
  {
    key: 'blackVest',
    id: 'cd394073c5c60289288aa413',
    previousName: 'Vest nam đen cổ ve nhọn',
    name: 'Vest nam đen cổ ve nhọn',
    description:
      'Gồm 1 áo vest đen cổ ve nhọn và 1 quần âu đồng màu; không kèm sơ mi, cà vạt hoặc giày.',
    rentalDailyPrice: 170000,
  },
  {
    key: 'beigeVest',
    id: '11a1fa6012207d8d62eec13b',
    previousName: 'Vest nam be sáng',
    name: 'Vest nam be sáng',
    description:
      'Gồm 1 áo vest be sáng và 1 quần âu đồng màu, chất vải nhẹ; không kèm sơ mi hoặc giày.',
    rentalDailyPrice: 180000,
  },
  {
    key: 'navyGown',
    id: 'be0f8df5c79198afaf21e068',
    previousName: 'Áo cử nhân xanh navy viền vàng',
    name: 'Áo cử nhân xanh navy viền vàng',
    description: 'Gồm 1 áo choàng cử nhân xanh navy viền vàng; mũ cử nhân thuê riêng.',
    rentalDailyPrice: 70000,
  },
  {
    key: 'redGown',
    id: 'e35eeef00966593764220042',
    previousName: 'Áo cử nhân đỏ đô viền đen',
    name: 'Áo cử nhân đỏ đô viền đen',
    description: 'Gồm 1 áo choàng cử nhân đỏ đô viền đen, khóa trước; mũ cử nhân thuê riêng.',
    rentalDailyPrice: 70000,
  },
  {
    key: 'blackGown',
    id: 'e02a919f7798279e7d2af90c',
    previousName: 'Áo cử nhân đen viền xanh',
    name: 'Áo cử nhân đen viền xanh',
    description: 'Gồm 1 áo choàng cử nhân đen viền xanh; mũ cử nhân thuê riêng.',
    rentalDailyPrice: 75000,
  },
  {
    key: 'creamBaBa',
    id: '050efa9c98490045bf728a8e',
    previousName: 'Áo bà ba kem cổ tròn',
    name: 'Áo bà ba kem cổ tròn',
    description: 'Gồm 1 áo bà ba kem cổ tròn và 1 quần đồng bộ bằng vải đũi; không kèm nón lá.',
    rentalDailyPrice: 90000,
  },
  {
    key: 'brownBaBa',
    id: '4571a3eb2bf0b1ac42e24151',
    previousName: 'Áo bà ba nâu đất',
    name: 'Áo bà ba nâu đất',
    description: 'Gồm 1 áo bà ba nâu đất và 1 quần đồng bộ, dáng thoải mái; không kèm nón lá.',
    rentalDailyPrice: 85000,
  },
  {
    key: 'maleShirt',
    id: '68a5f89308b739922edcad57',
    previousName: 'Sơ mi nam trắng học đường',
    name: 'Sơ mi nam trắng học đường',
    description:
      'Gồm 1 áo sơ mi nam trắng dài tay, cổ cơ bản; không kèm quần âu, vest hoặc cà vạt.',
    rentalDailyPrice: 40000,
  },
  {
    key: 'femaleShirt',
    id: '8c24faa198d0464b83fc736a',
    previousName: 'Sơ mi nữ trắng cổ sen',
    name: 'Sơ mi nữ trắng cổ sen',
    description: 'Gồm 1 áo sơ mi nữ trắng tay ngắn cổ sen; không kèm chân váy hoặc phụ kiện.',
    rentalDailyPrice: 40000,
  },
  {
    key: 'plaidSkirt',
    id: 'b98ee1d5c8dc613435b365e6',
    previousName: 'Chân váy xếp ly caro xanh',
    name: 'Chân váy xếp ly caro xanh',
    description: 'Gồm 1 chân váy xếp ly caro xanh dài ngang gối, khóa bên; không kèm áo sơ mi.',
    rentalDailyPrice: 50000,
  },
  {
    key: 'conicalHat',
    id: '7016cabe0633f8c69a100f42',
    previousName: 'Nón lá Huế quai lụa',
    name: 'Nón lá Huế quai lụa',
    description: 'Gồm 1 nón lá Huế và quai lụa trắng; trang phục thuê riêng.',
    rentalDailyPrice: 15000,
  },
  {
    key: 'books',
    id: 'ced43776888a5f6f4644976c',
    previousName: 'Bộ sách đạo cụ bìa cổ điển',
    name: 'Bộ sách đạo cụ bìa cổ điển',
    description:
      'Mỗi đơn vị thuê gồm 1 bộ 3 sách đạo cụ bìa nâu, xanh và kem, dùng cho ảnh bàn học hoặc thư viện.',
    rentalDailyPrice: 20000,
  },
  {
    key: 'graduationCap',
    id: '48e55a8ff6d6e5774df2ccce',
    previousName: 'Mũ cử nhân đen tua vàng',
    name: 'Mũ cử nhân đen tua vàng',
    description: 'Gồm 1 mũ cử nhân đen tua vàng, có dây chỉnh; áo choàng thuê riêng.',
    rentalDailyPrice: 20000,
  },
  {
    key: 'legacyWhiteAoDai',
    id: '57cb6f991dfdf6cf190f3688',
    previousName: 'Demo · Áo dài trắng',
    name: 'Áo dài trắng truyền thống',
    description:
      'Gồm 1 áo dài trắng cổ cao và 1 quần trắng, phù hợp chụp kỷ yếu; không kèm nón lá.',
    rentalDailyPrice: 100000,
  },
  {
    key: 'legacyNavyVest',
    id: '52abeab744555eb05420991f',
    previousName: 'Demo · Vest xanh navy',
    name: 'Bộ vest xanh navy cổ điển',
    description:
      'Gồm 1 áo vest xanh navy và 1 quần âu đồng màu; không kèm sơ mi, cà vạt hoặc giày.',
    rentalDailyPrice: 140000,
  },
  {
    key: 'legacyConicalHat',
    id: 'c38134a52d191874e34a43cc',
    previousName: 'Demo · Nón lá',
    name: 'Nón lá truyền thống',
    description: 'Gồm 1 nón lá dùng làm đạo cụ chụp ảnh; áo dài và trang phục thuê riêng.',
    rentalDailyPrice: 10000,
  },
];

const legacyPresentation = Object.fromEntries(
  CATALOG_PRESENTATION.filter((row) => row.key.startsWith('legacy')).map((row) => [row.key, row]),
);
const realisticPresentation = Object.fromEntries(
  CATALOG_PRESENTATION.filter((row) => !row.key.startsWith('legacy')).map((row) => [row.key, row]),
);

module.exports = { CATALOG_PRESENTATION, legacyPresentation, realisticPresentation };
