# Phase 1 — Release & UAT Runbook

## Trạng thái

- Phần mềm Phase 1 đã có feature flag, unit/component test, HTTP contract test, MongoDB integration test và browser E2E.
- CI bắt buộc `check → test → build → E2E` trước khi job deploy được phép chạy.
- Việc bật production chỉ được thực hiện sau khi staging UAT có chữ ký xác nhận. Không dùng kết quả local thay cho UAT staging.

## Cấu hình

| Biến | Staging | Production trước canary | Production khi mở |
| --- | --- | --- | --- |
| `CLIENT_PORTAL_ENABLED` | `true` | `false` | `true` |
| `VITE_CLIENT_PORTAL_ENABLED` | `true` | `false` | `true` |
| `VITE_API_URL` | URL API staging | URL API production | URL API production |
| `CORS_ORIGIN` | origin frontend staging | origin frontend production | origin frontend production |

`VITE_CLIENT_PORTAL_ENABLED` được đóng vào frontend tại thời điểm build. Thay đổi biến này phải build/deploy lại frontend. Backend flag có hiệu lực sau khi restart service.

## Preflight

1. Xác nhận database staging riêng, không trỏ production và chỉ dùng dữ liệu giả/đã ẩn danh.
2. Backup database đích; ghi lại image digest, root SHA, backend SHA và frontend SHA.
3. Chạy `yarn install --frozen-lockfile`, `yarn check`, `yarn test`, `yarn build`, `yarn test:e2e`.
4. Kiểm tra index duy nhất:
   - `users.username`
   - `users.sourceAccountRequest` (sparse)
   - `accountrequests.username`
   - `bookings(client, clientRequestId)` với partial filter.
5. Xác nhận `/api/health` trả `200` và CORS chỉ cho phép đúng origin.

Không cần backfill role cho dữ liệu cũ: role `6` chỉ áp dụng cho tài khoản khách hàng tạo mới. Không nhập khách hàng cũ thành client nếu chưa có quy tắc đối soát danh tính.

## UAT staging

Thực hiện bằng một Admin và ít nhất một tài khoản client pilot:

- Client đăng ký, đăng nhập và chỉ thấy portal khách hàng.
- Client gửi booking; giá/gói được snapshot, trạng thái là `pending`, gửi lại cùng idempotency key không tạo bản ghi thứ hai.
- Client khác không đọc được booking.
- Admin thấy yêu cầu và thông báo, nhập phản hồi, duyệt hoặc từ chối đúng một lần.
- Client thấy trạng thái, phản hồi và lịch sử dành cho client; không thấy event nội bộ.
- Nhân sự gửi yêu cầu tài khoản; Admin duyệt đúng một lần; password hash bị xóa khỏi request sau xử lý.
- Khi tắt cả hai feature flag, route đăng ký/portal bị ẩn và API đăng ký/booking trả `503`.
- Kiểm tra mobile và desktop; thông điệp luôn nêu rõ “chưa giữ chỗ/chưa thu tiền”.

| Bên xác nhận | Người xác nhận | Kết quả | Thời gian | Evidence/issue |
| --- | --- | --- | --- | --- |
| Admin nghiệp vụ |  |  |  |  |
| Client pilot |  |  |  |  |
| Kỹ thuật/QA |  |  |  |  |

## Canary production

1. Deploy production khi cả hai flag vẫn `false`; chạy health check và login nội bộ.
2. Bật backend flag, restart backend; build/deploy frontend với frontend flag `true` trong cửa sổ canary.
3. Chỉ mời nhóm client pilot; theo dõi log 4xx/5xx, latency, số đăng ký, booking, duplicate-key và review conflict trong ít nhất một chu kỳ nghiệp vụ.
4. Dừng mở rộng nếu có lỗi ownership/RBAC, tạo trùng, mất phản hồi hoặc tỷ lệ 5xx tăng bất thường.
5. Sau sign-off canary mới công bố cho toàn bộ khách hàng.

## Rollback

1. Đặt `CLIENT_PORTAL_ENABLED=false` và restart backend để chặn ngay đăng ký/booking mới.
2. Build/deploy frontend với `VITE_CLIENT_PORTAL_ENABLED=false` để ẩn portal.
3. Nếu lỗi nằm ngoài portal, rollback về image digest và ba SHA đã ghi ở preflight.
4. Không xóa booking/account request đã tạo. Giữ dữ liệu để đối soát và chỉ chạy migration đảo chiều đã được kiểm thử.
5. Chạy lại health/login nội bộ và lập incident record trước khi mở lại.

## Bằng chứng local hiện tại

| Gate | Kết quả |
| --- | --- |
| Backend contract + Mongo integration | 25 test pass trước khi thêm feature-flag regression; chạy lại trong final gate |
| Frontend component | 3 test pass |
| TypeScript backend/frontend | Pass |
| Browser E2E | Luồng đầy đủ được định nghĩa; kết quả final gate ghi trong `IMPLEMENTATION_PLAN.md` |

