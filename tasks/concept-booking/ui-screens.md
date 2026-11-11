# Danh sách gói và chi tiết concept — 11/11/2026

## Thiết kế đã chốt

- Danh sách 3 cột desktop, 1 cột mobile; card có ảnh, tên, giá, thời lượng, số ảnh chỉnh sửa và Xem chi tiết.
- Chi tiết là trang riêng, có câu chuyện concept, đối tượng phù hợp, không gian, gợi ý trang phục, gallery, quyền lợi và điều kiện.
- Chỉ có nút Chọn gói này ở cuối chi tiết; không có thanh bước hoặc nút chọn trên card.
- Ngày giờ/thợ/trang phục/brief/kiểm tra tiếp tục dùng nghiệp vụ hiện có, chuyển màn bằng URL và giữ draft.

## Checklist

- [x] Hai route mới và danh sách tương thích đường dẫn `/concepts`.
- [x] Giữ bộ lọc khi quay lại; gói không còn khả dụng có trạng thái rõ ràng.
- [x] Gallery mở lớn, điều hướng bằng nút/phím, Escape đóng và trả focus.
- [x] Nội dung/ảnh lưu trong dữ liệu concept; quản trị có thể chỉnh sửa, API kiểm tra URL và tối đa 24 ảnh.
- [x] Bổ sung ảnh WebP cho các gói, 8 ảnh chân dung và gallery cho cặp đôi/gia đình/áo dài.
- [x] Luồng chọn gói không tạo đơn hoặc ghi nhận tiền; đăng nhập/xác minh email/checkout giữ kiểm tra hiện có.
- [x] Browser desktop/mobile, QA với mockup và integration backend riêng.
- [x] Decor riêng theo gói: phông nền, đạo cụ, cách bố trí và decor đi kèm; chỉnh trong quản lý, lưu vào snapshot lúc đặt và hiển thị trên chi tiết. Bổ sung nội dung cho sáu gói local.
- [x] Bốn phần nội dung ưu tiên: lời giới thiệu riêng, studio đồng hành (tối đa bốn quyền lợi), bộ ảnh nhận được và bộ ảnh giới thiệu có mở lớn. Quản lý gói chỉnh được toàn bộ nội dung; số ảnh và lượt góp ý lấy theo nghiệp vụ hiện có.
- [x] Sáu gói local có nội dung riêng và ảnh concept hiện có. Khi có ảnh khách thật hoặc cặp ảnh trước/sau, thay trong “Bộ ảnh giới thiệu” và cập nhật tiêu đề, chú thích; không gắn ảnh minh họa thành ảnh khách thực tế.

Hướng dẫn và prompt ảnh: `docs/assets/concept-photography.md`. QA hiện tại ở `design-qa.md`; bằng chứng trong `audit/concept-pages-2026-11-11/`.
