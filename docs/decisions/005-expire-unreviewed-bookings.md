# ADR-005: Tự hủy yêu cầu chưa duyệt đã quá ngày chụp

## Trạng thái và ngày

Accepted — 30/10/2026, Asia/Bangkok.

## Bối cảnh

Yêu cầu đặt chụp đã qua ngày mong muốn vẫn nằm trong Chờ duyệt dù không thể duyệt lại. Chủ sản phẩm yêu cầu tự chuyển các yêu cầu đó sang Đã hủy.

## Quyết định

Chỉ tự hủy Booking có `status=pending` và `startAt` trước đầu ngày hiện tại theo giờ Việt Nam. Ngày hiện tại chưa kết thúc thì không hủy chỉ vì đã qua giờ bắt đầu. Ví dụ, ngày chụp 30/10 được tự hủy từ 00:00 ngày 31/10 nếu vẫn chưa duyệt. Đơn đã được duyệt, từ chối hoặc đã hủy không bị thay đổi. Lịch chụp nội bộ và các dịch vụ đã xác nhận không thuộc quy tắc này.

Booking bổ sung trạng thái `cancelled`, `cancelledAt` và `cancellationReason`. Hệ thống ghi lịch sử cho khách và admin; giải phóng phần giữ trang phục trên yêu cầu. Nếu đã có workflow tiếp nhận để phân công ekip, chuyển nó sang `cancelled` và tăng phiên bản trong cùng resource transaction. Không tự hủy bản ghi không nhất quán đã có báo giá, thanh toán hoặc liên kết lịch chính thức; chúng cần được đối soát thay vì bỏ nguồn lực hoặc tiền đã ghi nhận.

Worker chạy ngay sau khi kết nối database, sau đó mỗi phút, không chạy chồng chính nó. Đọc danh sách/chi tiết/thông báo và thao tác trên đơn cũng cập nhật các yêu cầu quá hạn trước khi xử lý. Điều kiện `pending` được kiểm tra lại trong transaction, nên duyệt và hủy đồng thời không ghi đè nhau, gọi lại không lặp lịch sử.

API booking/workflow trả trạng thái, thời điểm và lý do hủy. `view=cancelled` gồm cả yêu cầu hủy chưa từng có workflow; `view=active` loại chúng ra. Bộ lọc thực hiện trước phân trang và giữ giới hạn theo tài khoản. Cả khách, admin và thợ được giao thấy đúng trạng thái; đơn hủy không còn nút duyệt/phân công. Các luồng hủy dịch vụ đã duyệt và hoàn tiền hiện có được giữ nguyên.

## Hệ quả

Không xóa lịch sử hoặc đơn. Không cần cập nhật dữ liệu thủ công: worker bắt kịp dữ liệu cũ khi backend hoạt động lại, API cũng cập nhật trước khi trả kết quả. Cơ chế dùng transaction MongoDB hiện có và index `{status, startAt}`. Nếu backend dừng, việc tự hủy được xử lý khi chạy lại.

Kiểm tra: `backend/tests/booking-expiry.cjs` kiểm chứng mốc ngày Việt Nam, chạy lại/đồng thời, giữ trang phục, dữ liệu đã cam kết, worker và API; giao diện được kiểm tra qua các bài CustomerOrders, BookingWorkflowListPage và luồng browser phân công.
