# ADR-016: Đặt thuê trang phục và cọc tự động

Phần tính cọc bảo đảm và tổng tiền cho đơn mới được thay thế bởi [ADR-020](020-rental-advance-deposit.md) từ 12/11/2026: cọc trước 30% được trừ vào tiền thuê. Hồ sơ cũ giữ snapshot đã chốt.

## Trạng thái và ngày

Accepted — 10/11/2026, Asia/Bangkok. Áp dụng cho đơn mới. Hồ sơ cũ vẫn dùng báo giá/đối soát hiện có, không tự chuyển trạng thái hoặc thay điều khoản đã thỏa thuận.

## Quyết định

- Khách xác nhận giá, cọc và điều khoản ngay khi đặt. Backend tự tính phí theo `rentalDailyPrice × số lượng × số ngày` (gồm cả ngày nhận/trả); `rentalSecurityDeposit × số lượng` là cọc bảo đảm, không tự coi là doanh thu thuê. Mẫu thiếu một trong hai cấu hình không đặt tự động được; cọc `0` phải cấu hình rõ, không suy đoán từ trường trống. Không bổ sung luồng phát hiện/đàm phán thay đổi giá khi khách đang đặt theo yêu cầu người dùng.
- Snapshot `quote` tiếp tục phục vụ giao/nhận trả, ledger và đối soát; đơn mới không cần studio duyệt hoặc gửi báo giá riêng. `autoCheckout` phân biệt với hồ sơ cũ. Bắt buộc `termsAccepted=true` và `policyVersion` khớp điều khoản cấu hình hiện hành. Khóa gửi và snapshot vẫn hỗ trợ retry sau mất mạng.
- Giữ tạm trong transaction dùng khóa tài nguyên chung với booking/lịch chụp và sửa tồn kho. Mặc định 15 phút, tối đa 2 đơn chờ cọc/tài khoản. Đơn giữ tạm chỉ chiếm tồn khi còn hạn; không phụ thuộc độ trễ worker. Worker khởi động và định kỳ chuyển đơn hết hạn sang `expired`, trả giữ hàng và giữ nguyên tiền đã thu để hoàn.
- Ngày nhận tối thiểu 24 giờ so với giờ mở cửa ngày nhận; mặc định nhận/trả 09–17h giờ Việt Nam. Ngày studio đóng cửa cấu hình được. Giữ thêm 1 ngày giặt/chuẩn bị sau ngày trả, lưu buffer trên đơn; đơn đã trả giữ riêng số món còn tốt trong thời gian chuẩn bị. Đồ đang giao quá hạn tiếp tục chiếm tồn cả các ngày tương lai cho đến khi studio ghi nhận trả. Trả hỏng/mất giảm tồn tốt; kiểm tra các đơn thuê tự động đã cọc có liên quan và cảnh báo nếu không thể giao đủ.
- Mã cọc thuê dùng tiền tố `RENT`, tách khỏi `YUME` của booking. Dùng cùng webhook chữ ký raw bytes, SePay receipt bền vững, transaction, chống trùng ID giao dịch và bank reference. Chuyển thiếu cộng dồn, đủ cọc tự xác nhận. Chuyển thừa, sai mã/cấu hình hoặc tiền thêm sau khi đã xác nhận được lưu để đối soát, không tự cộng nhầm. API không cho ghi khoản thu chuyển khoản thủ công khi đơn đã có SePay, tránh ghi hai lần; phí thuê chuyển khoản sau cọc được xử lý từ giao dịch thực ở màn đối soát.
- Tiền về muộn chỉ xác nhận lại sau kiểm tra điều kiện ngày và tồn kho nguyên tử. Không còn hàng: giữ tiền trong ledger, chuyển `payment_review` với số cần hoàn; không tạo giữ hàng thiếu. Giao dịch đến sau khi khách rút đơn chưa cọc phải đối soát để ghi nhận/hoàn, không mở lại đơn đã hủy.
- Sau bất kỳ khoản thu nào (kể cả cọc thiếu hoặc giao dịch đúng mã cần đối soát), khách không được rút/hủy, đổi mẫu, size, số lượng, ngày hoặc gia hạn. Chặn API và giao diện; lịch sử đã ghi nhận tiền không được mở khóa chỉ vì tiền đã hoàn. Trước cọc có thể rút đơn rồi đặt lại. Giữ luồng thay đổi hồ sơ cũ theo điều khoản cũ.
- Ngoại lệ studio không thể giao được hàng là thao tác `fulfillment.refund` của admin, bắt buộc lý do, giải phóng giữ hàng và chuyển toàn bộ số đã thu sang cần hoàn. Thao tác không tự chuyển tiền ra ngân hàng; admin/kế toán ghi nhận hoàn sau khi thực hiện thật. Sau giao tiếp tục kiểm đếm tốt/hỏng/mất, đối soát phụ phí với khách, hoàn cọc dư hoặc thu thiếu theo luồng hiện có.
- Đối soát giao dịch SePay vào đơn thuê chỉ dành admin/kế toán, bắt buộc ghi căn cứ. Không cho tái sử dụng giao dịch đã áp dụng, đổi đích giao dịch đã khớp đơn khác, dùng giao dịch tiền ra/sai ngân hàng hoặc payload có xung đột. Tiền thừa đã đối soát có thể là tiền trả trước phí thuê; vượt tổng phí+cọc thì khoản dư được hoàn. Ghi người đối soát, thời điểm và ledger trong cùng transaction.

## Cấu hình và vận hành local

Trong quản lý trang phục, bật cho thuê và nhập **Giá thuê/ngày** cùng **Cọc bảo đảm/món**. Không tự điền cọc cho mẫu cũ.

```dotenv
RENTAL_HOLD_MINUTES=15
RENTAL_MAX_PENDING=2
RENTAL_MIN_LEAD_HOURS=24
RENTAL_TURNAROUND_DAYS=1
RENTAL_OPEN_HOUR=9
RENTAL_CLOSE_HOUR=17
RENTAL_CLOSED_WEEKDAYS=
```

`RENTAL_CLOSED_WEEKDAYS` là danh sách 0–6, 0 là Chủ nhật. Để trống phục vụ mọi ngày. Thay đổi cấu hình cần restart backend.

QR/tự đối soát dùng cấu hình SePay hiện có ở ADR-010. Khi SePay tắt, đơn vẫn có hạn giữ hàng và studio có thể ghi nhận cọc tiền mặt; giao diện không quảng bá QR không hoạt động. Webhook từ Internet cần backend truy cập được hoặc tunnel. Demo hoàn toàn local dùng webhook sandbox có chữ ký trên database riêng `studio_sepay_*`; không bật sandbox trên `studio_db`.

Demo QR local không cần cấu hình ngân hàng thật: chạy `node ops/sepay-sandbox.cjs serve`, mở `http://localhost:4001/costumes`, đăng nhập bằng tài khoản local hiện có và chọn mẫu `Áo dài trắng`. Sau khi đặt, dùng mã hồ sơ từ URL: `node ops/sepay-sandbox.cjs pay-rental RENTAL_ID` để mô phỏng nhận đủ cọc (thêm số tiền cuối lệnh nếu muốn mô phỏng nhận thiếu/thừa). Chỉ thao tác trên database sandbox và gửi webhook tới loopback; không chuyển tiền thật.

## API

Demo không cần terminal cho từng giao dịch: công cụ `ops/sepay-sandbox.cjs serve` bật `SEPAY_DEMO_UI=true`. Trong phần cọc, khách bấm **Thanh toán thử**, hệ thống tạo giao dịch nội bộ và trang tự cập nhật. Đây là mô phỏng của project, không gọi SePay hay ngân hàng thật. API `POST /api/payments/sepay/sandbox/simulate` chỉ mở khi có flag rõ ràng, `NODE_ENV=development`, SePay sandbox và MongoDB loopback đúng database sandbox. Khách chỉ mô phỏng đơn của mình; admin/kế toán được thao tác đơn sandbox. Khóa gửi chống bấm lặp/thử lại, không nhận số tiền/tài khoản tùy ý từ trình duyệt. Live/production không có chức năng này, kể cả khi giả mạo giao diện.

`seed`/`serve` bổ sung cho mango tối đa 2 đơn chờ cọc còn hạn bằng controller đặt thuê hiện có. Chạy lại không nhân đôi đơn đang chờ hoặc đặt lại đơn đã trả tiền. Công cụ sandbox đặt `RENTAL_HOLD_MINUTES=120` để đủ thời gian thử, không thay mặc định 15 phút của môi trường thường. Các đơn dùng tên trang phục và ghi chú bình thường.

- `GET /api/public/rental-policy`: điều khoản, thời hạn và lịch phục vụ.
- `POST /api/rentals`: dữ liệu cũ cộng `termsAccepted`, `policyVersion`; trả quote tự xác nhận, hạn giữ và thông tin QR nếu có cấu hình.
- `POST /api/rentals/:id/actions`: thêm `fulfillment.refund` cho admin; giữ expectedVersion/idempotency hiện có.
- `POST /api/payments/sepay/receipts/:id/resolve-rental`: `{ rentalId, note }`, admin/kế toán. Retry cùng giao dịch/đơn không tạo tiền lần nữa.

## Kiểm chứng

`backend/tests/rental-auto-checkout.cjs` chạy transaction/HTTP/webhook thật trên database riêng; kiểm tra cạnh tranh tồn, consent, cấu hình, hết hạn, giới hạn đơn, cọc thiếu, webhook trùng, cọc muộn, tiền thừa/sai mã, phân quyền, không hủy/đổi, hỏng đồ ảnh hưởng đơn sau và cọc 0. Không gọi ngân hàng hoặc gửi thư.

Đặt `RENTAL_BROWSER_TEST=true` để chạy thêm `ops/tests/rental-auto-checkout-browser.cjs`: frontend thật desktop/mobile, đặt thuê, consent, QR và polling sau webhook sandbox. Bằng chứng ở `audit/rental-auto-checkout-2026-11-10/`.
