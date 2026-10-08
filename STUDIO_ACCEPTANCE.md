# Nghiệm thu đồ án trên demo local

Đồ án dùng một môi trường demo local có dữ liệu lưu bền vững làm đích triển khai và nghiệm thu. Không cần staging, production, dữ liệu khách hàng thật hay chữ ký của studio để tiếp tục triển khai. Dữ liệu mẫu và các tài khoản theo vai trò đủ để trình diễn hai hành trình chụp/thuê cùng báo cáo; người thực hiện đồ án ghi lại kết quả UAT bằng tay.

Bằng chứng tự động đã có trong [audit/release-readiness-2026-10-05.md](audit/release-readiness-2026-10-05.md): 107 kiểm thử local đạt ở lần kiểm chứng đó. Đây là bằng chứng regression, không tự đánh dấu các dòng UAT dưới đây đã được người dùng thử. Các bước Docker/VPS trong release runbook chỉ áp dụng nếu sau này chọn triển khai lên máy chủ.

## 1. Chuẩn bị demo

Từ root repository:

```powershell
node ops/demo.cjs start
node ops/demo.cjs status
```

Hướng dẫn đầy đủ và tài khoản mẫu nằm trong [DEMO_LOCAL.md](DEMO_LOCAL.md). Frontend tại **http://localhost:4001**, API tại **http://localhost:5002**. Mongo chạy ở **127.0.0.1:27029**, replica set **rs0**, database **studio_project_demo**, thư mục dữ liệu **.workflow-tools/demo-mongo-data**. Demo tách khỏi database đang dùng và các database mà test harness xóa/tạo lại.

| Mục | Thông tin cần ghi khi trình diễn |
|---|---|
| Phiên bản | Root/backend/frontend SHA và ghi chú nếu có thay đổi local |
| Vai trò | Admin, sale, kế toán, photographer và client mẫu; tạo client thứ hai/CTV nếu cần thử quyền |
| Dữ liệu | Gói chụp, mẫu–size–tình trạng kho, hồ sơ chụp/thuê và giao dịch mẫu |
| Thời điểm khởi động | Thời gian, Mongo primary, API health và frontend truy cập được |
| Dữ liệu sau restart | ID một hồ sơ trước và sau khởi động lại; không mất dữ liệu |
| Backup trước reset/nâng cấp | File sao lưu, thời gian và lệnh dùng nếu database đã có dữ liệu cần giữ |

MongoDB phải là replica set hỗ trợ transaction. Một member local đủ cho đồ án, không cung cấp high availability. Dùng tài khoản và thông tin thanh toán minh họa, không nhập tài khoản ngân hàng thật hoặc liên kết Telegram thật. Nếu trình diễn Drive, dùng thư mục thử và URL minh họa phù hợp; kiểm thử tích hợp thực tế riêng khi đã cấu hình dịch vụ ngoài.

Backup và restore thử là phần kiểm chứng bảo toàn dữ liệu có thể trình diễn local; không cần một môi trường staging khác. Trước thao tác reset hoặc đổi topology trên dữ liệu muốn giữ, sao lưu trước. Restore vào một database local riêng rồi đối chiếu collection, index và thu–hoàn, giữ nguyên database demo đang dùng.

## 2. Kiểm tra dữ liệu chỉ đọc

Chạy readiness audit trên database demo sau khi khởi động và tạo dữ liệu mẫu. Không thao tác UI trong lúc audit để các truy vấn đọc cùng trạng thái. Từ root:

```powershell
$env:MONGO_URI = 'mongodb://127.0.0.1:27029/studio_project_demo?replicaSet=rs0&directConnection=true'
New-Item -ItemType Directory -Path .workflow-tools -Force | Out-Null
node ops/audit-studio-readiness.cjs --out .workflow-tools/readiness-demo.json
```

Output phải là tên mới; công cụ từ chối ghi đè bằng chứng. `.workflow-tools` được git-ignore. Exit 0 = không có blocker trong phạm vi kiểm tra; 2 = cần đối soát; 1 = lỗi đầu vào/kết nối/quyền đọc/đường dẫn output. Cảnh báo về công nợ, hồ sơ chờ xử lý hoặc dữ liệu thu chi cũ có thể là trạng thái mẫu hợp lệ cần giải thích khi demo.

| Findings | Cách xử lý trên demo |
|---|---|
| TRANSACTIONS_UNAVAILABLE / NO_WRITABLE_PRIMARY | Khởi tạo/kiểm tra replica set và primary trước thao tác workflow |
| MISSING_UNIQUE_INDEX | Kiểm tra khởi tạo index của backend; đối soát dữ liệu trùng trước tạo index |
| UNKNOWN/INVALID_COSTUME_ALLOCATION, INVALID_SIZE, INVALID_INVENTORY | Điền đúng mẫu–size–số lượng–ngày/tình trạng; không suy bằng tổng kho |
| PHOTOGRAPHER_COLLISION / INVALID_PHOTOGRAPHER | Chọn nhân sự đang hoạt động, đúng vai trò và khoảng thời gian phù hợp |
| STOCK_CAPACITY_CONFLICT | Xem nguồn giữ hàng; đổi phân bổ hoặc thực hiện đề xuất đổi/hủy |
| WORKFLOW_*_MISMATCH / ORPHAN_* | Đối chiếu hồ sơ và lịch đã chốt; dùng luồng đề xuất/đồng ý thay đổi |
| PAYMENT_*/TRANSACTION_* | Đối chiếu receipt/payment với sổ theo ID, số tiền, thu/hoàn và ngày VN |
| INVALID_*_COMPLETION / INVALID_*_CANCELLATION | Thực hiện đúng đồng ý/nghiệm thu/nhận trả trước chuyển trạng thái |
| OVERDUE_RENTAL / MISSED_RENTAL_HANDOVER | Giải thích hoặc xử lý đơn mẫu; đơn đã giao quá hạn tiếp tục chiếm hàng |
| OUTSTANDING_PAYMENT / OUTSTANDING_REFUND / RENTAL_AWAITING_SETTLEMENT | Xử lý bằng vai trò kế toán/khách hoặc giữ làm ví dụ công nợ hợp lệ |
| UNCLASSIFIED_TRANSACTION | Thu chi cũ không liên kết được giữ riêng; không tự gán dịch vụ |
| INVALID_DATA_SHAPE / INVALID_DOCUMENT_ID | Đối soát collection/ID/field; công cụ không sửa dữ liệu cho qua gate |

`ready=true` phản ánh dữ liệu/topology trong phạm vi audit. `transactionCommitVerified=false` có chủ ý vì audit không ghi lên database. Thao tác workflow thành công và các regression Mongo chứng minh transaction theo từng command; health/ping đơn lẻ không chứng minh việc commit. Xác nhận trên demo rằng chốt chụp tạo hồ sơ–Schedule–resource lock, chốt thuê tạo đơn–resource lock và ghi tiền tạo payment/receipt–Transaction liên kết.

## 3. Kịch bản UAT để trình diễn

Dùng các tài khoản mẫu theo vai trò, hai client khác nhau và nguồn lực riêng cho kịch bản. Với phí/cọc/phụ phí minh họa, người đóng vai studio gửi đề xuất để người đóng vai khách đồng ý. Các dòng hiện để **Chưa chạy thủ công**; chỉ cập nhật khi đã thực sự thao tác và lưu bằng chứng.

| ID | Vai trò / thao tác | Kết quả cần đạt | Kết quả, hồ sơ, evidence / issue |
|---|---|---|---|
| P01 | Guest chọn gói, so sánh, nhập lớp/concept, đăng nhập/refresh/gửi lại | Giữ bản nháp/context; chỉ một yêu cầu được tạo | Chưa chạy thủ công |
| P02 | Sale gửi quote; client đồng ý đúng phiên bản | Snapshot/điều khoản không đổi khi sửa catalog; quote mới cần đồng ý mới | Chưa chạy thủ công |
| P03 | Client nhập thành viên/size trước có Schedule, mở/đóng link | Không trả roster qua link công khai; đủ dữ liệu trước chốt | Chưa chạy thủ công |
| P04 | Chốt khi thiếu cọc, thiếu size/tồn, trùng photographer | Từ chối; không có lịch hoặc lớp mồ côi | Chưa chạy thủ công |
| P05 | Hai admin đồng thời xác nhận cùng đơn vị kho/nhân sự cuối | Một thành công; một conflict; không chiếm quá tồn | Chưa chạy thủ công |
| P06 | Đổi lịch/giá; phương án mới không đủ kho | Giữ phương án cũ đến khi đồng ý và transaction thành công | Chưa chạy thủ công |
| P07 | Hủy sau nhận cọc | Có đề xuất/đồng ý; giải phóng đúng nguồn lực; còn thu/hoàn vẫn truy vết được | Chưa chạy thủ công |
| P08 | Chụp/hậu kỳ/bàn giao V1 → sửa → V2 → nghiệm thu | URL/version/lịch sử đúng; nghiệm thu chưa trả đủ chưa hoàn tất | Chưa chạy thủ công |
| P09 | Kế toán ghi khoản tiền hai lần do retry hoặc stale version | Không nhân đôi tiền; stale/new payload conflict đúng | Chưa chạy thủ công |
| R01 | Guest chọn mẫu/size/quantity/kỳ, đăng nhập/refresh | Bản nháp giữ nguyên; catalog không tự chốt giá/cọc | Chưa chạy thủ công |
| R02 | Sale gửi quote fee/deposit; client đồng ý; kế toán ghi cọc | Cọc bảo đảm tách phí; chỉ giữ hàng khi đủ cọc/khả dụng | Chưa chạy thủ công |
| R03 | Admin giao thiếu tiền, sai kỳ hoặc hàng bị chụp/thuê khác giữ | Từ chối; giao hợp lệ giữ đúng từng mẫu–size–quantity | Chưa chạy thủ công |
| R04 | Gia hạn xung đột / gia hạn tăng phí sau giao | Xung đột giữ kỳ cũ; gia hạn hợp lệ tạo phần còn thu, không làm sai receipt trước giao | Chưa chạy thủ công |
| R05 | Nhận trả tốt/hỏng/mất; trả cùng ngày hoặc trả muộn | Tổng nhận trả đúng số giao; tình trạng kho cập nhật; quá hạn chưa trả không tự tăng tồn | Chưa chạy thủ công |
| R06 | Phụ phí chưa đồng ý → đồng ý đối soát → hoàn cọc dư | Chưa đồng ý không tăng giá; tổng thu/hoàn cuối đúng thì mới hoàn tất | Chưa chạy thủ công |
| R07 | Rút yêu cầu chưa đồng ý / hủy sau đồng ý trước giao | Rút không phí; hủy qua đề xuất/đồng ý, không cho hủy đơn đã giao | Chưa chạy thủ công |
| B01 | Kế toán đối chiếu kỳ thu/chi, nghiệm thu/đối soát, đổi kỳ | Cọc không tính vào giá trị dịch vụ; công nợ hiện tại độc lập bộ lọc kỳ | Chưa chạy thủ công |
| B02 | Đối chiếu Schedule/rental cùng mẫu–size trong kỳ | Không đếm bản sao workflow; ngày nhận/trả gồm hai đầu; cảnh báo legacy/thiếu dữ liệu | Chưa chạy thủ công |
| A01 | Client B / photographer không được phân công / CTV / sale | Không đọc hoặc ghi ngoài vai trò; báo cáo chỉ admin/kế toán | Chưa chạy thủ công |
| A02 | 360px, desktop, bàn phím, lỗi mạng/retry | Không tràn trang; có label/focus/loading/error/retry; retry không nhân đôi nghiệp vụ | Chưa chạy thủ công |
| A03 | Tắt flag workflow/rental rồi thử API lịch/kho/thu chi cũ | Giữ nguồn lực và lịch sử liên kết; không tạo/sửa lịch làm vượt tồn/trùng nhân sự | Chưa chạy thủ công |

Ghi ID hồ sơ/transaction và ảnh vào cột evidence, dùng dữ liệu mẫu thay cho dữ liệu cá nhân. Toàn hành trình gồm nhiều command; mỗi command commit nguyên tử các bản ghi liên quan. Kiểm thử cạnh tranh và retry tự động là bằng chứng hỗ trợ P05/P09, có thể dẫn tới báo cáo test khi demo thay vì cố tạo race condition bằng thao tác tay.

## 4. Feature flags và cấu hình

| Cấu hình | Local không Compose | Docker replica overlay, tùy chọn |
|---|---|---|
| CLIENT_PORTAL_ENABLED | backend/.env hoặc env của launcher | backend/.env |
| CLIENT_WORKFLOW_ENABLED | backend/.env hoặc env của launcher | root .env; ghi đè backend/.env; mặc định false |
| CLIENT_RENTAL_ENABLED | backend/.env hoặc env của launcher | root .env; ghi đè backend/.env; mặc định false |
| VITE_CLIENT_PORTAL_ENABLED | frontend/.env hoặc env của launcher | root .env → Docker build arg; mặc định true |
| VITE_CLIENT_RENTAL_ENABLED | frontend/.env hoặc env của launcher | root .env → Docker build arg; mặc định false |

Launcher demo mở portal, chụp và thuê bằng env cho process local; không cần ghi đè secret trong `.env` đang có. Restart backend khi đổi backend flags; frontend Vite cần restart và bản build cần build lại khi đổi VITE flags. CORS_ORIGIN phải khớp frontend local; API URL/port phải khớp backend đang chạy.

Nếu chọn Docker/VPS sau này, áp dụng cả hai Compose files theo [WORKFLOW_RELEASE.md](WORKFLOW_RELEASE.md), giữ data/keyfile volumes và xác nhận primary. `.env.rollout.example` là cấu hình mặc định đóng workflow mới khi nâng cấp một database đang dùng; không thay toàn bộ `.env` bằng file mẫu. Marker `.workflow-replica-enabled` chỉ phục vụ workflow deploy VPS, không phải điều kiện chạy launcher local.

## 5. Dừng, khởi động lại và khôi phục

```powershell
node ops/demo.cjs stop
node ops/demo.cjs start
```

Dừng và khởi động lại giữ dữ liệu trong `.workflow-tools/demo-mongo-data`. Kiểm chứng bằng ID một hồ sơ trước/sau restart. Chỉ reset database demo khi chủ động muốn tạo lại dữ liệu mẫu, sau khi đã giữ bằng chứng/backup cần thiết. Không dùng test harness hoặc seed xóa dữ liệu trên database demo.

Nếu cần tạm đóng ghi nghiệp vụ, tắt CLIENT_WORKFLOW_ENABLED/CLIENT_RENTAL_ENABLED trong nguồn cấu hình của process và restart backend; tắt entry tương ứng ở frontend bằng flags nếu cần. Bật lại để xử lý nhận trả/hoàn tiền đang mở. API cũ vẫn bảo vệ nguồn lực đã giữ cả chụp lẫn thuê. Không đổi replica set về standalone, xóa data/keyfile volume, xóa hồ sơ hay payment để rollback ứng dụng.

Theo dõi 409/503/5xx, đơn chờ hành động, chưa hoàn tiền, quá hạn và thiếu hàng. Lỗi Drive/notification được xử lý riêng khỏi transaction đã commit; retry không được tạo thêm payment hoặc Schedule. Khi rollback code, dùng phiên bản đã ghi và kiểm tra tương thích dữ liệu.

## 6. Biên bản kết quả đồ án

| Nội dung | Kết quả / bằng chứng cần ghi |
|---|---|
| Regression tự động | 107 kiểm thử local đạt ở lần kiểm chứng 05/10/2026; xem audit lịch sử và báo cáo lần chạy mới nếu có |
| Demo runtime | Launcher chạy bản build tại localhost:4001/API5002; Mongo rs0:27029; xem audit/demo-local-2026-10-05.md |
| Readiness database demo | 0 blocker; 1 warning còn thu 750.000đ của lịch sắp chụp; file demo-readiness-*.json |
| Khởi động lại giữ dữ liệu | Snapshot 16 collection trước/sau stop/start giữ nguyên; xem biên bản demo local |
| Chụp / thuê / báo cáo / quyền truy cập | Ghi các dòng UAT đã thao tác, chưa thao tác và issue còn mở |
| Backup / restore local nếu thực hiện | Ghi file và database restore riêng; không tự đánh dấu đã đạt |

Người thực hiện đồ án có thể tự nghiệm thu bằng tài khoản mẫu và lưu bằng chứng trình diễn. Manual UAT chưa chạy không ngăn chuẩn bị/cải tiến code hoặc khởi động demo. Khi nộp hoặc bảo vệ, mô tả đúng phần đã kiểm chứng tự động, phần đã thao tác bằng tay và giới hạn tích hợp dịch vụ ngoài.
