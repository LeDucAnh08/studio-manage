// Fictional Vietnamese studio catalog for the persistent graduation-project demo.
// The caller owns the connection and create-only ensure helper; this module never resets data.
async function seedCatalog({ models, ensure, at, day, now }) {
  for (const name of ['User', 'Season', 'CostumeType', 'Costume', 'Package', 'Category']) {
    if (!models[name]) throw new Error(`Missing demo model: ${name}`);
  }

  const staff = {};
  for (const [key, username, name, role] of [
    ['admin', 'quanly.ha', 'Nguyễn Thanh Hà', 1],
    ['saleAn', 'sale.ngocan', 'Trần Ngọc An', 2],
    ['saleLinh', 'sale.tuonglinh', 'Lê Tường Linh', 2],
    ['photoMinh', 'nhiepanh.minhquan', 'Phạm Minh Quân', 3],
    ['photoHuy', 'nhiepanh.quochuy', 'Vũ Quốc Huy', 3],
    ['photoBao', 'nhiepanh.giabao', 'Nguyễn Gia Bảo', 3],
    ['photoNam', 'nhiepanh.hoainam', 'Đỗ Hoài Nam', 3],
    ['photoKhoa', 'nhiepanh.anhkhoa', 'Trần Anh Khoa', 3],
    ['photoDuc', 'nhiepanh.minhduc', 'Lê Minh Đức', 3],
    ['accountant', 'ketoan.maianh', 'Bùi Mai Anh', 5],
    ['collaborator', 'ctv.khanhvy', 'Hoàng Khánh Vy', 4],
  ]) {
    staff[key] = await ensure(
      'User',
      `staff:${key}`,
      {
        username,
        name,
        password: 'Staff@1234',
        roles: [role],
        isActive: true,
        createdAt: at('2026-05-02', '09:00'),
      },
      { username },
    );
  }

  const clients = {};
  const clientRows = [
    ['maiAnh', 'khach.maianh', 'Nguyễn Mai Anh'],
    ['minhThu', 'khach.minhthu', 'Trần Minh Thư'],
    ['quocBao', 'khach.quocbao', 'Lê Quốc Bảo'],
    ['phuongLinh', 'khach.phuonglinh', 'Phạm Phương Linh'],
    ['ducHuy', 'khach.duchuy', 'Đặng Đức Huy'],
    ['ngocHa', 'khach.ngocha', 'Vũ Ngọc Hà'],
    ['giaHan', 'khach.giahan', 'Bùi Gia Hân'],
    ['thanhTam', 'khach.thanhtam', 'Hoàng Thanh Tâm'],
    ['khanhDuy', 'khach.khanhduy', 'Đỗ Khánh Duy'],
    ['thaoNhi', 'khach.thaonhi', 'Nguyễn Thảo Nhi'],
    ['tuanKiet', 'khach.tuankiet', 'Trần Tuấn Kiệt'],
    ['baoNgoc', 'khach.baongoc', 'Lê Bảo Ngọc'],
    ['hoangPhuc', 'khach.hoangphuc', 'Phạm Hoàng Phúc'],
    ['anhTu', 'khach.anhtu', 'Đinh Anh Tú'],
    ['nhatMinh', 'khach.nhatminh', 'Dương Nhật Minh'],
    ['huongGiang', 'khach.huonggiang', 'Nguyễn Hương Giang'],
  ];
  for (const [key, username, name] of clientRows) {
    clients[key] = await ensure(
      'User',
      `client:${key}`,
      {
        username,
        name,
        password: 'Client@1234',
        roles: [6],
        isActive: true,
        createdAt: at('2026-05-03', '10:30'),
      },
      { username },
    );
  }

  const seasons = {};
  for (const [key, name, start, end] of [
    ['summer', 'Mùa kỷ yếu hè 2026', '2026-05-01', '2026-08-31'],
    ['autumn', 'Mùa thu thanh xuân 2026', '2026-09-01', '2026-10-31'],
    ['yearEnd', 'Mùa tốt nghiệp cuối năm 2026', '2026-11-01', '2026-12-31'],
  ]) {
    seasons[key] = await ensure(
      'Season',
      `season:${key}`,
      {
        name,
        startDate: at(start, '00:00'),
        endDate: at(end, '23:59:59'),
        createdAt: at('2026-04-28', '09:00'),
        updatedAt: at('2026-04-28', '09:00'),
      },
      { name },
    );
  }

  const types = {};
  for (const [key, name, description] of [
    ['aoDai', 'Áo dài kỷ yếu', 'Áo dài truyền thống, phom nhẹ cho ảnh lớp và chân dung.'],
    ['vest', 'Vest và âu phục', 'Bộ vest phối sơ mi, phù hợp kỷ yếu và lễ tốt nghiệp.'],
    ['graduation', 'Lễ phục cử nhân', 'Áo choàng và phụ kiện cho lễ trao bằng, ảnh nhóm.'],
    ['vintage', 'Trang phục hoài niệm', 'Áo bà ba và tông màu mộc cho bộ ảnh phong cách xưa.'],
    ['casual', 'Trang phục học đường', 'Sơ mi, chân váy và trang phục phối theo concept lớp.'],
    ['accessory', 'Phụ kiện chụp ảnh', 'Nón, mũ và đạo cụ cầm tay dùng cùng trang phục.'],
  ]) {
    types[key] = await ensure(
      'CostumeType',
      `type:${key}`,
      { name, description, createdAt: at('2026-04-30', '09:00') },
      { name },
    );
  }

  const clothes = (quantities, wear = []) => [
    ...['S', 'M', 'L', 'XL'].map((size, index) => ({
      size,
      quantity: quantities[index],
      condition: 'good',
    })),
    ...wear,
  ];
  const repair = (size, quantity) => ({ size, quantity, condition: 'repair' });
  const damaged = (size, quantity) => ({ size, quantity, condition: 'damaged' });
  const costumeRows = [
    [
      'whiteAoDai',
      'Áo dài trắng lụa ngọc trai',
      'Lụa mềm, cổ cao truyền thống; phối quần trắng cho ảnh sân trường.',
      'female',
      'aoDai',
      160000,
      clothes([24, 48, 32, 18], [repair('M', 2), damaged('L', 1)]),
    ],
    [
      'ivoryAoDai',
      'Áo dài kem thêu sen',
      'Tông kem ấm, họa tiết sen thêu nhẹ ở tà; hợp ảnh ngoại cảnh buổi sáng.',
      'female',
      'aoDai',
      180000,
      clothes([18, 32, 24, 12], [repair('S', 1)]),
    ],
    [
      'pinkAoDai',
      'Áo dài hồng phấn tay lỡ',
      'Tay lỡ thoáng nhẹ, sắc hồng dịu; phối quần trắng và nón lá.',
      'female',
      'aoDai',
      150000,
      clothes([20, 36, 26, 14]),
    ],
    [
      'blueAoDai',
      'Áo dài xanh thiên thanh',
      'Voan hai lớp, dáng truyền thống; lên màu nhẹ trong bộ ảnh tập thể.',
      'female',
      'aoDai',
      150000,
      clothes([16, 30, 22, 12], [damaged('M', 1)]),
    ],
    [
      'navyVest',
      'Vest nam xanh navy hai nút',
      'Bộ áo và quần tông navy; chất vải đứng phom, phối cà vạt trơn.',
      'male',
      'vest',
      220000,
      clothes([18, 40, 34, 22], [repair('L', 2)]),
    ],
    [
      'blackVest',
      'Vest nam đen cổ ve nhọn',
      'Phom hiện đại, gồm áo và quần; phù hợp ảnh tốt nghiệp trang trọng.',
      'male',
      'vest',
      230000,
      clothes([14, 28, 26, 18]),
    ],
    [
      'beigeVest',
      'Vest nam be sáng',
      'Vải nhẹ tông be, phối sơ mi trắng; hợp concept sân cỏ và kiến trúc cổ.',
      'male',
      'vest',
      250000,
      clothes([12, 24, 20, 12], [repair('M', 1)]),
    ],
    [
      'navyGown',
      'Áo cử nhân xanh navy viền vàng',
      'Áo choàng rộng với viền vàng; sử dụng cùng mũ cử nhân đồng màu.',
      'unisex',
      'graduation',
      120000,
      clothes([30, 65, 40, 28], [repair('L', 1)]),
    ],
    [
      'redGown',
      'Áo cử nhân đỏ đô viền đen',
      'Tông đỏ đô nổi bật, khóa trước; phù hợp chụp tập thể và lễ trao bằng.',
      'unisex',
      'graduation',
      120000,
      clothes([28, 60, 36, 26]),
    ],
    [
      'blackGown',
      'Áo cử nhân đen viền xanh',
      'Áo choàng đen cổ viền xanh, chất vải ít nhăn; phù hợp ảnh chân dung.',
      'unisex',
      'graduation',
      130000,
      clothes([26, 60, 32, 25], [damaged('S', 1)]),
    ],
    [
      'creamBaBa',
      'Áo bà ba kem cổ tròn',
      'Vải đũi tông kem, bộ áo và quần; phù hợp concept đồng quê.',
      'unisex',
      'vintage',
      140000,
      clothes([28, 60, 32, 25]),
    ],
    [
      'brownBaBa',
      'Áo bà ba nâu đất',
      'Bộ bà ba nâu, dáng thoải mái; phối nón lá cho ảnh hoài niệm.',
      'unisex',
      'vintage',
      130000,
      clothes([26, 60, 32, 25], [repair('M', 1)]),
    ],
    [
      'maleShirt',
      'Sơ mi nam trắng học đường',
      'Sơ mi dài tay trắng, cổ cơ bản; phối quần âu hoặc vest.',
      'male',
      'casual',
      70000,
      clothes([20, 40, 32, 20], [repair('M', 2)]),
    ],
    [
      'femaleShirt',
      'Sơ mi nữ trắng cổ sen',
      'Sơ mi tay ngắn cổ sen; phối chân váy cho concept lớp học.',
      'female',
      'casual',
      70000,
      clothes([24, 38, 28, 16]),
    ],
    [
      'plaidSkirt',
      'Chân váy xếp ly caro xanh',
      'Váy caro xanh dài ngang gối, có khóa bên; phối sơ mi trắng.',
      'female',
      'casual',
      90000,
      clothes([22, 36, 24, 12], [damaged('M', 1)]),
    ],
    [
      'conicalHat',
      'Nón lá Huế quai lụa',
      'Nón lá nhẹ, quai lụa trắng; dùng làm đạo cụ cùng áo dài hoặc bà ba.',
      'unisex',
      'accessory',
      30000,
      [{ size: 'FREE', quantity: 120, condition: 'good' }, repair('FREE', 4), damaged('FREE', 2)],
    ],
    [
      'books',
      'Bộ sách đạo cụ bìa cổ điển',
      'Bộ ba sách bìa tông nâu, xanh và kem cho ảnh bàn học, thư viện.',
      'unisex',
      'accessory',
      40000,
      [{ size: 'FREE', quantity: 36, condition: 'good' }, repair('FREE', 1)],
    ],
    [
      'graduationCap',
      'Mũ cử nhân đen tua vàng',
      'Mũ vuông có dây chỉnh, tua vàng; phù hợp các bộ áo cử nhân trong kho.',
      'unisex',
      'accessory',
      35000,
      [{ size: 'FREE', quantity: 150, condition: 'good' }, repair('FREE', 3)],
    ],
  ];
  const costumes = {};
  for (const [key, name, description, gender, type, rentalPrice, inventory] of costumeRows) {
    costumes[key] = await ensure(
      'Costume',
      `costume:${key}`,
      {
        name,
        description,
        gender,
        type: types[type]._id,
        itemKind: type === 'accessory' ? 'accessory' : 'clothing',
        isRentalItem: true,
        rentalPrice,
        inventory,
        createdAt: at('2026-05-04', '08:00'),
      },
      { name },
    );
  }

  const packages = {};
  for (const input of [
    {
      key: 'school',
      name: 'Kỷ yếu Sân trường',
      pricePerMember: 300000,
      duration: 'half_day',
      typeKeys: ['aoDai', 'vest'],
      studentsPerCrew: 15,
      deliveryDays: 5,
      editingScope: 'full',
      description:
        'Một buổi tại trường: ảnh lớp, nhóm bạn và chân dung. Bao gồm trang phục áo dài hoặc vest, chỉnh màu toàn bộ ảnh.',
    },
    {
      key: 'youth',
      name: 'Thanh xuân Ngoại cảnh',
      pricePerMember: 380000,
      duration: 'two_thirds_day',
      typeKeys: ['aoDai', 'vest', 'casual'],
      studentsPerCrew: 15,
      deliveryDays: 7,
      editingScope: 'full',
      isPopular: true,
      description:
        'Một ngày nhẹ nhàng với sân trường và một điểm ngoại cảnh. Có ảnh nhóm, chân dung và bộ ảnh concept học đường.',
    },
    {
      key: 'graduation',
      name: 'Dấu ấn Tốt nghiệp',
      pricePerMember: 450000,
      duration: 'two_thirds_day',
      typeKeys: ['graduation', 'aoDai', 'vest'],
      studentsPerCrew: 12,
      deliveryDays: 7,
      editingScope: 'full',
      description:
        'Chụp với lễ phục cử nhân và trang phục kỷ yếu tại hai bối cảnh. Chỉnh màu toàn bộ, chỉnh da ảnh chân dung chọn lọc.',
    },
    {
      key: 'memory',
      name: 'Miền nhớ Trọn ngày',
      pricePerMember: 550000,
      duration: 'full_day',
      typeKeys: ['aoDai', 'vest', 'vintage'],
      studentsPerCrew: 10,
      deliveryDays: 10,
      editingScope: 'full',
      isPopular: true,
      description:
        'Hai địa điểm trong ngày, ba bộ trang phục và concept hoài niệm. Có ảnh tập thể, nhóm bạn và chân dung cá nhân được chỉnh sửa.',
    },
    {
      key: 'signature',
      name: 'Thanh xuân Signature',
      pricePerMember: 650000,
      duration: 'full_day',
      typeKeys: ['aoDai', 'vest', 'graduation', 'casual'],
      studentsPerCrew: 8,
      deliveryDays: 12,
      editingScope: 'full',
      description:
        'Bộ ảnh trọn ngày với ekip theo nhóm nhỏ, tối đa ba bối cảnh và bốn lựa chọn trang phục. Chỉnh màu toàn bộ và chỉnh chân dung kỹ theo danh sách chọn.',
    },
  ]) {
    const { key, typeKeys, ...fields } = input;
    packages[key] = await ensure(
      'Package',
      `package:${key}`,
      {
        ...fields,
        costumes: typeKeys.map((type) => types[type]._id),
        crewRatio: `1 thợ / ${fields.studentsPerCrew} thành viên`,
        isPopular: fields.isPopular || false,
        createdAt: at('2026-05-03', '16:00'),
      },
      { name: fields.name },
    );
  }

  const categories = {};
  for (const [key, name, type] of [
    ['deposit', 'Đặt cọc', 'income'],
    ['balance', 'Thanh toán còn lại', 'income'],
    ['rentalDeposit', 'Cọc thuê', 'income'],
    ['rentalBalance', 'Thanh toán thuê', 'income'],
    ['rentalRefund', 'Hoàn cọc thuê', 'expense'],
    ['refund', 'Hoàn tiền', 'expense'],
    ['print', 'In ấn / Album', 'expense'],
    ['photographer', 'Nhân sự / Thợ chụp', 'expense'],
    ['equipment', 'Thiết bị / Vật tư', 'expense'],
    ['transport', 'Di chuyển / Hậu cần', 'expense'],
    ['maintenance', 'Giặt ủi / Sửa trang phục', 'expense'],
    ['marketing', 'Truyền thông / Quảng cáo', 'expense'],
    ['office', 'Chi phí văn phòng', 'expense'],
    ['other', 'Khác', 'expense'],
  ]) {
    categories[key] = await ensure(
      'Category',
      `category:${key}`,
      {
        name,
        type,
        isDefault: true,
        createdBy: staff.accountant._id,
        createdAt: at('2026-05-03', '08:00'),
      },
      { name, type },
    );
  }
  return {
    staff: Object.values(staff),
    clients: Object.values(clients),
    seasons: Object.values(seasons),
    types: Object.values(types),
    costumes: Object.values(costumes),
    packages: Object.values(packages),
    categories: Object.values(categories),
    staffByKey: staff,
    clientsByKey: clients,
    seasonsByKey: seasons,
    typesByKey: types,
    costumesByKey: costumes,
    packagesByKey: packages,
    categoriesByKey: categories,
  };
}

module.exports = { seedCatalog };
