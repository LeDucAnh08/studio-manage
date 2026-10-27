# ADR-001: Giữ trang phục đặt chụp dùng chung kho tài nguyên

## Trạng thái và ngày

Accepted — 26/10/2026, Asia/Bangkok. Phần luồng chọn trang phục phía khách đã được thay thế bởi [ADR-002](002-package-included-costumes.md); phần bảo vệ kho và xử lý hồ sơ có phần giữ vẫn áp dụng.

## Bối cảnh

Khách cần bước chọn trang phục tùy chọn sau thông tin lớp và thời gian. Gói đã liên kết CostumeType; mẫu Costume có tồn theo size và tình trạng. Trang phục chụp và cho thuê dùng chung kho. Chỉ lưu lựa chọn mà chưa giữ kho không đáp ứng yêu cầu đã chốt.

## Quyết định

Lưu lựa chọn và trạng thái giữ trực tiếp trên Booking, cùng snapshot tên mẫu/loại. Giữ theo ngày Việt Nam như đơn thuê và lịch chụp hiện có. Gửi yêu cầu giữ tạm 24 giờ; duyệt chuyển giữ tiếp; xác nhận lịch chuyển phần giữ sang Schedule trong transaction.

Tái sử dụng `withResourceTransaction` và khóa `studio-resources`; đưa phần giữ Booking vào dạng reservation nội bộ để mọi phép tính khả dụng hiện có tính chung. Khi xác nhận lịch, loại phần giữ của chính Booking và chuyển trạng thái trong cùng transaction để không có khoảng trống hay giữ kép.

Hết hạn được kiểm tra bằng `expiresAt > now` khi đọc. Không xóa lịch sử hoặc phụ thuộc độ trễ của tác vụ nền. Duyệt sau hết hạn kiểm tra và giữ lại nguyên tử. Duyệt thành công giữ tới khi chốt lịch; admin có thao tác bỏ giữ với lý do để xử lý yêu cầu không tiếp tục.

## Phương án không chọn

- Tạo đơn thuê riêng cho trang phục trong gói: làm lẫn nghiệp vụ, giá/cọc và lifecycle của hai dịch vụ.
- Khóa toàn bộ mẫu hoặc giữ ngay khi đang điền form: giữ quá số lượng cần thiết, đòi hỏi lifecycle phiên tạm khi khách rời trang.
- Thêm kho/worker giữ độc lập: tăng điểm đồng bộ, vẫn phải phối hợp với khóa tài nguyên hiện có.
- Tính theo giờ: không tương thích cách kiểm tra ngày nhận/trả hiện tại; chưa có quy tắc bàn giao để tái sử dụng trong ngày.

## Hệ quả

MongoDB transactional là điều kiện bắt buộc với yêu cầu có chọn trang phục. Luồng bỏ qua và Booking cũ giữ hành vi hiện tại. Khi portal được bật, thao tác ghi kho/lịch luôn dùng transaction dù cờ workflow/rental tắt: phần giữ đầu tiên có thể được tạo đồng thời với chỉnh kho. Khi portal tắt, phần giữ đang hoạt động vẫn buộc bảo vệ tài nguyên bằng transaction. Cần triển khai đồng bộ tất cả nơi đọc/ghi kho; quy trình và hợp đồng API nằm tại [BOOKING_COSTUMES_RELEASE.md](../../BOOKING_COSTUMES_RELEASE.md).
