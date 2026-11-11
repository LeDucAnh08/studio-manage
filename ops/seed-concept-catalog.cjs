// Populate the local application's concept catalog without resetting existing records.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
process.env.TS_NODE_PROJECT = path.join(root, 'backend/tsconfig.json');
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const Concept = r('../backend/src/models/Concept').default;
const Package = r('../backend/src/models/ConceptPackage').default;
const Profile = r('../backend/src/models/PhotographerProfile').default;
const User = r('../backend/src/models/User').default;
const CostumeType = r('../backend/src/models/CostumeType').default;

const catalog = [
  {
    name: 'Chân dung cá nhân',
    description:
      'Lưu giữ nét riêng qua ánh sáng mềm, phông nền tinh giản và những khoảnh khắc tự nhiên. Ekip hỗ trợ tạo dáng phù hợp với phong cách của bạn.',
    packages: [
      {
        name: 'Chân dung Tự nhiên',
        price: 900000,
        durationMinutes: 60,
        maxPeople: 1,
        retouchQuota: 10,
        costumeCount: 1,
      },
      {
        name: 'Chân dung Nghệ thuật',
        price: 1490000,
        durationMinutes: 90,
        maxPeople: 1,
        retouchQuota: 20,
        costumeCount: 2,
      },
    ],
  },
  {
    name: 'Cặp đôi',
    description:
      'Một buổi hẹn tại studio với những khung hình gần gũi, lãng mạn. Cùng ekip chọn màu sắc và cách kể câu chuyện của hai bạn.',
    packages: [
      {
        name: 'Hẹn hò tại studio',
        price: 1690000,
        durationMinutes: 90,
        maxPeople: 2,
        retouchQuota: 25,
        costumeCount: 2,
      },
    ],
  },
  {
    name: 'Gia đình',
    description:
      'Giữ lại những cái ôm, nụ cười và phút giây quây quần. Không gian ấm áp cùng ekip hỗ trợ tạo dáng cho cả người lớn và trẻ nhỏ.',
    packages: [
      {
        name: 'Khoảnh khắc sum vầy',
        price: 2190000,
        durationMinutes: 90,
        maxPeople: 6,
        retouchQuota: 25,
        costumeCount: 0,
      },
      {
        name: 'Gia đình Trọn vẹn',
        price: 2990000,
        durationMinutes: 120,
        maxPeople: 8,
        retouchQuota: 40,
        costumeCount: 0,
      },
    ],
  },
  {
    name: 'Áo dài',
    description:
      'Tôn nét duyên Việt với áo dài lụa, ánh sáng dịu và bối cảnh thanh nhã. Tư vấn phối màu và tạo dáng trước buổi chụp.',
    packages: [
      {
        name: 'Áo dài Thanh lịch',
        price: 1290000,
        durationMinutes: 90,
        maxPeople: 1,
        retouchQuota: 20,
        costumeCount: 2,
      },
    ],
  },
];
const specialties = [
  {
    concepts: [0, 3],
    bio: 'Chân dung và áo dài với ánh sáng mềm, đường nét thanh thoát. Hướng dẫn tạo dáng nhẹ nhàng để bạn tự tin trước ống kính.',
  },
  {
    concepts: [0, 1],
    bio: 'Ưu tiên cảm xúc tự nhiên trong ảnh chân dung và cặp đôi. Phối màu tinh giản, chú trọng sự gần gũi trong từng khung hình.',
  },
  {
    concepts: [1, 2],
    bio: 'Chụp cặp đôi và gia đình theo phong cách ấm áp. Kiên nhẫn làm việc với trẻ nhỏ và lưu giữ những khoảnh khắc đời thường.',
  },
  {
    concepts: [2, 3],
    bio: 'Ảnh gia đình và áo dài với bố cục chỉn chu, màu sắc dịu. Đồng hành cùng khách trong việc phối trang phục và tạo dáng.',
  },
];

const photo = (file, caption = '') => ({ url: `/images/concepts/${file}.webp`, caption });
const content = {
  'Chân dung cá nhân': {
    styleSummary: 'Ánh sáng mềm · Tông màu ấm · Tạo dáng tự nhiên',
    coverUrl: photo('portrait-01').url,
    story:
      'Lấy cảm hứng từ những khoảnh khắc đời thường, concept tập trung vào ánh mắt, nụ cười và cảm xúc của bạn. Ánh sáng cửa sổ, phông nền kem và màu sắc trung tính tạo nên những khung hình gần gũi.\n\nEkip cùng bạn trao đổi ý tưởng, chọn góc chụp và hướng dẫn tạo dáng phù hợp. Bạn không cần có kinh nghiệm trước ống kính.',
    audience: 'Chân dung cá nhân, sinh nhật và những dấu mốc riêng.',
    setting: 'Studio, góc cửa sổ và phông nền trung tính.',
    wardrobeGuidance: 'Trắng, kem hoặc màu trung tính; phụ kiện tối giản.',
    preparation:
      'Chọn trang phục theo tông màu bạn yêu thích, chuẩn bị phụ kiện đơn giản và gửi trước những ảnh tham khảo để ekip hiểu mong muốn của bạn.',
    gallery: [
      'Chân dung cận',
      'Ánh sáng cửa sổ',
      'Góc nghiêng',
      'Tạo dáng tự nhiên',
      'Nét riêng',
      'Khoảnh khắc tự nhiên',
      'Góc nhìn dịu dàng',
      'Nụ cười của bạn',
    ].map((caption, index) => photo(`portrait-${String(index + 1).padStart(2, '0')}`, caption)),
  },
  'Cặp đôi': {
    styleSummary: 'Cảm xúc tự nhiên · Tông màu ấm · Không gian gần gũi',
    coverUrl: photo('couple-cover').url,
    story:
      'Một buổi hẹn dành cho hai người, nơi những cái nắm tay và ánh nhìn quen thuộc trở thành câu chuyện bằng ảnh. Ekip gợi ý tương tác nhẹ nhàng thay cho những tư thế gò bó.\n\nTông màu ấm và bối cảnh tinh giản giúp giữ sự chú ý vào cảm xúc của hai bạn.',
    audience: 'Kỷ niệm ngày yêu, sinh nhật hoặc một buổi hẹn đặc biệt.',
    setting: 'Studio ánh sáng mềm, phông nền trung tính và góc ngồi ấm áp.',
    wardrobeGuidance: 'Trang phục đồng điệu về màu sắc, thoải mái khi tương tác.',
    preparation:
      'Cùng chọn bảng màu trang phục và chia sẻ những khoảnh khắc hoặc câu chuyện hai bạn muốn lưu giữ.',
    gallery: [
      photo('couple-cover', 'Bên nhau'),
      photo('couple-02', 'Một buổi hẹn'),
      photo('couple-03', 'Khoảnh khắc tự nhiên'),
    ],
  },
  'Gia đình': {
    styleSummary: 'Khoảnh khắc quây quần · Ánh sáng dịu · Màu sắc ấm áp',
    coverUrl: photo('family-cover').url,
    story:
      'Lưu giữ những cái ôm và nụ cười qua bộ ảnh gia đình ấm áp. Ekip hỗ trợ bố cục cho từng nhóm thành viên, xen kẽ ảnh cả nhà và những tương tác tự nhiên.\n\nBuổi chụp được sắp xếp nhẹ nhàng để người lớn và các bé đều cảm thấy thoải mái.',
    audience: 'Gia đình nhỏ, gia đình nhiều thế hệ và những dịp sum họp.',
    setting: 'Studio tông màu sáng, ghế ngồi và phông nền nhẹ nhàng.',
    wardrobeGuidance: 'Trang phục cá nhân đồng điệu, ưu tiên màu sáng và ít họa tiết.',
    preparation:
      'Chuẩn bị trang phục cho các thành viên, đồ dùng quen thuộc cho bé và trao đổi trước nhu cầu của người lớn tuổi.',
    gallery: [
      photo('family-cover', 'Nhà là nơi có nhau'),
      photo('family-02', 'Vòng tay gia đình'),
      photo('family-03', 'Nụ cười của bé'),
      photo('family-full-cover', 'Khoảnh khắc sum họp'),
    ],
  },
  'Áo dài': {
    styleSummary: 'Đường nét thanh thoát · Tông màu dịu · Nét duyên Việt',
    coverUrl: photo('aodai-cover').url,
    story:
      'Concept áo dài tôn nét duyên Việt bằng ánh sáng dịu, tông màu thanh nhã và những dáng chụp mềm mại. Từng khung hình chú trọng đường nét áo dài và thần thái riêng của bạn.\n\nEkip tư vấn cách phối màu, chọn phụ kiện và hướng dẫn tạo dáng trong suốt buổi chụp.',
    audience: 'Chân dung áo dài, sinh nhật, kỷ niệm và bộ ảnh lưu giữ nét truyền thống.',
    setting: 'Studio ánh sáng tự nhiên, phông nền kem và hoa trang trí nhẹ.',
    wardrobeGuidance: 'Áo dài tông pastel, phụ kiện nhỏ và trang phục lót phù hợp.',
    preparation:
      'Chọn size áo dài và bảng màu bạn yêu thích, chuẩn bị phụ kiện đơn giản để trao đổi cùng ekip.',
    gallery: [
      photo('aodai-cover', 'Nét duyên Việt'),
      photo('aodai-02', 'Thanh lịch'),
      photo('aodai-03', 'Một thoáng dịu dàng'),
    ],
  },
};
const packageImages = {
  'Chân dung Tự nhiên': photo('portrait-01').url,
  'Chân dung Nghệ thuật': photo('portrait-artistic').url,
  'Hẹn hò tại studio': photo('couple-cover').url,
  'Khoảnh khắc sum vầy': photo('family-cover').url,
  'Gia đình Trọn vẹn': photo('family-full-cover').url,
  'Áo dài Thanh lịch': photo('aodai-cover').url,
};
const packageDecor = {
  'Chân dung Tự nhiên': {
    backdrop: 'Phông kem và góc cửa sổ với ánh sáng mềm, tông màu ấm.',
    props: 'Ghế gỗ, vải nền trung tính và cây lá trang trí nhẹ.',
    layout: 'Bố trí góc ngồi gần cửa sổ và khoảng nền trơn để chụp cận, bán thân.',
    included:
      'Một set decor studio với phông nền và đạo cụ nêu trên, sử dụng trong thời lượng gói.',
  },
  'Chân dung Nghệ thuật': {
    backdrop: 'Phông xám đậm kết hợp nền trung tính, ánh sáng tạo khối.',
    props: 'Ghế thấp, vải nền và phụ kiện cầm tay tối giản.',
    layout: 'Hai cách bố trí ánh sáng trên nền sáng và tối để thay đổi sắc thái chân dung.',
    included:
      'Decor studio theo phong cách nghệ thuật và thay đổi bố trí ánh sáng trong buổi chụp.',
  },
  'Hẹn hò tại studio': {
    backdrop: 'Phông be ấm và góc rèm sáng, tạo cảm giác gần gũi.',
    props: 'Ghế đôi, ghế gỗ và vải trang trí tông trung tính.',
    layout: 'Góc ngồi cạnh nhau kết hợp khoảng nền thoáng cho những tương tác tự nhiên.',
    included: 'Một set decor cặp đôi với các góc đứng và ngồi, đạo cụ sử dụng theo set.',
  },
  'Khoảnh khắc sum vầy': {
    backdrop: 'Phông kem sáng, bố cục ấm áp cho gia đình nhỏ.',
    props: 'Ghế ngồi gia đình, ghế thấp cho bé và gối tựa trung tính.',
    layout: 'Sắp xếp chỗ ngồi cho cả nhà, có khoảng trống để chụp tương tác cùng bé.',
    included: 'Một set decor gia đình, phông nền và đạo cụ hỗ trợ ảnh cả nhà lẫn nhóm nhỏ.',
  },
  'Gia đình Trọn vẹn': {
    backdrop: 'Phông studio sáng rộng, tông màu kem và gỗ tự nhiên.',
    props: 'Ghế ngồi nhiều độ cao, ghế dài và gối tựa cho các thế hệ.',
    layout: 'Bố trí ảnh đại gia đình, sau đó điều chỉnh chỗ ngồi để chụp từng nhóm thành viên.',
    included:
      'Set decor gia đình nhiều thế hệ, có điều chỉnh bố cục cho các nhóm trong cùng buổi chụp.',
  },
  'Áo dài Thanh lịch': {
    backdrop: 'Phông kem, rèm sáng và hoa trang trí nhẹ theo tông pastel.',
    props: 'Ghế gỗ, cành hoa và bó hoa nhỏ đồng điệu với áo dài.',
    layout: 'Góc chụp toàn thân thoáng, kết hợp góc hoa và ánh sáng cửa sổ để chụp chân dung.',
    included: 'Một set decor áo dài với hoa và đạo cụ nêu trên, phối màu theo phong cách của gói.',
  },
};

const packageIntroductions = {
  'Chân dung Tự nhiên':
    'Một bộ ảnh nhẹ nhàng, mang đúng nét riêng của bạn. Phông kem và ánh sáng mềm tạo không gian thoải mái để lưu lại những biểu cảm tự nhiên, từ nụ cười đến một góc nghiêng bạn yêu thích.',
  'Chân dung Nghệ thuật':
    'Để cá tính của bạn kể câu chuyện qua ánh sáng. Những mảng sáng tối và bố cục tinh giản tạo nên bộ chân dung có chiều sâu, tập trung vào đường nét và cảm xúc riêng.',
  'Hẹn hò tại studio':
    'Dành một buổi hẹn để lưu lại câu chuyện của hai bạn. Những cái nắm tay, ánh nhìn và tiếng cười được đặt trong không gian ấm áp, gần gũi và đồng điệu.',
  'Khoảnh khắc sum vầy':
    'Giữ lại những điều bình dị mà quý giá: một cái ôm, nụ cười của bé, phút giây cả nhà ở bên nhau. Buổi chụp dành chỗ cho sự tương tác tự nhiên và nét riêng của từng thành viên.',
  'Gia đình Trọn vẹn':
    'Một khung hình, nhiều thế hệ và thật nhiều yêu thương. Không gian rộng cùng những bố cục nhóm linh hoạt giúp cả nhà có những bức ảnh chung và những khoảnh khắc gần gũi bên nhau.',
  'Áo dài Thanh lịch':
    'Lưu nét duyên Việt theo cách nhẹ nhàng và tinh tế. Tà áo, ánh sáng dịu và sắc hoa thanh nhã cùng tôn lên thần thái, từ dáng toàn thân đến từng góc chân dung.',
};
const packageShowcases = {
  'Chân dung Tự nhiên': {
    description:
      'Ánh sáng cửa sổ và màu kem ấm làm nổi bật biểu cảm tự nhiên. Hai góc chụp tham khảo để bạn hình dung tinh thần của bộ ảnh.',
    images: [
      { url: '/images/concepts/portrait-02.webp', caption: 'Dáng ngồi thoải mái, ánh sáng mềm' },
      {
        url: '/images/concepts/portrait-06.webp',
        caption: 'Góc chân dung gần, tập trung vào biểu cảm',
      },
    ],
  },
  'Chân dung Nghệ thuật': {
    description:
      'Tham khảo cách ánh sáng định hình đường nét, với nền tối và trang phục tinh giản để cảm xúc trở thành điểm nhấn.',
    images: [
      {
        url: '/images/concepts/portrait-artistic.webp',
        caption: 'Ánh sáng có chủ đích và tông màu trầm',
      },
    ],
  },
  'Hẹn hò tại studio': {
    description:
      'Sắc màu trung tính giúp hai bạn trở thành tâm điểm. Những khung hình tham khảo khai thác tương tác và khoảng cách gần gũi.',
    images: [
      { url: '/images/concepts/couple-02.webp', caption: 'Một góc ngồi gần gũi của hai người' },
      { url: '/images/concepts/couple-03.webp', caption: 'Những cái ôm và nụ cười tự nhiên' },
    ],
  },
  'Khoảnh khắc sum vầy': {
    description:
      'Bố cục gắn kết và ánh sáng ấm tạo cảm giác thân thuộc. Tham khảo những góc chụp cả nhà cùng tương tác thay vì chỉ nhìn vào máy ảnh.',
    images: [
      {
        url: '/images/concepts/family-cover.webp',
        caption: 'Cả nhà trong cùng một khung hình ấm áp',
      },
      { url: '/images/concepts/family-02.webp', caption: 'Khoảnh khắc gần gũi giữa bố mẹ và bé' },
    ],
  },
  'Gia đình Trọn vẹn': {
    description:
      'Gợi ý bố cục cho một bộ ảnh gia đình: khung hình chung nhiều thế hệ và những góc chụp nhóm nhỏ, giữ sự đồng điệu về màu sắc.',
    images: [
      {
        url: '/images/concepts/family-full-cover.webp',
        caption: 'Bố cục chung cho gia đình nhiều thế hệ',
      },
      {
        url: '/images/concepts/family-02.webp',
        caption: 'Gợi ý góc chụp riêng của một gia đình nhỏ',
      },
    ],
  },
  'Áo dài Thanh lịch': {
    description:
      'Tham khảo cách phối áo dài cùng hoa và nền sáng. Tư thế nhẹ nhàng giúp tà áo và đường nét có khoảng thở trong khung hình.',
    images: [
      { url: '/images/concepts/aodai-cover.webp', caption: 'Áo dài và bối cảnh thanh nhã' },
      {
        url: '/images/concepts/aodai-02.webp',
        caption: 'Góc chân dung tôn thần thái và chi tiết áo',
      },
    ],
  },
};

async function main() {
  assert.ok(
    process.argv.slice(2).every((arg) => arg === '--apply'),
    'Usage: node ops/seed-concept-catalog.cjs [--apply]',
  );
  const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  const uri = require('./mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    assert.equal(mongoose.connection.name, 'studio_db');
    const photographers = await User.find({ roles: 3, isActive: true }).sort({ name: 1 }).limit(4);
    assert.equal(photographers.length, 4, 'Need four existing active photographers.');
    const aoDai = await CostumeType.findOne({ name: /^Áo dài/ });
    const vest = await CostumeType.findOne({ name: /^Vest/ });
    assert.ok(aoDai && vest, 'Need the existing áo dài and vest categories.');
    assert.ok(
      !/\b(seed|demo|sandbox)\b|dữ liệu mẫu|thử nghiệm/i.test(
        JSON.stringify({ catalog, specialties }),
      ),
    );
    if (!process.argv.includes('--apply')) {
      console.log(
        JSON.stringify(
          {
            concepts: catalog.map((c) => c.name),
            packages: catalog.flatMap((c) => c.packages.map((p) => p.name)),
            photographers: photographers.map((p) => p.name),
            apply: false,
          },
          null,
          2,
        ),
      );
      return;
    }
    const concepts = [];
    for (const item of catalog) {
      const concept = await Concept.findOneAndUpdate(
        { name: item.name },
        {
          $setOnInsert: { name: item.name, description: item.description, active: true },
        },
        { upsert: true, new: true },
      );
      for (const [field, value] of Object.entries(content[item.name])) {
        const current = concept.get(field);
        if (!current || (Array.isArray(current) && !current.length)) concept.set(field, value);
      }
      if (concept.isModified()) await concept.save();
      concepts.push(concept);
      for (const pkg of item.packages) {
        await Package.updateOne(
          { concept: concept._id, name: pkg.name },
          {
            $setOnInsert: {
              ...pkg,
              concept: concept._id,
              active: true,
              extraPhotoPrice: 70000,
              costumeTypes: pkg.costumeCount
                ? item.name === 'Áo dài'
                  ? [aoDai._id]
                  : [aoDai._id, vest._id]
                : [],
            },
          },
          { upsert: true },
        );
        await Package.updateOne(
          {
            concept: concept._id,
            name: pkg.name,
            $or: [{ imageUrl: { $exists: false } }, { imageUrl: '' }],
          },
          { $set: { imageUrl: packageImages[pkg.name] } },
        );
        const saved = await Package.findOne({ concept: concept._id, name: pkg.name });
        const decor = Object.fromEntries(
          Object.entries(packageDecor[pkg.name])
            .filter(([field]) => !saved.decor?.[field]?.trim())
            .map(([field, value]) => [`decor.${field}`, value]),
        );
        const updates = { ...decor };
        if (!saved.introduction?.trim()) updates.introduction = packageIntroductions[pkg.name];
        if (!saved.studioSupport?.length)
          updates.studioSupport = [
            {
              title: 'Tự tin trước ống kính',
              description:
                'Photographer hướng dẫn cách đứng, đặt tay và biểu cảm để bạn thoải mái trong buổi chụp.',
            },
            {
              title: 'Phong cách đồng điệu',
              description: pkg.costumeCount
                ? 'Tham khảo gợi ý trang phục của concept và chọn trang phục trong danh mục gói để phối hợp cùng bối cảnh.'
                : 'Gợi ý phối màu trang phục cá nhân để các thành viên hài hòa trong cùng khung hình.',
            },
            { title: 'Bối cảnh được chuẩn bị', description: packageDecor[pkg.name].included },
            {
              title: 'Cùng hoàn thiện bộ ảnh',
              description:
                'Chọn ảnh và gửi ghi chú qua album riêng; hai vòng góp ý chỉnh sửa miễn phí theo quy trình của gói.',
            },
          ];
        for (const [field, value] of Object.entries({
          timeline:
            'Studio xác nhận thời gian giao ảnh sau khi bạn chốt danh sách ảnh cần chỉnh sửa.',
          format: 'Ảnh kỹ thuật số, xem và tải về qua album riêng của bạn.',
          originals: 'Trao đổi với studio trước buổi chụp nếu bạn có nhu cầu nhận thêm ảnh gốc.',
        }))
          if (!saved.delivery?.[field]?.trim()) updates[`delivery.${field}`] = value;
        if (!saved.showcase?.images?.length) {
          updates['showcase.images'] = packageShowcases[pkg.name].images;
          if (!saved.showcase?.title?.trim()) updates['showcase.title'] = 'Phong cách bộ ảnh';
          if (!saved.showcase?.description?.trim())
            updates['showcase.description'] = packageShowcases[pkg.name].description;
        }
        if (Object.keys(updates).length)
          await Package.updateOne(
            { _id: saved._id, version: saved.version },
            { $set: updates, $inc: { version: 1 } },
          );
      }
    }
    for (const [index, photographer] of photographers.entries()) {
      const specialty = specialties[index];
      await Profile.updateOne(
        { photographer: photographer._id },
        {
          $setOnInsert: {
            photographer: photographer._id,
            concepts: specialty.concepts.map((i) => concepts[i]._id),
            bio: specialty.bio,
            published: true,
            portfolio: [],
          },
        },
        { upsert: true },
      );
    }
    const packages = await Package.find({ concept: { $in: concepts.map((c) => c._id) } }).lean();
    assert.equal(
      packages.filter((p) =>
        catalog.some((c) => c.packages.some((sample) => sample.name === p.name)),
      ).length,
      6,
    );
    console.log(
      JSON.stringify(
        {
          database: mongoose.connection.name,
          concepts: concepts.map((c) => c.name),
          packages: packages.length,
          photographers: photographers.map((p) => p.name),
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error(
    error.name?.startsWith('Mongo') ? 'Local database operation failed.' : error.message,
  );
  process.exitCode = 1;
});
