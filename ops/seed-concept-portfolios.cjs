// Enrich existing local studio profiles without resetting users, bookings or edited content.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
process.env.TS_NODE_PROJECT = path.join(root, 'backend/tsconfig.json');
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const User = r('../backend/src/models/User').default;
const Concept = r('../backend/src/models/Concept').default;
const Profile = r('../backend/src/models/PhotographerProfile').default;
const item = (title, description) => ({ title, description });
const work = (concept, file, caption) => ({
  concept,
  url: `/images/concepts/${file}.webp`,
  caption,
  permitted: true,
});
const records = [
  {
    name: 'Lê Minh Đức',
    portraitUrl: '/images/concepts/photographer-minh-duc.webp',
    coverUrl: '/images/concepts/portrait-01.webp',
    title: 'Nhiếp ảnh gia chân dung & áo dài',
    tagline: 'Giữ nét riêng của bạn trong từng khung hình.',
    story:
      'Tôi yêu những bức ảnh có ánh sáng mềm, đường nét thanh thoát và biểu cảm tự nhiên. Một góc nghiêng, một cử chỉ nhỏ hay cách bạn mỉm cười đều có thể trở thành điểm bắt đầu cho một bức chân dung.\n\nTrong buổi chụp, tôi hướng dẫn từng dáng đứng và vị trí đặt tay, rồi điều chỉnh theo sự thoải mái của bạn. Tôi muốn bạn nhìn thấy chính mình trong bộ ảnh và cảm thấy dễ chịu khi đứng trước máy ảnh.',
    specialty: 'Chân dung cá nhân · Áo dài',
    style: 'Ánh sáng mềm · Tông màu dịu · Đường nét thanh thoát',
    guidance: 'Nhẹ nhàng, rõ ràng, theo nhịp của bạn',
    philosophy:
      'Tôi chú trọng đường nét và biểu cảm riêng của người được chụp. Bố cục tinh giản, màu sắc vừa đủ và ánh sáng dịu giúp bạn trở thành điểm nhấn của khung hình.',
    approach: [
      item(
        'Trao đổi phong cách trước buổi chụp',
        'Cùng chọn tông trang phục và những góc ảnh bạn yêu thích để buổi chụp có một tinh thần thống nhất.',
      ),
      item(
        'Làm quen từ những dáng đơn giản',
        'Bắt đầu bằng dáng ngồi, cách đặt tay và ánh nhìn để bạn tự tin hơn trước ống kính.',
      ),
      item(
        'Điều chỉnh ánh sáng theo bạn',
        'Thay đổi góc chụp và hướng sáng để tôn gương mặt, giữ biểu cảm gần gũi và tự nhiên.',
      ),
    ],
    audience: [
      item('Lần đầu chụp studio', 'Muốn được hướng dẫn cụ thể, dễ theo.'),
      item('Thích chân dung nhẹ nhàng', 'Ưu tiên sự tự nhiên và gần gũi.'),
      item('Yêu áo dài thanh lịch', 'Tôn nét dịu dàng và đường nét riêng.'),
    ],
    portfolio: [
      work(
        'Chân dung cá nhân',
        'portrait-01',
        'Ánh sáng mềm bên gương mặt, giữ nụ cười và nét riêng.',
      ),
      work('Áo dài', 'aodai-cover', 'Áo dài hồng trên nền sáng, điểm hoa vừa đủ để tôn thần thái.'),
      work(
        'Chân dung cá nhân',
        'portrait-06',
        'Một cử chỉ tựa tay nhẹ nhàng giúp biểu cảm trở nên gần gũi.',
      ),
      work('Áo dài', 'aodai-02', 'Góc toàn thân dành khoảng thở cho tà áo và dáng đứng.'),
      work(
        'Chân dung cá nhân',
        'portrait-03',
        'Góc nghiêng theo ánh sáng cửa sổ, tập trung vào đường nét.',
      ),
      work('Áo dài', 'aodai-03', 'Góc ba phần tư và sắc hoa dịu tạo một khung hình thanh nhã.'),
    ],
  },
  {
    name: 'Nguyễn Gia Bảo',
    portraitUrl: '/images/concepts/photographer-gia-bao.webp',
    coverUrl: '/images/concepts/couple-03.webp',
    title: 'Nhiếp ảnh gia chân dung & cặp đôi',
    tagline: 'Tôi thích khoảnh khắc bạn quên mất máy ảnh.',
    story:
      'Tôi thường bắt đầu buổi chụp bằng một cuộc trò chuyện. Khi bạn nói về điều mình thích, nhìn người bên cạnh hay bật cười vì một câu chuyện nhỏ, những khung hình có cảm xúc sẽ xuất hiện.\n\nVới chân dung và cặp đôi, tôi ưu tiên sự tương tác. Một cái nắm tay hay ánh nhìn thoáng qua có thể kể được nhiều điều. Tôi hướng dẫn bằng những chuyển động đơn giản để bạn có không gian là chính mình.',
    specialty: 'Chân dung tự nhiên · Cặp đôi',
    style: 'Tông ấm · Chuyển động nhẹ · Cảm xúc gần gũi',
    guidance: 'Trò chuyện, gợi tình huống và bắt lấy tương tác',
    philosophy:
      'Tôi thích một bộ ảnh có nhịp điệu: lúc trò chuyện, lúc yên lặng, lúc cười thật thoải mái. Màu sắc tinh giản giúp cảm xúc và sự gắn kết được giữ ở trung tâm.',
    approach: [
      item(
        'Bắt đầu bằng câu chuyện của bạn',
        'Trao đổi về những điều khiến bạn thấy thoải mái và tinh thần muốn giữ lại trong bộ ảnh.',
      ),
      item(
        'Tạo chuyển động nhỏ',
        'Thử bước chậm, ngồi gần nhau hoặc kể một chuyện vui để biểu cảm đến tự nhiên.',
      ),
      item(
        'Theo nhịp tương tác',
        'Điều chỉnh góc chụp khi cảm xúc xuất hiện, đồng thời hướng dẫn để hai bạn thấy dễ chịu.',
      ),
    ],
    audience: [
      item('Ngại tạo dáng', 'Thích trò chuyện và chuyển động nhẹ.'),
      item('Muốn lưu câu chuyện hai người', 'Ưu tiên ánh nhìn, cái ôm và sự kết nối.'),
      item('Thích màu ảnh ấm', 'Tìm cảm giác đời thường, gần gũi.'),
    ],
    portfolio: [
      work(
        'Chân dung cá nhân',
        'portrait-08',
        'Giữ lại nụ cười thoải mái giữa những lần trò chuyện.',
      ),
      work('Cặp đôi', 'couple-03', 'Cái ôm và tiếng cười là điểm bắt đầu của khung hình.'),
      work(
        'Chân dung cá nhân',
        'portrait-05',
        'Chuyển động tay và ánh nhìn giúp chân dung bớt gò bó.',
      ),
      work('Cặp đôi', 'couple-02', 'Khoảng cách gần và một ánh nhìn kể câu chuyện của hai người.'),
      work('Chân dung cá nhân', 'portrait-02', 'Dáng ngồi thoải mái trên nền màu trung tính.'),
      work(
        'Cặp đôi',
        'couple-cover',
        'Trang phục đồng điệu để cảm xúc của hai bạn trở thành điểm nhấn.',
      ),
    ],
  },
  {
    name: 'Phạm Minh Quân',
    portraitUrl: '/images/concepts/photographer-minh-quan.webp',
    coverUrl: '/images/concepts/family-02.webp',
    title: 'Nhiếp ảnh gia gia đình & cặp đôi',
    tagline: 'Giữ lại những điều bình dị của cả nhà.',
    story:
      'Tôi chú ý đến những cử chỉ nhỏ giữa các thành viên: cách bố mẹ ôm bé, lúc cả nhà cùng bật cười hay một cái tựa vai rất quen. Đó là những điều tôi muốn giữ lại trong ảnh gia đình.\n\nTôi dành thời gian để mọi người làm quen với không gian và máy ảnh. Với trẻ nhỏ, buổi chụp cần sự kiên nhẫn và những khoảng nghỉ phù hợp. Tôi hướng dẫn bố cục, đồng thời dành chỗ cho những tương tác đời thường.',
    specialty: 'Gia đình · Cặp đôi · Tương tác với trẻ nhỏ',
    style: 'Ánh sáng ấm · Bố cục gắn kết · Khoảnh khắc đời thường',
    guidance: 'Kiên nhẫn, linh hoạt và ưu tiên sự thoải mái của cả nhà',
    philosophy:
      'Một bộ ảnh gia đình có ý nghĩa khi mỗi thành viên thấy mình được hiện diện. Tôi kết hợp khung hình chung chỉn chu với những góc nhỏ gần gũi để bộ ảnh có sự tự nhiên và gắn kết.',
    approach: [
      item(
        'Làm quen cùng cả nhà',
        'Trao đổi cách xưng hô và mong muốn của từng nhóm để việc hướng dẫn dễ hiểu, thoải mái.',
      ),
      item(
        'Để những tương tác diễn ra',
        'Gợi ý trò chuyện, ôm bé hay ngồi gần nhau để có những khoảnh khắc quen thuộc.',
      ),
      item(
        'Chụp linh hoạt theo nhịp của bé',
        'Điều chỉnh thứ tự khung hình và xen kẽ các góc chụp phù hợp với sự hợp tác của trẻ.',
      ),
    ],
    audience: [
      item('Gia đình có trẻ nhỏ', 'Cần sự kiên nhẫn và hướng dẫn nhẹ nhàng.'),
      item('Thích ảnh quây quần', 'Muốn lưu cái ôm và tương tác thân thuộc.'),
      item('Cặp đôi yêu sự giản dị', 'Ưu tiên cảm xúc và câu chuyện thường ngày.'),
    ],
    portfolio: [
      work('Gia đình', 'family-02', 'Một cái ôm gần gũi giữ cả nhà trong cùng một nhịp cảm xúc.'),
      work('Cặp đôi', 'couple-02', 'Khoảnh khắc ngồi cạnh và nhìn nhau thật tự nhiên.'),
      work(
        'Gia đình',
        'family-03',
        'Góc chụp gần dành cho biểu cảm của bé và sự âu yếm của bố mẹ.',
      ),
      work('Cặp đôi', 'couple-03', 'Nụ cười từ một tương tác nhỏ giữa hai người.'),
      work(
        'Gia đình',
        'family-cover',
        'Bố cục gắn kết để từng thành viên đều có vị trí trong khung hình.',
      ),
      work('Cặp đôi', 'couple-cover', 'Sắc màu nhẹ và sự gần gũi trong một buổi hẹn tại studio.'),
    ],
  },
  {
    name: 'Trần Anh Khoa',
    portraitUrl: '/images/concepts/photographer-anh-khoa.webp',
    coverUrl: '/images/concepts/family-full-cover.webp',
    title: 'Nhiếp ảnh gia gia đình & áo dài',
    tagline: 'Chỉn chu trong bố cục, gần gũi trong cảm xúc.',
    story:
      'Tôi thích cảm giác hài hòa khi các thành viên đứng trong cùng một khung hình: màu trang phục, vị trí và hướng nhìn cùng tạo nên một tổng thể gắn kết. Sự chuẩn bị ấy giúp mọi người bước vào buổi chụp một cách nhẹ nhàng hơn.\n\nVới áo dài, tôi chú trọng dáng đứng và khoảng thở của tà áo. Với gia đình, tôi sắp xếp những khung hình chung và các nhóm nhỏ để ai cũng có khoảnh khắc riêng. Tôi hướng dẫn rõ ràng và điều chỉnh đến khi mọi người thấy thoải mái.',
    specialty: 'Gia đình nhiều thế hệ · Áo dài',
    style: 'Bố cục cân bằng · Màu sắc hài hòa · Đường nét chỉn chu',
    guidance: 'Chuẩn bị bố cục trước, hướng dẫn rõ và điều chỉnh từng nhóm',
    philosophy:
      'Sự chỉn chu bắt đầu từ những chi tiết nhỏ: vị trí bàn tay, khoảng cách giữa các thành viên, đường tà áo và màu nền. Tôi muốn sự chuẩn bị đó giúp cảm xúc của người được chụp hiện lên rõ hơn.',
    approach: [
      item(
        'Thống nhất màu sắc và bố cục',
        'Cùng trao đổi trang phục, nhóm thành viên và những khung hình quan trọng trước buổi chụp.',
      ),
      item(
        'Hướng dẫn cụ thể, dễ theo',
        'Sắp xếp vị trí và chỉnh từng tư thế để cả nhóm hiểu điều cần làm.',
      ),
      item(
        'Kết hợp ảnh chung và ảnh riêng',
        'Chuyển từ toàn gia đình sang từng nhóm nhỏ, dành khoảng thời gian cho chân dung và chi tiết.',
      ),
    ],
    audience: [
      item('Gia đình nhiều thế hệ', 'Muốn khung hình chung cân đối, trang trọng.'),
      item('Yêu áo dài thanh lịch', 'Chú trọng dáng đứng và chi tiết tà áo.'),
      item('Thích sự chuẩn bị kỹ', 'Cần hướng dẫn rõ và bố cục đồng nhất.'),
    ],
    portfolio: [
      work(
        'Gia đình',
        'family-full-cover',
        'Sắp xếp nhiều thế hệ theo bố cục cân bằng và màu sắc hài hòa.',
      ),
      work('Áo dài', 'aodai-02', 'Dáng toàn thân thoáng để đường tà áo hiện lên rõ ràng.'),
      work(
        'Gia đình',
        'family-cover',
        'Khoảng cách và vị trí ngồi tạo cảm giác gần gũi cho cả nhà.',
      ),
      work('Áo dài', 'aodai-03', 'Góc nghiêng nhẹ, hướng tay và sắc hoa được phối đồng điệu.'),
      work('Gia đình', 'family-02', 'Từ bố cục chung đến những nhóm nhỏ thân mật.'),
      work('Áo dài', 'aodai-cover', 'Nền màu dịu và khoảng thở quanh chủ thể tạo vẻ thanh nhã.'),
    ],
  },
];
async function main() {
  assert.ok(process.argv.slice(2).every((arg) => arg === '--apply'));
  assert.ok(!/\b(seed|demo|sandbox)\b|dữ liệu mẫu/i.test(JSON.stringify(records)));
  for (const record of records)
    for (const url of [record.portraitUrl, record.coverUrl, ...record.portfolio.map((p) => p.url)])
      assert.ok(fs.existsSync(path.join(root, 'frontend/public', url)), 'Missing image: ' + url);
  const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  await mongoose.connect(require('./mongodb-windows.cjs').validateNativeUri(env.MONGO_URI), {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    assert.equal(mongoose.connection.name, 'studio_db');
    const results = [];
    for (const record of records) {
      const actor = await User.findOne({ name: record.name, roles: 3, isActive: true });
      assert.ok(actor, 'Missing photographer: ' + record.name);
      const profile = await Profile.findOne({ photographer: actor._id });
      assert.ok(profile, 'Create the existing concept catalog first.');
      const concepts = await Concept.find({ _id: { $in: profile.concepts }, active: true });
      const { name, portfolio, ...content } = record;
      const updates = Object.fromEntries(
        Object.entries(content).filter(([key, value]) =>
          Array.isArray(value) ? !profile[key]?.length : !profile[key]?.trim(),
        ),
      );
      if (!profile.portfolio.length)
        updates.portfolio = portfolio
          .map((photo) => ({
            ...photo,
            concept: concepts.find((c) => c.name === photo.concept)?._id,
          }))
          .filter((p) => p.concept);
      if (process.argv.includes('--apply') && Object.keys(updates).length)
        await Profile.updateOne({ _id: profile._id }, { $set: updates });
      results.push({
        name,
        changedFields: Object.keys(updates),
        photos: updates.portfolio?.length || profile.portfolio.length,
      });
    }
    console.log(
      JSON.stringify({ apply: process.argv.includes('--apply'), profiles: results }, null, 2),
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
