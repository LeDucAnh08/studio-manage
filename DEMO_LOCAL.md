# Chạy và trình diễn đồ án trên máy local

Môi trường triển khai của đồ án là bản demo local bền vững. Không cần staging, VPS, domain, chứng chỉ HTTPS hoặc dữ liệu studio thật để tiếp tục kế hoạch. MongoDB replica set vẫn cần thiết để kiểm tra đồng thời và commit nghiệp vụ nguyên tử.

## Khởi chạy

Từ root repository, sau khi cài dependencies:

```powershell
node ops/demo.cjs start
node ops/demo.cjs status
```

Các lệnh tương đương: `yarn demo`, `yarn demo:status`, `yarn demo:stop`; `yarn demo:smoke` kiểm tra giao diện bản build bằng Chrome trên bộ dữ liệu mẫu ban đầu.

Lệnh start tự khởi tạo MongoDB replica set riêng, compile backend, build frontend với portal/thuê bật, tạo tài khoản/danh mục demo nếu chưa có, chuẩn bị các hồ sơ trình diễn qua API và xuất kết quả đối soát chỉ đọc. Các tiến trình chạy nền ẩn; ứng dụng tiếp tục chạy sau khi lệnh kết thúc. Khi đã chạy, start trả trạng thái hiện có. Xem tiến độ hoặc lỗi trong `.workflow-tools/demo.log` và `.workflow-tools/demo-mongod.log`.

Yêu cầu: Node.js và dependencies đã cài; MongoDB executable `.workflow-tools/mongod.exe` đang có trên máy này. Trên máy khác, cài MongoDB rồi đưa mongod vào PATH hoặc đặt biến `DEMO_MONGOD` trỏ tới executable. Không cần Docker. Các cổng 4001, 5002, 27029 phải trống; launcher không dừng chương trình khác đang dùng cổng.

| Thành phần | Địa chỉ |
|---|---|
| Ứng dụng đã build | http://localhost:4001 |
| API | http://localhost:5002/api/health |
| MongoDB demo | 127.0.0.1:27029, replica set rs0, database studio_project_demo |
| Dữ liệu bền vững | .workflow-tools/demo-mongo-data |

Frontend được phục vụ từ `frontend/dist`, có SPA fallback và proxy `/api` tới backend. Không phải Vite dev server. Frontend/Mongo bind vào loopback; các lệnh demo dành cho máy local.

## Tài khoản trình diễn

Các tài khoản sau chỉ thuộc database demo:

| Vai trò | Tên đăng nhập | Mật khẩu ban đầu |
|---|---|---|
| Superadmin | superadmin | Admin@1234 |
| Khách hàng | demo.client | Client@1234 |
| Kế toán | demo.accountant | Staff@1234 |
| Sale | demo.sale | Staff@1234 |
| Photographer | demo.photographer | Staff@1234 |

Seed chỉ bổ sung dữ liệu mẫu còn thiếu, không reset database hoặc ghi đè hồ sơ đang dùng. Các hồ sơ có nhãn demo và dữ liệu giả để thuyết trình; chúng không đại diện giao dịch studio thật. Kịch bản mẫu có hồ sơ chụp hoàn tất, đơn thuê hoàn tất có hoàn cọc và lịch chụp sắp tới. Sau khi kịch bản đã tạo xong, khởi động lại giữ nguyên các dữ liệu này và những thao tác người dùng thực hiện tiếp.

Đăng nhập admin để xem Dashboard, Yêu cầu chụp, Đơn thuê, Lịch chụp, Kho và Quản lý → Báo cáo dịch vụ và kho. Đăng nhập client để theo dõi hồ sơ chụp/thuê và các khoản tiền. Dùng kế toán để xem thu chi, báo cáo và đối soát tiền; dùng photographer để kiểm tra công việc được phân công. Bộ kịch bản nghiệm thu chi tiết nằm trong [STUDIO_ACCEPTANCE.md](STUDIO_ACCEPTANCE.md).

## Dữ liệu giả lập phong phú

Khi demo đã chạy, bổ sung bộ dữ liệu mùa kỷ yếu 2026:

```powershell
yarn demo:seed:check
yarn demo:seed
yarn demo:seed:smoke
```

Đợt seed ngày 06/10/2026 thêm 20 lớp với 802 thành viên, 20 hồ sơ chụp, 17 lịch, 24 đơn thuê và 120 giao dịch (78 khoản thanh toán/hoàn cọc liên kết dịch vụ, 42 khoản chi vận hành). Danh mục thêm 18 mẫu trang phục/phụ kiện, 5 gói chụp 300–650 nghìn đồng/người, 3 mùa, 11 nhân sự và 16 tài khoản khách. Có hồ sơ hoàn tất, đang hậu kỳ/chỉnh sửa, chờ cọc, lịch sắp tới và đơn thuê đang nhận/trả đồ để trình diễn công nợ và hoàn cọc.

Tên người, số điện thoại, danh sách lớp và lịch sử giao dịch đều là dữ liệu giả lập; tên trường/địa điểm chỉ tạo bối cảnh. Tài khoản khách ví dụ `khach.maianh` / `Client@1234`; nhân sự ví dụ `ketoan.maianh`, `sale.ngocan`, `nhiepanh.minhquan` dùng mật khẩu ban đầu `Staff@1234`. Admin vẫn là `superadmin` / `Admin@1234` nếu chưa đổi mật khẩu.

Menu **Mùa chụp** tự chọn mùa hiện tại. Chọn mùa hè, mùa thu hoặc mùa cuối năm để xem các nhóm lớp, lịch và thu chi của từng đợt; tổng bộ dữ liệu mới gồm cả ba mùa.

Seeder chỉ chạy với database demo riêng ở cổng 27029. Nó tạo bản ghi mới theo ID ổn định, kiểm tra dấu vân tay của dữ liệu cũ và đối soát lịch/kho/tiền sau commit. Marker hoàn tất và ngày gốc được lưu trong database: chạy lại không tạo trùng hay ghi đè chỉnh sửa của người dùng. Launcher không tự nạp lại bộ dữ liệu lớn mỗi lần khởi động. Bằng chứng nằm trong `.workflow-tools/realistic-seed.json`, `realistic-readiness-*.json` và `realistic-browser.json`.

Cảnh báo công nợ, khoản hoàn cọc/chờ quyết toán và chi vận hành chưa gắn vào hồ sơ dịch vụ là những tình huống được chủ ý tạo trong bộ dữ liệu này. Đợt kiểm tra ban đầu không có lỗi liên kết tiền, xung đột lịch thợ hoặc vượt tồn kho. Xem [biên bản seed](audit/realistic-seed-2026-10-06.md).

## Cấu hình và đối soát

Launcher bật CLIENT_PORTAL_ENABLED, CLIENT_WORKFLOW_ENABLED, CLIENT_RENTAL_ENABLED cho backend demo và VITE_CLIENT_PORTAL_ENABLED/VITE_CLIENT_RENTAL_ENABLED khi build. URI database, JWT secret local, port và CORS được truyền riêng cho runtime. Không sửa `.env` hiện có; không đổi MongoDB studio_db ở cổng 27017. Các integration/E2E test vẫn dùng database riêng của harness.

Telegram/GAS webhook và các biến PAYMENT_* bị để trống riêng cho demo; thông báo nội bộ vẫn hoạt động. Phần Drive dùng link giả hoặc tài liệu kiểm thử do người trình diễn cung cấp; demo không tạo folder/sheet trên tài khoản Google thật. Không nhập thông tin chuyển khoản thật để trình diễn.

JWT secret demo và token dừng runtime lưu trong `.workflow-tools/demo-config.json` / `demo-state.json`, thuộc thư mục git-ignore. Không cần đưa chúng vào source hoặc biên bản. Báo cáo đọc dữ liệu được ghi thành `demo-readiness-<timestamp>.json`; status chỉ hiển thị đường dẫn/counts. `phase=ready` nghĩa là ứng dụng đã khởi chạy; trường `readiness.ready` nói riêng về dữ liệu. Cảnh báo công nợ/hoàn tiền còn mở có thể là tình huống nghiệp vụ hợp lệ.

Nếu kịch bản mẫu chưa hoàn tất bị ngắt sang ngày khác, kỳ thuê trong nhật ký có thể đã quá hạn và API từ chối chạy tiếp. Launcher vẫn mở ứng dụng, giữ hồ sơ và báo `scenario.status=incomplete` kèm bước lỗi; dùng UI để kiểm tra hồ sơ hoặc tạo một yêu cầu demo mới với kỳ hiện tại. Không sửa kỳ đã chốt, xóa tiền hoặc reset database tự động để làm kịch bản chạy lại.

Có thể kiểm tra lại sau khi thao tác demo:

```powershell
$env:MONGO_URI='mongodb://127.0.0.1:27029/studio_project_demo?replicaSet=rs0&directConnection=true'
node ops/audit-studio-readiness.cjs --out .workflow-tools/demo-readiness-manual.json
```

Chọn tên output mới mỗi lần, công cụ không ghi đè bằng chứng. Lệnh này chỉ đọc; không tự tạo index, sửa payment, giải phóng hàng hoặc thay đổi trạng thái hồ sơ.

## Dừng và chạy lại

```powershell
node ops/demo.cjs stop
node ops/demo.cjs start
```

Stop gửi yêu cầu đến đúng runtime của workspace, dừng MongoDB và các tiến trình do launcher tạo, giữ dữ liệu. Muốn lưu bản sao đồ án, dừng demo rồi sao chép cả thư mục `demo-mongo-data` và các file cấu hình demo sang nơi backup; không sao chép data directory khi MongoDB đang ghi. Không xóa thư mục dữ liệu để cập nhật code. Sau khi sửa code, stop/start để compile và build lại.

Lần chạy/kiểm chứng hiện tại được ghi trong [audit/demo-local-2026-10-05.md](audit/demo-local-2026-10-05.md). Các biên bản giai đoạn trước vẫn giữ làm lịch sử; các gate staging/production chỉ áp dụng nếu sau này chọn triển khai VPS.

GitHub Actions vẫn chạy quality gate khi push/PR main; job VPS chỉ chạy nếu repository variable ENABLE_VPS_DEPLOY=true. Không cần cấu hình SSH secrets để sử dụng demo local.
