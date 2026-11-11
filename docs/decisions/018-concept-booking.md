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

### Màn danh sách và chi tiết — 11/11/2026

Danh mục ở `/concept-booking` (và alias `/concepts`); chi tiết ở `/concept-booking/packages/:packageId`. Card chỉ dẫn đến chi tiết. Nút cuối chi tiết chọn gói và mở `/concept-booking/packages/:packageId/book/date`. Các màn sau dùng suffix `photographer`, `costumes`, `brief`, `review`; URL và session draft giữ lựa chọn khi tải lại/quay về sau đăng nhập. Không còn thanh bước. API checkout, xác minh email và kiểm tra tài nguyên/giá ở server được giữ nguyên.

Concept thêm các trường trình bày tùy chọn `story`, `styleSummary`, `audience`, `setting`, `wardrobeGuidance`, `preparation`, `gallery[{url,caption}]`. Gói thêm `imageUrl`. Quản trị chỉnh sửa được; các client cũ gửi thiếu trường mới không xóa nội dung. Gallery tối đa 24 ảnh, URL HTTPS hoặc file WebP trong `/images/concepts/` với tên được kiểm tra, không nhận đường dẫn tùy ý. Nội dung công khai cùng API catalog hiện có; ảnh bàn giao và quyền truy cập album không đổi.

Gói có thêm `decor` tùy chọn gồm `backdrop`, `props`, `layout`, `included`, mỗi trường tối đa 1.000 ký tự. Quản trị chỉnh sửa trong form gói; trang chi tiết hiển thị phần “Decor & bối cảnh” và bỏ qua trường trống. API cũ không gửi `decor` vẫn giữ nội dung hiện có. Snapshot lúc đặt lưu decor cùng thông tin gói, DTO cho ekip cũng trả decor để chuẩn bị bối cảnh đúng với đơn đã đặt. Catalog local đã bổ sung nội dung cho sáu gói, giữ các nội dung đã được chỉnh trước đó.

Nội dung chi tiết gói bổ sung các trường tùy chọn: `introduction` (1.000 ký tự), `studioSupport[{title,description}]` (tối đa bốn mục, 120/500 ký tự), `delivery{timeline,format,originals}` (1.000 ký tự mỗi trường), `showcase{title,description,images[{url,caption}]}` (120/1.000 ký tự, tối đa sáu ảnh, chú thích 200 ký tự). Dùng cùng API quản trị gói, quyền admin, version và idempotency hiện có; thiếu trường trong request cũ không xóa dữ liệu. URL ảnh áp dụng bộ kiểm tra URL concept hiện có. Snapshot đặt gói vốn sao chép dữ liệu gói nên giữ nội dung đã cam kết tại thời điểm đặt.

Trang chi tiết giữ phần giới thiệu ngay dưới tên/giá, hiển thị quyền lợi studio dạng thẻ, lấy số ảnh chỉnh sửa từ cấu hình gói và hai vòng góp ý từ quy trình hiện tại. Thời gian, định dạng và điều kiện ảnh gốc do studio nhập; dữ liệu local không tự đặt SLA hoặc độ phân giải chưa được xác nhận. Bộ ảnh giới thiệu và gallery có nhóm xem lớn riêng. Ảnh local hiện là ảnh minh họa concept, trình bày dưới tên “Phong cách bộ ảnh”; khi có ảnh khách thật/trước-sau, quản trị thay ảnh, tiêu đề và chú thích mà không cần đổi code.

Ảnh minh họa lưu trong frontend public assets; prompt và danh sách ở `docs/assets/concept-photography.md`. Checklist và QA ở `tasks/concept-booking/ui-screens.md` và `design-qa.md`.

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


### Giao diện chọn thời gian — 11/11/2026

Route chọn ngày giữ nguyên, thay dải tuần bằng lịch tháng bắt đầu thứ Hai. Ngày và giờ hiển thị theo Asia/Ho_Chi_Minh, không phụ thuộc múi giờ thiết bị. UI khóa ngày đã qua, vượt `horizonDays` hoặc không có slot; nhóm giờ trước/sau 12h và hiển thị mọi slot từ API. Đổi ngày xóa giờ/thợ/trang phục cũ, Next yêu cầu slot còn hợp lệ; khôi phục draft mất slot sẽ yêu cầu chọn lại.

Tái sử dụng endpoint availability từng ngày, chỉ đọc trong hạn đặt với tối đa bốn request đồng thời, hủy khi đổi tháng/thoát màn. Cache tháng 30 giây trong component giảm lặp request; retry và giờ đã qua xóa cache, bước chọn thợ tải lại ngày đã chọn. Không thay backend, API công khai, cơ chế giữ chỗ hoặc checkout. Kiểm tra và giữ chỗ vẫn diễn ra ở server khi tạo QR. Thiết kế chọn, checklist và QA: `tasks/concept-booking/time-picker.md`, `design-qa.md`; evidence `audit/concept-time-2026-11-11/`.


### Portfolio cá nhân và hồ sơ công khai — 11/11/2026

Giữ model PhotographerProfile và quyền quản trị hiện có. Các trường tùy chọn mới gồm ảnh chân dung/bìa, vai trò, câu định vị, câu chuyện, sở trường, phong cách, cách hướng dẫn, triết lý và các mục cách làm việc/đối tượng/dấu mốc. Client cũ gửi thiếu trường mới sẽ giữ nội dung. Độ dài được kiểm ở model/API, nhóm nội dung tối đa 4/4/6 mục. URL HTTPS hoặc asset WebP concept hợp lệ; ảnh portfolio vẫn yêu cầu đúng concept và permitted=true khi lưu.

API `GET /api/concepts/photographers/:id` chỉ đọc công khai, áp dụng feature gate và rate limit của concept. Chỉ trả hồ sơ published=true của thợ isActive=true/role3 có concept hoạt động. DTO whitelist tên, nội dung hồ sơ, concept hoạt động và ảnh được phép; không trả thông tin liên hệ, tài khoản, vai trò hoặc metadata quản trị. Availability chỉ thêm tóm tắt tên/vai trò/câu định vị/ảnh, không lặp tiểu sử dài trong từng slot.

Trang `/concept-booking/packages/:packageId/photographers/:photographerId` đọc DTO này, hiển thị nội dung cá nhân trước ảnh tác phẩm. Ngày giờ đến từ session draft đã kiểm chủ sở hữu. Khách chưa có lịch vẫn đọc hồ sơ, CTA yêu cầu chọn thời gian. Khi chọn thợ, frontend tải lại availability, giữ draft nếu vừa hết lịch; nếu còn trống thì ghi photographerId, xóa trang phục khi đổi thợ và chuyển tới bước costumes. Không tạo giữ chỗ/thanh toán; checkout tiếp tục kiểm mọi tài nguyên phía server. Hỗ trợ returnTo an toàn cho route mới. Không bổ sung quyền tự sửa hồ sơ cho role3.

Bốn hồ sơ local được bổ sung bằng lệnh chủ động, dùng nội dung/ảnh tạo riêng; không gán thành tích hoặc tác phẩm nổi tiếng cho nhân sự. Tham khảo và provenance: `docs/assets/photographer-profiles.md`; checklist `tasks/concept-booking/photographer-portfolios.md`.


### Trang phục đi kèm gói và điều hướng từng bước — 11/11/2026

Luồng khách concept thay lựa chọn mẫu/size tồn kho bằng số đo theo người: `wardrobeMeasurements[{size,heightCm,weightKg}]`. Khách không gắn costumeId hoặc số lượng món; studio chuẩn bị đồ theo quyền lợi gói. Đơn lưu số đo riêng với `costumes` để không biến thông tin cơ thể thành giữ kho một sản phẩm chưa được chỉ định. Các đơn/client cũ dùng `costumes` vẫn kiểm tồn kho và transaction như trước. Payload có số đo phải có số dòng đúng số người khi gói kèm đồ, không kèm lựa chọn món cụ thể; gói trang phục cá nhân chấp nhận mảng trống. Dữ liệu chỉ qua API đơn có phân quyền, không thêm vào hồ sơ thợ hoặc album công khai.

Draft giữ số đo khi đổi thời gian/thợ; bước kiểm tra và hồ sơ đơn hiển thị theo từng người. Bước sau bị đưa về form số đo nếu dữ liệu gói kèm đồ thiếu hoặc sai. Thông tin số người được nhập ở bước số đo cho gói kèm đồ; gói không kèm giữ ở brief. Không suy size bằng công thức hoặc tự cấp phát kho.

Back trong wizard đi đúng một bước logic, dùng icon mũi tên trái và không gạch chân; bỏ Back lặp ở cuối màn. Nhãn dịch vụ chụp truyền thống đổi thành “Chụp kỉ yếu” trên menu/tiêu đề/thông báo, giữ nguyên route và API booking.
