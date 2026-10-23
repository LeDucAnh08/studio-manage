# Studio Management - Monorepo - YUME

## Demo local của đồ án

Đồ án dùng môi trường local để triển khai và nghiệm thu, không cần staging hoặc production. Sau khi cài dependencies, chạy từ root:

```powershell
node ops/demo.cjs start
```

Mở http://localhost:4001. Admin demo: `superadmin` / `Admin@1234`. Dừng bằng `node ops/demo.cjs stop`; dữ liệu được giữ khi chạy lại. Hướng dẫn tài khoản, dữ liệu mẫu và nghiệm thu: [DEMO_LOCAL.md](DEMO_LOCAL.md).

## Cài đặt

```bash
# Clone repo kèm submodule
git clone --branch codex/customer-booking-intake --recurse-submodules https://github.com/LeDucAnh08/studio-manage.git
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

Chạy từ repo chính trên nhánh `codex/customer-booking-intake`, sau khi lưu các thay đổi local:

```bash
git pull --ff-only origin codex/customer-booking-intake
git submodule sync --recursive
git submodule update --init --recursive
git submodule status --recursive
```

Các lệnh trên lấy đúng commit frontend/backend đã được repo chính chốt. `detached HEAD` trong submodule là bình thường khi checkout commit cụ thể. Xem [HUONG_DAN_CLONE.md](HUONG_DAN_CLONE.md) để chuyển nhánh, kiểm tra phiên bản và chuẩn bị môi trường trên máy mới.
