# ADR-004: Một mục Đơn chụp ảnh cho nhân sự studio

## Trạng thái và ngày

Accepted — 29/10/2026; cập nhật 30/10/2026, Asia/Bangkok.

## Bối cảnh

Admin nhìn thấy cả Yêu cầu đặt dịch vụ và Quy trình dịch vụ, nhưng hai danh sách đều dẫn tới cùng màn chi tiết và cùng thao tác xử lý đơn. Việc phân công từ lúc tiếp nhận khiến ranh giới giữa hai mục không còn hữu ích.

## Quyết định

Chỉ giữ một mục **Đơn chụp ảnh** tại `/workflow-bookings`, dùng danh sách workflow hiện có từ tiếp nhận tới bàn giao. Admin xem tất cả đơn, thông báo yêu cầu và quản lý lịch bận; thợ xem các đơn được giao và lịch bận của mình; kế toán giữ phần tài chính theo quyền hiện có. Backend tiếp tục kiểm soát phạm vi dữ liệu, không mở thêm quyền.

Bộ lọc gồm tất cả, chờ duyệt, đang xử lý, hoàn tất, đã hủy, đã từ chối. API `GET /api/workflows` bổ sung query `status` tùy chọn (`pending`, `approved`, `rejected`), kết hợp với `view` và quyền sở hữu trước phân trang. Bộ lọc “Chờ duyệt” gửi `status=pending`; “Đang xử lý” gửi `view=active&status=approved`. Các lời gọi `view=active` cũ không đổi ý nghĩa để giữ tương thích trang khách. Thẻ đơn ưu tiên hiển thị trạng thái từ chối/chờ duyệt trước trạng thái workflow. `view` và `page` lưu trong URL của giao diện; mở chi tiết rồi quay lại giữ bộ lọc và trang. Khi đổi bộ lọc, trở về trang đầu và bỏ qua các phản hồi tải danh sách đã cũ.

`/booking-requests` và `/booking-requests/:id` trở thành redirect thay thế lịch sử tới đường dẫn tương ứng tại `/workflow-bookings`, giữ query, hash và navigation state. Các alias cũ vẫn chỉ dành cho admin như trước. Thông báo và liên kết quay lại từ chi tiết dùng đường dẫn chung. Liên kết từ báo cáo và quyền của khách hàng không đổi.

## Hệ quả

Nhân sự có một nơi làm việc với đơn chụp ảnh. Không thay đổi dữ liệu, nghiệp vụ báo giá, giữ lịch, phân công hay thanh toán; không cần migration. Các API booking cũ được giữ để tương thích.

Kiểm tra bằng `BookingWorkflowListPage.test.tsx`, `Sidebar.test.tsx`, kiểm thử route hiện có và `photographer-assignment.spec.cjs` cho redirect, một mục điều hướng duy nhất và quay lại đúng bộ lọc.
