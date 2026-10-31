# Studio Management - Monorepo - YUME

## MongoDB Windows đang sử dụng

Database hiện tại chạy trực tiếp trên Windows tại `127.0.0.1:27020`, database `studio_db`, có xác thực và replica set. Dữ liệu lưu ngoài Docker/source và MongoDB tự chạy khi đăng nhập Windows. Xem [MONGODB_WINDOWS.md](MONGODB_WINDOWS.md) để kết nối, sao lưu và quản lý.

```powershell
npm run db:status
npm run db:start
npm run dev
```

Mở ứng dụng tại http://localhost:4001. Các lệnh demo bên dưới dùng một database mẫu riêng.

Nạp dữ liệu mẫu vào MongoDB Windows hiện tại bằng `npm run db:seed` (kiểm tra trước với `npm run db:seed:check`). Lệnh giữ dữ liệu cũ và không nạp trùng khi chạy lại; tài khoản mẫu được ghi trong [MONGODB_WINDOWS.md](MONGODB_WINDOWS.md).

## Demo local của đồ án

Đồ án dùng môi trường local để triển khai và nghiệm thu, không cần staging hoặc production. Sau khi cài dependencies, chạy từ root:

```powershell
node ops/demo.cjs start
```

Mở http://localhost:4001. Admin demo: `superadmin` / `Admin@1234`. Dừng bằng `node ops/demo.cjs stop`; dữ liệu được giữ khi chạy lại. Hướng dẫn tài khoản, dữ liệu mẫu và nghiệm thu: [DEMO_LOCAL.md](DEMO_LOCAL.md).

## Điều hướng khách hàng

Khách chưa đăng nhập xem giới thiệu tại `/portfolio` và các trang riêng `/services`, `/concepts`, `/costumes`, `/pricing`. Khi bắt đầu đặt dịch vụ hoặc thuê trang phục, khách đăng nhập rồi tiếp tục với lựa chọn đã giữ.

Sau đăng nhập, mục Concept được ẩn và đường dẫn `/concepts` chuyển về Đơn của tôi. Màn đặt dịch vụ dùng navbar chung, không có cụm liên kết phụ Dịch vụ/Concept/Bảng giá. `/account/orders` là màn mặc định, có tab `bookings` (chụp ảnh) và `rentals` (thuê trang phục). Tab thuê chỉ hiện khi tính năng thuê bật. Hai URL danh sách cũ `/account/bookings` và `/account/rentals` chuyển sang tab tương ứng; URL tạo đơn và chi tiết đơn được giữ nguyên. Portfolio không còn là màn thao tác của khách đã đăng nhập. Các nút tư vấn được tạm ẩn trong khi chờ chatbot.

Đặt dịch vụ gồm ba bước: chọn dịch vụ → lớp và thời gian → kiểm tra, đồng ý giá và điều kiện gói. Với đơn gói mới, admin phân công đủ ekip và duyệt giữ tạm đúng lịch khách chọn, không lập báo giá riêng. Mặc định cọc 30%, giữ 24 giờ từ lúc duyệt (tối đa đến giờ chụp); chỉnh được tại **Cài đặt → Gói chụp**. Khi admin/kế toán ghi nhận đủ cọc trong hạn, hệ thống tự tạo lịch chính thức đúng một lần. Hết hạn chưa đủ cọc, đơn tự hủy và trả ekip; khoản đã nhận vẫn được giữ để đối soát hoàn. Danh sách thành viên nhập sau chốt lịch, trước buổi chụp. Trang phục đã gồm trong giá; admin dùng **Chuẩn bị trang phục cho buổi chụp** sau chốt để phân bổ mẫu, size, số lượng và ngày nhận/trả, có kiểm tra tồn kho. Hồ sơ tư vấn cũ giữ nguyên quy trình và lịch sử. Xem [ADR-008 và kiểm chứng](docs/decisions/008-package-booking-checkout.md), [ADR-002](docs/decisions/002-package-included-costumes.md).

## Bảng quản trị

Các màn danh sách admin dùng chung dạng bảng trên desktop và mobile, có khung cuộn ngang riêng. Đơn chụp, đơn thuê, phản hồi và danh mục thu/chi dùng cùng `DataTable`; các bản card mobile trùng đã được bỏ. Dashboard vẫn giữ biểu đồ và lịch có chế độ calendar; form/trang chi tiết giữ đúng chức năng. Xem [ADR-009](docs/decisions/009-admin-tables.md).

## Chi tiết gói dịch vụ

Tại `/pricing`, chọn **Xem chi tiết** để mở `/pricing/:id`. Khách chưa đăng nhập vẫn xem được quyền lợi, ảnh demo, lịch trình mẫu, quy trình, chi phí và điều kiện do studio nhập. **Đặt gói này** giữ đúng gói qua trang đăng nhập chung và chuyển sang form đặt lịch.

Admin mở **Cài đặt → Gói chụp → Nội dung chi tiết** để nhập nội dung, tải và sắp thứ tự ảnh. Ảnh đầu tiên là ảnh bìa; tối đa 10 ảnh/gói, 5 MB/ảnh (JPEG/PNG/WebP). Nội dung và ảnh chỉ thay đổi công khai sau khi lưu thành công. Giá/người và thông tin cơ bản tiếp tục sửa trong danh sách gói. Gói cũ không cần nhập thêm để tiếp tục hoạt động.

Ảnh được kiểm tra, chuyển sang WebP và lưu ngoài `src`/`dist`, mặc định ở `.data/package-media` tại root. Có thể đặt `UPLOAD_DIR` trong `backend/.env` thành thư mục tuyệt đối trên ổ lưu trữ bền vững. Khi sao lưu/khôi phục, giữ **cả database và thư mục ảnh**. Docker Compose dùng volume `package_media`; Nginx cho phép multipart đến 55 MB. Không xóa volume này khi dựng lại ứng dụng.

Kiểm thử riêng: `yarn workspace studio-management-backend test:package-content` và `yarn workspace studio-management-frontend test:e2e e2e/package-content.spec.cjs`. E2E chỉ ghi vào database `studio_phase1_e2e` và thư mục `.data/e2e-package-media` riêng.

Nạp ảnh demo từ portfolio có sẵn: chạy `node ops/seed-package-images.cjs` để kiểm tra, thêm `--apply` để nạp 3 ảnh cho mỗi gói chưa có ảnh. Script dùng MongoDB Windows local đã cấu hình, giữ nguyên gói đã có ảnh, giá và nội dung khác.

Nạp nội dung mẫu cho sản phẩm bàn giao, phạm vi buổi chụp và điều kiện áp dụng giá: chạy `node ops/seed-package-content.cjs` để kiểm tra, thêm `--apply` để nạp vào 5 gói demo đã biết. Chỉ điền từng mục đang trống, giữ nguyên mục đã nhập và các dữ liệu khác; chạy lại không ghi đè. Nội dung là mẫu để kiểm tra giao diện, có thể chỉnh sửa trong admin trước khi dùng thực tế.

Bổ sung danh mục trang phục cho tháng 11/2026: `node ops/seed-november-costumes.cjs` kiểm tra dữ liệu; thêm `--apply` để gắn ảnh cho 18 mẫu hiện có và thêm 8 mẫu cùng tồn kho S/M/L/XL hoặc FREE. Ảnh minh họa AI ở `frontend/public/costume-demo/`, trường `Costume.imageUrl` tùy chọn được trả qua danh mục công khai và hiển thị ở khách hàng/admin. Chỉ điền ảnh trống; giữ nguyên giá, tồn kho cũ, lịch chụp, đơn thuê và giao dịch. Tồn kho dùng chung giữa các ngày, không tự đặt lại theo tháng và không tạo đơn thuê. Xem [nguồn ảnh và prompt](docs/demo-costume-images.md).

Trong yêu cầu thuê, nút **Thêm món thuê** mở `/costumes?receiveDate=...&returnDate=...&add=1`. Khoảng ngày được giữ và khóa trên màn chọn thêm; lọc danh mục không làm mất chế độ này. Chọn mẫu sẽ quay về bản nháp hiện tại để chọn size/số lượng; có thể chọn lại một mẫu cho size khác. Tham số chọn thêm được tiêu thụ sau khi áp dụng để tải lại không thêm trùng. Nút **Quay lại yêu cầu thuê** giữ nguyên các món và thông tin liên hệ nếu không chọn thêm; vào danh mục thông thường vẫn sửa ngày được.

## Cài đặt

```bash
# Clone repo kèm submodule
git clone --branch develop --recurse-submodules https://github.com/LeDucAnh08/studio-manage.git
cd studio-manage

# Cài tất cả dependencies
yarn install
```

## Lệnh chung (từ root)

Hướng dẫn clone, lấy đủ submodule và cập nhật đúng nhánh: [HUONG_DAN_CLONE.md](HUONG_DAN_CLONE.md).

| Lệnh | Mô tả |
|---|---|
| `yarn install` | Cài dependencies cho tất cả project |
| `yarn dev` | Chạy dev backend + frontend song song |
| `yarn build` | Build cả 2 project |
| `yarn format` | Format code cả 2 project |
| `yarn seed` | Chạy seed database (backend) |

## Cài thư viện cho từng project

Tên workspace lấy từ `name` trong `package.json` của mỗi project:
- Backend: `studio-management-backend`
- Frontend: `studio-management-frontend`

```bash
# Cài dependency cho backend
yarn workspace studio-management-backend add <package-name>

# Cài devDependency cho backend
yarn workspace studio-management-backend add -D <package-name>

# Cài dependency cho frontend
yarn workspace studio-management-frontend add <package-name>

# Cài devDependency cho frontend
yarn workspace studio-management-frontend add -D <package-name>

# Gỡ thư viện
yarn workspace studio-management-backend remove <package-name>

# Cài thư viện ở root (shared tools)
yarn add -W -D <package-name>
```

### Ví dụ

```bash
# Thêm helmet cho backend
yarn workspace studio-management-backend add helmet

# Thêm framer-motion cho frontend
yarn workspace studio-management-frontend add framer-motion

# Thêm eslint cho toàn project
yarn add -W -D eslint
```

## Chạy script của project con

```bash
yarn workspace studio-management-backend seed
yarn workspace studio-management-frontend build
```

## CI và triển khai VPS tùy chọn

Project da co san workflow GitHub Actions tai [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

Workflow chạy quality gate khi push/PR vào `main`. Demo đồ án dùng launcher local ở trên. Job SSH/deploy VPS mặc định không chạy; chỉ bật khi đặt repository variable `ENABLE_VPS_DEPLOY=true` và cấu hình VPS thực tế. Khi được bật, job cập nhật root/submodule và build lại stack Docker sau khi quality gate đạt.

Can khai bao cac GitHub Secrets sau:
- `SSH_HOST`: IP/domain cua VPS
- `SSH_USER`: user SSH tren VPS
- `SSH_KEY`: private key dung de SSH
- `SSH_PORT`: cong SSH, vi du `22`
- `DEPLOY_PATH`: duong dan tuyet doi toi thu muc project tren VPS

Vi du `DEPLOY_PATH`:

```bash
/var/www/studio-manage
```

Luu y:
- VPS can cai san `git`, `docker`, va `docker compose` (hoac `docker-compose`).
- Thu muc deploy tren VPS phai la repo root cua project nay, khong phai chi rieng `backend` hoac `frontend`.
- Neu `backend` va `frontend` la private submodule, VPS can duoc cap quyen pull 2 repo do.

## Git Submodule

Cả ba repo dùng nhánh `develop` để tiếp tục phát triển. Repo chính đã nhận code từ `codex/customer-booking-intake`; frontend và backend đã nhận code từ `codex/recover-work`.

Chạy từ repo chính trên nhánh `develop`, sau khi lưu các thay đổi local:

```bash
git pull --ff-only origin develop
git submodule sync --recursive
git submodule update --init --recursive
git submodule status --recursive
```

Các lệnh trên lấy đúng commit frontend/backend đã được repo chính chốt. `detached HEAD` trong submodule là bình thường khi checkout commit cụ thể. Xem [HUONG_DAN_CLONE.md](HUONG_DAN_CLONE.md) để chuyển nhánh, kiểm tra phiên bản và chuẩn bị môi trường trên máy mới.

Trước khi sửa code frontend/backend sau clone hoặc cập nhật submodule, chuyển chúng sang `develop`:

```bash
git -C frontend switch develop
git -C backend switch develop
```

Đẩy commit của frontend/backend lên `origin/develop` trước, rồi commit và đẩy các con trỏ submodule ở repo chính lên `origin/develop`. `.gitmodules` cấu hình cả hai submodule theo dõi `develop`; cập nhật bằng `--remote` sẽ lấy đầu nhánh đó thay vì commit đã chốt trong repo chính.
