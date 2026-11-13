# ADR-024: Gộp đơn chụp ảnh của thợ

## Trạng thái và ngày

Accepted — 13/11/2026, theo yêu cầu của người dùng.

## Quyết định

- Tài khoản dùng workspace cá nhân của thợ (role 3, không có role quản lý 0/1/2/4) xem chung concept và kỉ yếu tại `/workflow-bookings`; bộ lọc `service` có tất cả, `concept`, `yearbook`. Giữ bộ lọc trạng thái `view` và trang `page` trên URL. Các tài khoản quản lý vẫn dùng màn hiện tại.
- Ẩn mục menu concept riêng cho thợ. URL danh sách concept cũ chuyển sang `/workflow-bookings?service=concept`. Hồ sơ concept/kỉ yếu vẫn dùng route và quyền hiện có; hồ sơ concept đánh dấu mục “Đơn chụp ảnh” đang mở, và Back giữ trạng thái danh sách qua `bookingOrdersReturnTo` đã kiểm tra là đường nội bộ.
- `GET /api/workflows/photographer-orders` yêu cầu role 3. Query: `service` (rỗng/concept/yearbook), `stage` (các giai đoạn đơn hiện có), `page` (1–100000), `limit` (1–50, mặc định 20). Luôn lọc theo ID người gọi ở từng nhánh trước khi nối dữ liệu, kể cả thợ kiêm kế toán.
- Kỉ yếu nhận các workflow có phân công chính, phụ hoặc trong ekip tài nguyên. Concept nhận đơn có người gọi là thợ hoặc người hậu kỳ. Chỉ trả tóm tắt ID/loại/tên/gói, ngày giờ, trạng thái, vai trò và thời gian cập nhật; không trả thanh toán, số điện thoại hay hồ sơ đầy đủ.
- Dùng aggregation `$unionWith`, lọc trạng thái rồi sắp xếp chung và `$facet` để đếm/phân trang chính xác. Không gộp hai trang độc lập ở frontend. Thứ tự chung: cập nhật mới nhất, loại dịch vụ, ID. Khi tắt concept, bỏ nhánh này.
- Tái sử dụng quy tắc khung giờ đã chốt cho trạng thái kỉ yếu. Concept chờ cọc → chờ chốt lịch, confirmed → đã chốt/đang thực hiện/đang hậu kỳ theo khung giờ, shot → hậu kỳ, completed → hoàn tất, expired/cancelled → hủy. Khung giờ được gửi về để giao diện làm mới khi qua mốc bắt đầu/kết thúc. Không sửa trạng thái gốc hay giao dịch.

## Kiểm chứng

Kiểm thử HTTP với auth/route/controller thật và model stub: quyền role, scope bất biến cho cả hai nhánh và nhiều vai trò, projection, bộ lọc trước phân trang chung, giới hạn query và feature flag. Kiểm thử giao diện: hai loại đơn, bộ lọc/trang trên URL, phản hồi cũ/lỗi/thử lại, mở đúng hồ sơ, Back giữ ngữ cảnh, menu thợ/quản lý và redirect URL cũ. Kiểm tra trình duyệt thực trên `studio_db`; không tạo đơn hay giao dịch thử trong DB chính. Bằng chứng ở `audit/photographer-orders-2026-11-13`.
