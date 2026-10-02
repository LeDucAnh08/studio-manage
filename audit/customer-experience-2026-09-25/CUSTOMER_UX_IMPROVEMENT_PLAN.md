# Kế hoạch cải tiến UI/UX phía khách hàng — Yume Studio

Ngày đánh giá: 25/09/2026  
Phạm vi: trang giới thiệu, báo giá, concept, danh mục trang phục, đăng ký/đăng nhập và luồng đặt dịch vụ của khách hàng.

## 1. Kết luận điều hành

Phần giao diện công khai đã có nhận diện hình ảnh khá tốt, nhưng trải nghiệm chưa chuyên nghiệp vì hành trình nghiệp vụ bị chia thành nhiều điểm đến rời rạc. Cùng một ý định “đặt lịch” hiện dẫn tới hai kết quả khác nhau: nút ở thanh điều hướng mở trang đăng nhập, trong khi nút ở hero chỉ cuộn tới khối số điện thoại/Facebook. Danh mục trang phục là một trang gần như độc lập, còn tài khoản khách hàng mang cảm giác của một cổng nội bộ hơn là phần tiếp nối tự nhiên của website.

Vấn đề chính không nằm ở việc thiếu hiệu ứng. Vấn đề là khách chưa nhìn thấy một lộ trình rõ ràng từ “xem dịch vụ” đến “gửi yêu cầu”, “được xác nhận”, “chuẩn bị buổi chụp” và “nhận sản phẩm”. Vì vậy, hướng cải tiến nên ưu tiên kiến trúc thông tin, luồng đặt dịch vụ và trạng thái nghiệp vụ trước khi tăng độ bóng bẩy hình ảnh.

## 2. Kết quả audit theo từng bước

| Bước | Màn hình / tác vụ | Sức khỏe | Nhận xét chính |
|---|---|---|---|
| 1 | Trang giới thiệu và hero | Trung bình | Hình ảnh nổi bật, nhưng ba CTA đầu trang cạnh tranh nhau; “Đặt lịch” không có một đích đến duy nhất. |
| 2 | Báo giá / gói dịch vụ | Yếu | Khi chưa có dữ liệu gói, toàn bộ khu vực trở thành khoảng trống lớn; không có empty state hoặc đường dẫn tư vấn thay thế. |
| 3 | Danh mục trang phục & phụ kiện | Trung bình-yếu | Bộ lọc khá rõ nhưng trang bị tách khỏi điều hướng chính, không có luồng chọn món, lưu danh sách hoặc thêm vào yêu cầu đặt dịch vụ. |
| 4 | Đăng ký tài khoản khách hàng | Yếu | Form tối giản nhưng dùng ngôn ngữ và liên kết lẫn với tài khoản nhân sự; chưa có cảm giác đây là một bước trong hành trình mua dịch vụ. |
| 5 | CTA “Đặt lịch chụp” | Yếu | CTA kết thúc tại khối liên hệ thủ công; khách phải tự gọi, gửi email hoặc sang Facebook/Zalo, làm mất ngữ cảnh gói/concept vừa xem. |
| 6 | Portal khách hàng và tạo booking | Chưa xác minh trực tiếp | Không dùng tài khoản thật để tránh thay đổi dữ liệu. Qua cấu trúc hiện tại, portal dùng điều hướng cơ bản và form đặt lịch dài một trang, chưa có wizard, tóm tắt hay chỉ dẫn bước tiếp theo. Cần UAT bằng tài khoản khách thử trước khi nghiệm thu thiết kế. |

Ảnh bằng chứng nằm cùng thư mục với tài liệu này: `01-portfolio-hero.png`, `02-packages-section.png`, `03-rental-catalog.png`, `04-register.png`, `05-booking-cta-destination.png`.

## 3. Kiến trúc trải nghiệm đề xuất

### 3.1. Một website, một shell điều hướng

Mọi trang phía khách hàng dùng chung header, footer, màu sắc, typography và trạng thái đăng nhập.

Thanh điều hướng đề xuất:

- Dịch vụ
- Concept
- Trang phục
- Quy trình
- Báo giá
- Tài khoản
- CTA chính: **Bắt đầu đặt lịch**

Khi khách đã đăng nhập, “Tài khoản” đổi thành avatar/tên khách và CTA chính đổi thành **Theo dõi yêu cầu** nếu đang có dịch vụ chưa hoàn tất.

### 3.2. Chuẩn hóa route và giữ tương thích

| Hiện tại | Đề xuất | Ghi chú |
|---|---|---|
| `/portfolio` | `/` | Giữ redirect từ URL cũ. |
| `#services`, `#gallery`, `#packages` | `/services`, `/concepts`, `/pricing` | Tạo URL có thể chia sẻ và ghi nhớ; landing vẫn có teaser cho từng mục. |
| `/rental-catalog` | `/costumes` | Đưa vào cùng shell website. |
| `/login`, `/register` | `/account/login`, `/account/register` | Tách rõ tài khoản khách hàng; lối vào nhân sự không xuất hiện trong luồng khách. |
| `/account/bookings/new` | `/booking/start` | Cho phép khách bắt đầu trước, yêu cầu đăng nhập ở bước lưu/gửi. |
| `/account/bookings` | `/account/services` | Nhãn “Dịch vụ của tôi” dễ hiểu hơn “Booking của tôi”. Có thể giữ route cũ làm alias. |

### 3.3. Luồng khách hàng mục tiêu

```text
Khám phá dịch vụ
    ↓
Chọn gói hoặc concept
    ↓
Bắt đầu đặt lịch (giữ lại lựa chọn bằng query/state)
    ↓
1. Nhu cầu  →  2. Thời gian & lớp  →  3. Trang phục / tiện ích  →  4. Xác nhận
    ↓
Đăng nhập/đăng ký nhanh nếu chưa có tài khoản
    ↓
Gửi yêu cầu
    ↓
Studio xác nhận → báo giá → đặt cọc → chuẩn bị → chụp → hậu kỳ → bàn giao
```

Nguyên tắc quan trọng: không ép đăng nhập ngay khi khách mới bấm “Đặt lịch”. Hệ thống phải giữ lại gói, concept hoặc trang phục khách đã chọn; đăng nhập chỉ xuất hiện khi cần lưu hoặc gửi yêu cầu.

## 4. Cải tiến nghiệp vụ và tương tác

### 4.1. Tách rõ hai mục tiêu chuyển đổi

- **Nhận tư vấn**: dành cho khách chưa biết chọn gì; mở form ngắn gồm tên, số điện thoại, trường/lớp, số lượng dự kiến và kênh liên hệ mong muốn.
- **Bắt đầu đặt lịch**: dành cho khách đã có nhu cầu; mở wizard đặt dịch vụ.

Không dùng cùng nhãn “Đặt lịch” cho cả đăng nhập, form booking và khối Facebook/Zalo.

### 4.2. Biến form booking thành wizard 4 bước

1. **Nhu cầu**: gói chụp, concept, số người, ngân sách dự kiến.
2. **Thời gian & địa điểm**: ngày mong muốn, khung giờ, trường/lớp, địa điểm; hỗ trợ “chưa chốt ngày”.
3. **Trang phục & tiện ích**: chọn trang phục, makeup, quay phim, album, đạo cụ; hiển thị tạm tính hoặc “cần tư vấn”.
4. **Xác nhận**: tóm tắt toàn bộ lựa chọn, thông tin liên hệ và điều khoản; cho phép quay lại từng bước để sửa.

Yêu cầu UX:

- Hiển thị tiến độ và tự lưu bản nháp.
- Xác thực tại chỗ, thông báo lỗi sát trường dữ liệu.
- Cho phép quay lại mà không mất thông tin.
- Trên mobile có thanh tóm tắt/CTA cố định ở cuối màn hình.
- Sau khi gửi phải có mã yêu cầu, thời gian dự kiến phản hồi và hành động tiếp theo.

### 4.3. Kết nối trang phục với booking

- Mỗi item có CTA **Thêm vào yêu cầu** thay vì chỉ để xem.
- Có danh sách đã lưu và bộ đếm trên header.
- Khi từ trang phục sang booking, giữ `itemId`, size và ngày mong muốn.
- Hiển thị rõ đây là tình trạng tham khảo hay đã được giữ; không dùng từ ngữ khiến khách hiểu nhầm tồn kho đã được khóa.
- Cho phép studio đề xuất sản phẩm thay thế nếu hết size/ngày.

### 4.4. Nâng portal thành “trung tâm dịch vụ”

Trang tổng quan nên trả lời ngay ba câu hỏi: “Đang ở bước nào?”, “Tôi cần làm gì tiếp theo?”, “Khi nào có kết quả?”.

Các khối chính:

- Dịch vụ đang thực hiện, trạng thái và mốc tiếp theo.
- Việc cần làm: bổ sung thông tin, duyệt báo giá, thanh toán, chọn ảnh.
- Lịch sắp tới và người phụ trách.
- Tài liệu: báo giá, hợp đồng, hóa đơn, link ảnh/video.
- Trao đổi theo từng dịch vụ; thông báo toàn cục đặt ở header, không nhúng như một khối lớn trong danh sách booking.

Chi tiết dịch vụ dùng timeline nghiệp vụ nhất quán:

`Yêu cầu mới → Đang tư vấn → Đã chốt phương án → Chờ đặt cọc → Đã xác nhận lịch → Đang hậu kỳ → Chờ duyệt → Đã bàn giao`

Mỗi trạng thái phải có mô tả bằng ngôn ngữ khách hàng và CTA kế tiếp, không chỉ hiển thị mã trạng thái nội bộ.

### 4.5. Empty, loading và error state

- Khu vực chưa có gói: hiển thị “Bảng giá đang được cập nhật” cùng CTA nhận tư vấn; tuyệt đối không để khoảng trống lớn.
- Chưa có booking: giải thích lợi ích tài khoản và CTA bắt đầu đặt dịch vụ.
- Đang tải: skeleton đúng cấu trúc nội dung, tránh spinner toàn trang.
- Lỗi mạng: giữ dữ liệu đã nhập, có nút thử lại và thông điệp cụ thể.
- Không có kết quả trang phục: gợi ý bỏ bớt bộ lọc hoặc liên hệ để studio đề xuất.

## 5. Hệ thống hình ảnh chuyên nghiệp hơn

- Duy trì màu tối và gradient thương hiệu, nhưng giảm số hiệu ứng cạnh tranh cùng lúc; nội dung và CTA phải nổi bật hơn trang trí.
- Dùng một hệ typography, spacing 4/8px, radius và shadow thống nhất cho marketing, auth và portal.
- Thay emoji trong thành phần chức năng bằng bộ icon nhất quán; emoji chỉ dùng khi có chủ đích trong nội dung truyền thông.
- Trang đăng nhập/đăng ký dùng cùng header rút gọn của website, bỏ liên kết “nhân sự” khỏi luồng khách hàng.
- Concept card nên có ảnh thật, tên phong cách, mô tả ngắn, mức giá tham khảo và CTA chọn concept.
- Chuyển động 150–220ms cho phản hồi thao tác; hỗ trợ `prefers-reduced-motion`; không tự chạy chuyển động trang trí gây phân tâm trong bước đặt dịch vụ.
- Bảo đảm focus rõ, điều hướng bàn phím, nhãn form, độ tương phản và vùng chạm tối thiểu 44px.

## 6. Lộ trình triển khai

### Giai đoạn 0 — Chốt nghiệp vụ và đo lường (2–3 ngày)

- Chốt thuật ngữ khách hàng: “dịch vụ”, “yêu cầu”, “đặt lịch”, “báo giá”, “đặt cọc”.
- Chốt trạng thái nghiệp vụ và CTA tương ứng cho từng trạng thái.
- Chốt sơ đồ route, redirect và sự khác nhau giữa “Nhận tư vấn” với “Bắt đầu đặt lịch”.
- Gắn sự kiện analytics nền tảng.

**Tiêu chí hoàn tất:** mọi CTA chính có đúng một đích đến và mỗi trạng thái có hành động kế tiếp rõ ràng.

### Giai đoạn 1 — Sửa điều hướng công khai (1–2 tuần)

- Dùng chung header/footer cho landing, concept, báo giá và trang phục.
- Chuẩn hóa route, breadcrumb/back navigation và giữ redirect URL cũ.
- Sửa khoảng trống báo giá, empty/loading/error state.
- Thêm CTA cố định “Bắt đầu đặt lịch” và bảo toàn ngữ cảnh nguồn.

**Tiêu chí hoàn tất:** khách có thể đi từ bất kỳ trang nội dung nào tới booking và quay lại mà không mất ngữ cảnh.

### Giai đoạn 2 — Booking wizard và xác thực muộn (2–3 tuần)

- Xây wizard 4 bước, autosave và trang xác nhận.
- Tích hợp gói, concept, trang phục và tiện ích.
- Chuyển đăng nhập/đăng ký về cuối luồng gửi yêu cầu.
- Tạo trang thành công có mã yêu cầu và SLA phản hồi.

**Tiêu chí hoàn tất:** luồng chạy được trên desktop/mobile, refresh/back không mất dữ liệu, lỗi được phục hồi an toàn.

### Giai đoạn 3 — Portal khách hàng (2–3 tuần)

- Dashboard theo “việc cần làm”.
- Timeline trạng thái, báo giá, lịch, thanh toán, tài liệu và trao đổi.
- Thông báo toàn cục và deep-link đến đúng dịch vụ.
- Empty state và onboarding lần đầu.

**Tiêu chí hoàn tất:** khách biết trạng thái và hành động tiếp theo trong vòng 5 giây sau khi mở portal.

### Giai đoạn 4 — Polish, accessibility và kiểm thử (1–2 tuần)

- Đồng bộ design tokens/component states.
- Kiểm tra responsive, bàn phím, screen reader, contrast và reduced motion.
- Usability test với 5–7 người dùng đại diện; sửa các điểm rơi lớn.
- Kiểm tra analytics và hiệu năng ảnh.

## 7. Thứ tự ưu tiên

| Mức | Hạng mục | Lý do |
|---|---|---|
| P0 | Chuẩn hóa CTA/route và tách “tư vấn” khỏi “đặt lịch” | Xóa sự mơ hồ lớn nhất trong hành trình. |
| P0 | Empty state cho báo giá và dữ liệu rỗng | Tránh cảm giác website lỗi hoặc chưa hoàn thiện. |
| P0 | Booking wizard, giữ ngữ cảnh và đăng nhập muộn | Tác động trực tiếp tới tỷ lệ gửi yêu cầu. |
| P1 | Kết nối trang phục/concept với booking | Tạo luồng bán thêm và giảm trao đổi thủ công. |
| P1 | Dashboard/timeline portal khách hàng | Giảm câu hỏi hỗ trợ và tăng niềm tin sau khi đặt. |
| P2 | Motion, icon, hình ảnh và microinteraction | Hoàn thiện cảm giác cao cấp sau khi nghiệp vụ đã rõ. |

## 8. Chỉ số đánh giá sau cải tiến

- Tỷ lệ từ CTA chính → bắt đầu booking.
- Tỷ lệ hoàn tất booking và tỷ lệ rơi theo từng bước.
- Thời gian trung vị để gửi một yêu cầu.
- Tỷ lệ khách phải chuyển sang Facebook/Zalo trước khi gửi đủ thông tin.
- Tỷ lệ khách quay lại portal để xem trạng thái.
- Số câu hỏi hỗ trợ kiểu “đơn của em đang ở đâu / bước tiếp theo là gì”.
- Tỷ lệ chọn thêm trang phục, makeup, quay phim hoặc album.

Mục tiêu ban đầu nên lấy dữ liệu hiện tại làm baseline trong 2 tuần, sau đó đặt mục tiêu tăng hoàn tất booking 20–30% và giảm ít nhất 25% các câu hỏi về trạng thái.

## 9. Giới hạn audit

Phần công khai và đăng ký được kiểm tra trực tiếp trên website đang chạy. Portal đăng nhập không được thao tác bằng tài khoản thật vì yêu cầu hiện tại là audit/kế hoạch và không cho phép tạo dữ liệu khách hàng thử. Trước khi triển khai Giai đoạn 3, cần một tài khoản UAT riêng để xác minh đầy đủ dashboard, booking detail, notification và các nhánh lỗi.
