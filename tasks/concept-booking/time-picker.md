# Chọn thời gian buổi chụp — 11/11/2026

## Thiết kế đã chọn

Phương án 1 trong bộ ba mockup chọn thời gian, ảnh nguồn:
`C:/Users/Admin/.codex/generated_images/01a1c338-9c9a-7021-92cf-d2536ad65100/exec-3b668a75-199b-4e4e-a70c-9e9ce6db826b.png`.

Giữ route `/concept-booking/packages/:packageId/book/date`, lịch tháng bên trái,
giờ nhóm sáng/chiều bên phải và xác nhận ở cuối. Một liên kết quay lại chi tiết;
Tiếp tục đi đến chọn thợ. Giữ thumbnail có sẵn, font Inter và màu coral hiện tại.

## Checklist

- [x] Lịch thứ Hai đến Chủ Nhật, chuyển tháng/năm và ngày hôm nay theo giờ Việt Nam.
- [x] Khóa ngày đã qua, ngoài hạn đặt và ngày không còn khung giờ từ API.
- [x] Hiển thị mọi giờ có thể đặt, cùng thời lượng thật của từng gói.
- [x] Đổi ngày xóa giờ/thợ/trang phục cũ; giữ giờ khi quay lại hoặc tải lại.
- [x] Phát hiện giờ đã lưu không còn khả dụng, thử lại khi tải lịch thất bại.
- [x] Dùng API từng ngày hiện có, tối đa bốn request đồng thời; cache tháng 30 giây và hủy request khi chuyển tháng/thoát màn.
- [x] Không tạo đơn hoặc giữ lịch trong bước chọn; checkout và kiểm tra phía server giữ nguyên.
- [x] 15 kiểm thử frontend, TypeScript, ESLint phần sửa và build frontend đạt.
- [x] So sánh ảnh nguồn với Chrome desktop; kiểm tra tablet/mobile/320px và ghi QA cuối.

Bằng chứng: `audit/concept-time-2026-11-11/`. QA hiện tại: `design-qa.md`.
