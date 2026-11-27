# ADR-045: Đổi ConceptPackage thành ConceptDetail

## Trạng thái và ngày

Accepted — 27/11/2026, Asia/Bangkok. Người dùng yêu cầu đổi tên bảng concept package thành concept detail trong database.

## Bối cảnh

Danh mục gói concept đang dùng model ConceptPackage và collection `conceptpackages`. Tên lưu trữ cần đổi theo yêu cầu, đồng thời giữ nguyên nội dung gói, giá, cấu hình trang phục, ảnh, ID và liên kết của các đơn đã đặt.

## Quyết định

- Model mới là `ConceptDetail`, collection khai báo rõ `concept_details`. Thay import ở API, service, startup, seed và test; không giữ model cũ tạo collection ngầm.
- `ConceptOrder.package` tham chiếu `ConceptDetail` nhưng giữ nguyên tên trường và ObjectId. Các API, tham số `packageId`, kết quả `packages`, kiểu DTO phía frontend và nhãn gói chụp tiếp tục tương thích. Snapshot đơn cũ không bị sửa.
- Đây là đổi tên thực thể gói concept, không tách thêm nội dung hay thay đổi schema của gói. `Package` và `PackageDetail` của kỉ yếu không bị ảnh hưởng.
- Công cụ copy catalog sandbox đọc `concept_details`; script seed dùng model mới. Công cụ copy production từ chối nguồn còn `conceptpackages` để không khôi phục collection đã đổi tên. Không chạy seed lại trên database thật.
- API/worker kiểm tra dữ liệu còn trong collection cũ trước khi khởi động để tránh dùng nhầm một danh mục mới rỗng khi chưa migrate.

## Chuyển dữ liệu

Lệnh backend `npm run migrate:concept-details` chỉ kiểm tra; thêm `-- --apply` để đổi tên. Chỉ chấp nhận `studio_db` hoặc database kiểm thử riêng `studio_concept_detail_test_<PID>`.

- Dừng API/worker cũ, sao lưu BSON danh mục cùng manifest/indexes vào thư mục `studio-concept-details-*`.
- Dùng MongoDB rename collection với `dropTarget: false`, giữ nguyên tài liệu và index. Nếu đích đã có dữ liệu thì dừng; nếu đích rỗng đã tồn tại thì giữ lại dưới tên archive trước khi rename.
- So sánh hash tất cả collection nghiệp vụ và danh sách index trước/sau. Không ghi lại document, đổi ID, timestamps hay giá. Chạy lại nhận diện collection đã đổi tên và không tạo bản sao.

## Kiểm chứng

18 kiểm thử qua trên replica set tạm: toàn bộ luồng concept, model/reference mới, populate trường package, giữ BSON/ID/index và đơn, chặn đích có dữ liệu và chạy lại migration an toàn. Backend build thành công; các file sửa/thêm được định dạng bằng Prettier.

Atlas studio_db đã đổi `conceptpackages` thành `concept_details`, giữ nguyên 6 bản ghi và index. Hash tài liệu của 34 collection được kiểm tra trước/sau không đổi. Backup tại `C:/Users/APC/AppData/Local/Temp/studio-concept-details-3dJW8Q/`.

Kiểm tra HTTP chỉ đọc: API quản trị vẫn trả đủ 6 gói qua trường `packages` (200), chưa đăng nhập bị chặn (401), khách không được quản trị danh mục (403). Một đơn concept hiện có populate package thành công qua model mới. Không tạo đơn mới, gửi email, gọi thanh toán hoặc sửa cấu hình database/background jobs. Kết quả tại `audit/concept-detail-rename-2026-11-27/read-verification.json`.
