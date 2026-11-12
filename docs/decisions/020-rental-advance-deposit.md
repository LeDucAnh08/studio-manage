# ADR-020: Cọc trước 30% tiền thuê

## Trạng thái và ngày

Accepted — 12/11/2026, Asia/Bangkok. Thay thế cách tính cọc cho đơn thuê mới trong ADR-016.

## Bối cảnh

Người dùng không đặt được mẫu có giá/ngày nhưng chưa cấu hình cọc bảo đảm/món. Người dùng xác nhận muốn cọc trước 30% được trừ vào tiền thuê: tổng 690.000đ → cọc 207.000đ → còn 483.000đ.

## Quyết định

- Đơn đặt tự động mới tính phí từ giá/ngày × số lượng × số ngày, gồm ngày nhận/trả. Cọc bằng `ceil(fee × 30 / 100)`; làm tròn một lần trên toàn đơn đến đơn vị đồng.
- `GET /api/public/rental-policy` trả `depositPercent: 30` và điều khoản mới, làm thay đổi mã phiên bản đồng ý điều khoản. Giao diện tính xem trước theo cùng tỷ lệ.
- Quote lưu `depositKind: advance` và `depositPercent: 30`. Cọc là một phần của phí thuê, không phải khoản bảo đảm hoàn riêng sau khi trả đồ. Tổng cần thu trước giao bằng `fee`, sau nhận trả bằng `fee + phụ phí được khách chấp thuận`.
- Thiếu cấu hình `rentalSecurityDeposit` không chặn đặt mới. Thiếu giá thuê/ngày vẫn bị chặn; số tiền do backend tính từ catalog, không lấy số tiền do khách gửi.
- Quote cũ thiếu `depositKind: advance` tiếp tục dùng khoản cọc bảo đảm riêng và tổng phí+cọc đã chốt. Không migration hay ghi đè các hồ sơ, giao dịch hoặc giá cũ trong `studio_db`.
- Giữ cơ chế hết hạn, giữ hàng, webhook, chống thu trùng, đối soát tiền thừa và hoàn khi studio không thể giao hàng. Đủ 30% xác nhận giữ hàng; đủ 100% phí thuê mới được giao.
- Sau khi đặt, điều hướng thẳng tới `/account/rentals/:id?payment=deposit`. Màn này chỉ tập trung vào cọc/QR/đếm ngược, số tiền và kỳ thuê; không có bước chờ duyệt hoặc đồng ý báo giá lần nữa. Khi polling ghi nhận đủ cọc, hiển thị đã nhận tiền và liên kết hồ sơ. “Đơn của tôi” cho tiếp tục thanh toán cọc tại cùng URL; đơn thủ công cũ vẫn dùng hồ sơ hiện có.

## Kiểm chứng

Kiểm thử ví dụ 690.000/207.000/483.000, làm tròn, thiếu cọc cố định cũ, snapshot cũ, cọc thiếu/đủ, thu phần còn lại, nhận trả/phụ phí, tiền muộn/thừa và quyền sở hữu trên MongoDB thử nghiệm riêng.
