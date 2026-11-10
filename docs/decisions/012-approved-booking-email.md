# ADR-012: Email thông báo duyệt đơn và thanh toán cọc

## Trạng thái và ngày

Accepted — 05/11/2026, Asia/Bangkok. Tiếp nối ADR-010. Bản đầu chỉ gửi thư xác minh email và thông báo duyệt đơn theo gói đã có QR cọc hợp lệ.

Yêu cầu HTTPS cho demo local được thay thế một phần bởi [ADR-015](015-local-email-demo.md); production giữ yêu cầu HTTPS.

## Quyết định

- Khách có `email` tùy chọn và `emailVerifiedAt`. Đăng ký nhận email nhưng không tự xác minh. Tài khoản cũ được nhắc bổ sung/xác minh trong Đơn của tôi; form quản lý nằm ở Hồ sơ cá nhân. Không dùng email do staff nhập khi duyệt.
- `POST /api/auth/email/request` yêu cầu đăng nhập khách hàng. Chuẩn hóa email, hủy xác minh địa chỉ cũ, lưu hash token một lần và enqueue thư trong cùng transaction. Cooldown 60 giây, tối đa 10 yêu cầu/tài khoản/24 giờ được lưu trong Mongo; thêm giới hạn IP có sẵn. User DTO không chứa dữ liệu xác minh nội bộ.
- Token HMAC có miền riêng, gắn tài khoản + địa chỉ + nonce ngẫu nhiên, dùng secret backend hiện có. Outbox lưu nonce trong payload không được trả mặc định, không lưu token thô trong chế độ thật. Thư dẫn đến `/account/verify-email#token=...`; fragment không vào access log HTTP. Đăng nhập giữ nguyên URL; chỉ POST xác nhận sau khi khách bấm nút. Token hết hạn sau 1 giờ, bị vô hiệu khi thay địa chỉ/gửi thư mới; xác minh nguyên tử theo tài khoản đăng nhập. Thành công xóa token khỏi URL.
- Trong transaction `package.approve`, chỉ enqueue khi `depositPaymentDto` đang pending và khách có email đã xác minh. Khóa duy nhất gồm booking + payment reference. Việc bổ sung QR qua maintenance cũng dùng hook này. Khách xác minh sau khi duyệt được quét lại các đơn đủ điều kiện trong cùng transaction; CLI scan dùng lại quy tắc này khi bật tính năng sau triển khai.
- Snapshot email chứa gói/lớp/ngày chụp, số cọc theo thỏa thuận, hạn theo giờ Việt Nam và nút mở đúng `/account/bookings/:id`. Không đính kèm QR/tài khoản ngân hàng; website hiển thị số còn thiếu và trạng thái mới nhất sau đăng nhập. Tên lớp/gói/tên khách được escape trong HTML.
- Worker Mongo chạy mỗi 15 giây, claim bằng lease nguyên tử 60 giây và fence bằng lease token khi cập nhật kết quả. Chỉ gọi API sau khi transaction duyệt đã commit. Kiểm tra lại trạng thái tài khoản, địa chỉ, xác minh, QR/config hiện hành, số cọc và hạn ngay trước dispatch. Email đã được provider chấp nhận không thể thu hồi nếu khách thanh toán/hủy đồng thời sau lần kiểm tra cuối.
- Payload của thư duyệt bất biến sau dispatch đầu. Job chưa dispatch có thể cập nhật/revive khi khách xác minh địa chỉ mới (kể cả quay về địa chỉ cũ); đổi địa chỉ sau dispatch không tự gửi một thư thứ hai. Lease bị xóa khi retarget để worker cũ không gửi snapshot cũ.
- Resend HTTP có timeout 10 giây và `Idempotency-Key` cố định theo outbox. Retry lùi từ 30 giây đến tối đa 1 giờ, tối đa 10 lượt, trong hạn tuyệt đối **23 giờ tính từ dispatch đầu**, ngắn hơn thời gian lưu idempotency 24 giờ của provider. Persist thời điểm/khả năng đã gửi trước HTTP để phục hồi crash. Job ngoài cửa sổ hoặc kết quả mơ hồ khi hết lượt chuyển `delivery_unknown`, không tự gửi lại. HTTP từ chối chắc chắn chuyển `failed`; `sent` nghĩa là provider nhận yêu cầu, không cam kết thư đã vào Inbox.
- Outbox và trạng thái gửi độc lập với trạng thái đơn. Lỗi provider không hoàn tác duyệt đơn. Nếu ghi outbox trong transaction thất bại, toàn bộ transaction duyệt rollback để không tồn tại kết quả duyệt thiếu thông báo bền vững. Chưa có email thì đơn vẫn duyệt được, thông báo website vẫn hoạt động.

## Cấu hình

Mặc định `EMAIL_ENABLED=false`. Khi dùng thật, cấu hình backend:

```dotenv
EMAIL_ENABLED=true
EMAIL_MODE=resend
EMAIL_FROM=Yume Studio <notifications@your-verified-domain.example>
EMAIL_PUBLIC_URL=https://your-studio.example
RESEND_API_KEY=your-server-api-key
```

Dùng tên miền gửi đã xác minh ở Resend. URL là origin HTTPS công khai, không có path/query/credentials; không lấy host từ request của khách. Giữ secret/API key ngoài Git và frontend. Khởi động kiểm tra cấu hình và unique index trước khi phục vụ. `EMAIL_ENABLED=true` nhưng cấu hình thiếu/sai sẽ không khởi động API.

`node ops/sepay-sandbox.cjs serve` bật `EMAIL_MODE=test`, from giả và origin `http://localhost:4001`, xóa API key thừa kế. Test mode chỉ cho database riêng `studio_email_*`/`studio_sepay_*` trên Mongo loopback, ngoài production. Payload preview lưu ở trường `testMessage` ẩn của outbox; không gọi email provider. Database sandbox/SePay sandbox không được bật gửi email thật.

## Vận hành

```sh
npm --prefix backend run email:outbox -- list
npm --prefix backend run email:outbox -- scan mango
npm --prefix backend run email:outbox -- process
npm --prefix backend run email:outbox -- retry JOB_ID
```

`scan` bổ sung thư thiếu cho các đơn còn chờ cọc của tài khoản đã xác minh; chạy không có username để quét toàn bộ tài khoản đủ điều kiện. Unique key giữ việc chạy lại an toàn. `retry` chỉ nhận job `failed` còn trong cửa sổ 23 giờ, giữ payload/key/thời điểm dispatch ban đầu. Với `delivery_unknown`, xem log provider và xác định đã được nhận hay chưa; không reset thời điểm hoặc xóa job để tự gửi lại. `list` không in token, payload hay API key.

Đổi JWT secret làm các token xác minh cũ không còn tạo lại được; khách yêu cầu thư xác minh mới. Chưa triển khai nhắc hạn, email nhận đủ cọc hoặc webhook bounce/delivery trong phiên bản này.

## Kiểm chứng và nguồn

`backend/tests/email-notifications.cjs` dùng HTTP + Mongo transaction thật trên database test riêng, transport mô phỏng, không gửi email thật: xác minh/ownership/one-use/ẩn secret, approve lặp, worker đồng thời, rollback, retry bất biến, hủy/hết hạn/đủ cọc/config đổi, xác minh sau duyệt, đổi địa chỉ và quay về địa chỉ cũ, lease bị thay và cửa sổ chống trùng. Frontend kiểm tra form email, giữ deep link qua login và xác nhận rõ ràng trước POST.

- [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email)
- [Idempotency, thời hạn 24 giờ](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Phân loại lỗi API](https://resend.com/docs/api-reference/errors)
