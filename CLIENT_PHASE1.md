# Khách hàng và yêu cầu đặt dịch vụ — đợt 1

> Tài liệu này ghi lại phạm vi đợt 1. Luồng chụp ảnh đang được mở rộng ở đợt tiếp theo
> với wizard, báo giá, thành viên, phân bổ nguồn lực, thu/hoàn tiền và bàn giao.
> Xem [WORKFLOW_RELEASE.md](WORKFLOW_RELEASE.md) để bật tính năng và nghiệm thu.
> Wizard mới dùng giờ Việt Nam; API vẫn lưu thời điểm dưới dạng UTC.

## Luồng sử dụng

- Khách mở `/register`, đăng ký bằng tên đăng nhập, họ tên và mật khẩu. Backend cố định quyền Client (6); không cần duyệt tài khoản khách.
- Nhân sự tiếp tục gửi yêu cầu tại `/staff-register`. Tài khoản nội bộ cũ giữ nguyên vai trò.
- Sau đăng nhập, khách vào `/account/bookings`, chọn Đặt dịch vụ; danh mục dùng các gói hiện có và giá tham khảo trên mỗi người.
- Yêu cầu lưu tài khoản sở hữu, thông tin liên hệ, địa điểm, số người, thời gian mong muốn, tên/giá gói tại lúc gửi. Không dùng model Customer của lớp học làm tài khoản.
- Chủ/Admin mở Yêu cầu đặt dịch vụ (`/booking-requests`), xem chi tiết và nhập phản hồi để duyệt/từ chối.
- Khách xem phản hồi trong chi tiết booking và thông báo. Thông báo được lấy từ sự kiện bền vững trong booking, tự tải lại mỗi 30 giây; đánh dấu đã đọc theo tài khoản.

## Giới hạn của đợt này

`approved` nghĩa là studio đã duyệt yêu cầu, chưa xác nhận giữ tài nguyên hoặc thanh toán. Studio liên hệ xác nhận khả năng phục vụ. Không tự tạo Schedule, thu tiền hoặc cam kết khung giờ trống. Thời gian hiển thị theo múi giờ trình duyệt, API lưu UTC.

Chưa có email xác minh/khôi phục mật khẩu, đặt phòng/thiết bị riêng, hồ sơ nhân viên công khai, lịch khả dụng, giữ chỗ, cọc, đổi/hủy và gallery. Các phần này thuộc đợt tiếp theo; không mở thanh toán trước khi có cơ chế phân bổ nguồn lực.

## Kiểm tra

Chạy từ root: `npm test`.

Hai bộ kiểm thử HTTP (20 test) dùng model giả lập, không kết nối DB: đăng ký không tự cấp quyền, kiểm tra dữ liệu đầu vào, chặn người ngoài, bảo vệ booking theo chủ sở hữu, idempotency khi gửi lại, khóa quyết định xét duyệt booking/tài khoản nhân sự và lưu sự kiện thông báo. Không thay thế kiểm thử transaction/concurrency với MongoDB thật khi triển khai giữ chỗ ở đợt 2.

Build riêng frontend/backend bằng các script build hiện có. Không cần migration cho người dùng cũ; schema thêm quyền 6 và collection bookings được tạo khi phát sinh dữ liệu. Booking mới lưu snapshot gói và hỗ trợ `Idempotency-Key`; tài khoản sinh từ yêu cầu nhân sự có liên kết nguồn để retry xét duyệt an toàn. Giới hạn thử đăng nhập hiện theo IP trong một tiến trình; cần kho dùng chung khi triển khai nhiều instance.
