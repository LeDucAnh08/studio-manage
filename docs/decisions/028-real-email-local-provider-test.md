# ADR-028: Email thật cùng SePay provider Test trên studio_db local

## Trạng thái và ngày

Accepted — 14/11/2026, Asia/Bangkok. Thay thế riêng quy tắc chặn email thật khi SePay provider Test chạy trên app chính local trong ADR-012, ADR-015 và ADR-021.

Mở rộng ngày 25/11/2026 bởi [ADR-038](038-atlas-provider-test-email.md): hỗ trợ `studio_db` trên MongoDB Atlas với opt-in riêng theo lựa chọn của người dùng; quy tắc loopback dưới đây vẫn áp dụng cho cấu hình local.

## Bối cảnh

Người dùng yêu cầu giữ dữ liệu `studio_db`, SePay provider Test và nhận email thật vào hộp thư. Database app chính không phải database sandbox riêng; cờ thanh toán Test không nên ngăn chức năng email đã được người dùng bật rõ ràng.

## Quyết định

- Cho phép `EMAIL_ENABLED=true`, `EMAIL_MODE=resend` cùng `SEPAY_ENABLED=true`, `SEPAY_MODE=sandbox` chỉ khi bật `SEPAY_TEST_ON_MAIN_DB=true`, `NODE_ENV=development`, database đúng `studio_db` và MongoDB là loopback. Email và thanh toán dùng chung hàm kiểm tra ngoại lệ này.
- Database riêng `studio_email_*` và `studio_sepay_*` luôn bị chặn gửi thật, kể cả khi bật cờ ngoại lệ hoặc tắt SePay. Email `test` vẫn chỉ dành cho database riêng trên loopback, ngoài production.
- Giữ nguyên `MONGO_URI`, payment Test snapshots, xác thực webhook và giới hạn simulation. Không chuyển sang SePay live hoặc đổi database để bật email.
- Resend vẫn cần API key hợp lệ, địa chỉ gửi được provider chấp nhận và `EMAIL_PUBLIC_URL` đã cấu hình. Với ngrok, dùng origin HTTPS của frontend để người nhận mở link trên thiết bị khác; không có path/query/fragment. HTTP loopback vẫn được phép khi development theo ADR-015.
- Không đổi xác minh người nhận, outbox, lease, retry hoặc idempotency. Email thật có thể được gửi đến khách đã đủ điều kiện khi bật worker; chế độ thanh toán Test không biến email thành giả.

## Kiểm chứng

`node --test backend/tests/email-config.cjs backend/tests/sandbox-startup.cjs` kiểm tra chấp nhận opt-in local, từ chối thiếu cờ/production/test/host remote/database khác và tiếp tục chặn gửi thật trên sandbox riêng. Bộ kiểm tra không kết nối database hay gọi provider. Kiểm tra TypeScript bằng `yarn workspace studio-management-backend build`.
