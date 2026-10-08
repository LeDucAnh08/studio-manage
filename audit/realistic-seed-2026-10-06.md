# Seed dữ liệu đồ án — 06/10/2026

Đã nạp bộ dữ liệu giả lập tiếng Việt vào `studio_project_demo`, MongoDB local `127.0.0.1:27029`, replica set `rs0`. Ứng dụng tiếp tục chạy tại `http://localhost:4001`. Không dùng dữ liệu cá nhân/giao dịch thật; ngày gốc của bộ dữ liệu là 06/10/2026.

| Dữ liệu | Bổ sung | Tổng sau seed |
|---|---:|---:|
| Tài khoản | 27 | 33 |
| Mùa | 3 | 3 |
| Loại trang phục | 6 | 8 |
| Mẫu trang phục/phụ kiện | 18 | 21 |
| Gói chụp | 5 | 7 |
| Danh mục thu/chi | 4 | 14 |
| Lớp/nhóm khách hàng | 20 | 22 |
| Thành viên | 802 | 807 |
| Hồ sơ chụp/workflow | 20 | 22 |
| Lịch chụp | 17 | 19 |
| Đơn thuê | 24 | 25 |
| Giao dịch | 120 | 126 |
| Đánh giá chụp | 8 | 9 |

20 hồ sơ chụp gồm 10 hoàn tất, 2 hậu kỳ, 1 đã bàn giao, 1 đang chỉnh sửa, 3 chốt lịch sắp tới, 1 chờ cọc, 1 báo giá và 1 mới tiếp nhận. 24 đơn thuê gồm 12 hoàn tất, 3 đã trả đồ, 3 chốt lịch, 2 đang giao đồ, 1 báo giá, 1 yêu cầu mới, 1 hủy và 1 từ chối. 120 giao dịch gồm 78 khoản liên kết đúng payment trong dịch vụ và 42 khoản chi vận hành.

Toàn bộ fixture được kiểm tra Mongoose trong bộ nhớ trước khi ghi. Seeder dùng ID ổn định, marker hoàn tất và một transaction cùng khóa tài nguyên của ứng dụng; tạo index theo model, không xóa index. 44 bản ghi có sẵn được kiểm tra dấu vân tay trước/sau và giữ nguyên. Chạy lại seed trả `retained`, tạo 0 bản ghi; dấu vân tay của cả 17 collection / 1.174 bản ghi (gồm metadata và lock) không đổi.

Đối soát sau commit: `ready=true`, 0 blocker. Các tình huống mở hợp lệ: 12 hồ sơ còn thu, 2 cần hoàn cọc, 1 đơn thuê chờ chấp thuận quyết toán và 42 chi phí vận hành chưa gắn vào payment dịch vụ. Không phát hiện xung đột lịch thợ, vượt tồn kho, payment mồ côi hay lệch sổ tiền. Kiểm tra browser được ghi riêng trong `.workflow-tools/realistic-browser.json`.

Chrome trên bản build: 9 kiểm tra dữ liệu mới đạt (20 lớp/802 thành viên qua API, chi tiết lớp, hai hồ sơ chụp, hai đơn thuê, báo cáo công nợ và kho 360px, tài khoản khách mới xem hồ sơ/đánh giá của mình). 0 lỗi JavaScript, không tràn toàn trang trên mobile. 8 kiểm tra bộ hồ sơ demo cũ cũng đạt sau seed; smoke cũ đã lấy công nợ hiện tại từ API để tránh giả định tổng luôn bằng 750.000đ. Cú pháp, Prettier của các script và `git diff --check` đạt.

Bằng chứng cục bộ (git-ignore): `realistic-seed.json`, `realistic-replay.json`, `realistic-before-*.json`, `realistic-readiness-*.json`, thư mục `screenshots`. Các file dấu vân tay chỉ lưu ID/hash, không xuất mật khẩu hoặc token. Xem cách chạy và tài khoản trong [DEMO_LOCAL.md](../DEMO_LOCAL.md).
