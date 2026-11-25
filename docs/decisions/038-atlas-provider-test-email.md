# ADR-038: Resend thật cùng SePay Test trên MongoDB Atlas

## Trạng thái và ngày

Accepted — 25/11/2026, Asia/Bangkok. Mở rộng ADR-028 theo lựa chọn rõ ràng của người dùng: tiếp tục dùng MongoDB Atlas đang cấu hình, không khôi phục MongoDB Windows.

## Bối cảnh

Ứng dụng đang kết nối `studio_db` trên Atlas, bật Resend thật và SePay provider Test. Kiểm tra chỉ cho phép MongoDB loopback trong ADR-028 khiến backend dừng với `Sandbox cannot send real email`.

## Quyết định

- Giữ nguyên `MONGO_URI`, dữ liệu và cấu hình provider hiện tại. Không sao chép, seed hay chuyển database.
- Trên Atlas, yêu cầu đồng thời `SEPAY_TEST_ON_MAIN_DB=true`, `SEPAY_TEST_ON_ATLAS=true`, `NODE_ENV=development`, database chính xác `studio_db` và hostname kết nối có hậu tố DNS `.mongodb.net`. Cờ Atlas mặc định tắt; không mở quyền cho host từ xa tùy ý hoặc production.
- Email và thanh toán dùng chung `mainDatabaseProviderTestEnabled`. Resend vẫn kiểm tra cấu hình gửi và người nhận; SePay vẫn dùng provider Test và webhook đã xác thực.
- Giữ ngoại lệ loopback cũ. Database `studio_email_*`/`studio_sepay_*` vẫn bị chặn gửi email thật. Email test chỉ dùng database local cô lập. Giả lập thanh toán nội bộ vẫn không được bật trên `studio_db`, kể cả khi `SEPAY_DEMO_UI=true`.
- Không đổi mode background jobs trong lần sửa này. Runbook Redis/worker local trong ADR-037 không tự áp dụng cutover lên Atlas.

## Kiểm chứng

`node --require ./backend/tests/environment.cjs --test backend/tests/email-config.cjs backend/tests/sandbox-startup.cjs` kiểm tra cấu hình Atlas và loopback, thiếu từng opt-in, môi trường production/test, hostname giả hậu tố, database khác và chặn simulation. Các test không kết nối database hay gọi provider.

Biên dịch bằng `yarn workspace studio-management-backend build`. Kiểm tra khởi động dùng URI hiện có và endpoint `/api/health`; không gửi email hoặc tạo thanh toán thử để xác minh.
