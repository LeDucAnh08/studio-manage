# Thông tin buổi chụp — 12/11/2026

Phương án 1 được chọn: form bên trái, thông tin gói/lịch/thợ bên phải. Gộp trang
phục và brief để khách hoàn thành chuẩn bị trên một màn, rồi kiểm tra đặt cọc.

- [x] Họ tên, điện thoại, số người; size/chiều cao/cân nặng theo người nếu gói có đồ.
- [x] Ý tưởng và link ảnh mẫu cùng màn; giữ giới hạn hiện có (4.000 ký tự, 10 link ở server).
- [x] Tóm tắt ảnh gói, thời lượng, số ảnh chỉnh, ngày/giờ theo múi giờ studio, thợ, giá.
- [x] Một Back có mũi tên, không gạch chân, về chọn thợ; một Continue tới review.
- [x] Gói `maxPeople: 1` cố định một người và không hiện selector; gói nhiều người cho chọn.
- [x] Giữ `/book/costumes` cho màn chung; `/book/brief` redirect bằng replace.
- [x] Giữ draft cũ, tải lại và quay lại; chặn review nếu thông tin bắt buộc chưa đủ.
- [x] Không ép số đo với gói trang phục cá nhân, không đổi API/checkout/giá/điều khoản.
- [x] 26 frontend tests: flow 23, returnTo 3. TypeScript, ESLint, build và diff checks.
- [x] Chrome desktop 1487×1058, tablet 834×1194, mobile 390/320×844; không tạo đơn.
- [x] So sánh toàn màn và vùng form với mockup; QA ở `design-qa.md`.

Mẫu chọn: `audit/concept-preparation-2026-11-12/reference.png` (bản đầu hiển thị
trong bộ mockup). Ảnh gói và logo dùng asset hiện có; icon dùng Lucide hiện có.
Không lấy giới hạn 500 ký tự hoặc bộ đếm do hình sinh ra làm thay đổi quy tắc dữ liệu.

Chuỗi hiện tại: chi tiết gói → thời gian → thợ → thông tin buổi chụp → kiểm tra/cọc.
File `wardrobe-measurements.md` ghi lại luồng ngày 11/11 trước khi gộp màn.
