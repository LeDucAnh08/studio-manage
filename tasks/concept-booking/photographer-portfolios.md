# Portfolio cá nhân của thợ — 11/11/2026

## Thiết kế và phạm vi

Trang riêng theo phương án 1 đã chọn:
`C:/Users/Admin/.codex/generated_images/01a1c338-9c9a-7021-92cf-d2536ad65100/exec-002f9572-2ee7-40d3-875b-2925e407214a.png`.

Danh sách thợ dẫn tới `/concept-booking/packages/:packageId/photographers/:photographerId`.
Trang hồ sơ ưu tiên con người, lời giới thiệu, dấu ấn, cách hướng dẫn, đối tượng phù hợp;
ảnh tác phẩm nằm sau phần thông tin. Không dùng popup hồ sơ. Chọn thợ kiểm tra lại lịch,
ghi draft và chuyển sang trang phục; không tạo đơn, giữ chỗ hoặc thu tiền ở bước này.

## Checklist

- [x] Model và form quản lý cho nội dung/ảnh riêng của từng thợ, ẩn mục trống.
- [x] API hồ sơ công khai theo whitelist, chỉ hồ sơ đã xuất bản của thợ hoạt động.
- [x] Lọc ảnh được phép công khai và concept đang hoạt động; không trả email/điện thoại/quyền.
- [x] Lưu trường mới khi client cũ gửi thiếu; kiểm tra URL, độ dài, số mục.
- [x] Trang riêng, trở lại danh sách, tải lại giữ ngày giờ, chọn thợ xong đi tới trang phục.
- [x] Kiểm tra lại lịch trước khi chọn, xử lý vừa hết chỗ và khách chưa chọn thời gian.
- [x] 4 chân dung tạo riêng; 4 hồ sơ local với giọng giới thiệu và 6 ảnh tiêu biểu mỗi hồ sơ.
- [x] Seed chỉ điền trường trống, giữ nội dung đã chỉnh, không tạo người dùng/đơn/thanh toán.
- [x] 22 frontend tests và 14 backend integration tests trên database riêng đạt.
- [x] Browser desktop/tablet/mobile/320px, đối chiếu ảnh đã chọn và QA cuối.
- [x] TypeScript, ESLint, build hai phần và kiểm tra diff cuối.

Seed: `node ops/seed-concept-portfolios.cjs --apply`, cần chạy catalog trước.
Trang quản lý: `/settings/concepts` → Hồ sơ thợ, giữ quyền admin hiện có.
Không mở quyền tự sửa hồ sơ cho thợ trong thay đổi này.

Nguồn ảnh, nội dung và tham khảo: `docs/assets/photographer-profiles.md`.
Evidence: `audit/concept-photographer-2026-11-11/`; QA: `design-qa.md`.
