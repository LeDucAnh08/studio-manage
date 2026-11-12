# ADR-021: SePay provider Test mode trên app chính local

## Trạng thái và ngày

Accepted — 12/11/2026, Asia/Bangkok. Cập nhật giới hạn database Test mode trong ADR-010 theo yêu cầu rõ ràng của người dùng.

## Bối cảnh

App chính `4001`/`5002` có catalog và đơn trong `studio_db` nhưng đang tắt SePay. Đơn thuê được tạo tự động nhưng thiếu QR; người dùng yêu cầu QR tự tạo ngay, không đợi admin, và chọn dùng SePay Test mode trên app chính với database cũ.

## Quyết định

- Giữ nguyên `MONGO_URI`, bật `SEPAY_ENABLED=true`, `SEPAY_MODE=sandbox`, `SEPAY_TEST_ON_MAIN_DB=true`. Ngoại lệ chỉ có hiệu lực khi `NODE_ENV=development`, database đúng `studio_db` và MongoDB là loopback. Production, host remote hoặc database khác vẫn bị chặn nếu không phải sandbox riêng.
- `SEPAY_DEMO_UI=false` và bộ kiểm tra simulation vẫn yêu cầu database sandbox riêng; không cho nút/API tự xác nhận thanh toán nội bộ trên `studio_db`. Tiền Test mode được ghi nhận từ webhook HMAC của provider và giữ `mode=sandbox` trên snapshot/receipt. Email thật vẫn bị chặn khi chạy Test mode; cấu hình local giữ email tắt.
- Tạo đơn thuê đã gọi `rentalPaymentSnapshot` ngay trong transaction giữ hàng. Khi cấu hình được bật, response tạo đơn có QR đúng số cọc 30%, tài khoản và reference; không có thao tác admin tạo QR.
- Đơn tự động tạo trước lúc bật SePay có thể bổ sung snapshot bằng `npm run sepay:maintenance -- backfill-rentals --apply`. Chỉ áp dụng khi còn hạn, giữ hàng còn hiệu lực, đã chốt giá, chưa có snapshot và chưa ghi nhận tiền. Không đổi phí/cọc, gia hạn hoặc thay reference đã có; chạy lặp không thêm snapshot thứ hai. Không tạo payment intent qua GET.
- Tunnel hiện có giữ URL công khai và path `/api/payments/sepay/webhook`, chuyển upstream sang `http://127.0.0.1:5002`. Nếu khởi động lại thủ công, dùng `ngrok http http://127.0.0.1:5002`. Chỉ trỏ về `5013` khi chủ động dùng sandbox riêng.

## Kiểm chứng

Kiểm thử opt-in theo môi trường/host/database, simulation bị chặn trên app chính, tạo/bổ sung QR đúng một lần, webhook và toàn bộ vòng đời cọc thuê trên MongoDB thử nghiệm riêng. Xác minh cấu hình đang chạy giữ `studio_db`, API đơn còn hạn trả QR pending và webhook HTTPS chấp nhận chữ ký nhưng từ chối payload rỗng trước khi ghi nhận giao dịch.
