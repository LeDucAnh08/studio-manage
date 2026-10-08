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
git clone --recurse-submodules https://github.com/tienhg13102001/studio-manage.git
cd studio-manage

# Cài tất cả dependencies
yarn install
```

## Lệnh chung (từ root)

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

```bash
# Cập nhật submodule lên commit mới nhất
cd backend && git pull origin main && cd ..
cd frontend && git pull origin main && cd ..
git add backend frontend
git commit -m "update submodules"

# Push code trong submodule
cd backend
git add -A && git commit -m "fix: ..." && git push origin main
cd ..
git add backend && git commit -m "update backend ref" && git push
```
