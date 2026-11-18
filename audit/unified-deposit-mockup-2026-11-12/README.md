# Trang thanh toán QR cọc dùng chung — đã triển khai

App chính: http://localhost:4001/account/orders

`DepositCheckout` dùng trong các route đơn hiện có với `?payment=deposit`: thuê trang phục, chụp concept và chụp kỉ yếu. Navbar lấy từ ClientLayout hiện tại, không có thanh bản duyệt hay công cụ đổi trạng thái. Hồ sơ khách hàng dẫn sang checkout thay cho QR cọc nhúng; các khoản thanh toán khác và giao diện nhân sự giữ luồng riêng.

- QR, ngân hàng, nội dung, số còn thiếu và expiresAt lấy từ DTO của đơn. Không gọi API tạo đơn hay tạo phiên cọc mới khi tải trang. Deadline hiển thị là hạn sớm nhất của payment và giữ chỗ.
- Countdown dùng PaymentCountdown, cập nhật mỗi giây. Hết hạn/hủy/đối soát ẩn QR, tải mã, sao chép và mô phỏng. Đã nhận đủ cọc ẩn QR/đếm ngược và dẫn về hồ sơ.
- Thuê mới cọc trước 30%, trừ vào tiền thuê. Snapshot cọc bảo đảm cũ giữ cách tính tổng tiền và phần còn lại cũ. Concept/kỉ yếu dùng số cọc theo snapshot/báo giá, không tính lại bằng giá hiện tại.
- Các page tiếp tục dùng polling API thật; kỉ yếu nhận thay đổi số còn thiếu/QR/hạn ngay cả khi version không đổi. Quay lại hồ sơ giữ ordersReturnTo và conceptDraft nếu có.
- Giữ studio_db, cấu hình SePay provider Test trên app chính; không đổi môi trường hay tạo giao dịch/thanh toán trong lần triển khai này.

Kiểm tra: 50/50 kiểm tra checkout và hợp đồng luồng đơn đạt; 85 kiểm tra hồi quy còn lại đã đạt. Lượt cuối sau chỉnh sửa: 23 đạt, 27 bỏ qua theo bộ lọc. Build production, TypeScript, ESLint và kiểm tra diff đã đạt.

Visual QA dùng chính component production trong entry phát triển `deposit-payment-mockup.html`, dữ liệu minh họa, QR PNG không có lệnh chuyển tiền. Entry này chỉ phục vụ kiểm tra bố cục, không phải route thanh toán của app. Các route có xác thực được kiểm tra bằng bài tích hợp component; tài khoản mẫu không đăng nhập được studio_db nên không chạy thêm E2E ngân hàng bằng tài khoản đó.

Ảnh triển khai: implemented-desktop.png, implemented-mobile.png. Đối chiếu: comparison-desktop.png, comparison-mobile.png, comparison-details.png. Ảnh desktop.png/mobile.png và các ảnh trạng thái cũ giữ làm nguồn thiết kế đã duyệt. Kết quả QA chi tiết lưu tại ../../design-qa.md. Log: checkout-tests.log, checkout-final-tests.log, checkout-build.log.
