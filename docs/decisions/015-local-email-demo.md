# ADR-015: Link xác minh email khi demo local

## Trạng thái và ngày

Accepted — 10/11/2026, Asia/Bangkok. Thay thế riêng yêu cầu HTTPS của ADR-012 trong môi trường development trên loopback.

## Quyết định

Demo local cần nhận thư Resend thật và mở link xác minh trên cùng máy, không cần triển khai frontend hoặc tunnel. `EMAIL_PUBLIC_URL` vẫn được cấu hình phía server và không lấy từ request. Cho phép HTTP với hostname chính xác `localhost`, `127.0.0.1` hoặc `[::1]` khi `NODE_ENV=development`. Production và môi trường không khai báo vẫn yêu cầu HTTPS khi dùng Resend. Không cho phép credentials, path, query hoặc fragment trong origin.

```dotenv
NODE_ENV=development
EMAIL_ENABLED=true
EMAIL_MODE=resend
EMAIL_FROM="Yume Studio <onboarding@resend.dev>"
EMAIL_PUBLIC_URL=http://localhost:4001
RESEND_API_KEY=your-server-api-key
```

Đây là cấu hình cho frontend Vite ở cổng 4001. Mở link từ thư trên chính máy chạy frontend; mở trên điện thoại sẽ trỏ về điện thoại. Với địa chỉ gửi thử `onboarding@resend.dev`, chỉ gửi đến email đăng ký tài khoản Resend. Worker gửi thật vẫn giữ kiểm tra sandbox, timeout và idempotency của ADR-012; chế độ `test` tiếp tục chỉ dùng database sandbox riêng.

## Kiểm chứng và nguồn

`node --test backend/tests/email-config.cjs` kiểm tra các địa chỉ loopback, chặn HTTP ngoài loopback, origin có credentials/path/query/fragment và HTTP loopback ngoài development; không kết nối database hoặc gửi thư.

- [Giới hạn người nhận với resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
