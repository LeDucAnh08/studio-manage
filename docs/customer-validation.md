# Kiểm tra dữ liệu khách hàng

Phạm vi là các trang công khai và workspace khách hàng trong ứng dụng hiện có. Không đặt thêm yêu cầu cho trường tìm kiếm tùy chọn, trường chỉ đọc, trường bị khóa hay input nội bộ của admin/thợ.

| Trang/luồng | Quy tắc và thông báo |
| --- | --- |
| Đăng ký | Họ tên không chỉ có khoảng trắng, tối đa 100 ký tự; username 3–40 chữ/số/`._-`; email tùy chọn nhưng đúng định dạng API, tối đa 254; mật khẩu tối thiểu 8 ký tự, tối đa 72 byte UTF-8; nhập lại phải khớp. |
| Đăng nhập | Username và mật khẩu bắt buộc, username tối đa 40; lỗi tài khoản/mật khẩu và giới hạn thử đăng nhập có thông báo. Không áp quy tắc mật khẩu mới lên tài khoản cũ. |
| Hồ sơ khách hàng | Họ tên 1–100 ký tự; email hợp lệ, không xóa trắng email đang có; mật khẩu hiện tại bắt buộc, mật khẩu mới và xác nhận theo quy tắc đăng ký. Lỗi API/email vẫn được giữ để sửa/gửi lại. |
| Đặt concept – chuẩn bị | Tên liên hệ 1–100, điện thoại Việt Nam, số người theo `maxPeople`; size 1–12 ký tự, cao 30–250 cm, nặng 1–350 kg cho từng người khi gói có trang phục; ý tưởng tối đa 4.000; tối đa 10 link, mỗi link HTTPS tối đa 1.000 ký tự, không có username/password trong URL. |
| Đặt concept – xem lại | Kiểm tra lại thông tin chuẩn bị, lịch/thợ thực tế, thời gian tương lai và consent. Chưa chấp thuận điều khoản thì báo lỗi và không gọi checkout. |
| Đặt kỉ yếu | Gói còn khả dụng; lớp 1–120, trường tùy chọn tối đa 160, người liên hệ 1–100, điện thoại tối đa 25 ký tự; thành viên nguyên 1–1.000; địa điểm 1–300; ngày giờ hợp lệ trong tương lai, kết thúc sau bắt đầu và theo thời lượng gói; ghi chú 2.000. Danh sách thành viên kiểm tra từng dòng theo giới hạn tên/điện thoại/số đo/size, không mất dòng đã nhập khi giảm số người. |
| Danh mục thuê | Ngày hợp lệ, ngày trả từ ngày nhận trở đi, nhận từ hôm nay, tối đa 366 ngày; giá nguyên không âm, cận trên không nhỏ hơn cận dưới; bộ lọc để trống vẫn hợp lệ. |
| Đặt thuê | Kiểm tra ngày theo chính sách studio, mẫu/size trong catalog và số lượng nguyên từ 1 đến hàng còn trống; tên liên hệ 1–120, điện thoại hợp lệ, ghi chú tối đa 2.000; consent bắt buộc trước tạo đơn. Draft xem lại được kiểm tra lại trước gửi. |
| Hồ sơ thuê | Yêu cầu thay đổi có lý do 1–1.000; ngày gia hạn sau ngày trả hiện tại; đánh giá 1–5, nhận xét tối đa 2.000. Giữ quy tắc khóa thay đổi sau thanh toán. |
| Form học sinh legacy | Tên 1–100; giới tính hợp lệ; cao 50–250 cm, nặng 10–200 kg, ghi chú tối đa 2.000; chỉ gửi trang phục thuộc lịch lớp. API kiểm tra lại các giá trị và liên kết truy cập. |
| Form thành viên qua token | Tên 1–100; số liên hệ tùy chọn nhưng đúng định dạng, tối đa 25; cao tùy chọn 80–230, nặng tùy chọn 25–250, size theo lựa chọn được cấp. Giữ request ID khi gửi lại cùng thông tin. |
| Form phản hồi công khai | Hai đánh giá ekip/album là số nguyên 1–5; hai nhận xét bắt buộc, mỗi nhận xét tối đa 2.000; điện thoại tùy chọn; cảm nhận và đề xuất tối đa 4.000 mỗi mục. Mọi lỗi rule có thông báo, lỗi server/kết nối giữ nội dung đã nhập. |
| Album kỉ yếu / nhận ảnh | Ghi chú tối đa 2.000; phản hồi bản bàn giao bắt buộc có nội dung, tối đa 2.000 và đúng phiên bản; điểm đánh giá 1–5, nhận xét tối đa 2.000. Không gửi khi bản ảnh đã thay đổi. |
| Hồ sơ/album concept | Đổi lịch phải chọn khung mới còn trống trong tương lai; ghi chú ảnh tối đa 2.000; vòng góp ý phải có ít nhất một góp ý không trống, mỗi góp ý tối đa 2.000; chốt ảnh cần ít nhất một ảnh và consent phí. |
| Các trang giới thiệu, hồ sơ thợ, giá, xác minh email và danh sách đơn | Các lựa chọn/bộ lọc dùng giá trị sẵn có. Không thêm trường bắt buộc giả; lỗi tải/API, liên kết không hợp lệ và dữ liệu hết khả dụng giữ cách thông báo hiện có. |

Số điện thoại được chuẩn hóa bằng cách bỏ dấu cách, ngoặc, dấu chấm và dấu gạch ngang; định dạng chấp nhận là `0` + 9 chữ số hoặc `+84` + 9 chữ số, phần số quốc gia không bắt đầu bằng 0. Không tự sinh thông tin, không đổi snapshot giá/đơn đã có.

Các kiểm thử mới nằm trong `CustomerValidation.test.tsx`, các ca bổ sung trong bộ test form/wizard/album, và `backend/tests/customer-validation.cjs`. HTTP tests dùng model giả và không kết nối database thật. Chạy bằng `yarn test` theo từng workspace; build bằng `yarn build`.

## Kết quả kiểm chứng ngày 14/11/2026

- 194 ca frontend trong 16 file đạt: bộ control chung, đăng ký/đăng nhập/hồ sơ, đặt concept/kỉ yếu/thuê, checkout, hồ sơ đơn và album. Bao gồm trường chưa chạm, dữ liệu draft khôi phục, sửa lỗi, consent và lần nhấn gửi đầu tiên khi rời ô đang sai.
- 23 ca backend đạt với `node --test tests/customer-validation.cjs tests/client-bookings.cjs tests/rental-access.cjs`. HTTP tests dùng model giả để xác nhận dữ liệu sai trả lỗi rõ ràng và không ghi dữ liệu; có ca dữ liệu hợp lệ và trang phục ngoài lịch lớp.
- TypeScript frontend/backend, ESLint các file frontend thay đổi, Prettier và production build đạt. Build còn cảnh báo Browserslist cũ và kích thước chunk hiện có.
- Thử trực tiếp trên `localhost:4001`: đăng ký sai từng trường, form phản hồi thiếu đánh giá và nội dung, bước chuẩn bị concept sai thông tin liên hệ/số đo/link ảnh. Kiểm tra desktop và mobile 390px, focus tới lỗi đầu tiên, sửa lỗi mà không mất dữ liệu, không tràn ngang và không có console error.
- Ảnh kiểm chứng trong `.workflow-tools/customer-validation-register-desktop.jpg`, `customer-validation-register-mobile.jpg`, `customer-validation-feedback-mobile.jpg` và `customer-validation-concept-desktop.jpg`. Log cuối: `.workflow-tools/customer-validation-final-tests.log`, `customer-validation-final-build.log`, `customer-validation-backend-models.log`.
- Không tạo tài khoản, đơn, thanh toán hay gửi email thật trong lượt thử trên trình duyệt. Không đổi cấu hình database/email/SePay.
- Bộ tích hợp booking cũ chưa xác nhận đạt trong môi trường hiện tại (lượt đầu trả 503). Yêu cầu chạy lại bị kiểm duyệt tự động từ chối vì bộ test có `dropDatabase()`; không chạy lại bộ đó. Các kiểm tra API nêu trên đã hoàn tất bằng model giả, không kết nối hay xóa database thật.
