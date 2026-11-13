# ADR-022: Khôi phục thông tin khi đặt lại dịch vụ

## Trạng thái và ngày

Accepted — 13/11/2026, Asia/Bangkok.

## Bối cảnh

Nút “Đặt lại dịch vụ” trước đây chỉ mở danh mục/form mới, khiến khách phải nhập lại đơn khi QR cọc hết hạn. Người dùng yêu cầu khôi phục đầy đủ thông tin đã nhập khi bấm nút này.

## Quyết định

- Khôi phục từ hồ sơ đã lưu trên server, không phụ thuộc bản nháp trước thanh toán còn trong trình duyệt. Thuê lấy mẫu/size/số lượng, kỳ thuê và liên hệ/ghi chú từ quote hiện có; concept lấy gói, giờ/thợ, số người, số đo, liên hệ, ý tưởng và các liên kết tham khảo; kỉ yếu lấy gói, lớp/trường, lịch, địa điểm, liên hệ, ghi chú và danh sách học sinh.
- Điền lại vào bước kiểm tra của lần đặt mới; form vẫn cho chỉnh sửa. Thêm `booking.packageId` vào DTO workflow cho chủ đơn/quản lý để xác định đúng gói thay vì tìm bằng tên.
- Mỗi lần bấm tạo một draft riêng với chủ sở hữu hiện tại và định danh khôi phục mới. Router state làm nguồn dự phòng khi storage không dùng được; session draft cùng định danh được ưu tiên khi tải lại để giữ chỉnh sửa và khóa gửi lại đã tạo sau đó.
- Giữ lịch sử, tiền đã nhận và QR hết hạn trên đơn cũ. Không mở lại giữ chỗ cũ, kéo dài deadline hoặc sao chép giá/consent/giao dịch sang đơn mới. Thuê và kỉ yếu cần đồng ý lại điều khoản; concept cần đồng ý lại và kiểm tra lịch/thợ hiện còn trống trước khi gửi. Backend tiếp tục quyết định giá, tài nguyên và việc tạo QR của đơn mới.
- Khi lịch/thợ không còn phù hợp, giữ thông tin chuẩn bị và dẫn khách chọn lại; khi ngày thuê/tồn kho/gói không hợp lệ, áp dụng validation hiện tại của form.

## Kiểm chứng

Kiểm thử ba nút đặt lại, đầy đủ trường nhập, múi giờ Việt Nam, khóa gửi mới, không sao chép khoản thu/QR cũ, xem lại với consent chưa chọn, giữ chỉnh sửa và khóa retry khi reload, và chặn tạo đơn concept khi lịch/thợ cũ không còn trống. Các kiểm thử dùng dịch vụ mock; không tạo đơn/giao dịch trong `studio_db`.
