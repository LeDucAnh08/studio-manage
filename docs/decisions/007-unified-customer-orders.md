# ADR-007: Bố cục chung cho đơn chụp ảnh và thuê trang phục

## Trạng thái và ngày

Accepted — 31/10/2026, Asia/Bangkok. Người dùng yêu cầu thống nhất giao diện trong Đơn của tôi để dễ theo dõi.

## Bối cảnh

Tab chụp ảnh dùng danh sách và bảng tiến độ bên cạnh; tab thuê trang phục dùng thẻ dẫn thẳng vào hồ sơ. Cách chọn đơn, đọc trạng thái và mở thông tin khác nhau giữa hai loại dịch vụ.

## Quyết định

- Cả hai tab tại `/account/orders` dùng `CustomerOrdersWorkspace`: bộ lọc trạng thái, tải lại, danh sách chọn đơn, phân trang và vùng tóm tắt/tiến độ. Desktop có hai cột; mobile xếp dọc theo CSS hiện có.
- Dùng chung `CustomerOrderProgress` và định dạng ngày Việt Nam. Mỗi luồng tự xác định mốc nghiệp vụ: lịch chụp/bàn giao ảnh hoặc giữ trang phục/giao nhận. Đơn hủy/từ chối chỉ hiển thị các mốc đã đạt, tránh gợi ý khách tiếp tục thực hiện.
- Tab thuê dùng dữ liệu danh sách đã được giới hạn theo khách hàng để hiển thị tóm tắt, không cần gọi thêm một API chi tiết khi đổi lựa chọn. Nút Xem hồ sơ đầy đủ giữ các thao tác theo quyền hiện có ở từng hồ sơ.
- Bộ lọc chung gồm tất cả, đang thực hiện, hoàn tất, đã hủy và đã từ chối. `GET /api/rentals?page=...&view=...` lọc trước khi phân trang và đếm tổng. `active` gồm requested, quoting, awaiting_deposit, ready_to_confirm, confirmed, checked_out, returned. Các view không hợp lệ trả 400; điều kiện sở hữu đơn vẫn áp dụng.
- Tham số `tab`, `view`, `page`, `order` lưu trạng thái màn hình trong URL. Đổi tab đặt lại bộ lọc; quay lại bằng lịch sử khôi phục tab cũ. Hồ sơ thuê nhận `ordersReturnTo` đã kiểm tra chỉ thuộc `/account/orders` để quay lại đúng đơn và bộ lọc, giống hồ sơ chụp ảnh.

## Hệ quả và kiểm chứng

Hai loại đơn vẫn giữ mô hình, trạng thái và thao tác nghiệp vụ riêng; phần trình bày chung tránh hai tab khác bố cục khi phát triển tiếp. Trang quản lý đơn thuê của nhân viên tiếp tục dùng danh sách hiện có.

Kiểm thử gồm `CustomerOrdersPage.test.tsx`, `CustomerOrders.test.tsx`, `DailyRentalPricing.test.tsx` và `backend/tests/rental-access.cjs`: chuyển tab, chọn đơn, mốc tiến độ, trạng thái kết thúc, lọc/phân trang/retry, giữ điều kiện sở hữu và từ chối query không hợp lệ. Kiểm tra trình duyệt dùng tài khoản demo có sẵn, chỉ đọc danh sách và hồ sơ.
