# ADR-017: Giai đoạn cố định cho đơn thuê

Accepted — 10/11/2026, Asia/Bangkok.

Đơn thuê có nhiều trạng thái nghiệp vụ để xử lý cọc, giao nhận và ngoại lệ. Hiển thị từng trạng thái này trên danh sách làm tiến độ thay đổi nhãn và bộ lọc khó đối chiếu.

## Quyết định

API trả thêm `orderStage`, suy ra từ `status`, không lưu thêm trạng thái có thể lệch dữ liệu:

| orderStage | Nhãn | status nội bộ |
| --- | --- | --- |
| awaiting_confirmation | Chờ xác nhận | requested, quoting, awaiting_deposit, ready_to_confirm, payment_review |
| ready_for_pickup | Chờ nhận đồ | confirmed |
| renting | Đang thuê | checked_out |
| settling | Chờ đối soát | returned |
| completed | Hoàn tất | completed |
| cancelled | Đã hủy | cancelled, rejected, expired |

Danh sách khách, danh sách studio và hồ sơ cùng dùng năm mốc cố định. Nhóm Đã hủy không phải bước tiếp theo của tiến độ. Lý do hết hạn/từ chối/hủy và cảnh báo cần xử lý vẫn hiện trong hồ sơ. `payment_review` chưa giữ được trang phục nên thuộc Chờ xác nhận, kèm cảnh báo vận hành.

`GET /api/rentals?view=...` nhận các khóa trên; dữ liệu và tổng số cùng dùng một bộ điều kiện trạng thái, giữ điều kiện chủ đơn. API vẫn nhận khóa cũ `active`, `rejected`, `expired`, `payment_review` để tương thích. Giao diện chuẩn hóa liên kết cũ về nhóm mới; `active` về Tất cả. Các hành động, điều khoản và quyền giao/nhận/đối soát tiếp tục kiểm tra trạng thái nội bộ theo ADR-016.

## Dữ liệu demo

Công cụ sandbox dùng tên trang phục, lớp và ghi chú tự nhiên. Khi chạy lại, chỉ chuẩn hóa chuỗi mẫu đã biết trong database sandbox, gồm snapshot tên hiển thị; không thay số tiền, tồn, mã giao dịch hoặc lịch sử nghiệp vụ. Theo yêu cầu tiếp theo ngày 10/11/2026, giao diện bỏ các thông báo demo và chữ mô phỏng ở ngân hàng; vẫn giữ nút Thanh toán thử và kiểm tra sandbox/phân quyền phía server.

## Kiểm chứng

Kiểm thử HTTP/MongoDB riêng đối chiếu mọi trạng thái nội bộ, nhóm lọc, phân trang, tổng số và quyền sở hữu. Kiểm thử frontend xác nhận các mốc luôn cùng tên, lọc gửi đúng khóa và đơn kết thúc không còn bước chờ. Kiểm chứng trình duyệt tại cổng 4001.
