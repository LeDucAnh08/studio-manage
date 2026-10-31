# ADR-009: Một dạng bảng cho các danh sách admin

Accepted — 31/10/2026. Người dùng yêu cầu các mục trong admin về cùng dạng bảng.

Tái sử dụng `DataTable`, `Table`, `PageHeader`, `Pagination` và style staff hiện có. Đơn chụp, đơn thuê, phản hồi, danh mục thu/chi, yêu cầu cấp tài khoản và lịch bận dùng cùng bảng. Các danh sách đã có bảng (khách hàng, học sinh, lịch, người dùng, trang phục, loại trang phục, gói, mùa chụp, tài chính, lịch sắp tới) bỏ bản card trùng trên mobile và giữ bảng ở mọi độ rộng.

Bảng có khung cuộn ngang riêng, focus được bằng bàn phím; độ rộng tối thiểu 640px để không ép các cột thành nhiều dòng khó đọc. Header/hàng/trạng thái dùng style staff chung; các cột số và tiền căn phải, thao tác đặt ở cột cuối. Báo cáo giữ bảng semantic và dùng phân trang chung. Dashboard vẫn có biểu đồ; các chế độ lịch, form và trang chi tiết tiếp tục phục vụ đúng chức năng.

Đơn chụp và đơn thuê giữ phân trang/bộ lọc trên server. Không lọc riêng từng trang để giả lập bộ lọc toàn danh sách. URL giữ trạng thái và số trang; mở đơn rồi quay lại giữ ngữ cảnh. Các quyền và thao tác nghiệp vụ hiện có được giữ nguyên. Phản hồi dùng bảng gọn và modal xem đầy đủ đánh giá, nội dung và đề xuất. Các trạng thái tải/rỗng/lỗi có thông báo và thử lại.

Không thay đổi backend, schema hoặc dữ liệu thật; không thêm dependency. Kiểm chứng tại `tasks/admin-tables/` và `audit/admin-tables-2026-10-31/`.
