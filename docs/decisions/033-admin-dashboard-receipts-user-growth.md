# ADR-033: Dashboard admin theo mẫu 2, tiền thu và biến động user

Accepted — 14/11/2026, Asia/Bangkok.

Người dùng chọn mẫu 2 trong bộ mockup đã sửa để bỏ chi tiền. Người dùng yêu cầu bỏ nút “Xem lịch chụp” ở góc trên phải và bổ sung biến động lượng user. Bản tham chiếu cập nhật nằm tại `frontend/docs/design/admin-dashboard-2026-11-14/approved-reference.png`.

- Dùng component admin riêng cho roles 0/1. Dashboard thợ cá nhân và các vai trò staff khác giữ nguyên quy tắc hiện có. Không đổi sidebar hay bổ sung chức năng chi tiền.
- Bốn số liệu: tiền thu đã ghi nhận, lớp mới, lịch chụp kỉ yếu và tổng tài khoản hiện có. Biểu đồ chỉ dùng giao dịch `income`; không trình bày chi, chênh lệch hoặc gọi khoản thu là lợi nhuận. Bộ lọc mùa/nhân sự giữ ngữ nghĩa API cũ và chỉ áp dụng các số liệu nghiệp vụ này.
- Số tài khoản và biểu đồ user là tổng hợp toàn hệ thống, chỉ trả cho admin, không trả danh sách hay thông tin cá nhân. Mỗi document User được tính một lần dù có nhiều role; bao gồm cả tài khoản đang bị khóa. Biểu đồ thể hiện sáu tháng gần nhất, bổ sung tháng trống bằng 0, chỉ tính dữ liệu `createdAt` không vượt thời điểm báo cáo.
- User mới tháng hiện tại được so với cùng thời lượng đã trôi qua của tháng trước, giới hạn tại cuối tháng trước nếu tháng đó ngắn hơn. Mốc tháng theo Việt Nam, không phụ thuộc timezone server. Nếu kỳ trước bằng 0 thì không tạo phần trăm tăng trưởng. Đây là tài khoản đang tồn tại theo ngày tạo, không phải người online, MAU hoặc lịch sử tăng/giảm ròng có tính tài khoản đã xóa; hệ thống chưa lưu sự kiện xóa để dựng lịch sử đó.
- Trang tự làm mới mỗi phút khi hiển thị và khi trở lại tab. Lỗi giữ bản tải gần nhất kèm cảnh báo/Thử lại; response cũ không ghi đè lựa chọn filter mới. Biểu đồ không chạy animation để không biến mất tạm thời khi resize/cập nhật và luôn phù hợp reduced motion.
- Dùng theme và component sẵn có; không thêm thư viện. Mobile xếp hai biểu đồ dọc, KPI hai cột, bảng lịch cuộn ngang trong vùng của bảng. Giữ nút Bảng/Lịch và link tới trang quản lý lịch trong phần lịch sắp tới.

Kiểm chứng: test tháng Việt Nam, năm nhuận/tháng ngắn, kỳ trước 0, tăng/giảm và tháng trống; HTTP model doubles xác nhận role 0/1 có thống kê user, role khác không có và guest/customer bị chặn. Hồi quy frontend kiểm tra số liệu chỉ thu, bỏ nút trên đầu trang, user cùng kỳ, biểu đồ ngày/tháng, quyền dashboard thợ và request filter về trễ. Không đọc/ghi database thật trong các HTTP tests. Browser QA dùng component thật với dữ liệu minh họa tách ở port 4014; ứng dụng chính vẫn lấy API thật tại 4001/5002.
