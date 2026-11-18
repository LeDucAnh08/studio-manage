# ADR-034: Gộp thông tin học sinh vào chi tiết lớp

Accepted — 18/11/2026, Asia/Bangkok.

Người dùng yêu cầu gộp “Danh sách lớp học” và “Thông tin học sinh”: chọn chi tiết lớp để xem thông tin học sinh đã điền khi đặt dịch vụ kỉ yếu.

- Sidebar chỉ giữ mục danh sách lớp. `/customers/size` chuyển về `/customers`; `/customers/:id` hiển thị thông tin lớp và bảng học sinh và lịch sử lịch chụp. Theo yêu cầu bổ sung cùng ngày, bỏ các thẻ tổng thu/tổng chi/lợi nhuận, bảng thu chi và request API giao dịch khỏi chi tiết lớp. Tìm kiếm, trang và số dòng của danh sách được giữ trong URL và đường quay lại.
- `GET /api/customers/:id/students` dùng cùng xác thực và quyền xem lớp hiện tại (roles 0/1/2/4). Endpoint kiểm tra mã lớp và lớp tồn tại, chỉ truy vấn hồ sơ gắn với đúng lớp, trả danh sách trường được phép: ID, tên, giới tính nếu có, liên hệ, chiều cao/cân nặng, size áo/quần và ghi chú. Không trả token, request fingerprint, thanh toán hoặc toàn bộ hồ sơ đặt dịch vụ.
- Cột ekip hiển thị tên đầy đủ của thợ chính và từng thợ hỗ trợ, dùng username khi chưa có tên. Chọn ngày hoặc dòng lịch mở `/workflow-bookings/:workflowBooking` nếu lịch có liên kết đơn và tài khoản có quyền xem đơn kỉ yếu. Lịch cũ không có liên kết không tạo ID đơn giả. Quay lại từ đơn giữ chi tiết lớp và ngữ cảnh danh sách lớp.
- Với lớp có `BookingWorkflow.customer`, dùng `workflow.members` làm nguồn chính để giữ liên hệ và ghi chú tách biệt, bao gồm các cập nhật sau đặt dịch vụ. Nếu danh sách đó rỗng thì hiển thị rỗng; không lấy lại bản sao học sinh cũ. Lớp không gắn workflow dùng `Student` theo đúng customer ID. Không ghi lại, di chuyển hay nhân đôi dữ liệu.
- Bảng tải toàn bộ học sinh của lớp và phân trang tại giao diện, không bị giới hạn 50 dòng của API học sinh cũ. Các trường chưa được điền hiển thị “—”. Trang này hiển thị dữ liệu đã lưu; không chỉnh sửa trực tiếp thành viên workflow qua API học sinh cũ.

Kiểm chứng: HTTP test với model doubles kiểm tra quyền truy cập, giới hạn theo lớp, trường dữ liệu được phép, nguồn workflow/legacy, danh sách rỗng, hơn 50 học sinh và mã lớp sai/không tồn tại. Frontend kiểm tra mở chi tiết, các cột dữ liệu, phân trang, lỗi/thử lại, điều hướng cũ và giữ bộ lọc khi quay lại. Không thay đổi database hoặc cấu hình thanh toán/email.
