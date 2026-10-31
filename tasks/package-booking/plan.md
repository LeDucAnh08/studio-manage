# Plan: Đặt gói chụp trực tiếp

Yêu cầu/contract: [ADR-008](../../docs/decisions/008-package-booking-checkout.md), đã được người dùng duyệt cùng cấu hình 30% / 24 giờ.

1. Snapshot và cấu hình gói: schema, validator checkout, API công khai và form giá/cọc.
2. Duyệt và giữ ekip: giữ tạm trên workflow, tích hợp availability/khóa tài nguyên, hết hạn.
3. Ghi nhận cọc và tự tạo lịch: reuse tạo Customer/Schedule, idempotency và hoàn tiền sau hết hạn.
4. Roster sau chốt: cho phép nhập trước khi chụp, đồng bộ Student/Customer và link công khai.
5. UI: wizard xác nhận thông tin gói, admin duyệt với ekip, hồ sơ/tiến độ đúng trạng thái và deadline; giữ hồ sơ cũ.
6. Kiểm thử contract, integration cô lập, frontend và browser; sửa lỗi đến khi các điều kiện trong spec đạt.
