# ADR-002: Trang phục là thông tin đi kèm gói dịch vụ

## Trạng thái và ngày

Accepted — 26/10/2026, Asia/Bangkok. Thay thế phần luồng chọn trang phục phía khách của [ADR-001](001-booking-costume-holds.md).

## Bối cảnh

Sau khi xem các mockup, chủ sản phẩm quyết định bỏ bước chọn mẫu và size khi gửi yêu cầu. Trang phục mặc định được bao gồm trong gói; studio sẽ tư vấn mẫu cụ thể và size khi chốt lịch.

## Quyết định

Luồng đặt dịch vụ còn ba bước: chọn dịch vụ → lớp và thời gian → kiểm tra yêu cầu. Dùng liên kết CostumeType hiện có của Package để hiển thị “Trang phục đã bao gồm” trên thông tin gói, so sánh và kiểm tra; trang bảng giá cũng nêu rõ trang phục đi kèm. Nếu chưa cấu hình loại, hiển thị thông báo studio sẽ tư vấn chi tiết.

Wizard không tải khả dụng theo size, không gửi `costumeSelections` và không tạo giữ kho khi gửi yêu cầu. Bản nháp session v3 đọc v1/v2, giữ dữ liệu lớp/lịch/liên hệ, đưa bước 3 hoặc 4 cũ về bước kiểm tra 3 và bỏ lựa chọn trang phục cũ khỏi bản nháp mới.

## Hệ quả

Không thay đổi giá gói, liên kết loại trang phục hoặc quy trình thu thập size và phân bổ nguồn lực của studio. Dữ liệu và API giữ trang phục cũ vẫn tương thích để xử lý hồ sơ đã có; không xóa hoặc tự giải phóng phần giữ đang tồn tại. Booking mới từ wizard dùng hành vi không có lựa chọn trang phục.
