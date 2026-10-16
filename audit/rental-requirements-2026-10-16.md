# Đối chiếu yêu cầu thuê độc lập — 16/10/2026

Trạng thái đối chiếu ban đầu: đã chốt đủ bốn lựa chọn nghiệp vụ với user. Sau khi user yêu cầu bắt đầu, code và kiểm thử đã hoàn thành; kết quả tại [rental-daily-2026-10-16.md](rental-daily-2026-10-16.md). Bảng hiện trạng bên dưới ghi nhận trước triển khai để đối chiếu. Không ghi/seed/reset dữ liệu demo; các thay đổi frontend navbar đang có được giữ nguyên.

## Quyết định đã xác nhận

- Thuê trang phục/phụ kiện không cần booking chụp.
- Bắt đầu giữ hàng khi khách đã đồng ý thuê và cọc được ghi nhận đủ.
- Phí theo ngày lịch Việt Nam UTC+7, nhận/trả đều tính phí; cùng ngày là1, 20–22/10 là3.
- User xác nhận nhập giá/ngày riêng cho đơn mới, giữ giá danh mục và báo giá cũ. Mức giá/ngày chưa khai báo không được coi là0đ hoặc ngầm lấy rentalPrice của cả kỳ để thay.
- Bắt buộc chọn đủ ngày nhận/trả hợp lệ trước khi tải/hiện hàng còn trống; không mặc định hôm nay, kể cả khi vào thẳng /rental/start.
- Ẩn hàng không đủ khả dụng trong khoảng khách chọn, theo mẫu+size+số lượng. Hàng hỏng/sửa/ngừng sử dụng không được tính là có thể thuê.

## Source hiện tại

| Phần | Hiện trạng | Thay đổi cần thiết |
|---|---|---|
| Thuê độc lập | RentalOrder và createRental không cần bookingId; /rental/start → /account/rentals/:id | Giữ luồng sẵn có, không buộc vào wizard chụp |
| Catalog | costumeController.getPublicCatalog chỉ lọc tồn vật lý good>0; không nhận ngày; khi không lọc size có thể hiện cả mẫu không có tồn tốt | Nhận kỳ thuê, chỉ trả size có số lượng đáp ứng toàn kỳ; hết mọi size thì bỏ mẫu khỏi kết quả |
| Khả dụng | rentalAvailability đã xét confirmed/checked_out và lịch chụp chung kho; theo ngày nhận/trả inclusive | Tái sử dụng cùng quy tắc cho catalog và bước chốt; không tạo boolean available toàn cục |
| Giá | rentalController.quote.propose chỉ Σquantity×unitPrice, đơn giá cho cả kỳ; gia hạn nhập finalFee thủ công | Bổ sung giá/ngày và snapshot số ngày/tổng dòng; backend tính, UI hiển thị thống nhất |
| Giữ hàng | Đủ cọc chuyển ready_to_confirm, vẫn chưa giữ tới khi Admin resources.confirm | Chốt giữ tự động khi đồng ý+đủ cọc, dưới transaction khóa chung; kiểm tra lại tồn tại thời điểm chốt |
| Đổi kỳ thuê | NewRentalPage chỉ tải catalog một lần, không biết tồn theo kỳ | Truyền ngày từ catalog vào draft; đổi ngày tải lại và đánh dấu lựa chọn không còn đáp ứng |
| Quá hạn/trả | checked_out quá hạn vẫn giữ tới khi staff nhận trả; hỏng/mất rời tồn good | Giữ cơ chế này; không tự mở hàng khi vừa qua ngày trả dự kiến |

Source chính: backend/src/services/rentalAvailability.ts; backend/src/controllers/rentalController.ts; backend/src/controllers/costumeController.ts; backend/src/models/RentalOrder.ts; backend/src/services/workflowTransactions.ts; frontend/src/pages/RentalCatalogPage.tsx; frontend/src/pages/NewRentalPage.tsx; frontend/src/pages/RentalDetailPage.tsx.

## Ranh giới cần bảo toàn

- Catalog là khả dụng tại thời điểm xem, không phải cam kết giữ hàng. Hai khách chốt cùng chiếc cuối chỉ một bên được giữ. Khóa tài nguyên và Mongo transaction hiện có phải tiếp tục bao phủ cả thuê và chụp.
- Các đơn đã đồng ý dùng snapshot giá/kỳ cũ, không bị nhân thêm số ngày hoặc đổi khi sửa danh mục.
- Cọc bảo đảm tách phí thuê, không tự đặt tỷ lệ cọc/phạt/chiết khấu/cổng thanh toán.
- Nếu thực tế đã nhận cọc nhưng hàng hết trước khi chốt, phải lưu đúng khoản tiền đã nhận và báo nhân viên xử lý/hoàn theo quy trình; không giữ vượt kho hoặc bỏ mất giao dịch tiền chỉ để báo lỗi tồn.
- Chi tiết đơn của người thuê vẫn hiển thị snapshot món đã thuê. Không công khai người thuê hoặc đơn của khách khác qua API khả dụng.
- Trả hàng hỏng/mất là sự kiện thực; không tự coi là hàng tốt. Nhận/trả từng phần chưa nằm trong yêu cầu mới này.

## Tiêu chí cần kiểm khi triển khai

1. Một khách chưa có lịch chụp vẫn tạo được đơn thuê độc lập.
2. Một ngày =1; 20–22/10 =3; qua tháng/năm đúng; ngày không hợp lệ hoặc ngày trả trước nhận bị từ chối.
3. Tổng phí bằng đơn giá/ngày × lượng × ngày; tăng kỳ thuê tăng phí; backend không tin tổng tiền từ client.
4. Mẫu có5 bộ, đã giữ2 trong kỳ thì còn3; hết sizeM nhưng sizeL còn thì chỉ sizeL còn thuê được.
5. Các giữ rải trên nhiều ngày phải lấy lượng nhỏ nhất còn trống trong toàn kỳ; không cộng tất cả đơn chồng kỳ thành một lần trừ sai.
6. Chưa đồng ý/chưa đủ cọc chưa giữ; vừa đủ điều kiện thì giữ hoặc báo xung đột đúng. Thuê và chụp đồng thời không vượt tồn.
7. Hàng hết trong20–22 không hiện cho người khác thuê cùng kỳ; kỳ khác còn trống vẫn hiện. Không lộ danh tính khách giữ.
8. Đổi ngày khiến món không còn đủ phải báo và chặn gửi/xác nhận; không âm thầm đổi size/lượng hoặc xóa lựa chọn.
9. Quá hạn chưa trả tiếp tục không khả dụng; trả tốt giải phóng, hỏng/mất không mở lại tồn tốt.
10. Báo giá cũ/đơn đang chạy vẫn giữ phí lịch sử; retry không nhân đôi cọc hay đơn.
11. Thiếu một hoặc cả hai ngày: không gọi API khả dụng, không hiện sản phẩm; bộ chọn ngày vẫn dùng được ở catalog/form, không rơi vào thông báo hết hàng giả.
12. Xóa bộ lọc phụ giữ kỳ thuê. CTA, đăng nhập, draft và reload giữ ngày; kết quả tải kỳ cũ không ghi đè khi người dùng vừa đổi kỳ.

## Các lựa chọn đã chốt

- Giữ hàng sau xác nhận+đủ cọc; ngày tính phí bao gồm nhận/trả; giá/ngày riêng; bắt buộc chọn ngày trước danh sách. Không còn câu hỏi cấu hình nào đang chờ trong nhóm này.
- Chỉ có hai consumer production getPublicCatalog: RentalCatalogPage và NewRentalPage. CustomerCatalogCard cần truyền thêm ngày sang form; không áp yêu cầu ngày vào API danh mục loại hoặc kho staff.

Thứ tự triển khai: mục13 trong IMPLEMENTATION_PLAN.md. Không chạy harness trên studio_project_demo. Tài liệu này ghi yêu cầu đã thống nhất; kết quả code/kiểm thử được ghi riêng trong biên bản triển khai liên kết ở đầu.
