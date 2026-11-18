# ADR-029: Màn chọn thợ chụp theo phương án đã duyệt

## Trạng thái và ngày

Accepted — 14/11/2026, Asia/Bangkok. Người dùng duyệt bản tương tác phương án 1 và yêu cầu áp dụng vào luồng chính.

## Quyết định

- Màn chọn thợ trong `/concept-booking/packages/:packageId/book/photographer` dùng hai thẻ chân dung cạnh nhau: danh tính, lời giới thiệu, chuyên môn và liên kết hồ sơ riêng. Trên mobile thẻ xếp dọc, thanh tiếp tục được giữ trong tầm nhìn khi cuộn.
- Thông tin gói, thời gian theo giờ Việt Nam, thời lượng và giá lấy từ catalog/draft thực tế. Danh sách và số thợ lấy từ API availability; không dùng danh sách, lịch hay thợ mặc định của mockup.
- Hồ sơ tiếp tục dùng renderer chung và route riêng. Chọn thợ kiểm tra lại lịch, lưu draft rồi quay lại màn danh sách để hiển thị trạng thái đã chọn; Continue chuyển sang màn chuẩn bị hợp nhất hiện có. Không tạo đơn hoặc giữ tài nguyên ở các bước này.
- Không cho tiếp tục khi đang kiểm tra lịch, API lỗi, thợ đã chọn không còn nhận lịch hoặc thời gian đã qua. Có thao tác thử lại khi API lỗi. Bảo toàn thông tin nháp và quy tắc kiểm tra cuối ở checkout.
- Hồ sơ thiếu ảnh dùng trạng thái không có ảnh, không gán ảnh của người khác. Trên database local đã được phép nạp dữ liệu mẫu, bổ sung ảnh chân dung, chuyên môn và tagline đã duyệt vào các trường còn trống của Lê Minh Đức và Nguyễn Gia Bảo; không thay trường đã có nội dung hoặc đổi phân công concept.

## Kiểm chứng

Kiểm thử wizard và trạng thái loading/error/stale-selection, các kiểm thử hồ sơ đơn và thanh toán concept, TypeScript, ESLint và build frontend. Kiểm tra trực tiếp trên browser: catalog → thời gian → danh sách → hồ sơ → chọn → danh sách → Continue → màn thông tin; Back giữ lựa chọn. Đối chiếu desktop/mobile với bản duyệt và kiểm tra không tràn ngang. Không gửi đơn hoặc thanh toán thật trong kiểm tra.
