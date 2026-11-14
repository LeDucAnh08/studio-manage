# 027 — Gộp đơn concept và kỉ yếu cho nhân sự

Ngày: 2026-11-14. Trạng thái: chấp nhận.

## Bối cảnh

Thợ chụp đã có danh sách hai dịch vụ. Quản lý vẫn phải chuyển giữa “Chụp concept” và “Đơn chụp ảnh”. Yêu cầu mới là bỏ mục đơn concept riêng, dùng một danh sách có bộ lọc loại đơn cho mọi nhân sự được cấp quyền.

## Quyết định

- Giữ `/workflow-bookings` là workspace chính, thêm cột/bộ lọc “Loại đơn chụp”: Tất cả, Concept, Kỉ yếu. Giữ bộ lọc trạng thái, thông báo quản lý, ekip và dữ liệu kế toán hiện có. Không khôi phục phần quản lý lịch bận đã bỏ.
- Mục `/concept-orders` được ẩn khỏi menu, vẫn đăng ký route để chuyển liên kết cũ sang `/workflow-bookings?service=concept`, giữ query phân trang. Trang chi tiết và album concept giữ nguyên route và nghiệp vụ. Back và trạng thái active của sidebar dùng workspace chung cho mọi staff role.
- Thêm `GET /api/workflows/shoot-orders` cho các role 0/1/2/3/5. Nhận `service` (rỗng, concept, yearbook), `stage`, `page` và `limit`. Dùng MongoDB union, lọc trạng thái và sắp xếp trước một facet phân trang/count chung; không ghép hai trang dữ liệu đã bị cắt.
- Nhánh kỉ yếu bắt đầu từ Booking để giữ cả yêu cầu chờ duyệt chưa có BookingWorkflow. Dùng lại phép tính trạng thái theo lịch xác nhận và helper summary của API hiện có; không thay đổi `/api/workflows` của khách hàng hoặc các consumer cũ.
- Quản lý 0/1 và kế toán 5 được xem cả hai dịch vụ. Sale 2 giữ quyền concept, không tự được cấp quyền kỉ yếu. Nhân sự có thêm role thợ chỉ đọc kỉ yếu được phân công nếu không có quyền quản lý/kế toán. Tài khoản thợ cá nhân, kể cả role 3+5, vẫn bị giới hạn theo phân công ở cả hai nhánh và không được trả dữ liệu tài chính.
- Endpoint riêng `/api/workflows/photographer-orders`, dashboard và scope cá nhân hiện có được giữ. Chia sẻ biểu thức trạng thái concept để hai danh sách không lệch nhau. Nội dung chuyển tiếp query có thể xác định filter, không xác định quyền truy cập.
- Dữ liệu thu tiền kỉ yếu dùng nguyên helper cũ. Concept chỉ bổ sung số đã thu/hoàn đã được ghi nhận cho người có quyền; không suy diễn số dư mới. Không đổi trạng thái nghiệp vụ hay tạo/migrate đơn.

## Kiểm chứng

`backend/tests/shoot-orders.cjs` chạy trên database local riêng `studio_shoot_orders_test_<pid>`: hơn một trang đơn hai loại, yêu cầu chưa có workflow, filter trước pagination/count, scope theo role/kết hợp role, dữ liệu tài chính, feature gate và parity với summary kỉ yếu cũ. Hồi quy customer order views, photographer orders/dashboard. Frontend kiểm tra lọc/reset trang, liên kết hai loại hồ sơ, Back/context, route cũ, menu và quyền sale. Kiểm tra trình duyệt tại main app bằng tài khoản quản lý; không seed đơn concept vào `studio_db` để lấp trạng thái rỗng. Bằng chứng ở `audit/unified-staff-orders-2026-11-14`.
