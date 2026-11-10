# Checklist

## Hợp nhất vào màn bàn giao

- [x] Một nút Xem ảnh bàn giao trong hồ sơ; alias album cũ chuyển về màn chung.
- [x] Hai tab Ảnh chọn / Ảnh đã chỉnh; Drive và upload local cùng màn; lịch sử/góp ý/nghiệm thu giữ nguyên.
- [x] JWT owner đọc/chọn/chốt cùng album với public link; ảnh nháp và công cụ studio không lộ.
- [x] API quyền owner và public dùng chung; 10 backend/browser tests pass, hồi quy private delivery 9 tests pass; bộ frontend đầy đủ 324 tests pass. Demo 15 bước đã ghi từ hồ sơ đơn đến nghiệm thu.

- [x] Drive API client: parse link/resource key, pagination, proxy, timeout/size/error handling; kiểm bằng upstream fixtures.
- [x] Album staff: cấu hình/sync/ảnh bìa/publish/share/revoke/export.
- [x] Guest: lựa chọn/ghi chú/version conflict/finalize/reopen và quyền.
- [x] Drive delivery: snapshot/version/history/revision action, legacy compatibility.
- [x] React: staff manager, public gallery, integration with booking/delivery; giữ link khách khi phiên tài khoản cũ hết hạn.
- [x] Backend integration (9, gồm browser), private delivery regression (9), backend contract (52); frontend toàn bộ 320 + focused album/API 14 sau thay đổi cuối; desktop 1440/mobile 390.
- [x] ADR và hướng dẫn cấu hình, giới hạn kiểm chứng.
- [x] Frontend/backend check (type/lint/format) và build. Chỉ còn các cảnh báo sẵn có về Fast Refresh/hooks và bundle lớn.
- [ ] Kiểm chứng Google Drive thật: người dùng chọn bàn giao hướng dẫn, chưa cung cấp key/thư mục mẫu. Không phải bước được chứng minh bằng fixture.

Ảnh chụp và kết quả: `audit/drive-album-2026-11-10/`. Build/check cuối được ghi trong README của evidence.
