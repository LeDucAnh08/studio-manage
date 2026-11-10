# Album chọn và giao ảnh Google Drive

Triển khai theo kế hoạch người dùng duyệt ngày 10/11/2026. Ảnh ở Drive công khai bằng link; khách dùng token riêng không đăng nhập, một danh sách chọn chung. Nghiệm thu chỉ chủ đơn đăng nhập. Giữ tương thích album local và link cũ.

Thứ tự: Drive client → album staff/sync → guest selection/finalize → Drive delivery/workflow → UI → tests/docs. Dùng transaction hiện tại; không gọi Google trong transaction. Ảnh lịch sử không được tự thay thế nếu nguồn Drive thay đổi.

Không có Drive API key/thư mục kiểm thử thật trong cấu hình lúc bắt đầu. Kiểm chứng Google thật cần hai cấu hình này; không tuyên bố fixture là kiểm thử Google thật.

## Kết quả triển khai

Đã nối manager `/workflow-bookings/:id/album`, guest `/albums/:publicId#access=...`, export tên file và workflow bàn giao Drive. Snapshot chốt riêng `BookingAlbumSelection`; phiên bản bàn giao riêng `BookingAlbumPhoto`, giữ đường đọc local cũ. Metadata/ảnh Google chỉ đọc ngoài transaction. Guest client tách riêng và bootstrap tài khoản hết hạn không chuyển link album sang login.

Người dùng đã chọn **bàn giao kèm hướng dẫn cấu hình** thay cho kiểm chứng Google thật trong phiên này. Cách dùng và cấu hình tại `docs/decisions/014-drive-photo-albums.md`.
