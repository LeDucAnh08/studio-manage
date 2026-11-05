# ADR-010: QR cọc và ghi nhận giao dịch SePay

## Trạng thái

Được chấp nhận — 05/11/2026. Áp dụng cho đơn chụp theo gói, tiếp nối ADR-008.

## Quyết định

Studio duyệt bằng luồng hiện có; cùng transaction tạo giữ ekip và snapshot `depositPayment`. Snapshot lưu tài khoản/ngân hàng, mã `YUME` duy nhất, chế độ, số cọc đã thỏa thuận và hạn ban đầu. DTO tính số tiền còn thiếu và hạn hiệu lực nhỏ hơn giữa snapshot với giữ lịch hiện tại. Đổi cấu hình nhận tiền làm QR cũ unavailable; không âm thầm đổi tài khoản đã chốt.

Khách chỉ quét/xác nhận tại ứng dụng ngân hàng. Không có nút tự khai “đã thanh toán”. Trang chi tiết kiểm tra trạng thái mỗi 5 giây khi đang chờ cọc và tab được xem; dừng khi kết thúc, hết hạn hoặc rời trang. Các GET giữ cơ chế tự xử lý hết hạn đã có của ADR-005; không tạo payment intent hoặc giao dịch tiền qua GET.

`POST /api/payments/sepay/webhook` đặt trước `express.json`, dùng raw bytes, `X-SePay-Timestamp` (±300 giây), `X-SePay-Signature: sha256=<hex>` và HMAC-SHA256 trên `timestamp.raw_body`. Chỉ giải mã JSON sau khi xác thực. Secret tối thiểu 32 ký tự. Đọc timestamp giao dịch ngân hàng theo UTC+7, độc lập timezone máy chủ.

Tiếp nhận chứng từ trước, sau đó áp dụng bằng transaction tài nguyên hiện có. Receipt pending sống qua lỗi/crash để replay; lỗi nghiệp vụ/resource chuyển review và vẫn liên kết đơn. Ghi Transaction, payment, Schedule và trạng thái applied cùng một transaction. Ngăn trùng theo `(mode, providerTransactionId)` và `(mode, gateway, accountNumber, bankReference)`. Xung đột dữ liệu của cùng giao dịch được lưu trong conflicts, hiện cho kế toán, không cộng tiền lại.

Hàm `recordWorkflowPayment` dùng chung cho kế toán và SePay. Giao dịch tự động có `source=sepay`, liên kết receipt, không có `recordedBy` giả hoặc tài khoản hệ thống có quyền admin. Các payment thủ công cũ mặc định manual. Với đơn có QR, không ghi cọc chuyển khoản thủ công để tránh kế toán và webhook ghi cùng một khoản; tiền mặt và các luồng số dư/hoàn vẫn dùng quyền hiện tại.

Chỉ áp dụng tiền vào đúng ngân hàng, tài khoản, mã, mode, đơn approved đang chờ cọc còn hạn. Chuyển thiếu được cộng dồn, QR đổi sang số thiếu. Chuyển thừa, mã không khớp, đơn đã hủy/hết hạn, giao dịch trước khi tạo QR hoặc resource không còn hợp lệ vào review. Không hồi sinh đơn đã giải phóng ekip; không tự xử lý tiền thừa/hoàn ngân hàng.

## API và dữ liệu

- Workflow detail bổ sung `depositPayment`: provider, mode, reference, thông tin nhận tiền, amount, depositRequired, expiresAt, status (`pending`, `paid`, `expired`, `unavailable`), qrUrl/downloadUrl. Chỉ các vai trò được xem tài chính của đơn được nhận thông tin này.
- Lịch sử payment thêm source; Transaction thêm paymentSource/providerReceipt.
- `GET /api/payments/sepay/receipts?page=1&limit=20`: admin/kế toán (0/1/5), trả pending/review và chứng từ có conflict; không công khai cho khách hoặc thợ. Giao diện ở **Quản lý → Đối soát tiền cọc**.
- Không migrate hồ sơ đã trả tiền/kết thúc. Backfill chỉ thêm snapshot cho đơn theo gói approved, quote đã được đồng ý, giữ lịch còn hạn, chưa đủ cọc/chưa có Schedule, chưa có snapshot. Có thể giới hạn username.

## Sandbox và bật thật

`SEPAY_ENABLED=false` mặc định giữ nguyên luồng thủ công. Khi bật cần `CLIENT_WORKFLOW_ENABLED=true`, `SEPAY_MODE`, `PAYMENT_BANK_CODE`, `SEPAY_BANK_GATEWAY` (gateway canonical trong webhook, ví dụ MBBank), `PAYMENT_BANK_NAME`, `PAYMENT_ACCOUNT_NAME`, `PAYMENT_ACCOUNT_NUMBER`, `SEPAY_WEBHOOK_SECRET`.

Sandbox bắt buộc database riêng trùng `SEPAY_SANDBOX_DATABASE` và bắt đầu `studio_sepay_`. Live không được dùng database này. Cấu hình bank thông thường được hỗ trợ trong v1; OCB/KienLongBank/MSB/BIDV/VietinBank cần quy tắc VA/nội dung riêng nên bị chặn với thông báo cấu hình, không sinh QR có thể đối soát sai. Không hỗ trợ đơn thuê, số dư hay tư vấn/báo giá riêng.

Mô phỏng nội bộ có thể chạy ngay, không cần tài khoản SePay:

```powershell
node ops/sepay-sandbox.cjs seed
node ops/sepay-sandbox.cjs serve
node ops/sepay-sandbox.cjs status
node ops/sepay-sandbox.cjs pay BOOKING_ID
# Có thể truyền số tiền để thử chuyển thiếu/thừa:
node ops/sepay-sandbox.cjs pay BOOKING_ID 100000
```

Frontend sandbox: `http://127.0.0.1:4013`, backend `http://127.0.0.1:5013`. Tài khoản mango và staff được sao chép tối thiểu sang database sandbox, giữ hash mật khẩu để dùng cùng thông tin đăng nhập local. Không sao chép Telegram/profile. Script không sửa dữ liệu studio_db. Seed hai đơn có 25 học sinh: chờ duyệt và chờ cọc, giữ nguyên dữ liệu khi chạy lại. Secret/JWT sandbox nằm trong `.workflow-tools/.env.sepay-sandbox` đã được gitignore. Lệnh serve chạy đến khi Ctrl+C; không tự cài hoặc kết nối tài khoản ngân hàng thật.

Đây là **webhook ký HMAC mô phỏng nội bộ**, không phải giao dịch từ nền tảng SePay. Để thử dịch vụ thật: tạo tài khoản/VA Test mode trên SePay, thay cấu hình sandbox tương ứng, công khai backend qua HTTPS tunnel, cấu hình webhook JSON/HMAC và tiền tố YUME với 16 ký tự hex, rồi dùng mô phỏng giao dịch của SePay. QR sandbox không nhận tiền thật.

Để bật live: dùng database vận hành, tài khoản ngân hàng và secret live riêng, `SEPAY_MODE=live`, webhook HTTPS công khai. Kiểm tra một giao dịch thực bằng đơn thử được cho phép; kiểm tra số tiền, đúng một Transaction và Schedule, notification, replay, đối soát. Việc nhận tiền thật cần cấu hình tài khoản SePay/ngân hàng từ chủ studio; mã nguồn không tự bật live hoặc chứa khóa truy cập thật.

## Khôi phục và bảo trì

Tại thư mục backend, cấu hình môi trường đúng mode/database trước khi chạy. Mặc định chỉ xem trước; thêm `--apply` mới ghi:

```powershell
yarn sepay:maintenance backfill --username mango
yarn sepay:maintenance backfill --username mango --apply
yarn sepay:maintenance replay --apply
yarn sepay:maintenance import --file C:\path\webhook-payloads.json --apply
```

`replay` áp dụng lại receipt pending do gián đoạn. Chứng từ review cần đối soát trước, không tự replay để hồi sinh lịch. Nếu webhook chưa đến server/hết retry, lấy giao dịch/log ở SePay Dashboard và phát lại; hoặc nhập file JSON là mảng payload webhook gốc qua import. Import dùng cùng kiểm tra/chống trùng, chỉ operator có quyền server mới chạy; không có API import công khai. Không có tác vụ polling API ngân hàng định kỳ trong v1; cần theo dõi Delivery logs của SePay và danh sách đối soát sau downtime.

Lỗi DB trả 5xx để provider retry, receipt đã lưu vẫn pending. Request không có chữ ký hợp lệ bị từ chối trước khi ghi. Lỗi nghiệp vụ hợp lệ được lưu review rồi trả `200 {"success":true}`; phát lại không ghi thêm tiền. Log không in secret/URI/password/payload tài khoản.

## Kiểm chứng

`node --test backend/tests/sepay-deposits.cjs` dùng database `studio_sepay_webhook_test` riêng; phủ cấu hình thiếu, QR/idempotency, raw HMAC, UTC+7, partial/full, duplicate concurrent/bank reference, tài khoản/ngân hàng sai, dư tiền, deadline rút ngắn, hủy, resource lỗi, crash/replay, kế toán/provider cùng lúc, conflict và backfill. Regression ADR-008/expiry và frontend QR/polling chạy riêng. Không dùng cơ sở dữ liệu vận hành để thực hiện kiểm thử tiền.

## Nguồn tích hợp

- [QR SePay](https://developer.sepay.vn/vi/tien-ich-khac/tao-qr-code)
- [HMAC webhook](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc)
- [SePay Test mode](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/mo-phong-tao-ma-vietqr)
- [Đối soát giao dịch](https://developer.sepay.vn/vi/sepay-webhooks/doi-soat-giao-dich)
