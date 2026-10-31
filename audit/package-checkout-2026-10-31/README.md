# Kiểm chứng luồng đặt gói — 31/10/2026

Đã hoàn tất ADR-008, mặc định cọc 30%, giữ 24 giờ (không quá giờ chụp). Các bài tích hợp và browser chỉ dùng database test local riêng; không tạo đơn thử trong `studio_db`.

- Backend `yarn run check`: đạt. Bổ sung kiểm tra TypeScript/định dạng sau thay đổi cuối: đạt.
- Frontend `yarn run check`: đạt với 7 cảnh báo ESLint đã có sẵn. TypeScript, ESLint và định dạng các file sửa cuối được kiểm tra lại.
- `package-booking.cjs`: 10/10 đạt, gồm consent/giá thay đổi, giữ ekip, trùng lịch, cọc thiếu/đủ/trùng, chuẩn bị trang phục và tồn kho, roster sau chốt, chặn chụp khi thiếu thành viên, hết hạn/hoàn tiền, tranh chấp ekip và thay đổi giá đã được khách chấp nhận. Xem `package-booking-tests.log`.
- Nhóm tích hợp `phase1-mongo-integration`, `booking-costumes`, `customer-order-views`, `package-booking`: 32/32 đạt ở lượt hồi quy trước. Với `booking-costumes`, đặt `MONGO_TEST_URI` bằng URI Mongo local đã cấu hình; từng test tự chuyển sang database test có kiểm tra tên. Xem `backend-regression.log`.
- Frontend `NewBookingPage`, `CustomerOrders`, `CustomerOrdersPage`: 52/52 đạt. Xem `frontend-tests.log`.
- Chrome E2E `e2e/package-checkout.spec.cjs`: 1/1 đạt. Khách gửi gói và consent → admin gắn ekip/duyệt giữ tạm → kế toán ghi nhận đủ cọc → tự chốt → admin giữ trang phục → khách nhập danh sách → mở nút bắt đầu buổi chụp khi đủ. Kiểm tra không tràn ngang ở viewport 390 px. Xem `browser-tests.log`.
- `git diff --check` tại root, frontend và backend: đạt.

Ảnh đã kiểm tra trực quan:

1. [Khách xác nhận gói](01-package-checkout.png)
2. [Admin duyệt giữ lịch tạm](02-admin-temporary-hold.png)
3. [Khách sau chốt lịch và nhập thành viên](03-confirmed-package.png)
4. [Admin chuẩn bị trang phục](04-admin-costume-preparation.png)

Đơn tư vấn cũ vẫn có báo giá/lịch sử cũ, không được tự chuyển thành đơn có consent. Ghi nhận cọc/hoàn tiền là thao tác của admin/kế toán sau đối soát thực tế, không tự giao dịch với ngân hàng. Worker hủy quá hạn chạy mỗi phút; các lần đọc/ghi đơn cũng kiểm tra hết hạn, availability bỏ giữ hết hiệu lực ngay.
