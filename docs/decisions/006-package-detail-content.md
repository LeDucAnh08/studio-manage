# ADR-006: Nội dung và ảnh chi tiết của gói dịch vụ

## Trạng thái và ngày

Accepted — 30/10/2026, Asia/Bangkok. User đã duyệt kế hoạch và yêu cầu triển khai.

## Bối cảnh

Bảng giá chỉ có thông tin tóm tắt. Khách cần một đường dẫn chia sẻ cho từng gói, có quyền lợi, ảnh demo, lịch trình buổi chụp, quy trình dịch vụ, chi phí và chính sách. Admin tải ảnh từ máy, nội dung hiển thị ngay sau khi lưu. Đồ án dùng môi trường local; chưa có dịch vụ lưu ảnh.

## Quyết định

- Trang công khai `/pricing/:id` dùng layout khách hàng. CTA đi qua `/booking/start?source=pricing&package=:id`, tái sử dụng cơ chế đăng nhập và giữ lựa chọn hiện tại.
- `Package.details` là nhóm tùy chọn; dùng lại các trường giá/người, thời lượng, trang phục, ekip, hậu kỳ và bàn giao hiện có. Gói cũ hoạt động mà không cần migration. Không tự tạo nội dung thương mại cho các gói chưa cấu hình.
- Admin vai trò 0/1 sửa nội dung tại `/settings/packages/:id/content`. Đây là màn riêng vì nội dung và ảnh dài hơn form cấu hình gói cơ bản. Không có draft/publish hoặc tính tổng tiền tự động.
- `GET /api/public/packages/:id` chỉ chọn trường công khai và populate tên loại trang phục. API danh sách giữ nội dung tóm tắt.
- `PUT /api/packages/:id/content` nhận multipart: `content` là JSON `{version, details}`, các file mới nằm trong `images`. `details.gallery` theo thứ tự hiển thị, mỗi dòng có `{id, alt, caption}` cho ảnh cũ hoặc `{uploadIndex, alt, caption}` cho ảnh mới. Chỉ nhận ID ảnh thuộc gói hiện tại. Chỉ số file bắt đầu từ 0. Backend tạo ID, kích thước và đường dẫn; client không cung cấp đường dẫn lưu file.
- Dùng Multer nhận file và Sharp giải mã, giới hạn 24 megapixel, xoay đúng hướng, thu nhỏ cạnh dài tối đa 1920 px và xuất WebP. Tối đa 10 ảnh/gói, 5 MB/ảnh và 100 KB nội dung. Không nhận SVG hoặc ảnh động, không giữ metadata gốc. Serve ảnh qua `/api/media/packages/:id`.
- Lưu ảnh vào thư mục ngoài source/build, cấu hình bằng `UPLOAD_DIR`, mặc định `.data/package-media` tại root. Docker dùng volume riêng. Chọn lưu local vì đây là đồ án local và không cần thêm tài khoản/dịch vụ cloud.
- `detailsVersion` được cập nhật bằng compare-and-set để hai người sửa không ghi đè. Nội dung đầu vào được kiểm tra trước khi xử lý ảnh; file mới được dọn khi xử lý hoặc ghi DB thất bại. Ảnh cũ chỉ bị xóa sau khi cập nhật thành công. Endpoint sửa gói cơ bản không cho ghi `details` hoặc `detailsVersion`.

## Hệ quả

- Khởi động lại/build lại không làm mất ảnh. Backup phải gồm cả MongoDB và thư mục ảnh; deploy nhiều instance cần chuyển thư mục sang kho lưu trữ dùng chung.
- Không có giao dịch nguyên tử giữa filesystem và MongoDB. Lỗi được bắt sẽ dọn file; tiến trình bị kill giữa chừng có thể để lại file không được tham chiếu, nhưng không làm nội dung đang lưu trỏ tới file chưa ghi xong.
- Khi xung đột phiên bản, trả 409 và giữ nội dung đang sửa để admin chủ động tải lại. Lỗi tải nội dung cho phép thử lại; gói không tồn tại trả 404.
- Nếu kết nối đứt sau khi MongoDB đã nhận lệnh ghi, kiểm tra lại tham chiếu trước khi dọn ảnh mới. Nếu không đọc lại được DB, giữ file để tránh xóa ảnh đã commit; có thể còn file không được tham chiếu sau sự cố.

## Bổ sung ngày 31/10/2026

`details.deliverables` (sản phẩm bàn giao), `details.shootScope` (phạm vi buổi chụp) và `details.pricingConditions` (điều kiện áp dụng giá) là văn bản nhiều dòng tùy chọn, tối đa 4.000 ký tự/mục. Admin nhập tại màn nội dung chi tiết; khách chỉ thấy mục có nội dung. Dùng văn bản vì đây là thông tin tư vấn theo từng gói, chưa phải quy tắc tính tiền hay giới hạn đặt lịch tự động. Các trường giá, thời lượng, hậu kỳ và ngày bàn giao cơ bản vẫn là nguồn dữ liệu hiện có; không cần migration hoặc tự điền cam kết thương mại cho gói cũ.

## Kiểm chứng

Backend có `tests/package-content.cjs` (HTTP và filesystem cô lập), frontend có component tests cho trang khách và trang quản lý, E2E có `frontend/e2e/package-content.spec.cjs`. E2E dùng database và thư mục ảnh test riêng; không sửa dữ liệu demo của ứng dụng.
