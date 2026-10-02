# Kế hoạch triển khai nghiệp vụ — YUME Studio Management

> Phạm vi đồ án: số hóa **hai dịch vụ chụp ảnh kỷ yếu và cho thuê trang phục, phụ kiện** trên cùng một hệ thống web. Dữ liệu khách hàng, lịch, kho và thu chi cần liên kết để studio giảm thao tác thủ công và khách theo dõi được dịch vụ của mình.

## 1. Nhóm người dùng và chức năng

| Nhóm | Chức năng chính |
|---|---|
| Khách hàng | Đăng ký/đăng nhập; xem ảnh tham khảo, tìm hiểu và so sánh gói chụp; cập nhật thông tin lớp, thành viên và kích cỡ trang phục; gửi yêu cầu chụp hoặc thuê; theo dõi lịch, tiến độ, thanh toán; yêu cầu thay đổi/gia hạn và đánh giá dịch vụ |
| Admin/Sale | Quản lý khách hàng, gói chụp và danh mục thuê; xét duyệt yêu cầu, tư vấn/báo giá, xếp lịch, phân công nhân sự, theo dõi thực hiện và xử lý yêu cầu thay đổi |
| Nhân viên studio | Xem việc được phân công; cập nhật tiến độ chụp/hậu kỳ, giao nhận và tình trạng trang phục, phụ kiện |
| Kế toán/Admin | Ghi nhận thu chi, cọc/hoàn cọc, phụ phí và công nợ; xem báo cáo doanh thu, hiệu quả khai thác kho |

## 2. Hai luồng nghiệp vụ chính

**Chụp ảnh kỷ yếu:** Khách xem/so sánh gói và ảnh tham khảo → gửi yêu cầu, thông tin lớp/thành viên/kích cỡ → studio duyệt, báo giá/hợp đồng và kiểm tra lịch/nguồn lực → khách xác nhận → studio phân công, thực hiện, hậu kỳ và bàn giao → khách đánh giá.

**Cho thuê trang phục, phụ kiện:** Khách lọc theo loại, kích cỡ, giá → chọn sản phẩm, số lượng, ngày nhận–trả và gửi yêu cầu → studio kiểm tra số lượng khả dụng, tư vấn điều kiện thuê → khách xác nhận, studio ghi nhận cọc và giao hàng → khách có thể yêu cầu thay đổi/gia hạn → nhận trả, kiểm tra tình trạng, tính phụ phí hoặc hoàn cọc → khách đánh giá.

Khách xem được trạng thái xử lý, lịch/tiến độ và các khoản đã thanh toán của từng dịch vụ. Studio có lịch sử để tra cứu yêu cầu, lần thuê, giao nhận và khoản thu liên quan.

### Quy tắc nghiệp vụ cốt lõi

- Duyệt yêu cầu chỉ là chấp nhận xử lý; lịch chụp hoặc đơn thuê chỉ được xác nhận sau khi studio kiểm tra khả năng đáp ứng và khách đồng ý điều kiện dịch vụ.
- Một nhân sự hoặc trang phục/phụ kiện không được phân bổ vượt khả năng đáp ứng trong cùng khoảng thời gian. Tồn khả dụng tính theo **sản phẩm, kích cỡ, số lượng và tình trạng sử dụng**, trừ cả đơn thuê lẫn nhu cầu của buổi chụp.
- Giá, số lượng, thời gian thuê và điều khoản đã chốt được lưu theo từng đơn; thay đổi danh mục sau đó không làm đổi giao dịch cũ.
- Khi trả muộn, hư hỏng hoặc mất sản phẩm, studio ghi nhận phụ phí; tiền cọc, hoàn cọc và công nợ phải gắn với đúng đơn và được đối chiếu khi hoàn tất.
- Khách chỉ xem dữ liệu của mình; nhân viên và kế toán chỉ thao tác trong phạm vi được phân quyền. Yêu cầu bị từ chối/hủy không tiếp tục chiếm lịch hoặc tồn kho.

## 3. Các mốc triển khai

| Mốc | Nghiệp vụ cần hoàn thành | Kết quả nghiệm thu |
|---|---|---|
| 1. Khám phá và tạo yêu cầu | Tài khoản khách; gói chụp/ảnh tham khảo; hồ sơ lớp/thành viên/kích cỡ; danh mục thuê có lọc; gửi yêu cầu chụp hoặc thuê | Khách tạo và theo dõi được cả hai loại yêu cầu; studio nhìn thấy thông tin cần xử lý |
| 2. Tiếp nhận và chốt dịch vụ | Studio duyệt/từ chối, tư vấn/báo giá, lập hợp đồng chụp, kiểm tra lịch nhân sự và kho theo thời gian; xác nhận lịch chụp hoặc thời gian thuê | Chỉ xác nhận dịch vụ khi đủ nguồn lực; không trùng lịch hoặc vượt tồn khả dụng |
| 3. Thực hiện và giao nhận | Phân công chụp/hậu kỳ, cập nhật tiến độ/bàn giao; xuất kho, giao, nhận trả, cập nhật tình trạng; xử lý yêu cầu thay đổi/gia hạn | Khách theo dõi được tiến độ; studio tra cứu được lịch sử chụp, thuê và giao nhận |
| 4. Thanh toán và phát sinh | Ghi nhận cọc, thanh toán, hoàn cọc, phụ phí trả muộn/hư hỏng/mất, thu chi và công nợ | Mỗi khoản tiền gắn đúng dịch vụ; công nợ và số tiền cần hoàn/thu thêm rõ ràng |
| 5. Báo cáo và đánh giá | Khách đánh giá; studio xem doanh thu theo dịch vụ, lịch chụp, tình hình khai thác trang phục/phụ kiện | Trình diễn được hai hành trình từ yêu cầu đến hoàn tất cùng báo cáo cơ bản |

Thiết kế cơ sở dữ liệu, giao diện theo vai trò, xác thực/phân quyền, kiểm thử và triển khai được thực hiện theo các mốc trên. Nghiệm thu bằng kịch bản thực tế của studio, gồm cả trường hợp thiếu hàng, trùng lịch, trả muộn và yêu cầu thay đổi.

## 4. Hiện trạng và ưu tiên

Hệ thống hiện có quản lý khách/lớp, gói chụp, lịch, hợp đồng, danh mục trang phục cơ bản, thu chi và feedback; khách đã có luồng gửi yêu cầu chụp. Các phần còn thiếu rõ nhất là **hồ sơ lớp trong tài khoản khách, so sánh gói, kiểm tra trùng lịch, kho/đơn thuê, giao nhận–hoàn cọc và tài chính gắn từng dịch vụ**.

Ưu tiên tiếp theo: (1) thống nhất dữ liệu lớp/thành viên/kích cỡ và danh mục thuê; (2) hoàn thiện hai loại yêu cầu; (3) kiểm tra lịch/kho trước khi xác nhận; (4) khép kín giao nhận, cọc/phụ phí và báo cáo.

## 5. Quyết định nghiệp vụ cần chốt

- Trang phục dùng cho buổi chụp và đơn thuê có dùng chung một kho không; khi nào được xem là đang chiếm hàng?
- Đơn vị quản lý tồn: từng sản phẩm riêng hay số lượng theo mẫu và kích cỡ? Tình trạng nào được phép cho thuê?
- Quy định cọc, gia hạn, trả muộn, hư hỏng, mất sản phẩm và quyền miễn/điều chỉnh phụ phí.
- Thông tin bắt buộc khi chốt lịch chụp, đơn thuê và khi bàn giao/nhận trả.

## 6. Ngoài phạm vi chính

Cổng thanh toán trực tuyến, hoàn tiền tự động, marketplace nhiều studio, ứng dụng di động riêng, kế toán thuế và quản trị nhân sự đầy đủ. Đồ án tập trung **ghi nhận và quản lý nghiệp vụ** thanh toán/cọc bằng quy trình studio thực tế.

## 7. Tiến độ kiểm chứng ngày 02/10/2026

Đã triển khai và kiểm thử luồng chụp ảnh: wizard 3 bước có bản nháp qua đăng nhập; so sánh tối đa 3 gói; hồ sơ theo vai trò; danh sách thành viên/kích cỡ và link nhập riêng; báo giá có phiên bản và đồng ý của khách; ghi nhận cọc/thanh toán/hoàn tiền; giữ lịch nhân sự và trang phục theo mẫu–size–số lượng bằng giao dịch MongoDB; thay đổi/hủy có đề xuất và xác nhận; bàn giao Drive, chỉnh sửa theo phiên bản, nghiệm thu và đánh giá.

Duyệt tiếp nhận vẫn độc lập với xác nhận dịch vụ. Nghiệm thu chưa thanh toán đủ chỉ chuyển sang trạng thái đã nghiệm thu; hoàn tất yêu cầu đối soát tiền. Các đường cập nhật lịch và thu chi cũ đã được chặn khi thao tác sẽ phá lịch sử hoặc bỏ qua quy tắc hồ sơ mới. Lịch cũ thiếu phân bổ có biểu mẫu đối soát theo size.

Kiểm chứng local: 32 kiểm thử backend, 14 frontend, 15 kiểm thử audit nghiệp vụ và 2 hành trình trình duyệt đều đạt; TypeScript hai ứng dụng và build frontend đạt. Biên bản: `audit/workflow-2026-10-02.md`.

Các bước còn lại theo kế hoạch:

1. Hoàn thiện đơn thuê độc lập: yêu cầu thuê, xác nhận, giao–nhận trả, gia hạn và tính phát sinh; dùng chung quy tắc khả dụng kho với lịch chụp.
2. Bổ sung báo cáo theo dịch vụ và hiệu quả khai thác kho sau khi dữ liệu đơn thuê được khép kín.
3. Nghiệm thu trên dữ liệu studio và triển khai có kiểm soát theo `WORKFLOW_RELEASE.md`: backup, replica set, đối soát lịch cũ và cấu hình trước khi bật workflow. Chưa triển khai production.
