# Thuê trang phục tự động

Yêu cầu: bỏ duyệt/báo giá riêng cho đơn mới; khách xác nhận tổng tiền và điều khoản rồi đặt cọc. Không thực hiện cơ chế xử lý biến động giá khi đang đặt. Sau khi có bất kỳ khoản cọc nào, khách không được hủy, đổi mẫu, size, số lượng, ngày hoặc gia hạn. Studio không thể giao được hàng phải có ngoại lệ hoàn tiền, không ép khách đổi mẫu.

## Checklist

- [x] Đơn mới tự tính giá/ngày và cọc theo mẫu; bắt buộc đồng ý điều khoản. Mẫu thiếu giá/cọc bị chặn.
- [x] Giữ tồn nguyên tử 15 phút, giới hạn 2 đơn chờ cọc; ngày nhận tối thiểu 24h, khung giờ 09–17h, ngày đóng cửa cấu hình được; buffer giặt 1 ngày.
- [x] Hết hạn trả tồn; thanh toán thiếu, thừa, muộn, sai mã, webhook lặp được xử lý và đối soát; giữ bằng chứng tiền về.
- [x] Chặn hủy/đổi sau khoản thu đầu tiên ở API và UI; giữ giao/nhận trả/đối soát hiện có; thiếu hàng vận hành có ngoại lệ hoàn tiền cho studio.
- [x] UI giá/cọc/điều khoản/QR/hạn cọc, cấu hình cọc trong quản lý mẫu, tương thích đơn cũ.
- [x] Integration trên DB test riêng, hồi quy thanh toán booking, frontend tests, typecheck/build và kiểm tra trình duyệt desktop/mobile.

Không gửi tiền/email thật hoặc thay đổi đơn hiện có để kiểm thử. Các kiểm tra dùng database riêng. Tận dụng transaction khóa tài nguyên, SePay receipt/outbox, ledger và màn đối soát hiện có.

## Kết quả kiểm chứng

- Backend hồi quy: 157/157; kiểm tra riêng luồng thuê cuối: 11/11 (parent + 10 tình huống).
- Frontend hồi quy toàn bộ: 330/330; sau chỉnh cuối, 55/55 tests hồ sơ/đặt thuê đạt.
- E2E thật HTTP + MongoDB riêng + webhook sandbox: desktop 1440×1000 và mobile 390×844 đạt; không tràn ngang, không lỗi JavaScript.
- Có bằng chứng giao diện và báo cáo tại `audit/rental-auto-checkout-2026-11-10/`.
- Typecheck/build/check frontend/backend; cảnh báo lint/chunk có sẵn.
- Script sandbox đã kiểm tra cú pháp. Không gửi tiền hoặc thư thật; cấu hình SePay live trên máy hiện đang tắt và không tự thay đổi.

## Demo qua giao diện

- [x] Nút Thanh toán thử trong panel cọc cho đơn thuê và chụp, không cần CLI cho từng giao dịch.
- [x] Chỉ bật qua SEPAY_DEMO_UI trên development + sandbox + MongoDB loopback đúng database; kiểm tra quyền sở hữu và idempotency phía server.
- [x] Kiểm chứng: 27 backend tests gồm browser desktop/mobile bấm nút thật, 8 frontend tests; typecheck backend/frontend và ESLint phần thay đổi đạt.
- [x] Bản demo đã khởi động ở http://127.0.0.1:4013/costumes, backend 5013, database studio_sepay_sandbox.

## Cổng demo thống nhất

Theo yêu cầu tiếp theo, demo hiện dùng http://localhost:4001 cho cả giao diện và URL API /api. Vite proxy sang backend sandbox nội bộ 5013; đã dừng frontend demo 4013. Đã kiểm chứng bằng Chrome: mango thấy đơn thuê và nút Thanh toán thử trên 4001, chưa thanh toán. Công cụ serve và tài liệu đã cập nhật mặc định 4001.

## Giai đoạn đơn thuê và dữ liệu demo

- [x] Năm mốc cố định: Chờ xác nhận → Chờ nhận đồ → Đang thuê → Chờ đối soát → Hoàn tất; nhóm Đã hủy gộp hủy/từ chối/hết hạn.
- [x] DTO `orderStage` và bộ lọc server dùng cùng bảng trạng thái; giữ nghiệp vụ và quyền của đơn cũ.
- [x] Khách/studio dùng cùng nhãn, bộ lọc và tiến độ trong hồ sơ; lý do kết thúc/cảnh báo giữ riêng.
- [x] Công cụ seed đặt tên tự nhiên, chuẩn hóa chuỗi mẫu cũ trong sandbox, giữ dữ liệu thanh toán và cảnh báo mô phỏng.
- [x] Kiểm thử stage/filter/ownership/phân trang, typecheck/build và trình duyệt 4001.

Quyết định chi tiết: ADR-017.

## Bổ sung đơn chờ cọc cho mango

- [x] `seed`/`serve` bổ sung tối đa 2 đơn đang chờ cọc cho mango bằng controller đặt thuê, không đặt lại đơn đã thanh toán hoặc sửa đơn hết hạn.
- [x] Riêng công cụ sandbox dùng hạn cọc 120 phút để đủ thời gian demo; giới hạn 2 đơn/tài khoản giữ nguyên. Tên và ghi chú không gắn nhãn seed.
- [x] Chạy seed hai lần giữ nguyên 2 ID, không nhân đôi; kiểm tra API/bộ lọc và nút Thanh toán thử bằng Chrome trên 4001, chưa thanh toán. Bằng chứng: `pending-seed-verification.json`, `mango-pending-orders.png`, `mango-pending-payment.png`.

## Nội dung thanh toán

Theo yêu cầu tiếp theo, bỏ banner và hướng dẫn demo, dòng tự cập nhật sau khi bấm Thanh toán thử; thông báo kết quả dùng lời bình thường. Tên ngân hàng/chủ tài khoản trong cấu hình và snapshot sandbox đổi thành MBBank / YUME STUDIO. Không đổi tiền, mã đơn hoặc logic thanh toán. Thông báo ghi nhận yêu cầu xác minh email cũng bỏ mô tả chế độ thử nghiệm.

Kết quả: 29 backend tests và 103 frontend tests liên quan đạt (4 files). Typecheck cả hai phần, build backend/frontend, ESLint các file frontend thay đổi đạt; build còn cảnh báo chunk có sẵn. Chrome desktop/mobile: bộ lọc khách/studio khớp API và tổng số, hồ sơ hiện lý do hết hạn, không tràn ngang hoặc lỗi JavaScript. Seed chạy lại thành công, tên/ghi chú sạch trong database sandbox. Bằng chứng: `stage-backend-tests.log`, `stages-browser.json`, `stages-client.png`, `stages-client-mobile.png`, `stages-studio.png` trong thư mục audit hiện có. Đơn mango cũ đã hết hạn cọc nên thuộc nhóm Đã hủy; không tự gia hạn hoặc thanh toán.
