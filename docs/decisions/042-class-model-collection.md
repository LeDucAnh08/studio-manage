# ADR-042: Đổi Customer thành Class

## Trạng thái và ngày

Accepted — 26/11/2026, Asia/Bangkok. Người dùng yêu cầu đổi tên bảng Customer thành Class trong lúc loại bỏ mùa chụp.

## Bối cảnh

Thực thể Customer cũ lưu lớp học, trường, liên hệ đại diện và sĩ số; tài khoản khách hàng thuộc User. Tên Class phản ánh đúng dữ liệu và sơ đồ lớp.

## Quyết định

- Đổi model/file `Customer` thành `Class`, interface `IClass`, collection `classes` được khai báo rõ trong schema.
- Cập nhật import, tham chiếu Mongoose của Student, Schedule, BookingWorkflow, Transaction và Feedback, cùng aggregate lookup sang collection classes.
- Giữ các ObjectId hiện có và các trường tham chiếu `customer` để bảo toàn dữ liệu/API. Các đường dẫn `/customers`, `/customers/users`, `/api/customers` và biểu mẫu khách hàng tiếp tục hoạt động như trước; việc đổi tên collection không yêu cầu đổi navigation hay đường dẫn quản lý tài khoản đã được duyệt.
- Các seed/helper/test dùng model Class. Giữ salt Customer lịch sử khi tính ID seed lớp để không tạo bản sao sau khi đổi tên; giữ nguyên completed seed marker.
- Lệnh `yarn workspace studio-management-backend migrate:classes` mặc định kiểm tra database studio_db hiện tại. Thêm `--apply` để rename customers thành classes bằng MongoDB với `dropTarget: false`, giữ nguyên tài liệu, ObjectId, index và liên kết.
- Nếu cả hai collection cùng có dữ liệu thì dừng, không merge/xóa/ghi đè. Nếu classes chỉ là collection rỗng đã tạo trước, rename collection rỗng sang tên lưu trữ riêng trước khi đổi customers, giữ nguyên cả index của collection rỗng. Chạy lại sau khi rename chỉ xác nhận trạng thái đã hoàn tất. So sánh hash BSON tất cả collection trước/sau, ánh xạ các tên collection được đổi.
- Dùng mã mới sau migration, tránh tiến trình cũ tái tạo collection customers. Cleanup mùa hỗ trợ cả tên collection cũ và mới, chỉ thực hiện khi có đồng ý rõ ràng cho việc xóa metadata trên database thật.

## Kiểm chứng

Build, kiểm thử lớp/học sinh/lịch/đơn/giao dịch; xác nhận schema ref và aggregate dùng Class/classes. Kiểm tra trực tiếp database không còn customers, class count và toàn bộ tài liệu giữ nguyên; populate các quan hệ và truy vấn lịch sử lớp qua API hiện có vẫn hoạt động.

Kết quả thực hiện: Atlas `studio_db` có 1 lớp trong customers và collection classes rỗng đã tạo sẵn. Collection rỗng được giữ dưới tên `classes_before_rename_1795706374490`; customers đổi thành classes với nguyên 1 bản ghi và index. Hash BSON của 37 collection trước/sau xác nhận không đổi tài liệu. Kiểm tra trực tiếp sau cleanup mùa xác nhận không còn customers, 4 tham chiếu lớp qua các model resolve được; API lớp/lịch/tổng hợp giao dịch/Role trả 200 và API danh sách học sinh của lớp trả 200. Các kiểm thử schema, populate và aggregate mới đều qua trong bộ 43 test backend; frontend giữ nguyên các route tương thích.
