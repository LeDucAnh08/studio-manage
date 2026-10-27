# MongoDB native trên Windows

Máy hiện tại dùng MongoDB Community 7.0.45 chạy trực tiếp trên Windows theo tài khoản `Admin`. Database có xác thực, chỉ lắng nghe `127.0.0.1:27020`, replica set `studio-rs0`, database ứng dụng `studio_db`.

## Vận hành

Từ thư mục dự án:

```powershell
npm run db:status
npm run db:start
npm run dev
```

MongoDB tự chạy ẩn khi đăng nhập Windows nhờ shortcut `StudioManage MongoDB` trong Startup của tài khoản. Đây là cài đặt theo tài khoản, không phải Windows Service. Dừng ứng dụng không dừng database. Có thể dừng riêng MongoDB bằng `npm run db:stop`; dữ liệu vẫn được giữ và `npm run db:start` khởi động lại.

| Thành phần           | Đường dẫn                                                     |
| -------------------- | ------------------------------------------------------------- |
| MongoDB Server       | `%LOCALAPPDATA%\Programs\StudioMongoDB\7.0.45\bin\mongod.exe` |
| Công cụ dump/restore | `%LOCALAPPDATA%\Programs\StudioMongoDB\tools\bin`             |
| Dữ liệu              | `%LOCALAPPDATA%\StudioManage\MongoDB\data`                    |
| Cấu hình MongoDB     | `%LOCALAPPDATA%\StudioManage\MongoDB\mongod.cfg`              |
| Log MongoDB          | `%LOCALAPPDATA%\StudioManage\MongoDB\logs\mongod.log`         |
| Backup               | `%LOCALAPPDATA%\StudioManage\MongoDB\backups`                 |

Các thư mục này độc lập với source và Docker volume. Cài trên máy khác cần cài MongoDB và chuyển dữ liệu bằng dump/restore; clone Git không mang theo database, mật khẩu hoặc cấu hình riêng của máy này.

## Kết nối ứng dụng và Compass

Kết nối thực nằm trong `backend/.env`, không commit Git. Cấu trúc URI:

```text
mongodb://<user>:<password>@127.0.0.1:27020/studio_db?authSource=admin&replicaSet=studio-rs0&directConnection=true
```

Trong MongoDB Compass, chọn địa chỉ `127.0.0.1:27020`, xác thực bằng username/password trong `backend/.env`, Authentication Database `admin`, Replica Set `studio-rs0`, Direct Connection bật. Tài khoản ứng dụng và mật khẩu người dùng trong database được giữ nguyên khi chuyển.

`CLIENT_PORTAL_ENABLED=true` và `CLIENT_WORKFLOW_ENABLED=true` đã được cấu hình trong backend để dùng luồng đặt chụp và transaction. Cờ thuê trang phục được giữ theo cấu hình riêng của ứng dụng.

`npm run dev` dùng database Windows này. Các lệnh `demo:*` vẫn là môi trường riêng với database `studio_project_demo`; `docker compose` vẫn có cấu hình database Docker riêng.

## Chuyển dữ liệu ngày 26/10/2026

Nguồn là `studio_db` trong container `studio-mongodb` (MongoDB 7.0.40). Đã dùng `mongodump`/`mongorestore` chính thức, lưu archive gzip và bản cấu hình backend trước chuyển trong thư mục backup. Không ghi đè volume Docker.

Đã đối chiếu số lượng, hash nội dung và định nghĩa indexes của toàn bộ 15 collection / 10 bản ghi: 4 tài khoản ứng dụng, 6 danh mục, các collection còn lại rỗng. Có kiểm tra transaction commit, dữ liệu tồn tại sau khi khởi động lại, và từ chối truy cập khi thiếu xác thực. Cả 17 kiểm thử giữ trang phục đã qua trên server Windows, dùng database kiểm thử riêng. Backend và frontend trả HTTP 200 sau khi dừng container MongoDB cũ; container và volume nguồn vẫn được giữ. Bằng chứng riêng của máy ở `.workflow-tools/mongodb-windows.json` (git-ignore).

Quay lại database cũ bằng bản `backend.env.before-native` trong thư mục backup sau khi dừng ứng dụng và khởi động lại container `studio-mongodb`. Những thay đổi phát sinh trên database Windows sau thời điểm chuyển cần được sao lưu/chuyển riêng trước khi quay lại.

## Dữ liệu mẫu trên MongoDB Windows

Theo yêu cầu ngày 26/10/2026, `studio_db` đã được bổ sung bộ dữ liệu mẫu mùa kỷ yếu: 5 gói chụp, 18 mẫu trang phục/phụ kiện theo size, 3 mùa, 20 lớp/802 thành viên, 20 yêu cầu chụp, 17 lịch, 24 đơn thuê và 120 giao dịch. Giữ nguyên 10 bản ghi cũ; có archive backup riêng `before-seed-*` trước khi nạp. Đây là dữ liệu giả lập để sử dụng và thử ứng dụng; công nợ/hoàn cọc còn mở là tình huống mẫu.

```powershell
npm run db:seed:check  # Kiểm tra dữ liệu, không ghi database
npm run db:seed        # Bổ sung một lần vào MongoDB Windows trong backend/.env
```

Seed có kiểm tra đúng database/replica set/thư mục Windows, chỉ tạo bản ghi còn thiếu và giữ marker hoàn tất. Chạy lại không tạo trùng hoặc ghi đè dữ liệu đã chỉnh sửa. Không dùng lệnh `demo:seed` cho database Windows.

Tài khoản mẫu mới: quản trị `quanly.ha` / `Staff@1234`, khách hàng `khach.maianh` / `Client@1234`, kế toán `ketoan.maianh` / `Staff@1234`, thợ chụp `nhiepanh.minhquan` / `Staff@1234`. Tài khoản cũ giữ mật khẩu hiện có.

Tài liệu chính thức: [MongoDB Community trên Windows](https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-windows/).
