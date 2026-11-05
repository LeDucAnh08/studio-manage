# ADR-011: Thống nhất trạng thái hiển thị của đơn chụp ảnh

## Trạng thái và ngày

Accepted — 05/11/2026, Asia/Bangkok. Thay thế quy ước bộ lọc đơn chụp ảnh trong ADR-004 và ADR-007.

## Bối cảnh

Bộ lọc gom mọi đơn chưa kết thúc thành “Đang thực hiện”, trong khi danh sách và hồ sơ dùng nhiều nhãn workflow khác nhau. Khách và nhân viên không biết phải chọn bộ lọc nào để tìm một trạng thái đang thấy.

## Quyết định

Đơn chụp ảnh dùng tám trạng thái hiển thị, thống nhất giữa bộ lọc, danh sách, tóm tắt và tiêu đề hồ sơ:

| Mã | Nhãn | Điều kiện |
| --- | --- | --- |
| pending | Chờ duyệt | Yêu cầu chưa duyệt |
| awaiting_confirmation | Chờ chốt lịch | Đã duyệt; đang báo giá, chờ cọc hoặc chờ xác nhận lịch |
| confirmed | Đã chốt lịch | Lịch đã xác nhận, chưa bắt đầu chụp |
| active | Đang thực hiện | Đang chụp, hậu kỳ hoặc chỉnh sửa ảnh |
| delivered | Đã bàn giao | Đã gửi ảnh; có thể đang chờ nghiệm thu hoặc thanh toán số dư |
| completed | Hoàn tất | Đã nghiệm thu và hoàn tất nghĩa vụ thanh toán |
| cancelled | Đã hủy | Yêu cầu hoặc workflow đã hủy |
| rejected | Đã từ chối | Studio từ chối yêu cầu |

Ưu tiên từ chối, hủy, rồi chờ duyệt trước khi suy ra giai đoạn từ workflow. Yêu cầu thay đổi chưa hoàn tất giữ giai đoạn trước đó (`previousLifecycle`); phản hồi thay đổi vẫn hiện riêng trong hồ sơ. Các bước nghiệp vụ, quyền thao tác, thanh toán, thông báo và dữ liệu cũ không đổi; không cần migration.

`GET /api/workflows?stage=...` lọc theo cùng phép ánh xạ với `orderStage` trong summary và workflow DTO, trước phân trang và đếm tổng, sau điều kiện quyền truy cập. Query không hợp lệ trả 400. `view` và `status` cũ vẫn được hỗ trợ với nghĩa cũ cho các client cũ; giao diện mới gửi `stage`. Tham số URL giao diện `view` tiếp tục lưu lựa chọn hiện tại để giữ chức năng quay lại hồ sơ.

Tab thuê trang phục giữ quy ước riêng của nghiệp vụ thuê.

Tiến độ đơn chụp ảnh dùng chung `BookingOrderProgress` ở phần xem nhanh, hồ sơ mới tiếp nhận và chi tiết cho khách/nhân viên. Sáu mốc giữ nguyên tên như trạng thái: Chờ duyệt → Chờ chốt lịch → Đã chốt lịch → Đang thực hiện → Đã bàn giao → Hoàn tất. Mốc hiện tại dùng `aria-current="step"`; các mốc trước đánh dấu hoàn thành. Hủy/từ chối chỉ hiện các mốc đã đạt và kết quả kết thúc, không gợi ý tiếp tục. Cọc, hậu kỳ và chỉnh sửa là mô tả bên trong mốc, không tạo thêm một tiến trình riêng.

## Hệ quả và kiểm chứng

Người dùng lọc bằng đúng nhãn đang thấy trên đơn; chi tiết chụp, hậu kỳ, cọc và thay đổi được đọc trong hồ sơ. Backend kiểm thử các lifecycle, đơn cũ chưa có workflow, thay đổi đang chờ xử lý, phân trang, dữ liệu thuộc khách khác và query không hợp lệ. Frontend kiểm thử tên bộ lọc/nhãn đơn, khôi phục URL và hiển thị theo vai trò.
