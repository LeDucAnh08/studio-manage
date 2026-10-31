# Thống nhất bảng trong admin

Yêu cầu: tất cả màn danh sách admin dùng cùng dạng bảng. Reuse `DataTable`, `PageHeader`, `Pagination` và style staff hiện có; không thêm thư viện, không thay đổi API/nghiệp vụ hoặc dữ liệu thật. Dashboard vẫn có thống kê/biểu đồ; lịch có chế độ calendar tùy chọn; form và chi tiết giữ đúng vai trò.

1. Chuyển Đơn chụp ảnh và Đơn thuê từ card sang `DataTable`: giữ quyền, bộ lọc, phân trang server, liên kết chi tiết và trạng thái tiền.
2. Chuyển Danh mục thu/chi và Phản hồi sang cùng bảng; giữ thao tác sửa/xóa/đọc và đầy đủ nội dung.
3. Các danh sách đã có bảng (khách hàng, học sinh, lịch, tài chính, người dùng, gói, trang phục, loại trang phục, mùa chụp, dashboard): dùng bảng ở mọi độ rộng, cuộn ngang trong vùng bảng trên mobile; bỏ bản card trùng lặp. Báo cáo giữ semantic table và style chung.
4. Kiểm tra hồi quy quyền/bộ lọc/phân trang/thao tác, TypeScript/lint/build; kiểm chứng browser các trang đại diện trên desktop và mobile bằng tài khoản/database test riêng.
