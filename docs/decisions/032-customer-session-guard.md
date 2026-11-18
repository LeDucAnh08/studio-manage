# ADR-032: Chỉ portfolio được xem khi chưa đăng nhập

Accepted — 14/11/2026, Asia/Bangkok.

Người dùng gặp tình trạng navbar hiện Đăng nhập nhưng phần nội dung bên dưới vẫn xem/thao tác được. Người dùng yêu cầu khách chưa đăng nhập chỉ được xem portfolio ban đầu.

- Một guard ở cấp router chặn mọi trang ngoài `/portfolio`, entry `/` và các trang xác thực/đăng ký hiện có. Guard chờ xác thực session trước khi mount trang; khi mất session thì unmount nội dung và chuyển tới đăng nhập. Các route staff giữ nguyên kiểm tra role riêng.
- `AuthProvider` đồng bộ user/token khi API trả 401, token hết hạn, tab được mở lại và đăng xuất ở tab khác. Bootstrap lấy user đã được server xác thực; user trong storage không đủ để mở trang. Timer dựa vào JWT `exp` chỉ phục vụ khóa UI, không thay kiểm tra chữ ký/active user ở server.
- Các phản hồi bootstrap/401 cũ không được khôi phục phiên đã thoát hoặc xóa token của lần đăng nhập mới. Sự kiện đăng nhập từ tab khác được xác thực bằng `/auth/me`, không liên tục phát hành token mới qua lại giữa các tab.
- Giữ draft khi tự hết phiên để đăng nhập lại cùng tài khoản; đăng xuất chủ động vẫn xóa draft theo quy tắc có sẵn. Return path chỉ nhận route customer cùng origin và giữ query/hash, gồm link album/intake. URL ngoài, route staff và redirect lặp về login bị loại.
- API `/public/*`, `/concepts/*` và shared concept album yêu cầu `protect`. Link token của lớp/album/intake vẫn là điều kiện bổ sung, không được thay bằng việc chỉ đăng nhập. Giữ nguyên ownership, role, trạng thái nghiệp vụ, feature flags và rate limits hiện có. API được bảo vệ trả `Cache-Control: no-store`.
- Portfolio dùng `/public/portfolio-stats` trả số lượng lớp/trường, không danh sách khách hàng. Đây là endpoint dữ liệu duy nhất không yêu cầu tài khoản trong nhóm customer. Ảnh/asset đã xuất bản, health check, đăng ký/đăng nhập và webhook thanh toán tiếp tục phục vụ đúng mục đích hiện có; không đổi `.env`, provider email, SePay hay database.

Kiểm chứng: route matrix chặn truy cập trực tiếp và khi session biến mất; lifecycle test hết hạn trong khi mở trang, logout tab khác, bootstrap trễ, đăng nhập tab khác; HTTP tests với model giả kiểm tra anonymous/token sai/token hết hạn/user inactive đều bị từ chối, session hợp lệ vẫn phải qua link permission và validation. Thử trực tiếp portfolio và chuyển từ link trang phục sang đăng nhập trên ứng dụng local.

Kết quả: 211 ca frontend trong 13 file và 55 ca backend đạt; TypeScript cả hai workspace, ESLint (không có lỗi), Prettier và production build đạt. Còn cảnh báo Fast Refresh có sẵn ở file context, React Router future flags trong test và Browserslist/chunk size trong build. API local thực tế trả 200 cho health/portfolio stats và 401 kèm `no-store` cho package/concept khi chưa đăng nhập. Không tạo tài khoản, đơn hoặc gửi email thật trong lượt kiểm tra. Log và ảnh nằm trong `.workflow-tools/customer-session-*`.
