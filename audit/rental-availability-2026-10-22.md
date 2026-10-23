# Bổ sung trang phục và kỳ thuê để kiểm tra availability

Ngày22/10/2026, Asia/Bangkok. Theo yêu cầu bổ sung dữ liệu để dễ kiểm tra danh mục theo khoảng thời gian. Đã áp dụng vào `127.0.0.1:27029/studio_project_demo`, replica set `rs0`, đúng project marker hiện có.

## Dữ liệu đã thêm

| Mẫu mới                   | Nhóm                 | Giá/ngày | Tồn tốt ban đầu |
| ------------------------- | -------------------- | -------: | --------------- |
| Áo dài lụa đào            | Áo dài kỷ yếu        | 135.000đ | M:2, L:1        |
| Áo dài linen xanh rêu     | Áo dài kỷ yếu        | 145.000đ | S:1, M:2, L:1   |
| Vest xám than             | Vest và âu phục      | 175.000đ | M:1, L:1, XL:1  |
| Bộ bà ba xanh lá nhạt     | Trang phục hoài niệm |  95.000đ | M:2, L:2        |
| Chân váy xếp ly xanh navy | Trang phục học đường |  65.000đ | S:1, M:2, L:1   |
| Mũ nồi dạ màu be          | Phụ kiện chụp ảnh    |  25.000đ | FREE:3          |
| Ô ren trắng cầm tay       | Phụ kiện chụp ảnh    |  35.000đ | FREE:2          |
| Mũ cói phối nơ kem        | Phụ kiện chụp ảnh    |  20.000đ | FREE:4          |

Thêm8 sản phẩm,5 đơn thuê `confirmed` với17 dòng size,5 giao dịch cọc liên kết đúng payment/order. Đơn thuộc `demo.client`; báo giá đã được chấp nhận, tính giá/ngày và bao gồm cả ngày nhận/trả. Không dùng `checked_out` để tránh giữ tồn quá hạn sau ngày trả dự kiến. Tên/mô tả sản phẩm dùng nội dung khách hàng; giá là dữ liệu giả định để thử nghiệm.

Các mẫu cũ, category ID, tồn kho cũ, đơn thuê/chụp, quote/payment và tài khoản được giữ nguyên. Đối chiếu hash trước/sau xác nhận **1.176 bản ghi có sẵn không đổi**; chỉ version của resource lock nội bộ tăng khi transaction chạy. Tổng danh mục sau bổ sung là29 mẫu:22 trang phục,7 phụ kiện.

## Mở nhanh để thử

Các liên kết dưới dùng preview trên máy hiện tại. Thay host/port nếu chạy bản build khác; query ngày vẫn giữ nguyên.

| Kỳ năm2026  | Liên kết                                                                                   | Điều cần thấy với8 mẫu mới                                                         |
| ----------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 22–24/10    | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-10-22&returnDate=2026-10-24) | Áo dài lụa đào ẩn; áo dài xanh rêu chỉ còn M:1/L:1; mũ nồi còn1                    |
| 24–26/10    | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-10-24&returnDate=2026-10-26) | Áo dài lụa đào và vest xám than đều ẩn; kiểm tra ngày trả24 vẫn chiếm tồn          |
| 25–27/10    | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-10-25&returnDate=2026-10-27) | Áo dài lụa đào hiện lại đủ; vest xám than ẩn; áo dài xanh rêu S:1/M:1, mũ nồi còn2 |
| 28–30/10    | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-10-28&returnDate=2026-10-30) | Chân váy ẩn; bà ba còn M:1/L:2                                                     |
| 31/10–02/11 | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-10-31&returnDate=2026-11-02) | Ô ren ẩn; vẫn là kỳ thuê3 ngày xuyên tháng                                         |
| 05–07/11    | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-11-05&returnDate=2026-11-07) | Mũ cói ẩn, các mẫu khác đầy đủ                                                     |
| 08–10/11    | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-11-08&returnDate=2026-11-10) | Cả8 mẫu hiện đủ size/số lượng ban đầu                                              |
| 22–27/10    | [Mở danh mục](http://127.0.0.1:4013/costumes?receiveDate=2026-10-22&returnDate=2026-10-27) | Mũ nồi còn1 thay vì0; hai đợt thuê rời nhau không bị cộng toàn khoảng              |

Mẫu hết toàn bộ size bị loại khỏi public catalog; mẫu còn size khác vẫn hiện, chỉ bỏ size hết. Không hứa giữ hàng từ việc thêm vào form. Đây là kết quả ngay sau seed, trước khi người dùng tự thao tác thêm.

## Cách seed và bằng chứng

- Source: `ops/fixtures/rental-availability.cjs`; CLI `ops/seed-rental-availability.cjs`; tests `ops/tests/rental-availability.cjs`.
- CLI mặc định dry-run; `--apply --anchor 2026-10-22` mới ghi. Chỉ CLI URI demo loopback27029/rs0 được chấp nhận. Project marker, role khách/sale/kế toán và category hiện có được kiểm tra trước ghi. Dùng model validation của backend source, không phụ thuộc build cũ.
- Tất cả additions và marker nằm trong cùng transaction với resource lock. Collision ID/tên hoặc thiếu reference thì từ chối toàn bộ. Rerun trả `retained`, created0; giữ anchor gốc và mọi sửa đổi về sau.
- 8/8 tests đạt, gồm ma trận availability qua hàm backend thật, ranh giới ngày trả, hai đợt rời nhau, tiền/ngày/cọc, dry-run, preservation, replay và collision/project guard trên DB test riêng.
- Đã đối chiếu qua API public của preview4013 đủ8 kỳ/64 lượt sản phẩm với ma trận size dự kiến. Số mẫu hiển thị tương ứng28/27/28/28/28/28/29/27. Không thay code frontend hoặc backend.
- Readiness audit chỉ đọc sau seed: `ready:true`, không blocker. Còn các cảnh báo công nợ/hoàn tiền/quá hạn của dữ liệu trình diễn;5 đơn mới chỉ thanh toán cọc nên có tiền thuê chưa thanh toán là tình huống dự kiến.
- Bằng chứng local git-ignore: `.workflow-tools/rental-availability-applied-2026-10-22.json`, `rental-availability-before-*.json`, `rental-availability-replay-2026-10-22.json`, `rental-availability-api-2026-10-22.json`, `rental-availability-readiness-2026-10-22.json`.
- Preview4013 hiện được nối riêng tới API demo5003. Backend5002 đang dùng `studio_db` tại27017 được giữ nguyên, không seed vào database đó và không sửa `.env`. Mongo demo27029 được khởi động lại từ data directory hiện có. Cấu hình preview tạm ở `.workflow-tools/customer-ui/` không phải thay đổi source/production.

Không xóa/reset DB hoặc chạy lại seed lịch sử để tạo các kỳ này. Không tạo giao dịch ngoài môi trường local, không push GitHub trong đợt seed. Không kiểm browser visual/E2E tạo thêm đơn; API availability và model/integration checks là evidence của đợt này.
