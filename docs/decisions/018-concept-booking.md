# ADR-018: Chụp concept và album hậu kỳ

Accepted — 10/11/2026. Implementation checklist: `tasks/concept-booking/todo.md`.

## Ranh giới và cấu hình

Đơn concept độc lập với kỷ yếu, dùng chung User, Schedule, kho, resource transaction,
Transaction, SePayReceipt, email outbox và dịch vụ ảnh Drive. Không chuyển đổi đơn cũ.
Mặc định tắt; bật `CONCEPT_BOOKING_ENABLED=true` ở backend và
`VITE_CONCEPT_BOOKING_ENABLED=true` ở frontend rồi restart/build. Cần
`CLIENT_WORKFLOW_ENABLED=true`, MongoDB replica set, cấu hình SePay hiện có và
xác thực email. Album cần `GOOGLE_DRIVE_API_KEY` phía server như ADR-014.
Nếu webhook SePay đang lọc mã thanh toán, bổ sung tiền tố `CONC` bên cạnh các
mã kỷ yếu/thuê hiện có; giữ JSON và HMAC-SHA256 như cấu hình đang dùng.
Với Docker Compose, đặt hai cờ concept trong root `.env`; frontend nhận cờ qua
build argument, backend nhận qua environment. Mặc định trong Compose vẫn tắt.

Khách mở `/concept-booking` (hoặc `/concepts` khi bật), đơn ở tab Chụp concept của
`/account/orders`. Nhân sự mở `/concept-orders`; admin cấu hình tại
`/settings/concepts`. Tạo concept, gói và hồ sơ thợ published, đánh dấu concept thợ
có thể chụp; ảnh portfolio chỉ công khai khi có quyền sử dụng. Giá tối thiểu 1.000đ,
thời lượng 30–600 phút, tối đa 500 ảnh mỗi bộ. Trang phục là bộ theo gói, dùng tồn
theo ngày của kho hiện có. Không cộng phí theo người; chặn vượt số người/số bộ.

## Lịch và tiền

Draft riêng trong sessionStorage, gắn chủ tài khoản, xóa khi logout; không tạo đơn
trước checkout. Chỉ email đã xác thực được tạo QR. Giữ studio/thợ/đồ 15 phút trong
resource transaction; giới hạn hai giữ chỗ còn hiệu lực/tài khoản. Retry không gia hạn.
Giữ chỗ được tính kể cả khi feature flag tắt; lịch chính thức thay giữ chỗ, không tính
trùng tồn. Calendar có nhãn concept và overlay giữ chỗ còn hạn. Lịch và giao dịch có
liên kết concept không sửa/xóa qua API legacy. Lịch concept không tạo Customer giả.

Mỗi khoản cọc, số dư, ảnh thêm, chỉnh thêm có mã CONC riêng. Webhook dùng cùng
HMAC, raw bytes và dedupe như ADR-010. Cọc thiếu cộng dồn; đủ cọc trong hạn mới tạo
Schedule cùng transaction ghi tiền. Sai/thừa/muộn, cấu hình ngân hàng đổi hoặc không
còn tài nguyên vào review. Receipt bền vững tồn tại trước áp dụng tiền. Không tự gửi
lệnh hoàn ngân hàng. Kế toán đối soát từ chứng từ vào đúng đơn; cọc lỗi cần hủy/hoàn
rồi đặt lại. QR số dư/phát sinh hết hạn có thể tạo lại cho phần thiếu; cọc hết hạn phải
checkout mới. Không ghi thu chuyển khoản thủ công song song webhook.

Một lần đổi miễn phí trước 48 giờ; giữ gói/thợ và tái kiểm tra toàn bộ tài nguyên.
Hủy trước >=48h giữ 0 cọc, 24–48h giữ nửa cọc (làm tròn lên), <24h giữ toàn cọc;
hoàn tiền khác. Tính trên min(lịch gốc,lịch hiện tại), không tự hủy khi đã đến giờ.
Admin có thao tác hủy ngoại lệ với lý do và số tiền hoàn rõ ràng. Kế toán ghi chứng
từ hoàn thực tế; không cho ghi lại cùng mã chứng từ hoặc vượt khoản phải hoàn.

## Album và phân quyền

Thợ đánh dấu đã chụp sau giờ bắt đầu; hệ thống tạo khoản số dư. Staff đồng bộ Drive,
nhưng chỉ xuất bản/chủ đơn xem khi đã chụp và thanh toán đủ số dư. Chủ đơn chọn tim,
ghi chú và chốt phiên bản. Phí vượt quota lấy từ snapshot; thu đủ mới vào retouch.
Admin chỉ mở lại trước retouch; số tiền đã thu được tính bù, phí giảm tạo khoản cần
hoàn và phải đối soát trước bàn giao. Xuất TXT danh sách tên ảnh để lọc trên máy.

Retouch dùng thư mục riêng mỗi bản, đủ danh sách chốt, giữ tên file gốc (đổi đuôi
được). Snapshot và checksum nguồn bất biến. Hai vòng feedback tổng hợp miễn phí,
gắn ảnh và bản giao; ekip đánh dấu xử lý từng ý. Bản mới không reset số vòng. Ngoài
hai vòng/đơn đã nghiệm thu: tạo yêu cầu → admin báo phí/phạm vi → chủ đơn đồng ý →
SePay đủ tiền → xử lý → bản giao mới. Chỉ chủ đơn nghiệm thu bản mới nhất.

Link `/concept-albums/:publicId#access=...` có hạn 7 ngày, token băm, header riêng,
chỉ xem; không thấy tiền, ghi chú riêng hoặc feedback; không ghi/tải qua guest API.
Đường ảnh authenticated kiểm tra quyền, không static mount. Tải từng ảnh hoặc ZIP
streaming theo bản giao khi admin cho phép. Thư mục Drive vẫn công khai bằng link:
quyền ứng dụng không thu hồi link Google; Studio phải giữ file/thư mục đã giao.
Không tuyên bố Google Drive công khai là kho lưu trữ riêng tư.

## Kiểm chứng và demo

`node ops/run-concept-tests.cjs` khởi động replica set loopback 27047 riêng, chạy
backend tests rồi dừng. Dữ liệu chỉ trong `studio_sepay_concept_test_<pid>`; test
kiểm tra host/tên DB trước cleanup. Dùng `CONCEPT_TEST_MONGOD` chỉ đường mongod
nếu chưa có trong PATH hoặc Windows installation. CI có replica set sẵn có thể chạy
`node --test tests/concept-booking.cjs` từ backend với `MONGO_TEST_URI`.

PowerShell: `$env:CONCEPT_BROWSER_TEST='true'; node ops/run-concept-tests.cjs` thêm
Chrome desktop/mobile, frontend cô lập 4047. Evidence ở `audit/concept-booking/`.
Google HTTP dùng fixture: không thay thế nghiệm thu Drive thật. Drive thật cần API
key và thư mục mẫu; kiểm quyền, thumbnail, ảnh lớn, thay nguồn và bản giao lịch sử.

Seed demo là lệnh chủ động: đặt `CONCEPT_DEMO_URI` trỏ loopback DB có tên
`studio_sepay_concept_*`, `CONCEPT_DEMO_PASSWORD` tối thiểu 12 ký tự rồi chạy
`node ops/seed-concepts.cjs`. Lệnh không đọc MONGO_URI và không reset; tạo gói/thợ/
khách/admin nếu chưa có, giữ dữ liệu có sẵn. Tài khoản `concept-admin`,
`concept-client`, `concept-photographer` dùng mật khẩu đã cung cấp; email demo được
xác thực chỉ trong sandbox. Không tạo thanh toán hoặc gửi email thật khi seed.

## Kết quả bàn giao

171/171 backend tests, 367/367 frontend tests đạt. Kiểm chứng Chrome thật với API
và MongoDB riêng: checkout, QR sandbox, xác nhận lịch, album theo phiên bản, zoom,
Escape và quản trị danh mục; desktop 1440×1000/mobile 390×844 không tràn ngang và
không có page error. Kiểm tra bổ sung ảnh nguồn bị mất: khách bỏ chọn rồi đồng bộ
lại được; HTTP suite cuối 11/11. TypeScript hai phần, ESLint phần sửa, build backend/
frontend và parse Compose YAML đạt. Evidence: `audit/concept-booking/`.

Build còn cảnh báo bundle lớn/circular chunk đã có từ cấu hình chia chunk. Prettier
kiểm toàn bộ backend trên Windows báo 101 tệp cũ ngoài phần sửa; không format lại
các tệp đó. Phần sửa được format và diff check đạt. Không chạy tiền/email thật,
không deploy; Drive thật chưa kiểm vì chưa cung cấp API key và thư mục mẫu.
