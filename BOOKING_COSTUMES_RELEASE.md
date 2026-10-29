# Trang phục trong yêu cầu đặt chụp

Ngày 26/10/2026, Asia/Bangkok. **Luồng khách hiện tại có ba bước: chọn gói → lớp và thời gian → kiểm tra.** Trang phục đã gồm trong gói, studio tư vấn mẫu và size khi chốt lịch; wizard không gửi lựa chọn hoặc tạo giữ kho. Bản nháp v3 chuyển v1/v2 sang ba bước và bỏ lựa chọn trang phục cũ. Xem [quyết định hiện tại](docs/decisions/002-package-included-costumes.md).

Phần giữ kho và API bên dưới được giữ để xử lý hồ sơ/lựa chọn đã tồn tại hoặc API tương thích. Đây không còn là luồng chọn trang phục của wizard. Xem [quyết định giữ kho ban đầu](docs/decisions/001-booking-costume-holds.md).

## Hành vi

- Chỉ quần áo thuộc các CostumeType của gói; không phụ thuộc cờ cho thuê riêng. Cho chọn nhiều mẫu và size, tổng trong mỗi loại tối đa bằng sĩ số; không thêm phí.
- Xem danh mục chưa giữ kho. Gửi thành công giữ trọn các ngày Việt Nam từ ngày bắt đầu tới ngày kết thúc, trong 24 giờ. Hạn này tính từ khi tạo, không kéo dài khi gửi lại.
- Studio duyệt chuyển giữ tạm thành giữ tiếp tới khi chốt lịch. Duyệt sau hết hạn phải kiểm tra kho lại; thiếu kho trả 409 và vẫn chờ duyệt.
- Từ chối, admin bỏ giữ hoặc hủy theo workflow giải phóng kho. Bỏ giữ không xóa yêu cầu hoặc lịch sử lựa chọn. Admin có thể bỏ giữ yêu cầu đã hết hạn rồi duyệt mà không giữ trang phục.
- Xác nhận nguồn lực chuyển giữ sang Schedule trong cùng transaction; số lượng/ngày của phân bổ cuối cùng được kiểm tra lại. Thông tin chọn ban đầu vẫn là lịch sử, không thay thế hồ sơ size từng thành viên.
- Không cần sửa Booking cũ hoặc xóa phần giữ đang tồn tại khi triển khai wizard ba bước.

## API

Các đường dẫn dưới đây có tiền tố `/api` và dùng envelope hiện có `{ success, message, data }`.

| Endpoint                                              | Dữ liệu / kết quả                                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /public/packages/:id/costumes?startAt=…&endAt=…` | Ngày giờ ISO có múi giờ; tương lai, khoảng tối đa 7 ngày. Trả `[{ _id, name, description?, gender, typeId, typeName, availableBySize }]`, gồm mẫu hết kho với map rỗng. Không trả danh tính người giữ hoặc tồn theo tình trạng. |
| `POST /bookings`                                      | Thêm `costumeSelections?: [{ costumeId, size, quantity }]`; thiếu/rỗng không giữ. Tối đa 100 dòng, ID hợp lệ, số lượng nguyên dương và không trùng mẫu–size. Giữ quyền khách hàng và `Idempotency-Key` hiện có.                 |
| `GET /bookings/:id`, `GET /bookings/:id/workflow`     | Khách sở hữu/admin nhận `costumeSelections` có tên mẫu/loại chụp tại lúc gửi và `costumeHold`. Booking cũ có danh sách rỗng và hold null.                                                                                       |
| `PATCH /bookings/:id/review`                          | Hợp đồng hiện có; duyệt/từ chối cập nhật phần giữ cùng quyết định.                                                                                                                                                              |
| `PATCH /bookings/:id/costume-hold/release`            | Chỉ admin 0/1, body `{ note }`, lý do 1–2.000 ký tự. Chỉ trước lịch chính thức; lặp lại không thêm sự kiện hoặc thay lý do cũ.                                                                                                  |

`costumeHold.status` trả về `temporary`, `expired`, `approved`, `released` hoặc `transferred`; kèm `receiveDate`, `returnDate`, `expiresAt?`, `releaseReason?`. `expired` được tính khi đọc, không cần worker. Không có TTL index xóa Booking.

`POST /bookings` bắt buộc `phone` là chuỗi tối đa 25 ký tự. Định dạng nhận: 10 chữ số bắt đầu bằng `0` (chữ số tiếp theo khác `0`) hoặc thay `0` đầu bằng `+84`; cho phép dấu cách, chấm, gạch nối và ngoặc để trình bày. Số sai trả `400` kèm thông báo cụ thể, không tạo Booking. Wizard kiểm tra khi rời ô nhập, trước khi xem lại và trước khi gửi; giữ nguyên định dạng người dùng đã nhập sau khi cắt khoảng trắng hai đầu.

Với API có lựa chọn trang phục, thiếu kho trả 409, `data.costumeConflicts: [{ costumeId, name, size, available }]`. Validation khác trả 400. MongoDB không hỗ trợ transaction trả 503 cho thao tác giữ, không tạo yêu cầu dở dang. Wizard hiện tại không gửi lựa chọn và không phụ thuộc endpoint khả dụng này.

## Triển khai và kiểm tra

- Dùng MongoDB replica set/mongos và cấu hình [WORKFLOW_RELEASE.md](WORKFLOW_RELEASE.md) có sẵn. Không thêm dependency, worker hay biến môi trường mới.
- Khi `CLIENT_PORTAL_ENABLED=true`, các thao tác ghi kho/lịch dùng transaction cả khi chưa có phần giữ nào, để tránh tranh chấp với yêu cầu đầu tiên. Tắt workflow/rental riêng không tắt bảo vệ này.
- Triển khai toàn bộ backend cùng lúc: các phép tính kho của đơn thuê, lịch chụp, workflow và bảo vệ sửa tồn phải cùng biết phần giữ Booking. Không rollback riêng các phép tính kho khi còn phần giữ hoạt động; chờ hết hạn hoặc admin giải phóng trước.
- Thông tin gói lấy các CostumeType đã liên kết; chưa cấu hình thì hiển thị studio sẽ tư vấn chi tiết. API giữ kho cũ vẫn kiểm tra `itemKind=clothing` và tồn tình trạng `good` theo size.
- `yarn workspace studio-management-backend test:booking-costumes` dùng CSDL local riêng `studio_booking_costume_test`. Có thể đặt `MONGO_TEST_URI` cho replica set local; mặc định kiểm thử riêng ở cổng 27031, replica set `bookingtest`. Chỉ CSDL kiểm thử này được dọn sau chạy.
- Frontend: `yarn workspace studio-management-frontend test`; E2E: `yarn test:e2e`, dùng CSDL riêng `studio_phase1_e2e` theo cấu hình hiện có. Hai bài E2E trang phục kiểm desktop 1440px và mobile 390px: thông tin gói, ba bước, tải lại bản nháp, gửi và duyệt không tạo giữ kho.

Không chạy seed/reset dữ liệu ứng dụng để bật tính năng. Các bài kiểm thử tích hợp yêu cầu MongoDB local đã chạy; không tự khởi động hoặc chỉnh cấu hình database của ứng dụng.
