# ADR-043: Lưu chi tiết gói chụp trong PackageDetail

## Trạng thái và ngày

Accepted — 26/11/2026, Asia/Bangkok. Người dùng yêu cầu lưu hẳn package detail sang bảng riêng.

## Bối cảnh

Gói chụp kỉ yếu trước đây nhúng nội dung giới thiệu, điều khoản, lịch trình và gallery trong Package.details. Cần thực thể riêng cho mô hình dữ liệu, trong khi các màn hình và điều khoản đã được khách chấp nhận phải tiếp tục hoạt động.

## Quyết định

- Thêm model PackageDetail, collection `package_details`, với khóa `_id: ObjectId`, tham chiếu `package: Package` có unique index, `version`, các trường nội dung audience/deliverables/shootScope/pricingConditions/benefits/exclusions/itinerary/process/extraCosts/preparationNotes/depositPolicy/cancellationPolicy/priceNotes/gallery và timestamps. Mỗi gói có tối đa một bản chi tiết; gói mới chưa nhập nội dung có thể chưa có bản chi tiết.
- Xóa trường details khỏi schema và tài liệu Package. Giữ detailsVersion trên Package làm cổng kiểm tra phiên bản; version trong PackageDetail phải khớp. Lưu nội dung và tăng phiên bản cả hai bảng trong cùng transaction, giữ các kiểm tra quyền 0/1, validation và xử lý ảnh hiện có.
- API chi tiết vẫn trả `details` và `detailsVersion` theo cấu trúc cũ bằng cách ghép dữ liệu từ bảng riêng. Không fallback sang dữ liệu nhúng. Nếu phiên bản không khớp hoặc dữ liệu chưa migrate thì trả 409 yêu cầu tải lại. Danh sách gói không tải nội dung đầy đủ.
- Khi khách đặt theo gói, đọc chi tiết từ bảng mới trước khi tạo packageAgreement. Các điều khoản/giá đã snapshot trong đơn cũ không bị thay đổi.
- Ảnh đại diện danh sách đơn lấy gallery theo package ID từ PackageDetail bằng một truy vấn chung. Gỡ gói và bản chi tiết trong cùng transaction; chỉ dọn file ảnh sau khi transaction thành công. Nếu mất xác nhận ghi, kiểm tra tham chiếu ảnh ở PackageDetail trước khi dọn file mới, giữ file khi chưa xác minh được.
- Các script seed nội dung/ảnh dùng cùng service lưu hai bảng; không được tạo lại Package.details. Không chạy seed lại trên database thật.
- Lệnh `yarn workspace studio-management-backend migrate:package-details` mặc định chỉ kiểm tra studio_db đang cấu hình. Thêm `--apply` để sao lưu BSON phần nhúng, chuyển nguyên nội dung/ảnh và phiên bản sang bảng mới rồi bỏ bản nhúng trong cùng transaction. Giữ nguyên Package.\_id, timestamps, detailsVersion và dữ liệu nghiệp vụ khác. Nội dung khác bản backup hoặc xung đột với dữ liệu đích làm transaction dừng; không ghi đè. Chạy lại sau khi chuyển không tạo bản sao.

## Kiểm chứng

- Build và HTTP contracts cho xem/sửa nội dung, quyền truy cập, upload, xung đột phiên bản, rollback và mất xác nhận ghi.
- Kiểm thử transaction trên database tạm riêng: unique relation, hai lượt lưu tranh chấp chỉ một thành công, lỗi ở bảng chi tiết hoàn tác tăng phiên bản Package, snapshot đơn giữ nguyên và xóa gói không để lại orphan.
- Trên studio_db: kiểm tra nội dung/ảnh khớp bản backup, không còn Package.details và các API đọc vẫn trả đúng cấu trúc cũ. Không gửi email, gọi thanh toán hoặc thay cấu hình database/background jobs.

Kết quả thực hiện: build backend thành công; 38 kiểm thử backend và 12 kiểm thử frontend liên quan đều qua. Kiểm thử transaction và API đặt gói dùng database tạm `studio_package_detail_test_<PID>` trên Atlas, đã xóa riêng database tạm sau khi xong; studio_db không nhận dữ liệu kiểm thử. Đã kiểm tra unique relation, rollback, tranh chấp phiên bản, điều khoản được chụp từ bảng mới, bảo toàn đơn đã đặt và xóa gói/ảnh không để orphan.

Migration studio_db chuyển đúng 5 gói với phiên bản hiện hành 2, không còn Package.details. Nội dung, thứ tự mảng và ID ảnh khớp BSON backup tại `C:/Users/APC/AppData/Local/Temp/studio-package-details-Dc0oWw/packages-details.bson`; hash các tài liệu khác và phần Package còn lại không đổi. Chạy lại chuyển 0 gói, không tạo bản trùng. Chrome đọc màn hình sửa gói và trang khách hàng qua API/database thật, tải lại vẫn giữ nguyên nội dung, không thực hiện thao tác lưu trên database thật. Bằng chứng giao diện ở `audit/package-detail-store-2026-11-26/`.
