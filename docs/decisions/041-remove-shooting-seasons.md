# ADR-041: Loại bỏ mùa chụp

## Trạng thái và ngày

Accepted — 26/11/2026, Asia/Bangkok. Người dùng yêu cầu bỏ các phần liên quan mùa chụp sau khi cập nhật mô hình dữ liệu Role.

## Bối cảnh

Mùa chụp là metadata phân nhóm theo khoảng ngày, được gán lên lớp, lịch và giao dịch; không quyết định quyền, thanh toán, giữ kho hoặc lịch xác nhận. Người dùng không còn dùng cách phân nhóm này.

## Quyết định

- Xóa model/collection Season, controller, route `/api/seasons`, cache tự gán và ba script migration cũ. Xóa thuộc tính/index season trên Customer, Schedule, Transaction và các DTO/projection liên quan.
- Bỏ bộ chọn ở sidebar, banner dashboard và trường nhập mùa trong lớp, lịch, tài chính. Xóa Redux slice/service/page cũ. Giữ các bộ lọc ngày, người phụ trách, dịch vụ và kỳ thống kê hiện có; URL cũ có tham số season không giới hạn kết quả.
- Dashboard cá nhân vẫn giới hạn đơn được phân công, thống kê theo kỳ và dùng mốc thời gian Việt Nam như trước. Các quyền, điều kiện thanh toán và điều phối tài nguyên không thay đổi.
- Dữ liệu mẫu không tạo, gán hay kiểm tra mùa. Giữ seed marker đã hoàn tất; không chạy seed lại trên database thật.
- Drive đặt bộ ảnh mới trực tiếp trong folder gốc; Sheet dùng tab Lịch chụp. Tìm lịch cũ bằng scheduleId trên các tab và giữ folder URL đã có. Xóa lịch vẫn dùng folderId để dọn đúng folder. Không di chuyển hoặc xóa hàng loạt folder/tab cũ. Webhook hiện chưa được cấu hình; khi bật, triển khai phiên bản Code.gs mới kèm repository.
- Lệnh `yarn workspace studio-management-backend migrate:remove-seasons` mặc định chỉ kiểm tra `studio_db` đang cấu hình. Thêm `--apply` để sao lưu BSON riêng collection seasons, liên kết và các index liên quan trước khi xóa metadata. Không thay đổi updatedAt của dữ liệu nghiệp vụ.
- Kiểm chứng hash BSON của các collection khác (bỏ riêng trường season ở ba collection liên quan). Nếu phát hiện dữ liệu đổi đồng thời thì dừng và giữ backup; không xóa lớp, lịch, giao dịch, tài khoản, thanh toán hoặc seed marker.
- Yêu cầu này thay thế phần bộ lọc mùa trong ADR-033 và thiết kế dashboard cá nhân cũ. Các quyết định còn lại tiếp tục có hiệu lực, bao gồm Role 0/1/3/6, Atlas studio_db, email, SePay và background jobs hiện tại.

## Kiểm chứng

Build backend/frontend; kiểm thử dashboard, danh sách và biểu mẫu lớp/lịch/tài chính, phạm vi thợ chụp, API cũ và Drive/Sheet. Kiểm tra trình duyệt không còn control mùa hay yêu cầu tới API seasons. Cleanup phải giữ nguyên các bản ghi nghiệp vụ, xóa đúng metadata và chạy lại không tạo thay đổi.

Kết quả thực hiện: build backend/frontend thành công; 43 kiểm thử backend liên quan và 48 kiểm thử frontend qua. Chrome headless kiểm tra biểu mẫu lớp/lịch/tài chính cùng dashboard quản trị/thợ chụp trên desktop/mobile, không có control hoặc request mùa và không có lỗi trình duyệt; bằng chứng tại `audit/no-seasons-2026-11-26/`.

Người dùng xác nhận rõ “Có, sao lưu rồi dọn dữ liệu mùa” trước khi áp dụng cleanup trên Atlas `studio_db`. Backup BSON tại `C:/Users/APC/AppData/Local/Temp/studio-remove-seasons-F1C7Xl`. Đã xóa 3 định nghĩa mùa, trường season trên 1 lớp, 1 lịch và 1 giao dịch, cùng 6 index liên quan. Hash BSON xác nhận dữ liệu nghiệp vụ còn lại của 36 collection không đổi. Kiểm tra lại không còn collection seasons, trường/index cần dọn; API seasons trả 404. Validate fixture mới qua và không ghi database.
