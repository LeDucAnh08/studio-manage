# MongoDB local trên Windows

Dự án dùng MongoDB Community 7.0.45 chạy trực tiếp trên Windows tại `127.0.0.1:27020`, database `studio_db`, có xác thực và replica set `studio-rs0`. Backend lấy kết nối từ `backend/.env`; không cần Docker để chạy ứng dụng.

## Vận hành

Từ thư mục dự án:

```powershell
npm run db:status
npm run db:start
npm run dev
```

Mở ứng dụng tại http://localhost:4001. Dừng riêng database bằng `npm run db:stop`; dữ liệu vẫn được giữ. Chạy `npm run db:start` trước khi mở backend nếu database chưa chạy. Đây là cài đặt theo tài khoản, không phải Windows Service.

| Thành phần           | Đường dẫn                                                  |
| -------------------- | ---------------------------------------------------------- |
| MongoDB Server       | `%LOCALAPPDATA%\Programs\StudioMongoDB\7.0.45\bin\mongod.exe` |
| Công cụ dump/restore | `%LOCALAPPDATA%\Programs\StudioMongoDB\tools\bin`             |
| Dữ liệu              | `%LOCALAPPDATA%\StudioManage\MongoDB\data`                  |
| Cấu hình             | `%LOCALAPPDATA%\StudioManage\MongoDB\mongod.cfg`            |
| Log                  | `%LOCALAPPDATA%\StudioManage\MongoDB\logs\mongod.log`       |
| Backup               | `%LOCALAPPDATA%\StudioManage\MongoDB\backups`               |
| Khởi động ẩn         | `%LOCALAPPDATA%\Programs\StudioMongoDB\Start-MongoDB.ps1`     |

Thư mục dữ liệu nằm ngoài source. Các lệnh quản lý và seed kiểm tra đúng thư mục này trước khi thao tác; vẫn hỗ trợ cài đặt cũ trong `%USERPROFILE%\StudioManage\MongoDB` khi chưa có cấu hình AppData. Clone Git không mang theo MongoDB, dữ liệu, mật khẩu hoặc tác vụ khởi động của máy.

Nếu backend báo `ECONNREFUSED 127.0.0.1:27020`, kiểm tra `npm run db:status` và dung lượng ổ chứa dữ liệu trước khi khởi động lại. Lỗi `No space left on device` / `There is not enough space on the disk` trong log có thể khiến MongoDB dừng. Giải phóng dung lượng rồi chạy `npm run db:start`; không xóa dữ liệu, journal hay lock file để xử lý lỗi này. Nếu nodemon đã báo `app crashed`, nhập `rs` trong terminal đang chạy backend hoặc chạy lại `npm run dev`.

## Kết nối ứng dụng và Compass

URI thực nằm trong `backend/.env`, được Git bỏ qua. Dùng username/password hiện có trong tệp này; cấu trúc kết nối:

```text
mongodb://<user>:<password>@127.0.0.1:27020/studio_db?authSource=admin&replicaSet=studio-rs0&directConnection=true
```

Trong Compass, dùng Authentication Database `admin`, Replica Set `studio-rs0` và bật Direct Connection. Database chỉ lắng nghe trên loopback. Các cờ tính năng, tài khoản ứng dụng và mật khẩu đăng nhập được giữ theo cấu hình/dữ liệu cũ.

## Chuyển dữ liệu ngày 31/10/2026

Đã chuyển `studio_db` từ container `studio-mongodb` (MongoDB 7.0.43) sang MongoDB local bằng `mongodump`/`mongorestore`. Bản sao gồm **17 collection / 83 bản ghi**; đã đối chiếu số lượng, SHA-256 nội dung từng collection, options và toàn bộ indexes. Đã kiểm tra transaction commit, từ chối đọc dữ liệu khi không xác thực và dữ liệu sau khi khởi động lại.

Archive gzip và bản `backend.env.before-native` nằm trong thư mục backup `from-docker-*`. Bằng chứng riêng của máy được ghi tại `.workflow-tools/mongodb-windows.json` (Git bỏ qua). Container và volume Docker cũ được giữ lại để dự phòng; container MongoDB đã dừng. Chỉ `MONGO_URI` trong cấu hình backend được thay đổi.

Nếu cần quay lại bản Docker, dừng ứng dụng, khởi động container cũ và khôi phục cấu hình từ bản backup. Những dữ liệu phát sinh trên MongoDB local sau khi chuyển phải được sao lưu/chuyển riêng trước khi quay lại.

Lệnh `npm run db:seed:check` kiểm tra dữ liệu mẫu trên database local; `npm run db:seed` bổ sung dữ liệu mẫu khi cần. Việc chuyển database không tự nạp seed. Các lệnh `demo:*` vẫn dùng database mẫu riêng `studio_project_demo`; cấu hình Docker Compose vẫn dành cho môi trường Docker tùy chọn.

Tham khảo: [MongoDB Community trên Windows](https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-windows-zip/), [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/), [mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/).
