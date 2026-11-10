# ADR-013: Album ảnh hậu kỳ riêng tư và màn phản hồi bàn giao

> Cập nhật 10/11/2026: upload/gửi bản mới đã chuyển vào tab **Ảnh đã chỉnh** của màn bàn giao chung; tab **Ảnh chọn** tích hợp Google Drive. Xem [ADR-014](014-drive-photo-albums.md). Quyền truy cập file local và lịch sử bàn giao tiếp tục áp dụng như dưới đây.

## Trạng thái và ngày

Accepted — 06/11/2026, Asia/Bangkok. Khách yêu cầu nút mở màn riêng từ hồ sơ và chọn tải ảnh trực tiếp lên hệ thống.

## Quyết định

- Mục Bàn giao ảnh trong hồ sơ có nút mở `/account/bookings/:id/delivery`. Màn này xem ảnh lớn, chọn ảnh, tải ảnh đang xem, chọn phiên bản và gửi góp ý/yêu cầu chỉnh sửa hoặc nghiệm thu bản mới nhất. Sau hoàn tất vẫn có đánh giá dịch vụ theo nghiệp vụ hiện có. Nhân viên dùng `/workflow-bookings/:id/delivery` để xem album và phản hồi; upload và gửi bản mới ở hồ sơ.
- Admin hoặc thợ được phân công tải JPEG/PNG/WebP khi đơn đang hậu kỳ/cần chỉnh sửa. Mỗi HTTP request nhận một file tối đa 20 MB; giao diện gửi tuần tự và giữ key cho lần thử lại. Ảnh nháp phục hồi từ server khi tải lại. Giới hạn hai upload/decode đồng thời trên một instance API, 60 megapixel/ảnh, 40 MB sau xử lý, 1000 ảnh/2 GB cho toàn bộ lịch sử một đơn, tối đa 500 ảnh mỗi bản bàn giao.
- Kiểm tra quyền trước khi nhận bytes và kiểm tra lại trong transaction ghi metadata để xử lý hủy/phân công lại đồng thời. Kiểm tra magic bytes, decode bằng Sharp, chuẩn hóa JPEG chất lượng 95 giữ kích thước sau xoay và bỏ metadata gốc; thumbnail WebP 640 px. Không phục vụ trực tiếp file gốc chưa chuẩn hóa.
- File nằm trong `PRIVATE_DELIVERY_DIR`, mặc định `.data/private-delivery` ngoài static/public. Đường dẫn tương đối tính từ project backend, độc lập cwd. Cấm public roots, kiểm tra realpath và so sánh không phân biệt hoa thường trên Windows. Vite deny cả logical/canonical private root, `.data` và `.workflow-tools`; không có Express static mount cho ảnh riêng tư. Không đưa file ảnh riêng tư vào Git.
- `BookingDeliveryPhoto` giữ booking, uploader, request key/hash, metadata, bytes và các phiên bản đã xuất bản. Unique `(booking, uploadKey)`; cùng key nhưng khác bytes/uploader trả 409. File ID bất biến do server tạo, không lấy đường dẫn từ client.
- `POST /api/bookings/:id/delivery/photos` tải nháp, `GET` cùng đường dẫn liệt kê nháp cho ekip; `GET /photos/:photoId?size=thumb` hoặc không có size trả ảnh sau kiểm tra JWT + quyền theo booking. Khách chỉ đọc ảnh đã nằm trong bản bàn giao; tài khoản khác/kế toán/anonymous không đọc được. Response ảnh `no-store`, không có token trong URL. Frontend fetch blob có Authorization, hủy request và thu hồi object URL khi đổi ảnh/tài khoản hoặc rời trang; thumbnail chỉ nạp trong vùng đang xem.
- `progress.update` sang delivered nhận `deliveryPhotoIds`: 1–500 ID duy nhất, kiểm tra đúng booking, chưa xóa và đủ file chuẩn hóa/thumbnail. Cho phép dùng lại ảnh đã xuất bản trong bản mới; lưu thứ tự và snapshot riêng cho mỗi phiên bản, đánh dấu phiên bản đã dùng cùng transaction có resource lock. Tiếp tục cho API cũ gửi `deliveryUrl`; các bản Drive cũ vẫn mở được bằng link ngoài, không nhúng URL tùy ý vào trang.
- `DELETE /photos/:photoId` chỉ bỏ nháp trong transaction; giữ tombstone để upload retry không hồi sinh ảnh đã xóa. Ảnh đã xuất bản ở bất kỳ phiên bản nào không bị xóa. Trên giao diện, bỏ ảnh từ bản trước chỉ bỏ khỏi lựa chọn cho bản mới, không xóa lịch sử.
- Góp ý ảnh dùng `revision.request` gắn `deliveryVersion`; studio xem trong hồ sơ và cập nhật bản mới. `delivery.accept` vẫn kiểm tra đúng phiên bản/lifecycle hiện tại. Khi đang xem bản cũ, form và nút nghiệm thu không khả dụng. Xung đột giữ nguyên nội dung khách đang viết và yêu cầu kiểm tra lại phiên bản mới. Không tạo thêm trạng thái đơn.

## Lưu trữ, phục hồi và dọn dẹp

Cấu hình `PRIVATE_DELIVERY_DIR` thành volume bền vững khi triển khai. Sao lưu volume ảnh cùng MongoDB. Giữ tệp chuẩn hóa và thumbnail của mọi bản đã bàn giao; không thay đổi đường dẫn khi restart/deploy. Không đặt volume trong frontend public/dist hoặc thư mục package media.

Filesystem không nằm trong Mongo transaction. Normalize vào ID mới bên ngoài callback có thể retry, sau đó ghi metadata cùng resource lock. Lỗi known-abort chỉ dọn file của chính attempt đó sau khi xác nhận không có doc. Unknown commit/network/write errors giữ file bất kể một lần đọc có thấy doc hay không; tránh xóa file của transaction có thể commit muộn. Bản upload khác không bị đụng tới.

```sh
npm --prefix backend run delivery:cleanup
```

Dọn nháp chưa xuất bản trên 7 ngày bằng tombstone trong resource transaction. Chỉ xóa file quá 7 ngày không còn doc hoặc doc đã xóa; staging quá 24 giờ được dọn riêng. Không xóa file được tham chiếu bởi bản đã xuất bản. Chạy định kỳ bằng công cụ vận hành của môi trường triển khai; không reset/xóa metadata để chữa lỗi commit mơ hồ. Thiếu file tại lúc publish trả lỗi thay vì tạo album hỏng.

## Kiểm chứng

`backend/tests/booking-delivery.cjs` dùng database và thư mục test cục bộ riêng, HTTP multipart thật và Sharp: quyền upload/read, magic/decode/metadata, idempotency/conflict, ID trùng/khác đơn, nháp không lộ, publication theo phiên bản, feedback/accept stale, tombstone, thiếu file, rollback/unknown commit và dọn nháp giữ bản cũ. Frontend kiểm thử màn riêng, retry cùng key, lịch sử chỉ xem, feedback gắn phiên bản, nghiệm thu, và hủy/revoke ảnh khi đổi tài khoản.
