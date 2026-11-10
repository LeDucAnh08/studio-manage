# ADR-014: Album chọn ảnh và bàn giao từ Google Drive

Accepted — 10/11/2026, Asia/Bangkok. Triển khai theo kế hoạch người dùng duyệt.

## Quyết định

- Một `BookingAlbum` cho mỗi booking, `BookingAlbumPhoto` riêng cho mỗi ảnh và phiên bản. Nguồn Drive được đọc từ thư mục đã bật “Bất kỳ ai có đường liên kết”; dùng API v3 với `GOOGLE_DRIVE_API_KEY` ở backend. GAS tạo thư mục/lịch hiện tại giữ nguyên.
- JPEG/PNG/WebP trực tiếp trong tối đa 10 thư mục; không duyệt đệ quy, không hỗ trợ RAW/video. Đọc đủ các trang trước khi ghi trong resource transaction; giữ lựa chọn theo Drive ID, giữ thông tin ảnh bị mất để không làm mất ghi chú. Tổng danh sách giới hạn 10.000 tệp.
- Metadata ảnh gồm ID, resource key, tên, kích thước và checksum/version. Backend tải bytes qua endpoint Google cố định, kiểm tra nguồn và MD5, giới hạn 40 MB/60 MP, tối đa 4 request ảnh đồng thời trên một instance. Thumbnail WebP 640px sinh trong bộ nhớ từ nội dung đã xác minh, không lưu URL thumbnail hết hạn hoặc ảnh gốc xuống đĩa. Mọi ảnh trả `no-store`.
- Link `/albums/:publicId#access=...` không cần đăng nhập. Token 256 bit được băm trong DB, gửi qua `X-Album-Token`, không nằm trong HTTP URL. Share token dẫn xuất bằng HMAC của secret server và idempotency key để retry trả đúng cùng link; thao tác mới tạo token mới. Không log token/key/URL Google có API key.
- Chỉ admin và ekip được phân công cấu hình, xem nháp, sync, xuất bản, cấp/thu hồi link. Khách chỉ thấy DTO album, không thấy hồ sơ/tài chính/thông tin liên hệ. Public API kiểm tra lại booking, token, lifecycle trong transaction. Đơn hủy/link thu hồi bị chặn. Quyền chia sẻ Drive độc lập: thu hồi link album không thu hồi link Drive.
- Một danh sách chọn chung. Các lệnh dùng `expectedVersion` + `Idempotency-Key`; đặt boolean thay vì toggle. Chốt lưu tên/ghi chú từng ảnh bất biến trong `BookingAlbumSelection`, album chỉ giữ thời điểm/số lượng/lần chốt để không phình document. 2.000 idempotency receipt gần nhất được giữ; lệnh cũ vượt cửa sổ trả xung đột phiên bản thay vì âm thầm áp dụng lại.
- Bàn giao Drive tạo snapshot bản ghi ảnh theo `deliveryVersion`, tham chiếu qua `progress.drivePhotos` và `deliveryHistory.drivePhotos`. Bản chuẩn bị giao `-1` chỉ staff thấy; ảnh chọn `0`. Không ghi đè ảnh thuộc bản đã giao. Kiểm tra nguồn trước transaction; đọc ảnh sau đó tiếp tục kiểm tra checksum để tránh hiển thị nội dung khác nếu file Drive đổi. Quyền Drive bị thu hồi/xóa/sửa ảnh sẽ làm ảnh lịch sử không khả dụng; không hứa lưu trữ nguyên trạng bytes khi studio thay nguồn.
- Ghi chú ảnh đã chỉnh chỉ sửa trên bản mới nhất lúc đang chờ nghiệm thu, không tự cập nhật lifecycle. `delivery.revision.start` cho ekip chuyển delivered → revision_requested, ghi người/lý do, sau đó dùng progress.update editing → delivered. `delivery.accept` vẫn chỉ chủ đơn, đúng bản hiện tại. Album local và URL lịch sử tiếp tục dùng luồng cũ.
- Frontend guest dùng client riêng không có interceptor đăng nhập; ghi chú nháp giữ khi xung đột/tải lại. Dialog có focus trap, Escape, khôi phục focus; thumbnail lazy load và phân trang hiển thị.

## Hợp nhất màn bàn giao — 10/11/2026

- Một lối vào **Hồ sơ đơn → Bàn giao ảnh → Xem ảnh bàn giao** cho cả ekip và chủ đơn, khả dụng trước khi có bản bàn giao. `/workflow-bookings/:id/album` chuyển về `/workflow-bookings/:id/delivery?tab=selection`; URL account và lịch sử phiên bản giữ nguyên.
- Tab **Ảnh chọn** nhúng cấu hình Drive/chia sẻ/xuất tên file cho ekip; chủ đơn thấy ảnh đã xuất bản và có thể chọn, ghi chú, chốt ngay bằng JWT. Tab **Ảnh đã chỉnh** gom chuẩn bị/gửi Drive, upload local, lịch sử, góp ý và nghiệm thu. Không lặp gallery Drive trong cùng màn. Chuyển sang hậu kỳ sau yêu cầu chỉnh sửa cũng thao tác tại màn chung.
- API `/api/bookings/:id/album` GET cho chủ đơn đọc DTO đã xuất bản; POST `/photo` và `/finalize` dùng cùng service/transaction/lựa chọn với public link. `/photos/:photoId` chỉ cho chủ đơn đọc ảnh chọn đã xuất bản và bản đã giao, không đọc `-1` (nháp). Chỉ owner role 6 đúng booking được ghi lựa chọn qua JWT; quản lý thư mục, share/revoke, export và xuất bản tiếp tục dành cho ekip. Thu hồi link công khai không thu hồi quyền tài khoản chủ đơn.
- Component album nhúng giữ ghi chú đang viết khi chuyển tab; parent quản lý workflow/lịch sử/nghiệm thu, component quản lý dữ liệu album. Bàn giao mới đồng bộ phiên bản lên parent và chọn tab ảnh đã chỉnh. Khách đã nghiệm thu không còn sửa ghi chú ảnh của bản đó.

## Vận hành và cấu hình

1. Bật Google Drive API trong Google Cloud project, tạo API key dùng phía server và giới hạn key cho Drive API. Nếu giới hạn theo IP, cho phép IP outbound của backend.
2. Đặt `GOOGLE_DRIVE_API_KEY` trong `backend/.env` và khởi động lại backend. Bật `CLIENT_PORTAL_ENABLED=true`, `CLIENT_WORKFLOW_ENABLED=true`; MongoDB cần replica set như workflow hiện tại.
3. Studio mở hồ sơ đơn đang hậu kỳ → **Bàn giao ảnh → Xem ảnh bàn giao → Ảnh chọn** → thêm tên/link/giới hạn → lưu/lấy ảnh → chọn ảnh bìa → xuất bản → tạo và lưu link khách. Chủ đơn cũng có thể chọn trong tài khoản. Link chỉ hiển thị lại khi phát hành; có thể tạo lại để thu hồi link cũ.
4. Khi khách chốt, xuất danh sách tên file để lọc trên máy. Trong tab **Ảnh đã chỉnh**, dùng thư mục Drive riêng cho phiên bản → lấy ảnh đã chỉnh → xem bản chuẩn bị → gửi bản bàn giao. Có thể dùng mục **Tải ảnh trực tiếp lên hệ thống** để giao ảnh local. Giữ nguyên thư mục/file Drive đã giao.
5. Sau góp ý qua link, ekip nhập lý do và bấm bắt đầu chỉnh lại, chuyển sang hậu kỳ trên chính màn bàn giao rồi gửi phiên bản mới. Chủ đơn nghiệm thu ở tab **Ảnh đã chỉnh** trong tài khoản.

Trong Google Cloud Console: chọn/tạo project → **APIs & Services → Library → Google Drive API → Enable**; vào **Credentials → Create credentials → API key**. Trong cấu hình key, chọn **API restrictions → Restrict key → Google Drive API**. Dán key vào biến sau ở `backend/.env` (không dùng tiền tố `VITE_`):

```dotenv
GOOGLE_DRIVE_API_KEY=your-server-api-key
```

Khởi động lại backend, sau đó thử một thư mục mẫu JPEG/PNG/WebP đã chia sẻ bằng link. Lấy ảnh thành công phải hiển thị số ảnh và tên thư mục, ảnh mở lớn được và tải được. Nếu nhận lỗi quyền, kiểm tra quyền thư mục/từng ảnh và giới hạn của key; lỗi quota/timeout có thể thử lại mà không mất danh sách cũ.

Sao lưu MongoDB để giữ lựa chọn, ghi chú và metadata lịch sử; ảnh Drive cần studio tự giữ/sao lưu. Localhost chỉ dùng nghiệm thu local, gửi cho khách ngoài Internet cần hosting frontend/backend. Key Google không cần thiết để xem album upload cũ.

## Kiểm chứng

`backend/tests/booking-album.cjs` chạy HTTP + MongoDB riêng và giả lập Google. `ALBUM_BROWSER_TEST=true` bổ sung Chrome desktop/mobile, Vite cô lập cổng 4023 và ảnh chụp trong `audit/drive-album-2026-11-10`. Không kết nối Google thật bằng fixture.

Kiểm thử Drive thật cần API key và thư mục mẫu công khai riêng. Đây là bước kiểm chứng phụ thuộc cấu hình ngoài, chưa được chứng minh bởi fixture test.
