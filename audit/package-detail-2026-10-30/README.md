# Kiểm chứng chi tiết gói dịch vụ — 30/10/2026

## Phạm vi

Trang khách `/pricing/:id` và trang nhập nội dung `/settings/packages/:id/content`. Các ảnh 01–03 dùng fixture **Gói E2E Phase 1** trên database kiểm thử riêng. Sau nghiệm thu, theo yêu cầu riêng của người dùng, đã seed 3 ảnh portfolio vào mỗi gói còn trống ảnh trong database ứng dụng local; ảnh 04 ghi nhận kết quả này.

## Kết quả

- Frontend: **115/115** kiểm thử liên quan đạt (9 file), chạy với `--maxWorkers=2 --minWorkers=1`.
- Backend: **11/11** kiểm thử riêng cho nội dung/ảnh đạt; gồm quyền, ID không hợp lệ, giải mã ảnh, giới hạn upload, tham chiếu ảnh khác gói, xung đột phiên bản, dọn file khi lỗi và giữ ảnh khi mất xác nhận sau commit.
- Bộ backend contract mở rộng: **50/50** đạt sau thay đổi cuối cùng.
- Browser E2E: **1/1** đạt với Chrome, API thật và database `studio_phase1_e2e` cô lập. Admin lưu ảnh/nội dung rồi tải lại; Back trong SPA có thể hủy để giữ thay đổi; khách xem gallery bằng bàn phím, Escape trả focus; desktop 1440 và mobile 390 không tràn ngang; login chung giữ đúng gói sang wizard.
- Backend/frontend build, TypeScript, lint các file frontend liên quan, định dạng và `git diff --check` đạt.
- Một lượt kiểm tra chạy đồng thời nhiều tác vụ bị timeout do tải máy; lượt chạy tuần tự và giới hạn worker đã đạt, không tăng timeout hoặc bỏ kiểm thử.

## Ảnh kiểm tra

- `01-admin-editor.png`: nội dung quản lý được tải lại từ API sau khi lưu.
- `02-customer-desktop.png`: trang khách desktop.
- `03-customer-mobile.png`: trang khách ở chiều rộng 390 px.
- `04-seeded-package-live.png`: gói Kỷ yếu Sân trường trên ứng dụng local sau khi seed ảnh theo yêu cầu.

Ảnh test nằm trong `.data/e2e-package-media`, tách khỏi thư mục ảnh ứng dụng. Đã dọn file test còn lại sau các lượt kiểm tra.

## Tự chạy lại

Từ `frontend`:

```powershell
npx playwright test e2e/package-content.spec.cjs
npx vitest run --maxWorkers=2 --minWorkers=1 src/pages/PublicPackageDetailPage.test.tsx src/pages/PackageContentPage.test.tsx src/pages/PublicDiscoveryPage.test.tsx src/App.test.tsx src/pages/NewBookingPage.test.tsx src/pages/LoginPage.test.tsx src/components/customer/CustomerScope.test.tsx src/components/customer/CustomerHeader.test.tsx src/components/Layout/Sidebar.test.tsx
```

Từ `backend`: `yarn test:package-content` hoặc `yarn test:contract`.

Seed ảnh từ root: `node ops/seed-package-images.cjs` chỉ kiểm tra; thêm `--apply` để nạp ảnh. Script chỉ kết nối MongoDB Windows local đã cấu hình, bỏ qua gói đã có ảnh và không thay giá/nội dung hiện có. Đã kiểm tra chạy lại không tạo ảnh trùng; 15/15 ảnh của 5 gói tải được qua API ứng dụng.
