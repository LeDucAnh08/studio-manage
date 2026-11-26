# ADR-040: Tách collection Role với mã số hiện có

## Trạng thái và ngày

Accepted — 26/11/2026, Asia/Bangkok. Người dùng yêu cầu sửa mã nguồn và database để có bảng Role riêng.

## Bối cảnh

Vai trò trước đây chỉ được khai báo trong model User và lưu bằng mảng số. Cần có thực thể Role để biểu diễn quan hệ trong dữ liệu và sơ đồ lớp, đồng thời giữ các tài khoản, API và quy tắc phân quyền hiện hành.

## Quyết định

- Thêm model `Role`, collection `roles`, gồm `_id: Number`, `name: String`, `description: String`, `createdAt: Date`, `updatedAt: Date`.
- Giữ khóa chính 0 (Superadmin), 1 (Admin), 3 (Thợ chụp ảnh), 6 (Khách hàng). Các mã 2/4/5 tiếp tục bị loại bỏ theo ADR-035/036; không tự nâng quyền tài khoản cũ.
- `User.roles` là mảng tham chiếu số đến `Role._id`; `AccountRequest.requestedRole` cũng tham chiếu Role và vẫn chỉ cho phép mã 3. Quan hệ User–Role là nhiều–nhiều, không cần collection trung gian.
- API tài khoản tiếp tục trả mảng số để giữ đăng nhập, JWT, truy vấn phân công và frontend tương thích. Không tự populate vai trò trong các luồng phân quyền.
- Khởi tạo bốn bản ghi còn thiếu trước khi API phục vụ yêu cầu. Chạy lại không ghi đè tên, mô tả hoặc timestamps của Role đã có và không sửa User.
- `GET /api/roles` trả metadata vai trò hiện hành từ database, chỉ cho vai trò 0/1. Không thêm API sửa quyền hay thêm vai trò tùy ý. Tên và mô tả trong database không cấp thêm quyền; các kiểm tra quyền vẫn do mã máy chủ quyết định.
- Lệnh `yarn workspace studio-management-backend migrate:roles` kiểm tra database `studio_db` đang được cấu hình; thêm `--apply` để tạo vai trò còn thiếu. Lệnh kiểm chứng toàn bộ tài liệu User không đổi bằng hash BSON, không in thông tin tài khoản hoặc chuỗi kết nối.
- Giữ nguyên MongoDB Atlas đang chọn, cấu hình email/SePay, chế độ background jobs và dữ liệu nghiệp vụ khác.

## Kiểm chứng

- Kiểm tra model Role từ chối mã đã nghỉ, User vẫn mặc định vai trò khách hàng và có thể populate tham chiếu số.
- Kiểm tra API Role yêu cầu xác thực và quyền quản trị, không cho sửa metadata.
- Kiểm tra khởi tạo chạy lặp không đổi dữ liệu, đăng nhập và tài khoản nhiều vai trò giữ đúng hành vi.
- Chạy migration trên database hiện tại, xác nhận chỉ thêm các Role còn thiếu và User không đổi.

Kết quả thực hiện: build backend thành công; 29 kiểm thử Role, đăng nhập, đăng ký và quyền tài khoản đều qua. Migration trên Atlas `studio_db` thêm đúng 4 Role; chạy lại thêm 0 bản ghi và giữ nguyên metadata/timestamps. Cả hai lượt xác nhận toàn bộ tài liệu User không đổi. Kiểm tra chỉ đọc 28 tài khoản xác nhận mọi tham chiếu vai trò hiện hành đều resolve được; API Role dùng database thật trả 200 cho quản trị và 401 cho khách chưa đăng nhập. Các file thay đổi đều qua Prettier. Lệnh check toàn backend qua TypeScript nhưng còn lỗi định dạng có sẵn ở 136 file ngoài phạm vi thay đổi.
