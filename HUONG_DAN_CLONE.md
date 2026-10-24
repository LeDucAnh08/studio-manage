# Clone Studio Management kèm frontend và backend

Hướng dẫn cho nhánh phát triển thống nhất từ ngày 24/10/2026. Chạy các lệnh trong PowerShell hoặc terminal tại nơi bạn muốn lưu dự án.

## 1. Repo và nhánh cần lấy

| Thành phần | Repository                                                                    | Nhánh hiện tại                  |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------- |
| Repo chính | [LeDucAnh08/studio-manage](https://github.com/LeDucAnh08/studio-manage)       | `develop` |
| Frontend   | [LeDucAnh08/studio-manage-fe](https://github.com/LeDucAnh08/studio-manage-fe) | `develop` |
| Backend    | [LeDucAnh08/studio-manage-be](https://github.com/LeDucAnh08/studio-manage-be) | `develop` |

Repo chính ghi lại chính xác commit của frontend/backend bằng Git submodule. Cả ba repo tiếp tục làm việc trên `develop`: repo chính kế thừa `codex/customer-booking-intake`, frontend/backend kế thừa `codex/recover-work`, kèm các chỉnh sửa điều hướng khách hàng đã hoàn tất.

## 2. Clone mới từ đầu

Cài Git trước. Nếu repo yêu cầu đăng nhập, tài khoản GitHub cần quyền đọc cả ba repository.

```powershell
git clone --branch develop --recurse-submodules https://github.com/LeDucAnh08/studio-manage.git
cd studio-manage
git submodule status --recursive
```

Lệnh trên tự tải cả hai submodule, không cần clone từng repo riêng. Cấu trúc sau clone:

```text
studio-manage/
├── backend/             # studio-manage-be
├── frontend/            # studio-manage-fe
├── ops/                 # Chạy demo, seed và kiểm tra
├── .gitmodules
├── package.json
├── yarn.lock
└── DEMO_LOCAL.md
```

`--branch` chọn nhánh repo chính. `--recurse-submodules` checkout frontend/backend đúng commit mà nhánh đó đã chốt.

## 3. Đã clone nhưng frontend/backend trống

Chạy từ repo chính:

```powershell
git submodule sync --recursive
git submodule update --init --recursive
git submodule status --recursive
```

Nếu đã clone nhánh `main`, chuyển sang nhánh hiện tại theo mục 4 trước.

## 4. Chuyển bản clone có sẵn sang nhánh hiện tại

Kiểm tra và lưu những thay đổi đang làm ở cả repo chính lẫn submodule:

```powershell
git status
git -C frontend status
git -C backend status
git remote -v
```

`origin` của repo chính cần trỏ tới `https://github.com/LeDucAnh08/studio-manage.git`. Nếu bản clone cũ trỏ repo khác, sửa URL:

```powershell
git remote set-url origin https://github.com/LeDucAnh08/studio-manage.git
```

Lấy thông tin nhánh và chuyển sang nhánh chứa code mới:

```powershell
git fetch origin
git switch develop
```

Git thường tự tạo nhánh local theo nhánh remote khi switch lần đầu. Nếu Git báo chưa có nhánh local, dùng:

```powershell
git switch --track origin/develop
```

Sau khi ở đúng nhánh:

```powershell
git pull --ff-only origin develop
git submodule sync --recursive
git submodule update --init --recursive
```

## 5. Cập nhật code ở những lần sau

Từ repo chính, sau khi lưu các thay đổi local:

```powershell
git switch develop
git pull --ff-only origin develop
git submodule sync --recursive
git submodule update --init --recursive
```

Nếu `--ff-only` báo không thể fast-forward, lịch sử local và remote đã khác nhau; giữ các commit local và kiểm tra trước khi đồng bộ tiếp.

Lệnh `git submodule update --init --recursive` lấy đúng commit đã ghi trong repo chính. `.gitmodules` cấu hình submodule theo dõi `develop`; dùng `--remote` lấy đầu nhánh đó và có thể chuyển sang bộ phiên bản khác với con trỏ đã chốt.

Để tiếp tục sửa code, chuyển cả hai submodule về nhánh làm việc:

```powershell
git -C frontend switch develop
git -C backend switch develop
```

Khi có commit mới trong submodule, đẩy frontend/backend lên `origin/develop` trước. Sau đó commit các con trỏ `frontend`, `backend` ở repo chính và đẩy repo chính lên `origin/develop`.

## 6. Kiểm tra đã lấy đủ code

```powershell
git branch --show-current
git ls-tree HEAD frontend backend
git -C frontend rev-parse HEAD
git -C backend rev-parse HEAD
git submodule status --recursive
```

- Repo chính phải ở `develop`; khi sửa code, frontend/backend cũng dùng `develop`.
- SHA của từng submodule phải trùng SHA tương ứng trong `git ls-tree`.
- Dấu `-` trước SHA ở `git submodule status`: submodule chưa khởi tạo; chạy mục 3.
- Dấu `+`: submodule đang ở commit khác với con trỏ repo chính.
- `detached HEAD` trong frontend/backend sau clone là bình thường, vì Git checkout commit cụ thể đã được ghi lại. Để chạy dự án, không cần chuyển nhánh bên trong từng submodule.

Các SHA sẽ thay đổi khi cập nhật; luôn đối chiếu với `git ls-tree HEAD` của bản đang dùng.

## 7. Cài dependencies và chạy demo

Dự án khai báo **Yarn Classic 1.22.22** trong `package.json`; workflow CI hiện cấu hình Node.js 20. Chuẩn bị Node.js/Yarn tương ứng môi trường dự án rồi kiểm tra:

```powershell
node --version
yarn --version
```

Nếu chưa có Yarn Classic:

```powershell
npm install --global yarn@1.22.22
```

Cài dependencies một lần tại repo chính để xử lý cả hai workspace:

```powershell
yarn install --frozen-lockfile
```

Làm tiếp theo [DEMO_LOCAL.md](DEMO_LOCAL.md) để chuẩn bị MongoDB executable và database local. Khi môi trường đã sẵn sàng:

```powershell
node ops/demo.cjs start
```

Mở [http://localhost:4001](http://localhost:4001). Các cổng 4001/5002/27029 cần sẵn sàng cho launcher demo.

**Clone chỉ tải source và các file seed được theo dõi trong Git.** Database hiện có, MongoDB executable trong `.workflow-tools`, `.env`, JWT/config local, dependencies và thư mục build không được clone. Máy mới cần cài đặt và tạo dữ liệu theo `DEMO_LOCAL.md`.

Bộ dữ liệu phong phú và seed theo nhiều kỳ thuê có lệnh riêng trong tài liệu đó. Mốc 22/10–10/11/2026 của bộ kỳ thuê hiện tại được giữ cố định, không tự dịch ngày khi clone sang máy khác.

Các file `.env.example` dùng cho cấu hình thủ công đang tắt một số cờ thuê/workflow; chỉ sao chép chúng sẽ chưa bật đầy đủ luồng customer như bản demo.
