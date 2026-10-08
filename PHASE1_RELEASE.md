# Phase 1 — Portal và nghiệm thu local

Tài liệu này mô tả portal ban đầu. Phiên bản hiện tại còn có chụp, thuê và báo cáo; bộ nghiệm thu tổng thể nằm trong [STUDIO_ACCEPTANCE.md](STUDIO_ACCEPTANCE.md), hướng dẫn chạy nằm trong [DEMO_LOCAL.md](DEMO_LOCAL.md).

Đích triển khai của đồ án là demo local lưu dữ liệu bền vững. Không yêu cầu staging, production, dữ liệu khách hàng thật hay chữ ký studio. Người thực hiện đồ án dùng tài khoản mẫu, ghi evidence của các thao tác bằng tay và dẫn tới báo cáo kiểm thử tự động khi phù hợp.

## Khởi động và cấu hình

Từ root:

```powershell
node ops/demo.cjs start
node ops/demo.cjs status
```

Mở **http://localhost:4001**, API **http://localhost:5002**. MongoDB **127.0.0.1:27029**, replica set **rs0**, database **studio_project_demo**, thư mục dữ liệu **.workflow-tools/demo-mongo-data**. Launcher bật portal/chụp/thuê bằng env riêng cho process; không cần sửa `.env` hiện có. Tài khoản mẫu theo vai trò nằm trong DEMO_LOCAL.md.

Nếu tự chạy các workspace thay cho launcher, cấu hình:

| Biến | Giá trị demo |
|---|---|
| CLIENT_PORTAL_ENABLED | true |
| CLIENT_WORKFLOW_ENABLED | true |
| CLIENT_RENTAL_ENABLED | true |
| VITE_CLIENT_PORTAL_ENABLED | true |
| VITE_CLIENT_RENTAL_ENABLED | true |
| VITE_API_URL | URL API local khớp backend đang chạy |
| CORS_ORIGIN | Origin frontend local khớp trình duyệt |
| MONGO_URI | URI replica set local gồm tên database demo rõ ràng |

VITE flags được đóng vào frontend tại thời điểm build; thay đổi cần build lại hoặc restart Vite khi chạy dev. Backend flags cần restart process. Khi dùng Docker tùy chọn, xem WORKFLOW_RELEASE.md vì root/backend `.env` có nguồn flag khác nhau.

## Preflight local

1. Dùng database demo riêng, không trỏ test harness hoặc seed xóa dữ liệu vào `studio_project_demo`.
2. Khởi động bằng launcher; xác nhận Mongo writable primary, API `/api/health` trả 200 và frontend truy cập được.
3. Đăng nhập admin/client mẫu, kiểm tra CORS cho đúng origin.
4. Chạy readiness audit trên database demo theo STUDIO_ACCEPTANCE.md; xem blocker/warning trước trình diễn.
5. Khi chỉnh code, chạy các quality gate phù hợp: check, test, build và E2E. CI hiện có chuỗi gate trước job deploy; job deploy VPS là tùy chọn của đồ án.
6. Khi muốn reset/nâng cấp dữ liệu cần giữ, backup trước; restore thử vào database local riêng nếu kiểm chứng phục hồi dữ liệu.

Index portal gồm `users.username`, `users.sourceAccountRequest` (sparse), `accountrequests.username` và `bookings(client, clientRequestId)` với partial filter. Readiness audit tổng thể còn kiểm tra index và dữ liệu của hai workflow. Không cần backfill role cho dữ liệu cũ: role 6 chỉ áp dụng cho tài khoản khách tạo mới. Không tự ghép khách cũ thành client theo tên/điện thoại.

## UAT portal

Dùng một Admin và ít nhất hai tài khoản client mẫu. Các dòng sau là kịch bản cần thực hiện, chưa phải kết quả nghiệm thu:

- Client đăng ký, đăng nhập và chỉ thấy portal khách hàng.
- Client gửi booking; giá/gói được snapshot, trạng thái pending, gửi lại cùng idempotency key không tạo bản ghi thứ hai.
- Client khác không đọc được booking.
- Admin thấy yêu cầu và thông báo, nhập phản hồi, duyệt hoặc từ chối đúng một lần.
- Client thấy trạng thái, phản hồi và lịch sử dành cho client; không thấy event nội bộ.
- Nhân sự gửi yêu cầu tài khoản; Admin duyệt đúng một lần; password hash bị xóa khỏi request sau xử lý.
- Trong kiểm thử flag, tắt portal backend/frontend sẽ ẩn route/entry và chặn đăng ký/booking mới theo flag. Launcher demo mặc định bật các tính năng để trình diễn.
- Kiểm tra mobile và desktop; thông điệp luôn nêu rõ “chưa giữ chỗ/chưa thu tiền”.

| Nội dung | Kết quả / evidence |
|---|---|
| Admin xử lý yêu cầu | Chưa ghi kết quả thủ công |
| Client A đăng ký/gửi/xem phản hồi | Chưa ghi kết quả thủ công |
| Client B thử ownership | Chưa ghi kết quả thủ công |
| Mobile / desktop / lỗi-retry | Chưa ghi kết quả thủ công |

Hai hành trình sau intake theo WORKFLOW_RELEASE.md và RENTAL_RELEASE.md. Phê duyệt intake không đồng nghĩa giữ lịch/kho hoặc đã nhận tiền.

## Dừng và rollback ứng dụng

```powershell
node ops/demo.cjs stop
node ops/demo.cjs start
```

Dữ liệu demo được giữ qua stop/start. Không xóa booking, account request, payment hoặc volume để rollback ứng dụng. Khi cần đổi code về phiên bản trước, ghi lại SHA và kiểm tra tương thích với dữ liệu đã tạo.

Nếu tự cấu hình để tạm đóng portal, đặt CLIENT_PORTAL_ENABLED=false cho backend và VITE_CLIENT_PORTAL_ENABLED=false cho frontend rồi restart/build phù hợp. Giữ dữ liệu để tiếp tục đối soát khi bật lại. Chụp/thuê có flag riêng; tắt chúng vẫn phải bảo vệ nguồn lực đang giữ, xem WORKFLOW_RELEASE.md.

## Bằng chứng tự động đã có

| Gate | Kết quả |
|---|---|
| Regression bản đã kiểm chứng ngày 05/10/2026 | 107 kiểm thử local đạt; TypeScript, lint, format và build đạt; xem audit/release-readiness-2026-10-05.md |
| Bằng chứng phiên bản/demo mới | Ghi theo báo cáo runtime và audit mới; không dùng số liệu lịch sử thay cho kết quả vừa chạy |
| Manual UAT / backup-restore local | Ghi kết quả thực hiện vào STUDIO_ACCEPTANCE.md; không tự đánh dấu đạt |

Nếu sau này muốn triển khai VPS, dùng quy trình Compose replica set, backup/restore và theo dõi trong WORKFLOW_RELEASE.md. Staging/canary/chữ ký nghiệp vụ có thể bổ sung theo nhu cầu vận hành thật, không phải gate bắt buộc để hoàn thành demo đồ án.
