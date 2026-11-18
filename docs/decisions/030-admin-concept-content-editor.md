# ADR-030: Quản lý thông tin concept theo mẫu 1

Accepted — 14/11/2026, Asia/Bangkok.

Người dùng duyệt mẫu 1 sau khi xác định admin chỉ quản lý thông tin concept, không quản lý hồ sơ thợ ở màn này.

- Giữ route `/settings/concepts` và shell admin hiện tại. Danh sách có ảnh, tìm kiếm và trạng thái đã lưu ở bên trái; trình chỉnh sửa concept đã chọn ở bên phải. Trên màn nhỏ hai vùng xếp dọc và thanh lưu vẫn trong tầm nhìn khi cuộn phần chỉnh sửa.
- Bốn tab chỉ phân nhóm trường của cùng concept: Thông tin chung, Nội dung giới thiệu, Ảnh tham khảo, Hướng dẫn chuẩn bị. Không thêm quy trình nháp/công khai, không có tab gói chụp, hồ sơ thợ hay giờ studio.
- Dùng dữ liệu và API concept hiện có; ảnh bìa và ảnh tham khảo dùng URL/đường dẫn ảnh theo cơ chế hiện tại. Giữ giới hạn nội dung và tối đa 24 ảnh. Không thay dữ liệu bằng nội dung mockup, không bổ sung upload giả.
- Lưu toàn bộ concept kể cả trường ở tab khác. Trạng thái hiển thị chỉ có hiệu lực sau khi lưu. Link trang khách dùng trạng thái đã lưu và không xuất hiện với concept đang ẩn.
- Nhắc trước khi bỏ thay đổi để đổi concept, thêm mới, hủy hoặc rời trang. Chặn gửi lặp khi đang lưu; giữ dữ liệu và khóa idempotency khi gửi lại cùng nội dung sau lỗi lưu hoặc lỗi tải lại.
- Chỉ thay giao diện quản lý thông tin concept; giữ nguyên API và các luồng đặt lịch, hồ sơ cá nhân của thợ, thanh toán và email.

Kiểm chứng: kiểm thử component cho tìm kiếm, phạm vi nội dung, thay đổi qua tab, lưu/ẩn, thêm mới, hủy và gửi lại sau lỗi; kiểm thử hồi quy wizard concept; ESLint, TypeScript và build. Kiểm tra trình duyệt với dữ liệu `studio_db`, desktop/mobile, API lưu thật và đối chiếu mẫu đã duyệt. Bài thử lưu trình duyệt chỉ thêm khoảng trắng cuối mô tả để API chuẩn hóa về nội dung cũ; không tạo concept hay đơn thử trên database chính.
