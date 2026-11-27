# ADR-044: Dùng chung Album và Photo cho kỉ yếu và concept

## Trạng thái và ngày

Accepted — 27/11/2026, Asia/Bangkok. Người dùng yêu cầu triển khai phương án dùng chung hai bảng album/ảnh, sửa cả code và database.

## Bối cảnh

Kỉ yếu lưu album, ảnh Drive và ảnh tải lên trong ba collection khác nhau; concept lưu album và ảnh Drive trong hai collection khác. Cả hai đều quản lý ảnh theo album nhưng khác quy trình chọn, thanh toán, góp ý và bàn giao. Chuyển cấu trúc lưu trữ phải giữ nguyên các quyền và lịch sử đang có.

## Quyết định

- Hai model gốc `Album` và `Photo` dùng collection `albums` và `photos`. Các module tên cũ trở thành Mongoose discriminators, không còn collection riêng. Cách này gom lưu trữ và tự giới hạn truy vấn của từng dịch vụ, đồng thời tái sử dụng quy trình hiện có.
- `Album.service` là `yearbook` hoặc `concept`. Album kỉ yếu có `booking: Booking`; album concept có `order: ConceptOrder`. Chỉ có đúng một tham chiếu, kiểm tra khi validate model và khi migrate. Giữ tên trường đang dùng để tương thích code/API. Không chuyển nhầm tham chiếu từ Booking sang BookingWorkflow.
- Mỗi đơn hiện có tối đa một album, được ràng buộc bằng unique index theo dịch vụ và tham chiếu đơn. Một album chứa nhiều ảnh/phiên bản bàn giao. Khả năng mở nhiều album độc lập trên cùng đơn chưa được yêu cầu trong lần hợp nhất này.
- `Photo.album` tham chiếu model chung `Album`. `kind` phân biệt `yearbook_drive`, `concept_drive`, `yearbook_upload`; truy vấn của từng discriminator tự thêm điều kiện tương ứng. Ảnh Drive dùng chung `deliveryVersion`: 0 là ảnh chọn, -1 là bản nháp kỉ yếu, số dương là bản bàn giao bất biến. API concept tiếp tục trả trường `version` cho ảnh như trước.
- Ảnh tải lên cũng nằm trong `photos`, giữ `booking`, metadata file, uploadKey/sha256 không chọn mặc định, `originalPhotoId`, `publishedVersions` và tombstone. Mỗi file vẫn có một ID và đường dẫn riêng trong private-delivery; không di chuyển hay xóa file khi migrate. Khi tải ảnh lên cho đơn chưa có album, tạo album kỉ yếu ở trạng thái draft trong cùng transaction. Migration xử lý tương tự với dữ liệu cũ.
- Giữ cấu trúc trạng thái riêng, quyền owner/ekip/admin, hạn mức chọn, phí ảnh thêm, điều kiện thanh toán, chia sẻ có token và session, các vòng góp ý, snapshot lịch sử và command idempotency. Các routes và DTO hiện tại không đổi; frontend dùng tiếp API cũ.
- BookingWorkflow trỏ ảnh qua `Photo`; lịch sử lựa chọn giữ collection nghiệp vụ riêng `bookingalbumselections`, tham chiếu `Album`. Đây là lịch sử tương tác, không phải bảng album/ảnh thứ ba. Worker và API dùng cùng model, kiểm tra không còn dữ liệu ở collection cũ trước khi khởi động. Lookup album trong danh sách công việc giới hạn `service: concept`.

## Chuyển dữ liệu

Lệnh trong backend: `npm run migrate:albums` chỉ kiểm tra; `npm run migrate:albums -- --apply` thực hiện. Chỉ chấp nhận database cấu hình `studio_db` hoặc database kiểm thử riêng `studio_album_store_test_<PID>`.

1. Dừng API/worker phiên bản cũ trước khi áp dụng, giữ nguyên cấu hình Atlas, email, thanh toán và background jobs.
2. Kiểm tra chủ đơn, album của ảnh, ảnh gốc của bản chỉnh, xung đột ID và nội dung. Không đổi ID hay ghi đè dữ liệu đích khác nội dung.
3. Sao lưu BSON cả năm collection nguồn và hai collection đích, kèm manifest/indexes trong thư mục tạm `studio-shared-albums-*`.
4. Tạo index, kiểm tra dữ liệu vẫn khớp backup rồi chuyển dữ liệu và xóa các tài liệu nguồn trong một MongoDB transaction. Đổi `ConceptPhoto.version` sang `deliveryVersion`; các trường và timestamps khác giữ nguyên.
5. Đối chiếu toàn bộ dữ liệu đích, xóa collection nguồn đã rỗng, so sánh hash các collection nghiệp vụ khác. Chạy lại không tạo bản sao. Nếu mất xác nhận commit, giữ backup, chạy lại lệnh để kiểm tra trạng thái thay vì khôi phục đè dữ liệu.

## Hệ quả

- Sơ đồ lớp có hai thực thể Album/Photo, quan hệ Booking — Album và ConceptOrder — Album là 1–0..1; Album — Photo là 1–N.
- Không tạo API chung làm lẫn quyền giữa hai dịch vụ. Khi thêm luồng mới, dùng đúng discriminator hoặc đặt điều kiện service/kind rõ ràng cho truy vấn gốc/aggregation.
- Dữ liệu bổ sung theo dịch vụ vẫn nằm cùng document thay vì bị xóa để ép về một schema tối thiểu. Giữ quy trình hiện có giúp tránh làm mất phí phát sinh, bản đã bàn giao và lịch sử khách chấp nhận.

## Kiểm chứng

- Kiểm thử HTTP trên replica set tạm cho chọn ảnh, phân quyền giữa đơn/dịch vụ, token, tải ảnh/ZIP, phí phát sinh, snapshot, upload riêng tư và lịch sử bàn giao.
- Kiểm thử migration gồm cả hai dịch vụ, ảnh tải lên chưa có album, bảo toàn ID/nội dung/timestamps, backup BSON, lỗi ghi hoàn tác toàn bộ, unique index và chạy lại không trùng dữ liệu.
- Kiểm tra build/format backend; đối chiếu dữ liệu trên studio_db sau khi áp dụng. Không gửi email hay tạo giao dịch thanh toán thật.

Kết quả thực hiện: 42 kiểm thử liên quan đều qua trên replica set dùng riêng; kiểm thử migration được chạy lại sau khi bổ sung tình huống đích trùng ID nhưng khác nội dung, cả hai kiểm thử store đều qua. Backend build và TypeScript thành công; toàn bộ file sửa/thêm đạt Prettier. Lệnh check toàn backend vẫn báo 99 file có lỗi định dạng tồn tại ngoài phạm vi thay đổi.

Migration Atlas studio_db chuyển 1 album và 59 ảnh (58 ảnh Drive, 1 ảnh tải lên) vào hai collection mới. Các ID, timestamps, metadata, token, ghi chú, lựa chọn và phiên bản giữ nguyên; toàn bộ collection nghiệp vụ khác giữ nguyên hash. Không có album/ảnh concept trong database thật lúc chuyển; luồng concept được kiểm thử đầy đủ bằng dữ liệu tạm. BSON backup và manifest ở `C:/Users/APC/AppData/Local/Temp/studio-shared-albums-1YokFW/`.

Kiểm tra API chỉ đọc qua `node ops/tests/shared-album-storage-read.cjs`: admin và chủ đơn trả 200, chưa đăng nhập trả 401, khách khác trả 404; các ảnh, lựa chọn và ghi chú vẫn đọc đúng. Kết quả ở `audit/shared-albums-2026-11-27/read-verification.json`. API/worker không chạy trước khi migrate và không được tự khởi động lại để tránh phát sinh công việc nền không thuộc lần kiểm chứng này.
