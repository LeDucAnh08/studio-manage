// Seed package detail sections in the local Windows application DB.
// Dry run by default. Existing nonempty fields and all other package data are preserved.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const backendRequire = createRequire(path.join(root, 'backend/package.json'));
const dotenv = backendRequire('dotenv');
const mongoose = backendRequire('mongoose');
const { validateNativeUri } = require('./mongodb-windows.cjs');

const samples = {
  'Kỷ yếu Sân trường': { photos: 10, hours: 4, concepts: 2, locations: '1 địa điểm: sân trường' },
  'Thanh xuân Ngoại cảnh': {
    photos: 15,
    hours: 6,
    concepts: 3,
    locations: '2 địa điểm: sân trường và một điểm ngoại cảnh',
  },
  'Dấu ấn Tốt nghiệp': {
    photos: 20,
    hours: 6,
    concepts: 3,
    locations: '2 địa điểm: sân trường và một điểm chụp tốt nghiệp',
  },
  'Miền nhớ Trọn ngày': {
    photos: 25,
    hours: 8,
    concepts: 4,
    locations: '2 địa điểm trong lịch trình đã thống nhất',
  },
  'Thanh xuân Signature': {
    photos: 30,
    hours: 10,
    concepts: 5,
    locations: '3 địa điểm theo concept riêng của lớp',
  },
};

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) {
    throw new Error('Usage: node ops/seed-package-content.cjs [--apply]');
  }
  const apply = process.argv.includes('--apply');
  const env = dotenv.parse(await fs.readFile(path.join(root, 'backend/.env')));
  process.env.TS_NODE_PROJECT = path.join(root, 'backend/tsconfig.json');
  backendRequire('ts-node/register/transpile-only');
  const Package = backendRequire(path.join(root, 'backend/src/models/Package')).default;
  const { readPackageContent } = backendRequire(
    path.join(root, 'backend/src/utils/packageContentInput'),
  );
  await mongoose.connect(validateNativeUri(env.MONGO_URI), { serverSelectionTimeoutMS: 5000 });
  try {
    assert.equal(mongoose.connection.name, 'studio_db');
    const packages = await Package.find().sort({ pricePerMember: 1 }).lean();
    const report = [];
    for (const pkg of packages) {
      const sample = samples[pkg.name];
      if (!sample) {
        report.push({ name: pkg.name, result: 'no-sample-skipped' });
        continue;
      }
      const fullDay = pkg.duration === 'full_day';
      const graduation = pkg.name === 'Dấu ấn Tốt nghiệp';
      const signature = pkg.name === 'Thanh xuân Signature';
      const deposit = pkg.depositPercent ?? 30;
      const holdHours = pkg.depositHoldHours ?? 24;
      const content = {
        audience: graduation
          ? 'Dành cho lớp cuối cấp hoặc sinh viên sắp tốt nghiệp muốn lưu giữ khoảnh khắc trưởng thành cùng lễ phục cử nhân, ảnh nhóm bạn và tập thể lớp.'
          : signature
            ? 'Dành cho lớp muốn một bộ ảnh có dấu ấn riêng: cùng ekip xây dựng concept, phối trang phục và chọn bối cảnh theo câu chuyện của lớp.'
            : fullDay
              ? 'Dành cho lớp muốn dành trọn một ngày bên nhau, có thời gian chụp nhiều nhóm bạn, thay trang phục và lưu giữ cả những khoảnh khắc tự nhiên.'
              : pkg.duration === 'half_day'
                ? 'Dành cho lớp muốn chụp kỷ yếu gọn trong một buổi tại trường, ưu tiên ảnh tập thể, chân dung và những góc quen thuộc của tuổi học trò.'
                : 'Dành cho lớp muốn kết hợp kỷ niệm tại trường với một bối cảnh ngoại cảnh, có nhiều màu sắc và góc chụp trong cùng một buổi hẹn.',
        benefits: [
          `Tư vấn ${sample.concepts} concept, phối trang phục và sắp xếp đội hình phù hợp với lớp.`,
          `Ekip theo tỷ lệ ${pkg.crewRatio || `1 thợ / ${pkg.studentsPerCrew || 15} thành viên`}, hỗ trợ tạo dáng cá nhân và nhóm.`,
          'Chụp ảnh tập thể lớp, nhóm bạn thân và chân dung từng thành viên.',
          graduation
            ? 'Kết hợp lễ phục cử nhân và trang phục kỷ yếu thuộc danh mục của gói; chốt size, số lượng với studio trước buổi chụp.'
            : 'Sử dụng trang phục thuộc danh mục của gói; studio chốt mẫu, size và số lượng theo tồn kho trước buổi chụp.',
          'Chỉnh màu toàn bộ ảnh đạt chất lượng và chỉnh sửa ảnh cá nhân theo phạm vi đã thống nhất.',
          `Bàn giao qua thư mục trực tuyến trong tối đa ${pkg.deliveryDays || 7} ngày sau buổi chụp.`,
        ],
        deliverables: [
          `Tối thiểu ${sample.photos} ảnh cá nhân đã chỉnh sửa/người, kèm bộ ảnh nhóm và tập thể của lớp.`,
          'Hậu kỳ toàn bộ ảnh đạt chất lượng; bàn giao file JPEG độ phân giải cao qua thư mục Google Drive riêng của lớp.',
          ...(pkg.deliveryDays
            ? [`Bàn giao trong tối đa ${pkg.deliveryDays} ngày sau buổi chụp.`]
            : []),
          'Ảnh gốc, video, ảnh in và album vật lý được báo giá riêng khi lớp có nhu cầu.',
        ].join('\n'),
        shootScope: [
          `Thời lượng tối đa ${sample.hours} giờ, gồm chuẩn bị và di chuyển giữa các điểm chụp.`,
          `Bao gồm ${sample.concepts} concept tại ${sample.locations}.`,
          'Chụp cá nhân, nhóm bạn và tập thể lớp; concept và lịch trình được thống nhất trước ngày chụp.',
          'Địa điểm hoặc thời gian ngoài phạm vi gói được studio tư vấn và báo giá trước khi thực hiện.',
        ].join('\n'),
        pricingConditions: [
          `Giá tham khảo ${pkg.pricePerMember.toLocaleString('vi-VN')} đ/người, áp dụng cho lớp từ 30 thành viên tại nội thành Hà Nội.`,
          'Lớp dưới 30 thành viên, chụp ngoại thành hoặc có yêu cầu riêng sẽ nhận báo giá theo thực tế.',
          'Vé vào địa điểm, phí thuê bối cảnh và phương tiện di chuyển chưa bao gồm trong giá/người.',
          'Thuế (nếu có), ưu đãi và phụ phí được thể hiện trong báo giá cuối cùng; studio xác nhận với lớp trước khi đặt cọc.',
        ].join('\n'),
        itinerary: [
          {
            time: '07:00 – 07:30',
            title: 'Tập trung và chuẩn bị',
            description:
              'Ekip gặp đại diện lớp, điểm danh, kiểm tra trang phục và thống nhất thứ tự chụp.',
          },
          {
            time: '07:30 – 09:00',
            title: 'Ảnh tập thể và nhóm bạn',
            description:
              'Chụp ảnh lớp tại sân trường, hành lang và các góc đã chọn; ekip hướng dẫn đội hình và tạo dáng.',
          },
          {
            time: '09:00 – 10:30',
            title: graduation ? 'Concept tốt nghiệp' : 'Chân dung từng thành viên',
            description: graduation
              ? 'Chụp lễ phục cử nhân, ảnh cùng bằng tốt nghiệp mô phỏng và khoảnh khắc bên nhóm bạn.'
              : 'Luân phiên chụp cá nhân, cặp bạn thân và nhóm nhỏ để mỗi thành viên đều có ảnh riêng.',
          },
          ...(pkg.duration === 'half_day'
            ? [
                {
                  time: '10:30 – 11:00',
                  title: 'Ảnh tự nhiên và kết thúc',
                  description:
                    'Chụp thêm những khoảnh khắc vui cùng lớp, kiểm tra các nhóm còn thiếu và thu hồi trang phục.',
                },
              ]
            : [
                {
                  time: '10:30 – 11:00',
                  title: 'Đổi trang phục và di chuyển',
                  description:
                    'Nghỉ ngắn, thay trang phục, di chuyển tới bối cảnh thứ hai theo lịch đã thống nhất.',
                },
                ...(fullDay
                  ? [
                      {
                        time: '11:00 – 13:00',
                        title: 'Nghỉ trưa',
                        description:
                          'Lớp và ekip nghỉ ngơi, ăn trưa và chuẩn bị cho phần chụp buổi chiều.',
                      },
                    ]
                  : []),
                {
                  time: fullDay ? (signature ? '13:00 – 16:00' : '13:00 – 14:30') : '11:00 – 12:30',
                  title: signature ? 'Concept riêng của lớp' : 'Bộ ảnh ngoại cảnh',
                  description: signature
                    ? 'Triển khai các concept đã duyệt tại những bối cảnh phù hợp; ưu tiên các nhóm nhỏ và câu chuyện riêng của lớp.'
                    : 'Chụp concept tại địa điểm thứ hai, bổ sung ảnh nhóm và khoảnh khắc tự nhiên.',
                },
                {
                  time: fullDay ? (signature ? '16:00 – 17:00' : '14:30 – 15:00') : '12:30 – 13:00',
                  title: 'Ảnh kết và bàn giao trang phục',
                  description:
                    'Kiểm tra danh sách ảnh, chụp bổ sung trong thời lượng gói, thu hồi trang phục và xác nhận đầu mối nhận ảnh.',
                },
              ]),
        ],
        process: [
          {
            title: 'Chọn gói và gửi lịch mong muốn',
            description:
              'Đại diện lớp cung cấp thông tin lớp, số thành viên, địa điểm và thời gian dự kiến.',
          },
          {
            title: 'Studio kiểm tra và duyệt giữ lịch',
            description:
              'Studio kiểm tra ekip, phạm vi phục vụ và lịch chụp; đại diện lớp xác nhận nội dung gói và các khoản phát sinh nếu có.',
          },
          {
            title: 'Đặt cọc để xác nhận lịch',
            description: `Hoàn tất cọc ${deposit}% theo thời hạn giữ lịch được studio xác nhận. Lịch chính thức được tạo sau khi studio ghi nhận đủ cọc.`,
          },
          {
            title: 'Chốt danh sách, concept và trang phục',
            description:
              'Bổ sung thông tin thành viên, thống nhất lịch trình, mẫu trang phục, size và các lưu ý trước ngày chụp.',
          },
          {
            title: 'Chụp ảnh và nhận sản phẩm',
            description: `Ekip thực hiện buổi chụp theo kế hoạch; lớp nhận bộ ảnh trong tối đa ${pkg.deliveryDays || 7} ngày và gửi các yêu cầu chỉnh sửa trong phạm vi đã thống nhất.`,
          },
        ],
        exclusions: [
          'Trang điểm, làm tóc và phụ kiện ngoài danh mục trang phục của gói.',
          'Vé vào địa điểm, thuê bối cảnh, phương tiện di chuyển và ăn uống.',
          'Quay video, flycam, ảnh in, album vật lý và dịch vụ ngoài phạm vi đã xác nhận.',
        ],
        extraCosts: [
          {
            name: 'Vé vào cửa hoặc thuê bối cảnh',
            priceLabel: 'Theo giá địa điểm',
            condition: 'Chỉ phát sinh khi lớp chọn địa điểm có thu phí; thống nhất trước khi đặt.',
          },
          {
            name: 'Di chuyển ngoài khu vực phục vụ',
            priceLabel: 'Báo giá theo lịch trình',
            condition: 'Áp dụng khi chụp ngoại thành hoặc bổ sung địa điểm ngoài phạm vi gói.',
          },
          {
            name: 'Trang điểm và làm tóc',
            priceLabel: 'Báo giá theo nhu cầu',
            condition: 'Dịch vụ tùy chọn, xác nhận số lượng thành viên và yêu cầu trước ngày chụp.',
          },
          {
            name: 'Ảnh in, album hoặc video',
            priceLabel: 'Báo giá riêng',
            condition: 'Chỉ thực hiện khi lớp đồng ý nội dung và chi phí bổ sung.',
          },
        ],
        preparationNotes:
          'Chốt danh sách thành viên, size trang phục và đầu mối liên hệ trước buổi chụp. Chuẩn bị giày phù hợp, nước uống, đồ dùng cá nhân và đạo cụ đã thống nhất; đến đúng giờ để không ảnh hưởng thời lượng chụp. Nếu chụp trong trường, lớp chủ động xin phép và thống nhất khu vực sử dụng.',
        depositPolicy: `Mức cọc tham khảo của gói là ${deposit}% tổng giá trị. Sau khi studio duyệt, lịch được giữ tối đa ${holdHours} giờ và không muộn hơn giờ chụp; thời hạn cụ thể hiển thị trong hồ sơ đặt gói. Studio ghi nhận đủ cọc trong hạn để xác nhận lịch chính thức.`,
        cancellationPolicy:
          'Nếu cần đổi lịch hoặc hủy, đại diện lớp liên hệ studio sớm để kiểm tra lịch ekip và chi phí đã phát sinh. Trường hợp thời tiết không phù hợp với concept ngoại cảnh, hai bên thống nhất phương án thay thế hoặc ngày chụp mới. Khoản cọc và hoàn tiền, nếu có, được đối soát theo thỏa thuận đã xác nhận trong hồ sơ.',
        priceNotes:
          'Nội dung mẫu phục vụ trải nghiệm và trình diễn ứng dụng. Giá đang hiển thị tính theo mỗi thành viên; tổng giá trị phụ thuộc số lượng thực tế và các dịch vụ được lớp đồng ý. Studio xác nhận thông tin cuối cùng trước khi nhận cọc.',
      };
      const keys = Object.keys(content);
      const missing = keys.filter((key) =>
        Array.isArray(content[key]) ? !pkg.details?.[key]?.length : !pkg.details?.[key]?.trim(),
      );
      if (!apply || !missing.length) {
        report.push({
          name: pkg.name,
          result: missing.length ? 'would-seed' : 'kept',
          fields: missing,
        });
        continue;
      }
      // Reuse the API validator before touching data. Existing galleries are left untouched.
      readPackageContent({ version: 0, details: content }, 0);
      const version = pkg.detailsVersion || 0;
      const versionFilter =
        version === 0
          ? { $or: [{ detailsVersion: 0 }, { detailsVersion: { $exists: false } }] }
          : { detailsVersion: version };
      const updates = Object.fromEntries(missing.map((key) => [`details.${key}`, content[key]]));
      if (!pkg.details) {
        updates.details = new Package({ details: content }).details.toObject();
        for (const key of missing) delete updates[`details.${key}`];
      }
      const result = await Package.updateOne(
        { _id: pkg._id, ...versionFilter },
        { $set: updates, $inc: { detailsVersion: 1 } },
        { runValidators: true },
      );
      if (result.modifiedCount === 1) {
        const saved = await Package.findById(pkg._id).lean();
        for (const key of keys)
          assert.deepEqual(
            saved.details[key],
            missing.includes(key) ? content[key] : pkg.details[key],
          );
        const unchanged = (item) => {
          const copy = JSON.parse(JSON.stringify(item));
          for (const key of keys) delete copy.details?.[key];
          delete copy.detailsVersion;
          delete copy.updatedAt;
          return copy;
        };
        if (pkg.details) assert.deepEqual(unchanged(saved), unchanged(pkg));
      }
      report.push({
        name: pkg.name,
        result: result.modifiedCount === 1 ? 'seeded' : 'concurrent-change-skipped',
        fields: missing,
      });
    }
    console.log(
      JSON.stringify(
        { mode: apply ? 'apply' : 'check', database: 'studio_db', packages: report },
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
    error.name.startsWith('Mongo')
      ? `Local database operation failed (${error.code || error.name}).`
      : error.message,
  );
  process.exitCode = 1;
});
