# ADR-039: Loại bỏ tích hợp Telegram

## Trạng thái và ngày

Accepted — 25/11/2026, Asia/Bangkok. Người dùng yêu cầu rà soát phạm vi và xóa Telegram khỏi hệ thống.

## Bối cảnh

Telegram được dùng để liên kết tài khoản nhân viên với bot, hiển thị trạng thái trong hồ sơ và danh sách người dùng, và gửi thông báo khi tạo/cập nhật lịch hoặc tạo giao dịch. Tích hợp không tham gia xác nhận thanh toán, giữ kho, phân công ekip hay xử lý ảnh.

## Quyết định

- Gỡ phần liên kết bot khỏi hồ sơ, cột Telegram khỏi bảng người dùng, và service gọi API ở frontend.
- Gỡ toàn bộ `/api/telegram`, webhook, controller và service gửi tin. Xóa các tác vụ gửi tin Telegram khỏi controller lịch và giao dịch; giữ nghiệp vụ lưu dữ liệu, kiểm tra tài nguyên và đồng bộ Drive/Sheet.
- Bỏ bốn trường `telegramId`, `telegramUsername`, `telegramLinkToken`, `telegramLinkTokenExpiry` khỏi schema và kiểu tài khoản. Không thay vai trò hay thông tin đăng nhập.
- Các API trả tài khoản dùng danh sách trường cho phép để dữ liệu cũ chưa dọn không lộ ra; chi tiết giao dịch cũng giới hạn trường người tạo như danh sách giao dịch.
- Xóa các biến `TELEGRAM_*` trong cấu hình hiện tại và mẫu; bỏ cấu hình bot khỏi các công cụ demo/kiểm thử.
- Dùng `yarn workspace studio-management-backend migrate:remove-telegram` để kiểm tra dữ liệu cũ. Thêm `--apply` để sao lưu riêng bốn trường vào file BSON trong thư mục tạm rồi `$unset` chúng trên `users` của `studio_db` đang cấu hình. Lệnh không thay `updatedAt`, mật khẩu, email, vai trò hoặc các dữ liệu nghiệp vụ. Chạy lại không tạo thay đổi khi các trường đã được xóa.
- Cleanup chỉ xóa nếu cả bốn giá trị vẫn khớp bản sao lưu (phân biệt trường thiếu với `null`). Nếu có thay đổi đồng thời, giữ giá trị mới và báo kiểm chứng thất bại kèm đường dẫn sao lưu.
- Không gọi API Telegram để gửi tin, hủy webhook hay thay đổi bot bên ngoài. Thông báo nội bộ và email hiện có tiếp tục theo luồng riêng.
- Sơ đồ use case hiện hành không còn liên kết hay nhận thông báo Telegram. Tài liệu kiểm toán lịch sử giữ nguyên bằng chứng của thời điểm đã ghi.

## Kiểm chứng

- Build backend/frontend và chạy test hồ sơ, điều hướng tài khoản, tài khoản/đăng ký, phân công thợ và tài chính liên quan.
- Kiểm tra giao diện hồ sơ và danh sách người dùng không còn Telegram hoặc yêu cầu mạng tới Telegram.
- Sau khi áp dụng cleanup, kiểm tra không còn bốn trường cũ và tổng số tài khoản không đổi; chạy lại để xác nhận không còn dữ liệu cần xóa.

Kết quả thực hiện: build backend/frontend thành công; 34 test frontend và 21 test backend liên quan đều qua. Kiểm tra Chrome với API doubles cho vai trò 0/1/3/6 xác nhận hồ sơ trên desktop/mobile vẫn lưu được, bảng người dùng không còn cột Telegram, không có lỗi trình duyệt hoặc yêu cầu API Telegram. Các endpoint bot cũ trả 404; health vẫn trả 200 mà không cần kết nối database trong test đó.

Cleanup được áp dụng trên Atlas `studio_db`: 28 tài khoản được bỏ bốn trường cũ, số tài khoản giữ nguyên, kiểm tra BSON xác nhận mọi trường khác không đổi. Bản sao lưu chỉ chứa ID và dữ liệu Telegram được lưu ngoài repository; chạy lại lệnh kiểm tra cho kết quả 0 bản ghi cần dọn. Các cảnh báo build sẵn có về Browserslist và phân chia bundle không thuộc thay đổi Telegram.
