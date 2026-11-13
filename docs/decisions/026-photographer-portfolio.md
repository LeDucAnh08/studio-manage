# 026 — Portfolio cá nhân và bản công khai dùng chung hồ sơ

Ngày: 2026-11-13. Trạng thái: chấp nhận.

## Bối cảnh

Thợ chụp cần tự sửa portfolio concept theo mockup phương án 1. Nội dung chỉnh trong workspace phải là hồ sơ khách hàng thấy trên website, đồng thời việc lưu nháp không được làm thay đổi bản công khai hay quyền nhận concept.

## Quyết định

- Giữ `PhotographerProfile` duy nhất theo photographer. Các trường cấp cao nhất tiếp tục là bản công khai để tương thích với trang hồ sơ và truy vấn lịch trống hiện có. `draft` lưu nội dung đang biên tập; `revision` tăng mỗi lần ghi, `publishedRevision` ghi nhận phiên bản được công khai. Hồ sơ cũ không có revision được coi là 0; đọc không tạo hồ sơ mới hay chạy seed/migration.
- Workspace `/my-portfolio` dành cho role 3, kể cả tài khoản nhiều vai trò có role này. Không nhận photographer/concepts từ form để xác định chủ sở hữu hoặc quyền nhận lịch. Tên lấy từ User, concept do admin phân công.
- `GET /api/photographers/me/portfolio` trả nội dung nháp mới nhất, metadata phiên bản và concept được phân công. `PUT` lưu nháp; `POST /api/photographers/me/portfolio/publish` lưu nội dung hiện tại và công khai trong cùng một cập nhật nguyên tử. Hai lệnh nhận multipart với trường JSON `content: {revision, content}` cùng tối đa 10 file `images`; tham chiếu file mới bằng `upload:N`.
- Compare-and-swap theo revision, kể cả đường chỉnh của admin. API admin `/api/concepts/profile` yêu cầu revision khi sửa hồ sơ hiện có; catalog quản lý trả bản nháp mới nhất. Admin vẫn quản lý concept và có thể ẩn hồ sơ. Phiên bản lỗi trả 409, frontend giữ nội dung đang sửa và yêu cầu tải lại có cảnh báo bỏ thay đổi.
- Public API mới `/api/photographers/:id/portfolio` và API cũ `/api/concepts/photographers/:id` dùng cùng hàm đọc bản công khai. Trang `/photographers/:id`, hồ sơ trong bước đặt concept và preview dùng chung `PhotographerPortfolio`. Preview thu gọn chỉ hiện giới thiệu và ba ảnh đầu; xem trước toàn trang hiển thị đầy đủ cùng navbar khách hàng, trong native dialog để focus không lọt về sidebar.
- Chỉ hồ sơ đã công khai của tài khoản thợ hoạt động với concept đang hoạt động được đọc công khai. Chỉ ảnh tác phẩm được đánh dấu permitted và thuộc concept đang hoạt động được hiển thị. Công khai yêu cầu chân dung, giới thiệu và ít nhất một ảnh có quyền công khai trong concept đang hoạt động được phân công. Không tự tạo thành tích, review hay kinh nghiệm.
- Upload JPEG/PNG/WebP tĩnh ≤5 MB, ≤24 megapixel; tối đa 100 tác phẩm. Dùng Multer/Sharp hiện có, xoay theo EXIF, giới hạn 1920 px, ghi WebP bằng UUID trong `.data/portfolio-media/<owner>/` (có thể đổi bằng `PORTFOLIO_UPLOAD_DIR`). Không thêm dependency. Thư mục này cần được lưu bền và backup cùng ứng dụng; không commit ảnh lên Git.
- Không mount static cho ảnh nháp. `GET /api/photographers/:id/portfolio-media/:file` chỉ phục vụ ảnh còn thuộc bản công khai hợp lệ hoặc có Bearer token của chính chủ. Ảnh nháp tải qua API thành object URL; không nhét token vào URL. Nội dung và media trả `Cache-Control: no-store` để không giữ quyền xem cũ sau khi ẩn hồ sơ. Cleanup sau lần lưu của thợ đọc lại tham chiếu đã persist trước khi xóa, kể cả khi ghi lỗi; ảnh bản công khai đang dùng luôn được giữ. Đường admin giữ file cũ an toàn; không chạy xóa hàng loạt.

## Kiểm chứng

Chạy `npm run test:portfolio` trong backend cho HTTP trên database local riêng `studio_portfolio_test_<pid>`, tự dọn DB và thư mục ảnh fixture; không ghi vào `studio_db`. Kiểm thử bao gồm legacy, role/ownership, nháp, công khai, lịch trống, media riêng/công khai, file lỗi/quá lớn, ảnh không được phân công, thất bại không đổi bản công khai và xung đột admin/thợ. Hồi quy `concept-booking.cjs`, frontend editor/sidebar/đặt concept, TypeScript và production build. Bằng chứng giao diện trong `audit/photographer-portfolio-2026-11-13` và báo cáo `design-qa.md`.
