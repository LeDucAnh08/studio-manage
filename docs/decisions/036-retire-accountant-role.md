# ADR-036 Bỏ vai trò Kế toán

Accepted — 21/11/2026, Asia/Bangkok. Thay thế các quyền Kế toán trong ADR trước, bao gồm ADR-035.

Người dùng yêu cầu bỏ vai trò Kế toán trong project, sửa báo cáo đồ án và xóa dữ liệu kế toán mẫu liên quan. Quản trị viên tiếp nhận nghiệp vụ tài chính; không tạo thêm vai trò thay thế.

- Vai trò hoạt động còn 0 Superadmin, 1 Admin, 3 Thợ chụp ảnh và 6 Khách hàng. Giữ nguyên ID; 2/4/5 ngừng dùng. Không tự chuyển tài khoản vai trò 5 thành Admin. Phiên và đăng nhập chỉ có vai trò đã nghỉ bị từ chối; tổ hợp cũ có role thợ không được mở rộng phạm vi công việc hay xem tài chính nhờ role 5.
- Bỏ lựa chọn 5 khỏi schema tài khoản, đăng ký/xét duyệt nhân sự, menu và các điều kiện quyền. Nhân sự chỉ đăng ký Thợ chụp ảnh. Yêu cầu cấp tài khoản cũ không được tự cấp lại 5 khi duyệt mà không gửi roles.
- Chỉ quản trị 0/1 thực hiện thu chi, nhận tiền mặt, đối soát, ghi nhận hoàn thực tế và xem báo cáo tài chính. Giữ quyền sở hữu đơn của khách hàng, phạm vi phân công của thợ, xác thực webhook và mọi điều kiện về số tiền, hạn cọc, giữ tài nguyên, giao nhận, bàn giao ảnh.
- Giữ trường lịch sử `accountantRefunded` để đọc và ghi dữ liệu tương thích; nhãn giao diện đổi thành “Đã hoàn tiền”, quản trị viên được thao tác. Tên trường không cấp quyền cho vai trò 5.
- Seed không tạo `ketoan.maianh` hoặc `demo.accountant`; các kịch bản và fixture mới dùng tài khoản quản trị cho nghiệp vụ tài chính. Sandbox không sao chép tài khoản vai trò 5. Không seed lại dữ liệu vừa xóa khi khởi động hay đổi database chính.
- Báo cáo Word và sơ đồ thể hiện ba nhóm người dùng: quản trị (0/1), thợ chụp ảnh (3), khách hàng (6). SePay vẫn là tác nhân hỗ trợ bên ngoài.

## Dọn dữ liệu được người dùng cho phép

Chạy trên MongoDB Windows có xác thực, loopback `studio_db`, replica set `studio-rs0`, development. Kế hoạch xóa được ràng buộc bằng ID, bằng chứng seed và hash toàn bộ nội dung từng bản ghi; sao lưu trước, xóa trong một transaction, xác nhận nguyên vẹn bản ghi ngoài danh sách.

Đã xóa 1 tài khoản `ketoan.maianh`, 44 giao dịch, 10 booking, 10 workflow, 8 lớp mẫu, 200 học sinh mẫu, 8 lịch, 5 đơn thuê mẫu, 8 danh mục thu chi mẫu, 1 phản hồi và 6 bản ghi ảnh bàn giao phụ thuộc: tổng 301 bản ghi. Đơn thuê được xác minh bằng bằng chứng seed `rental-reset` đã lưu; các đơn chụp bổ sung bằng ID ổn định của `client-photo-states-v1` và manifest `realistic:v1`.

Giữ tài khoản khách hàng và thợ, đơn không liên quan, gói dịch vụ, concept, kho trang phục, ảnh và tệp nguồn trên đĩa hoặc Drive. Không gửi thông báo hay chuyển tiền. Marker `realistic:v1` tiếp tục `completed`, manifest loại ID đã xóa để lần seed lặp không tự khôi phục.

Bằng chứng: `audit/retire-accountant-2026-11-21/cleanup-plan.json`, `cleanup-result.json`; bản sao lưu BSON/EJSON ở `.workflow-tools/retire-accountant-2026-11-21-backup.ejson` không đưa vào Git.

## Kiểm chứng

58 kiểm thử backend liên quan đạt (57 phân quyền, báo cáo, đơn và thanh toán; 1 danh sách học sinh), 119 kiểm thử giao diện liên quan đạt sau khi chạy lại hai nhóm fixture/timeout. Backend build, frontend TypeScript/build và kiểm tra seed không ghi dữ liệu đều đạt. Kiểm tra trực tiếp ứng dụng local: admin 200, thợ 403 và tài khoản kế toán đã xóa 401 tại API giao dịch/báo cáo.

Bộ test tổng đã dừng để giảm tải và vẫn có bài cũ kỳ vọng truy cập ẩn danh trái quy định đăng nhập hiện tại; không coi đây là một lần kiểm thử toàn bộ thành công. Xem `audit/retire-accountant-2026-11-21/verification-summary.json`.

Bản Word v03 có 20 trang, đã kiểm tra trực quan toàn bộ, ba nhóm tác nhân, tiêu đề màu đen.
