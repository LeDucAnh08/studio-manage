# ADR-008 / Spec: Đặt gói chụp theo giá công khai

## Trạng thái và mục tiêu

Accepted — 31/10/2026, Asia/Bangkok. Người dùng đã duyệt luồng và chọn cọc 30%, giữ lịch 24 giờ. Bỏ lập báo giá và nhập lại lịch thủ công đối với đơn gói mới: khách xác nhận giá/điều kiện khi gửi; admin kiểm tra phạm vi và ekip rồi duyệt giữ tạm; đủ cọc tự tạo lịch chính thức; hết hạn chưa đủ cọc tự hủy và giải phóng ekip.

## Hợp đồng nghiệp vụ

- Package có cấu hình tỷ lệ cọc và số giờ giữ; mặc định 30% và 24 giờ. Đơn mới lưu riêng thỏa thuận gói đã xác nhận gồm giá, tổng, cọc, nội dung và thời điểm khách đồng ý. Giá thay đổi trước gửi trả 409; thay đổi sau gửi không sửa đơn.
- Gói có giá dương mới hỗ trợ checkout theo gói. Giá liên hệ và các hồ sơ cũ tiếp tục được nhận diện rõ như hồ sơ tư vấn, không tự suy đoán thỏa thuận cũ hoặc tự chuyển hồ sơ đã có tiền/lịch.
- Admin chọn ekip trước duyệt. Duyệt không đổi ngày/giờ/địa điểm/giá khách đã xác nhận, tạo thỏa thuận nội bộ từ snapshot và giữ ekip trong thời hạn. Deadline không được muộn hơn giờ chụp.
- Giữ tạm nằm trong workflow, dùng cùng khóa transaction với lịch chính thức và lịch bận. Kiểm tra ekip ở mọi luồng phải tính cả giữ tạm còn hiệu lực; không tính giữ hết hạn dù worker chưa chạy. Khi chỉnh phân công cho cùng đơn phải loại trừ giữ của chính đơn đó.
- Ghi nhận đủ cọc trước hạn tự tạo một Schedule và Customer liên kết trong cùng transaction, không yêu cầu đủ danh sách thành viên. Idempotency giữ nguyên; trả lại yêu cầu trùng không tạo thêm lịch hoặc giao dịch.
- Đơn hết hạn giữ tạm chuyển hủy, đóng link thành viên, giải phóng ekip. Tiền đã ghi nhận được bảo toàn và hiển thị cần hoàn; chỉ kế toán/admin ghi nhận hoàn thực tế. Không tự gọi ngân hàng hoặc gửi tin bên ngoài.
- Danh sách thành viên nhập được sau khi chốt lịch và trước khi chụp, đồng bộ vào hồ sơ lớp/học sinh liên kết; server chặn bắt đầu chụp nếu danh sách còn thiếu. Luồng đổi/hủy cần khách xác nhận tiếp tục dùng hợp đồng hiện có; thay đổi không được tự kéo dài giữ tạm.
- Sau chốt, admin phân bổ trang phục trong gói bằng `resources.costumes` khi lifecycle còn `confirmed`. Tái sử dụng kiểm tra tài nguyên và khóa transaction; không đổi lịch, ekip, giá hay yêu cầu khách đồng ý lại. Đổi giá đã được khách chấp nhận mà số cọc hiện có đã đủ cũng tự chốt lịch. Đổi phân công sau duyệt phải giữ đủ số thợ theo quy mô gói.
- Hồ sơ cũ không bị migrate hoặc mất các khoản thu, lịch sử và lịch đã chốt. Giữ API/kiểm thử tương thích cho hồ sơ tư vấn cũ; UI luồng gói mới không có nút lập/đồng ý báo giá hoặc chốt lại lịch thủ công.

## Phạm vi và cấu trúc

Một khả năng xuyên suốt: đặt gói chụp, không thay đổi nghiệp vụ thuê trang phục. Backend ở models/services/routes/controllers; frontend ở wizard, gói, hồ sơ và tiến độ. Reuse dữ liệu quote nội bộ để giữ đối soát/bàn giao/thay đổi cũ; không thêm thư viện.

## Kế hoạch và tác vụ

Kế hoạch/task riêng tại `tasks/package-booking/plan.md` và `tasks/package-booking/todo.md`, tránh ghi đè kế hoạch đang có.

## Quy ước và giới hạn

TypeScript, transaction MongoDB qua `withResourceTransaction`; `WorkflowProblem` cho lỗi đầu vào/xung đột; JSX semantic và UI hiện có; Prettier. Ví dụ: `if (expired) throw new WorkflowProblem(409, 'Đã hết hạn đặt cọc.');` Luôn xác thực giá ở server và dùng snapshot. Không ghi đè dữ liệu thật, không gửi tin ngoài, không thêm dependency; schema mới bổ sung tùy chọn cho tương thích hồ sơ cũ.

## Kiểm chứng và lệnh

- `yarn workspace studio-management-backend run check`
- `yarn workspace studio-management-frontend run check`
- `node --test backend/tests/client-bookings.cjs backend/tests/package-booking.cjs`
- `yarn workspace studio-management-frontend test src/pages/NewBookingPage.test.tsx src/pages/CustomerOrders.test.tsx --maxWorkers=2 --minWorkers=1`
- Integration Mongo local trong database test riêng: giá cũ/mới, duyệt/trùng ekip, cọc thiếu/đủ/trùng, hết hạn và hoàn tiền, roster sau chốt. Browser kiểm tra wizard/admin/customer; không dùng dữ liệu thật để tạo đơn kiểm thử.

Hoàn tất triển khai và kiểm chứng: [audit 31/10/2026](../../audit/package-checkout-2026-10-31/README.md).
