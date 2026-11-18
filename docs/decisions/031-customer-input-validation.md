# ADR-031: Validation và thông báo lỗi phía khách hàng

Accepted — 14/11/2026, Asia/Bangkok.

Người dùng yêu cầu kiểm tra toàn bộ input phía khách hàng và thông báo rõ lỗi tương ứng.

- Dùng `CustomerInput`, `CustomerTextarea`, `CustomerSelect` và helper hiện có/mới trong `customerValidation.ts`. Kiểm tra khi rời ô, khi sửa một ô đã có lỗi và khi gửi form/chuyển bước. Lỗi tiếng Việt nằm cạnh trường, có `aria-invalid`, mô tả liên kết và focus tới trường đầu tiên cần sửa.
- Các form dùng React Hook Form tiếp tục dùng bộ kiểm tra của form, có thông báo cho mọi rule. Các form native được kiểm tra trước submit trong `CustomerScope`; thao tác chuyển bước bằng JavaScript gọi kiểm tra container hoặc validator của wizard. Không dùng validation phía trình duyệt làm ranh giới bảo mật.
- Giữ quy tắc đăng nhập hiện có. Đăng ký/đổi mật khẩu mới dùng tối thiểu 8 ký tự và tối đa 72 byte UTF-8, xác nhận trùng khớp. Email dùng định dạng tương thích API; số điện thoại Việt Nam có thể nhập dạng 0 hoặc +84 và dấu phân cách thông thường, sau đó chuẩn hóa trước gửi.
- Cho phép nhấn gửi khi còn thiếu dữ liệu/consent để hiển thị lý do cụ thể; vẫn chặn API khi chưa hợp lệ. Chỉ khóa nút theo trạng thái đang gửi, dữ liệu đang tải, quyền hoặc các điều kiện nghiệp vụ hiện có. Không bỏ kiểm tra giá, lịch, hàng, consent hay phiên bản tài nguyên.
- Form học sinh công khai và phản hồi legacy được bổ sung kiểm tra kiểu dữ liệu, độ dài, khoảng giá trị và thông báo 400 có nghĩa. Trang phục học sinh phải thuộc lịch của lớp. Không thay đổi dữ liệu đã lưu, auth roles, CORS, email hoặc thanh toán.
- Ma trận route/trường và giới hạn nằm trong `docs/customer-validation.md`. Trường không bắt buộc để trống vẫn hợp lệ; trường disabled/read-only không được coi là dữ liệu cần sửa.

Kiểm chứng bằng component tests, hồi quy wizard và album, HTTP tests dùng model giả, TypeScript/ESLint/build, và thử dữ liệu sai trên trình duyệt local. Không tạo tài khoản, đơn, thanh toán hay email thật trong các ca thử.
