# ADR-035: Bỏ vai trò Sale và Cộng tác viên sale

Accepted — 19/11/2026, Asia/Bangkok.

Người dùng quyết định bỏ cả Sale (2) và Cộng tác viên sale (4), giao việc tiếp nhận/chốt đơn/báo giá cho quản trị. Người dùng xác nhận ba tài khoản `sale.ngocan`, `sale.tuonglinh`, `ctv.khanhvy` là dữ liệu seed và yêu cầu xóa cả dữ liệu liên quan.

- Vai trò hoạt động còn 0 Superadmin, 1 Admin, 3 Thợ chụp ảnh, 5 Kế toán và 6 Khách hàng. Giữ nguyên các ID, để trống 2/4; không đánh lại số và không chuyển tài khoản cũ thành Admin.
- Bỏ 2/4 khỏi kiểu dữ liệu, schema, các điều kiện phân quyền API, route và menu frontend. Đăng nhập và middleware session từ chối tài khoản không có vai trò hoạt động; token của tài khoản đã xóa không còn truy cập được. Nhánh thợ cá nhân chỉ được mở rộng bởi quyền quản trị 0/1, kể cả dữ liệu cũ có thêm role đã ngừng dùng.
- Quản lý người dùng chỉ cấp các role hoạt động và yêu cầu chọn role rõ ràng. Mặc định model là Khách hàng (6), không có quyền nội bộ. Đăng ký nhân sự chỉ cho yêu cầu Thợ chụp ảnh (3) hoặc Kế toán (5). Duyệt yêu cầu cũ không được lấy role 2/4 làm mặc định để tạo tài khoản bằng raw collection.
- Trường lịch chụp giữ tên dữ liệu `bookedBy`, đổi nhãn thành “Người phụ trách”. Dropdown dùng `GET /api/users/coordinators`, chỉ trả quản trị 0/1 đang hoạt động và chỉ quản trị được gọi. API từ chối chỉ định mới tài khoản ngoài nhóm này; lịch cũ được giữ nguyên người phụ trách nếu không thay đổi lựa chọn. Xóa `/api/users/sales`.
- Các quy tắc còn lại về khách hàng, kế toán, phân công thợ, số tiền snapshot, đặt cọc, nhận trả và hoàn tiền không thay đổi. Quyết định này thay thế phần quyền Sale/CTV trong các ADR trước; không mở rộng quyền của vai trò còn lại.
- Sửa seed catalog, scenario, browser smoke và seed availability để dùng quản trị; các lần seed sau không tạo lại Sale/CTV. Giữ marker seed `realistic:v1` ở trạng thái hoàn tất để lần chạy lặp không khôi phục bộ mẫu đã xóa; gỡ các ID đã xóa khỏi manifest.

Dọn dữ liệu trên `studio_db` loopback, development, bằng một transaction: xóa 3 tài khoản, 20 lớp, 802 học sinh, 20 booking, 20 workflow, 17 lịch, 45 giao dịch và 8 phản hồi. Danh sách được chốt từ ID và liên kết, xác nhận class ID/booking request ID thuộc seed; hash của dry-run ràng buộc lệnh apply. Transaction kiểm tra số bản ghi xóa và xác nhận ID ngoài danh sách còn nguyên. Không xóa tài khoản khách hàng dùng chung, catalog, ảnh hoặc tài nguyên Drive bên ngoài.

Bằng chứng: `audit/retire-sales-2026-11-19/cleanup-plan.json`, `cleanup-result.json`, `verification.json`. Kiểm thử gồm role cũ/phiên cũ, giả mạo role khi tạo/đăng ký/duyệt tài khoản, phạm vi thợ có nhiều role, bộ lọc đơn, lịch, đơn thuê và điều hướng. Không gửi thông báo/email hoặc thực hiện thanh toán trong kiểm chứng.
