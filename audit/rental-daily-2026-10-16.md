# Kiểm chứng triển khai thuê theo ngày — 16/10/2026

Đã triển khai nghiệp vụ thuê trang phục/phụ kiện độc lập, chọn kỳ thuê trước danh mục, tính giá theo ngày và tự giữ hàng sau xác nhận + đủ cọc. Kết quả dưới đây phân biệt kiểm thử chức năng tự động với các bước đã thao tác trên trình duyệt. Không seed/reset hoặc ghi dữ liệu nghiệp vụ vào `studio_project_demo`; các kiểm thử có ghi dữ liệu chỉ dùng database test riêng.

## Phạm vi đã triển khai

- `rentalDailyPrice` riêng, có thể để trống để báo giá. Không coi giá chưa khai báo là 0đ hoặc lấy `rentalPrice` cũ thay thế. Staff vẫn xem/sửa giá cũ riêng; không tính lại các đơn và báo giá lịch sử.
- Ngày lịch Việt Nam UTC+7, tính cả ngày nhận và trả; cùng ngày là 1, tối đa 366 ngày. Server tính phí bằng đơn giá/ngày × số lượng × số ngày và lưu snapshot chế độ giá, số ngày, đơn giá trong báo giá.
- Catalog và form không mặc định ngày, không tải/hiện hàng trước khi đủ kỳ hợp lệ. URL, CTA, bộ lọc phụ, bản nháp và đăng nhập giữ kỳ thuê. Đổi kỳ phải tải lại, bỏ phản hồi cũ và kiểm tra lại lựa chọn/số lượng.
- Khả dụng lấy lượng thấp nhất còn trống trong toàn kỳ theo mẫu–size, chỉ tính tồn tốt, trừ cả đơn thuê và lịch chụp. Hết mọi size thì ẩn mẫu; hàng quá hạn chưa trả tiếp tục chiếm tồn.
- Đơn mới theo ngày tự giữ hàng khi khách đồng ý và cọc được ghi nhận đủ, dưới transaction/khóa tài nguyên chung. Cọc bằng 0 giữ khi đồng ý. Cạnh tranh chiếc cuối không được giữ vượt kho. Nếu thực nhận tiền nhưng không còn hàng, vẫn lưu khoản thu và giao dịch, báo `reservationIssue` để studio xử lý giữ lại hoặc hủy/hoàn theo quy trình.
- Gia hạn đơn theo ngày tính lại toàn kỳ bằng đơn giá đã chốt, lưu lịch sử báo giá và kiểm tra lại khả dụng. Đơn legacy giữ phí cả kỳ và quy trình xác nhận thủ công.

## Kiểm thử tự động

| Kiểm tra                           | Kết quả                  | Phạm vi bằng chứng                                                                                                                                          |
| ---------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Vitest đầy đủ             | **119/119 đạt, 18 file** | Bao gồm catalog/date helper, form/draft/login, giới hạn số lượng, tính tiền và các regression hiện có                                                       |
| Backend contract                   | **36/36 đạt**            | Parser ngày, giá/ngày nullable/positive, catalog theo kỳ, tồn theo ngày/size và các contract liên quan                                                      |
| `ops/tests/rental-audit.cjs`       | **9/9 đạt**              | Hành trình vận hành cũ với fixture legacy khai báo rõ, giữ cách tính giá cả kỳ                                                                              |
| `ops/tests/rental-daily-audit.cjs` | **9/9 đạt**              | DB test riêng; giá/ngày, snapshot/gia hạn, cọc từng phần tới đủ cọc, giữ hàng, cạnh tranh thuê/chụp, bảo toàn khoản thu khi thiếu hàng và retry/idempotency |
| TypeScript frontend và backend     | **Đạt**                  | Không có lỗi kiểu                                                                                                                                           |
| ESLint phạm vi thay đổi            | **Đạt**                  | Kiểm tra tập file được sửa                                                                                                                                  |
| Prettier và `git diff --check`     | **Đạt**                  | Định dạng và khoảng trắng trong phạm vi thay đổi                                                                                                            |
| Vite production build              | **Đạt**                  | Có cảnh báo Browserslist và circular chunk đã tồn tại; không có lỗi build                                                                                   |
| Playwright rental E2E spec         | **Chưa chạy**            | Đã cập nhật spec theo contract mới, kiểm tra cú pháp/định dạng đạt; không coi là E2E trình duyệt đã đạt                                                     |

Các Mongo integration ở trên chứng minh hành trình chức năng request → quote → deposit → hold cùng các nhánh xung đột và legacy. Đây là bằng chứng tự động, không thay cho thao tác thủ công toàn bộ hành trình trên trình duyệt.

## Kiểm tra trình duyệt với API thật

Preview kiểm tra dùng frontend `4020`, API `5020` và database riêng `studio_rental_ui_audit`. Không dùng database demo cần giữ. Các bước đã quan sát:

| Tình huống                                 | Kết quả quan sát                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Mở catalog chưa chọn ngày                  | Không hiện sản phẩm; bộ chọn ngày luôn thấy được                                       |
| Chọn nhận 17/10, trả 19/10/2026            | Hiện kỳ thuê 3 ngày, tính cả ngày nhận/trả                                             |
| Chọn mẫu 125.000đ/ngày, số lượng 2         | Form/preview hiển thị phí thuê 750.000đ                                                |
| Một mẫu đã được giữ hết trong kỳ           | Mẫu hết khả dụng không xuất hiện trong catalog                                         |
| Mẫu chưa có giá/ngày, giá cũ 900.000đ      | Hiện “Liên hệ báo giá”, không dùng 900.000đ làm giá/ngày                               |
| Xóa bộ lọc phụ                             | Ngày nhận/trả vẫn được giữ                                                             |
| Catalog → CTA → form → xem lại → đăng nhập | Kỳ thuê và lựa chọn được khôi phục qua luồng                                           |
| Gửi yêu cầu                                | Đã gửi vào database test riêng; không tạo đơn demo                                     |
| Staff mở trình sửa giá                     | Thấy giá cũ 900.000đ và trường giá/ngày riêng đang trống; hủy form, không lưu thay đổi |
| Mobile catalog 360px, form 390px           | Không tràn ngang toàn trang                                                            |
| Tab customer trong các bước đã kiểm        | Không ghi nhận lỗi JavaScript                                                          |

Phạm vi browser dừng ở tạo yêu cầu và kiểm tra trình sửa giá. Không tuyên bố đã thao tác toàn bộ báo giá, nhận cọc, giao–trả và hoàn tiền bằng browser trong đợt này; các nhánh đó được kiểm bằng Mongo integration ở bảng trên.

Ảnh bằng chứng đã lưu:

- [Catalog desktop](screenshots/rental-daily-catalog-desktop.jpg)
- [Catalog mobile](screenshots/rental-daily-catalog-mobile.jpg)
- [Form mobile](screenshots/rental-daily-form-mobile.jpg)
- [Trình sửa giá staff](screenshots/rental-daily-staff-price.jpg)

## Môi trường bàn giao và giới hạn cuối đợt kiểm

- Sau khi plugin tải lại, kết nối điều khiển trình duyệt đóng. Kết quả đóng tab QA, reset viewport và mở tab bàn giao ở preview thật **chưa xác minh được**; không coi các thao tác này đã hoàn tất.
- Đã khôi phục Mongo trực tiếp từ cùng đường dẫn `.workflow-tools/demo-mongo-data`, không chạy launcher demo, seed hoặc reset. Backend preview `5002` và frontend `4013` đã hoạt động lại; health API và `http://127.0.0.1:4013/costumes` đều trả HTTP 200.
- Kiểm tra chỉ đọc trên preview thật: `/api/public/costumes` thiếu ngày trả HTTP 400; kỳ 20–22/10/2026 trả 21 mặt hàng, `rentalDays=3`, 0 mặt hàng đã khai báo giá/ngày. Vì không tự điền giá/ngày cho dữ liệu hiện có, các mẫu đó hiện “Liên hệ báo giá”. Không ghi dữ liệu trong các bước đối chiếu này.
- Database test browser `studio_rental_ui_audit` đã được dọn sau khi Mongo hoạt động lại, có guard đúng localhost cổng 27029, tên database và replica set `rs0`. Các process API/frontend cô lập `5020`/`4020` đã dừng. Bốn ảnh bằng chứng đều còn; ảnh catalog 360px cuối cùng đã lưu trước khi browser transport đóng.
- Các sửa navbar đã có từ trước được giữ nguyên. Chưa commit/push hoặc deploy trong đợt triển khai nghiệp vụ này.

Tài liệu liên quan: [yêu cầu đã chốt](rental-requirements-2026-10-16.md), [đặc tả](../SPEC-rental-orders.md), [kế hoạch](../IMPLEMENTATION_PLAN.md), [hướng dẫn vận hành](../RENTAL_RELEASE.md).
