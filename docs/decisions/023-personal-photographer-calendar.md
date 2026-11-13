# ADR-023: Lịch tháng riêng cho thợ chụp

## Trạng thái và ngày

Accepted — 13/11/2026, sau khi người dùng duyệt mockup lịch cá nhân.

## Bối cảnh

Màn lịch cũ dùng chung công cụ quản lý và chỉ nhận một trang tối đa 20 lịch. Vì vậy, dùng danh sách đó để vẽ lịch tháng có thể thiếu buổi chụp. Người dùng muốn thợ chỉ thấy lịch được phân công cho chính mình, với tất cả ngày trong tháng.

## Quyết định

- Tài khoản có role 3 nhưng không có role quản lý 0/1/2/4 mở lịch cá nhân tại `/schedules`. Tài khoản kiêm kế toán (3/5) vẫn dùng lịch cá nhân. Admin/sale giữ màn quản lý hiện có.
- `GET /api/schedules/mine/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` yêu cầu role 3, luôn giới hạn theo ID đăng nhập ở `leadPhotographer` hoặc `supportPhotographers`, kể cả tài khoản nhiều vai trò. Không nhận ID thợ để mở rộng quyền.
- Khoảng ngày hợp lệ dài tối đa 42 ngày, tính trọn ngày Việt Nam: từ 00:00 ngày đầu đến trước 00:00 ngày sau ngày cuối. Trả tất cả lịch trong khoảng, không phân trang. Chỉ trả ID, ngày/giờ, địa điểm, trạng thái, ghi chú, loại dịch vụ, tên và vai trò của người đang đăng nhập; không trả tài chính hoặc hồ sơ khách đầy đủ.
- Lưới 6 tuần bắt đầu từ thứ hai, có tháng trước/sau, Hôm nay, chọn ngày và chi tiết buổi chụp. Lịch concept lấy từ Schedule đã phân công; không trộn các giữ chỗ chưa thanh toán vào lịch công việc. Trạng thái dùng dữ liệu đã lưu, không suy diễn “đang chụp” chỉ vì cùng ngày.
- Dùng sidebar, logo, phông chữ và token sáng/tối sẵn có. Điện thoại dùng dấu chấm/số lịch trong ô ngày và chi tiết bên dưới. Lịch tháng cá nhân bao gồm phân công ở mọi mùa trong tháng đang xem, không phụ thuộc bộ lọc mùa của màn quản lý.
- Đọc lại khi mở/chuyển tháng; hủy request cũ khi chuyển tháng/tài khoản. Đây là lịch chỉ đọc, không tạo/sửa lịch và không thay đổi cơ sở dữ liệu hay cấu hình thanh toán.

## Kiểm chứng

Kiểm thử HTTP không kết nối DB: role, ID người gọi, thợ chính/phụ, tài khoản nhiều vai trò, hơn 20 lịch, biên ngày Việt Nam, ngày sai và khoảng vượt 42 ngày. Kiểm thử giao diện: lưới đủ ngày, đổi tháng/Hôm nay, chọn buổi/ngày trống, vai trò phụ, lỗi/thử lại, phản hồi request cũ và giữ màn quản lý. Kiểm tra trực tiếp tài khoản thợ trên `studio_db`; ảnh đối chiếu và báo cáo nằm ở `audit/personal-calendar-2026-11-13` và `design-qa.md`.
