# Kiểm chứng album Google Drive — 10/11/2026

## Hợp nhất vào màn bàn giao

- Lối vào duy nhất trong hồ sơ: **Bàn giao ảnh → Xem ảnh bàn giao**; cả studio và tài khoản khách dùng hai tab Ảnh chọn / Ảnh đã chỉnh. Album URL cũ chuyển về màn chung, giữ tham số phiên bản.
- Owner JWT chọn/chốt trực tiếp, đồng bộ với public link. Draft Drive, công cụ thư mục/share/export và đơn của người khác vẫn bị chặn. Upload local đã chuyển vào tab Ảnh đã chỉnh, lịch sử và nghiệm thu tiếp tục hoạt động.
- Backend album/Chrome: 10 tests pass, có đi từ hồ sơ thật, alias, tài khoản owner, lựa chọn chia sẻ hai kênh, giao Drive, mobile, góp ý và nghiệm thu. Private delivery regression: 9 tests pass.
- Frontend full suite: 36 files / 324 tests pass; thêm ca unit upload local và alias sau bộ full. Frontend/backend check/build pass với cảnh báo cũ đã ghi bên dưới.
- Demo mới có 15 bước tại `audit/drive-album-demo-2026-11-10`, bắt đầu từ hồ sơ đơn và kết thúc nghiệm thu/thu hồi link. Google upstream tiếp tục là fixture theo lựa chọn bàn giao của người dùng.

Google upstream được giả lập trong test; API Express, phân quyền JWT/token và MongoDB replica set đều chạy thật trên database riêng. Không dùng dữ liệu studio_db. Người dùng chọn bàn giao kèm cấu hình; chưa kiểm chứng API key/thư mục Google thật.

- Backend album: 9 tests pass, gồm pagination/resource key, rollback sync, quyền/DTO, thumbnail/bytes, concurrent selection, giới hạn chọn, retry, quota/timeout/size, snapshot chốt, snapshot nhiều ảnh đã chỉnh, history/revision/accept, revoke/reassignment/cancel.
- Private delivery regression: 9 tests pass. Backend contract: 52 tests pass.
- Frontend: full suite 36 files / 320 tests pass; sau bổ sung test cuối, focused album/API 14 tests pass (6 album + 8 API).
- Chrome desktop 1440×1000 và mobile 390×844: studio tạo/sync/mở/chia sẻ → khách chọn/ghi chú/chốt → tải lại giữ dữ liệu → studio xuất tên → giao Drive cùng link → khách tải file thật/ghi chú → xử lý xung đột và thu hồi link. Kiểm cả phiên tài khoản cũ hết hạn; guest không bị chuyển sang login. Không lỗi JavaScript, mobile không tràn ngang.
- `guest-desktop.png`, `guest-mobile.png`, `studio-desktop.png`, `delivery-mobile.png` dùng ảnh màu phẳng cố ý để kiểm luồng; không phải ảnh khách thật. `result.json` là kết quả browser.
- `npm run check` cả frontend/backend: pass; frontend còn 7 cảnh báo sẵn có ở các file ngoài tính năng album, không có lỗi. Build frontend/backend pass; Vite còn cảnh báo bundle lớn và circular vendor chunks có sẵn.

## Chạy lại

MongoDB local cần chạy replica set; test đọc cấu hình backend và tự đổi sang database `studio_drive_album_test_<pid>` có kiểm tra localhost trước khi tạo/dọn dữ liệu. Có thể đặt `MONGO_TEST_URI` để dùng replica set QA riêng.

```powershell
cd backend
npm run test:album
$env:ALBUM_BROWSER_TEST='true'
npm run test:album
```

Browser test cần Chrome, dùng Vite cổng 4023 và tự dừng server/browser. Build/check và TypeScript chạy riêng theo script mỗi workspace. Hướng dẫn vận hành và cấu hình Google tại [ADR-014](../../docs/decisions/014-drive-photo-albums.md).
