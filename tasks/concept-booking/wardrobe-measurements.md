# Số đo trang phục, Back và tên mục kỉ yếu — 11/11/2026

## Kết quả yêu cầu

- Gói có trang phục: khách nhập size, chiều cao (cm), cân nặng (kg) cho từng người.
  Số người được chọn ở bước này; gói một người chỉ có ba ô số đo.
- Gói không kèm trang phục vẫn dùng trang phục cá nhân theo cấu hình gói; không
  ép nhập số đo không cần thiết hoặc thay quyền lợi/giá gói.
- Dữ liệu được giữ trong draft, trình bày ở kiểm tra trước cọc và lưu cùng đơn
  để ekip xem khi chuẩn bị. Số đo giữ nguyên khi đổi ngày/thợ.
- Mỗi màn có một Back ở đầu trang, có mũi tên và không gạch chân. Chuỗi Back:
  review → brief → costumes → photographer → date → chi tiết gói.
- “Đặt dịch vụ” đổi thành “Chụp kỉ yếu” trên UI, tiêu đề, menu desktop/mobile,
  lời nhắc và thông báo liên quan; không đổi URL/API/quy trình kỉ yếu.

## Dữ liệu và tương thích

`wardrobeMeasurements: [{size,heightCm,weightKg}]` lưu theo thứ tự người tham gia.
Khi gửi trường này, checkout kiểm số dòng theo số người và quyền lợi gói; size
1–12 ký tự, chiều cao 30–250cm, cân nặng 1–350kg, chấp nhận số thập phân hữu hạn.
Không gửi đồng thời lựa chọn mẫu trang phục cụ thể. Trường hợp gói không kèm đồ
có thể gửi mảng trống. API dùng cùng transaction/idempotency và quyền đọc đơn.

Đơn và client cũ dùng `costumes` tiếp tục hoạt động với kiểm kho/giữ đồ hiện có.
Luồng số đo không tự chọn hoặc giữ một mẫu/size tồn kho khi chưa có món cụ thể;
ekip chuẩn bị trang phục theo gói và số đo, trạng thái chuẩn bị/thu hồi giữ nguyên.
Không thêm thuật toán tự suy size hoặc thay luồng thuê trang phục.

## Checklist

- [x] Model, DTO, validation checkout và draft theo người.
- [x] Form ba số đo, kiểm dữ liệu thiếu, giữ khi Back/reload và hiển thị trong hồ sơ.
- [x] Không gọi API catalog trang phục từ luồng chọn concept mới.
- [x] Back đúng một bước, một nút mỗi màn, mũi tên và không gạch chân.
- [x] Nhãn “Chụp kỉ yếu” nhất quán, các đường dẫn giữ nguyên.
- [x] 152 frontend tests và 15 backend integration tests trên DB riêng đạt.
- [x] Chrome desktop/mobile, kiểm tra form và menu cuối.
- [x] TypeScript, ESLint, build hai phần và diff checks cuối.

Evidence: `audit/concept-wardrobe-2026-11-11/`.
