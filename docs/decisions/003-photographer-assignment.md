# ADR-003: Thợ chính kiêm chăm khách và tra cứu lịch trống

## Trạng thái và ngày

Accepted — 29/10/2026, Asia/Bangkok.

## Bối cảnh

Studio nhỏ giao cùng một thợ chăm khách và phụ trách chụp. Việc phân người chăm khách cần thực hiện từ lúc tiếp nhận, trước thời điểm đủ điều kiện giữ lịch. Danh sách thợ cần phản ánh cả lịch chụp và thời gian không nhận việc.

## Quyết định

Lưu `BookingWorkflow.assignedPhotographer` riêng với `resources.photographers`. Action `photographer.assign` chỉ dành cho admin, dùng `expectedVersion` và `Idempotency-Key` của workflow. Giao sớm không tạo Schedule hoặc giữ giờ. Khi xác nhận, người phụ trách phải là thợ chính; để tương thích client cũ, lần xác nhận chưa có người phụ trách sẽ lấy thợ đầu tiên trong danh sách. Đổi người trên lịch đã xác nhận đồng thời cập nhật Schedule và danh sách thợ được giữ trong một transaction. Không đổi phân công sau khi bắt đầu chụp, kết thúc đơn hoặc trong khi có đề xuất thay đổi chưa giải quyết.

Dữ liệu cũ không được cập nhật hàng loạt: khi đọc, dùng thợ chính của Schedule nếu chưa có trường mới. DTO chi tiết và danh sách bổ sung `assignedPhotographer: {_id, name} | null`. Thợ phụ trách được đọc thông tin liên hệ và ghi chú của đơn; thợ hỗ trợ đã được giữ lịch vẫn có quyền đọc phục vụ chụp. Quyền cập nhật tiến độ chỉ mở khi có lịch xác nhận. Báo giá, duyệt, xác nhận lịch và thanh toán giữ nguyên giới hạn quyền hiện có.

`photographerAvailability` là nguồn kiểm tra chung cho tra cứu, phân công, lịch thủ công, xác nhận, đổi lịch và bắt đầu chụp. Tính cả thợ chính và hỗ trợ trong các Schedule `pending`/`confirmed`; chừa tối thiểu 60 phút giữa hai buổi, kể cả qua nửa đêm. Lịch cũ thiếu hoặc sai giờ chặn phân công trong ngày và trả trạng thái `unknown`. Lịch riêng chặn đúng khoảng `[startAt, endAt)`, không cộng đệm. Múi giờ nghiệp vụ là `Asia/Ho_Chi_Minh`; API khoảng giờ yêu cầu ISO có múi giờ.

API mới dưới `/api/photographers`:

- `GET /availability?startAt=…&endAt=…&bookingId=…`: admin xem thợ đang hoạt động, trạng thái `available`/`busy`/`unknown`, lý do và lịch chụp trong ngày. Server xác định lịch của chính đơn để loại trừ; không nhận ID lịch loại trừ tùy ý. Ghi chú lịch bận riêng không được trả qua API này.
- `GET /unavailability?photographerId=…`: thợ chỉ đọc lịch của mình; admin chọn thợ cần quản lý.
- `POST /unavailability`, `PUT /unavailability/:id`: nhận `startAt`, `endAt`, `note` tùy chọn; admin tạo cho thợ qua `photographerId`, thợ tự tạo cho mình. Chủ sở hữu không đổi khi sửa.
- `DELETE /unavailability/:id`: chủ sở hữu hoặc admin xóa lịch bận.

Các thao tác giữ/đổi lịch và CRUD lịch bận dùng chung resource transaction/lock hiện có. Lịch bận mới hoặc được sửa không được trùng lịch chụp đang giữ. Tra cứu là ảnh chụp trạng thái tại thời điểm đọc; thao tác xác nhận luôn kiểm tra lại và trả 409 nếu đã có xung đột.

## Hệ quả

Cập nhật cùng ngày: admin được chọn ekip từ 1 đến 10 thợ ngay trên đơn. Giữ `assignedPhotographer` cho thợ chính kiêm chăm khách, bổ sung `assignedSupportPhotographers` cho thợ hỗ trợ dự kiến; cả hai tách khỏi phần giữ giờ. `photographer.assign` nhận `photographerIds` theo thứ tự thợ chính trước, hỗ trợ sau; danh sách đầy đủ thay thế phân công cũ. Payload `photographerId` cũ vẫn đổi thợ chính và giữ thợ hỗ trợ hiện có. Khi đọc dữ liệu cũ chưa có mảng hỗ trợ dự kiến, lấy từ Schedule đã liên kết. DTO chi tiết và danh sách bổ sung `assignedSupportPhotographers: {_id, name}[]`.

Thợ hỗ trợ được giao sớm thấy đơn và thông tin liên hệ phục vụ chụp; quyền cập nhật tiến độ vẫn cần lịch đã xác nhận. Khi xác nhận, hỗ trợ trong phần giữ nguồn lực được đồng bộ lại vào phân công để người bị bỏ khỏi ekip mất quyền truy cập. Đổi ekip đã xác nhận kiểm tra toàn bộ thợ và cập nhật lịch, phân công, quyền truy cập trong cùng transaction.

Một thợ có thể chăm nhiều đơn chưa chốt có thời gian dự kiến trùng nhau; chỉ đơn chốt thành công mới giữ giờ. Không tự động phân thợ, không tính quãng đường hoặc tải hậu kỳ, không thêm chat. Admin cần cân nhắc địa điểm từ lịch chụp hiển thị. Lịch bận riêng có thể kéo dài qua nhiều ngày. Triển khai thêm collection/index theo model Mongoose, không sửa dữ liệu ứng dụng cũ.

Kiểm tra bằng `node --test backend/tests/photographer-assignment.cjs`, frontend `PhotographerAssignment.test.tsx` và browser `photographer-assignment.spec.cjs`. Các bài tích hợp chỉ dùng database local cô lập, không dùng database ứng dụng.
