# Kế hoạch triển khai nghiệp vụ — YUME Studio Management

> Phạm vi đồ án: số hóa **hai dịch vụ chụp ảnh kỷ yếu và cho thuê trang phục, phụ kiện** trên cùng một hệ thống web. Dữ liệu khách hàng, lịch, kho và thu chi cần liên kết để studio giảm thao tác thủ công và khách theo dõi được dịch vụ của mình.

> Môi trường đồ án đã chốt: triển khai và nghiệm thu trên demo local bền vững, dùng dữ liệu giả lập. Không cần staging, production, database studio thật hay chữ ký của studio để tiếp tục. Hướng dẫn chạy: DEMO_LOCAL.md. Các đoạn nghiệm thu studio/rollout VPS ở tiến độ cũ chỉ còn là lịch sử và phương án mở rộng.

## 1. Nhóm người dùng và chức năng

| Nhóm | Chức năng chính |
|---|---|
| Khách hàng | Đăng ký/đăng nhập; xem ảnh tham khảo, tìm hiểu và so sánh gói chụp; cập nhật thông tin lớp, thành viên và kích cỡ trang phục; gửi yêu cầu chụp hoặc thuê; theo dõi lịch, tiến độ, thanh toán; yêu cầu thay đổi/gia hạn và đánh giá dịch vụ |
| Admin/Sale | Quản lý khách hàng, gói chụp và danh mục thuê; xét duyệt yêu cầu, tư vấn/báo giá, xếp lịch, phân công nhân sự, theo dõi thực hiện và xử lý yêu cầu thay đổi |
| Nhân viên studio | Xem việc được phân công; cập nhật tiến độ chụp/hậu kỳ, giao nhận và tình trạng trang phục, phụ kiện |
| Kế toán/Admin | Ghi nhận thu chi, cọc/hoàn cọc, phụ phí và công nợ; xem báo cáo doanh thu, hiệu quả khai thác kho |

## 2. Hai luồng nghiệp vụ chính

**Chụp ảnh kỷ yếu:** Khách xem/so sánh gói và ảnh tham khảo → gửi yêu cầu, thông tin lớp/thành viên/kích cỡ → studio duyệt, báo giá/hợp đồng và kiểm tra lịch/nguồn lực → khách xác nhận → studio phân công, thực hiện, hậu kỳ và bàn giao → khách đánh giá.

**Cho thuê trang phục, phụ kiện:** Khách chọn ngày nhận–trả → xem/lọc sản phẩm và kích cỡ khả dụng trong toàn kỳ → chọn số lượng, xem phí theo ngày và gửi yêu cầu → studio tư vấn/báo giá → khách đồng ý, studio ghi nhận đủ cọc thì hệ thống giữ hàng → giao hàng → khách có thể yêu cầu thay đổi/gia hạn → nhận trả, kiểm tra tình trạng, tính phụ phí hoặc hoàn cọc → khách đánh giá.

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

Thiết kế cơ sở dữ liệu, giao diện theo vai trò, xác thực/phân quyền, kiểm thử và triển khai được thực hiện theo các mốc trên. Nghiệm thu đồ án bằng kịch bản nghiệp vụ trên dữ liệu demo local, gồm cả trường hợp thiếu hàng, trùng lịch, trả muộn và yêu cầu thay đổi.

## 4. Hiện trạng ban đầu và ưu tiên

Hệ thống hiện có quản lý khách/lớp, gói chụp, lịch, hợp đồng, danh mục trang phục cơ bản, thu chi và feedback; khách đã có luồng gửi yêu cầu chụp. Các phần còn thiếu rõ nhất là **hồ sơ lớp trong tài khoản khách, so sánh gói, kiểm tra trùng lịch, kho/đơn thuê, giao nhận–hoàn cọc và tài chính gắn từng dịch vụ**.

Ưu tiên tiếp theo: (1) thống nhất dữ liệu lớp/thành viên/kích cỡ và danh mục thuê; (2) hoàn thiện hai loại yêu cầu; (3) kiểm tra lịch/kho trước khi xác nhận; (4) khép kín giao nhận, cọc/phụ phí và báo cáo.

## 5. Quy tắc nghiệp vụ đã triển khai

- Chụp và thuê dùng chung một kho, kiểm tra nguồn lực bằng transaction/resource lock. Ngày nhận và ngày trả đều giữ hàng; thuê quá hạn chưa trả vẫn giữ hàng.
- Tồn quản lý theo mẫu, kích cỡ, số lượng và tình trạng; chỉ tồn tốt được xác nhận cho thuê. Lịch cũ thiếu phân bổ cần đối soát, không tự coi là không giữ hàng.
- Giá/cọc/kỳ chốt theo báo giá có phiên bản. Gia hạn/hủy/phụ phí qua đề xuất và đồng ý; mức phí do người phụ trách nhập trong demo, không tự đặt chính sách phạt của studio.
- Chốt chụp cần thành viên/size, cọc, thời gian/nhân sự và phân bổ kho. Giao thuê cần phí+cọc; nhận trả đủ tốt/hỏng/mất; hoàn tất cần đối soát tiền và bằng chứng đồng ý/nghiệm thu.

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

## 8. Tiến độ ngày 05/10/2026 — đơn thuê

Đã triển khai đơn thuê độc lập, wizard có bản nháp qua đăng nhập, danh sách và chi tiết theo vai trò; báo giá chốt kỳ/giá/cọc; xác nhận giữ hàng; giao và nhận trả tốt/hỏng/mất; gia hạn có kiểm tra lại, rút yêu cầu/hủy trước giao; phụ phí cần đồng ý; đối soát thu/hoàn cọc và đánh giá. Kho dùng chung với lịch chụp bằng cùng transaction/resource lock. Hàng quá hạn chưa trả vẫn giữ kho; trước giao hàng và trước bắt đầu chụp đều kiểm tra lại khả dụng.

Đơn thuê mặc định mở cùng cổng khách hàng, không có cờ bật/tắt riêng. Đặc tả: `SPEC-rental-orders.md`; vận hành: `RENTAL_RELEASE.md`; kiểm chứng: `audit/rental-2026-10-05.md`.

Bước còn lại là báo cáo doanh thu theo dịch vụ/hiệu quả kho, nghiệm thu với studio và rollout theo các điều kiện hạ tầng đã ghi. Không đánh dấu toàn bộ dự án hoàn tất.

## 9. Tiến độ ngày 05/10/2026 — báo cáo

Đã bổ sung Quản lý → Báo cáo dịch vụ và kho cho admin/kế toán: lọc kỳ ngày Việt Nam; tiền thu/chi theo liên kết chụp/thuê/chưa phân loại; giá trị nghiệm thu/đối soát và phí hủy; giá trị dịch vụ/công nợ/hoàn tiền/cọc bảo đảm hiện tại; đối chiếu phân trang tới hồ sơ. Không tính cọc thuê vào giá trị dịch vụ và không gọi dòng tiền là lợi nhuận. Các đề xuất chưa đồng ý không làm tăng giá trị.

Kho có phân bổ mẫu–size theo món × ngày, peak/ngày vượt tồn và tìm kiếm/phân trang; lịch chụp chỉ đếm nguồn Schedule; đơn trả dùng ngày giao/trả thực tế; quá hạn chưa trả vẫn giữ hàng. Mẫu số là tồn tốt hiện tại; dữ liệu legacy thiếu hoặc sai có cảnh báo và không hiển thị tỷ lệ chắc chắn.

9 kiểm thử báo cáo MongoDB, 14 frontend và cả 4 hành trình Chrome đã đạt; TypeScript, lint phạm vi thay đổi và build đạt. Đặc tả: SPEC-service-reports.md; hướng dẫn/kịch bản nghiệm thu: REPORTS_RELEASE.md; audit: audit/reports-2026-10-05.md.

Còn nghiệm thu hai hành trình và báo cáo bằng dữ liệu studio, sau đó rollout hạ tầng/cấu hình theo WORKFLOW_RELEASE.md và RENTAL_RELEASE.md. Chưa deploy hoặc thay đổi database production; chưa đánh dấu toàn bộ dự án hoàn tất.

## 10. Tiến độ ngày 05/10/2026 — chuẩn bị nghiệm thu và rollout

Đã bổ sung công cụ audit chỉ đọc cho cả hai dịch vụ: topology/index, lịch nhân sự và kho dùng chung, mirror hồ sơ–lịch, đối chiếu payment–Transaction, đồng ý/hủy/hoàn tất, giao–nhận trả và cảnh báo công nợ/quá hạn. Có xuất bằng chứng JSON mới, giới hạn ví dụ và không trả dữ liệu cá nhân/credential; không tự sửa dữ liệu hoặc tạo index. Đặc tả: SPEC-studio-readiness.md.

Đã truyền portal/rental flags rõ qua Docker build args, bổ sung rental flag trong replica overlay và ghi đúng ưu tiên root .env/backend .env; giữ mặc định portal hiện có. Sửa rollback để API lịch/kho cũ vẫn bảo vệ nguồn lực chụp khi cả hai flag tắt và không còn đơn thuê giữ hàng. Đã xử lý lỗi lint/format làm quality gate trước đó thất bại.

Kiểm chứng local: 32 backend + 17 frontend + 54 audit + 4 Chrome E2E = 107 kiểm thử đều đạt; TypeScript, full lint/format và frontend production build đạt. Compose parse/merge đạt; chưa build/start Docker. Biên bản: audit/release-readiness-2026-10-05.md.

Bộ nghiệm thu STUDIO_ACCEPTANCE.md có 21 kịch bản hai hành trình/báo cáo/RBAC/rollback, gate backup–restore/transaction và bảng ký xác nhận. Chưa chọn database studio/staging nên các kết quả thật vẫn để chưa thực hiện. Bước còn lại: audit bản sao studio, xử lý findings, UAT và ký nghiệm thu, sau đó rollout có kiểm soát. Chưa triển khai production hoặc đánh dấu toàn bộ dự án hoàn tất.

## 11. Tiến độ ngày 05/10/2026 — triển khai demo đồ án

Theo phạm vi người thực hiện đã chốt, các yêu cầu staging/production/database studio thật/sign-off ở tiến độ trước không còn là điều kiện bắt buộc. Đã triển khai ứng dụng bản build trên http://localhost:4001, API cổng 5002, MongoDB replica set rs0 cổng 27029/database studio_project_demo, lưu bền vững trong workspace. Chạy/dừng/trạng thái bằng node ops/demo.cjs hoặc các lệnh yarn demo, yarn demo:stop, yarn demo:status; hướng dẫn DEMO_LOCAL.md.

Đã tạo tài khoản theo 5 vai trò, gói/danh mục/kho mẫu và ba hồ sơ thông qua API: chụp hoàn tất, thuê hoàn tất có hoàn cọc, lịch chụp sắp tới. Hai dịch vụ có 6 giao dịch liên kết. Readiness thực tế 0 blocker; cảnh báo còn thu 750.000đ của lịch sắp chụp là nghiệp vụ hợp lệ. Seed/scenario chạy lại không nhân đôi hoặc ghi đè dữ liệu. Snapshot 16 collection giữ nguyên qua stop/start.

Chrome kiểm tra 8 nội dung trên bản build cho 5 vai trò, có báo cáo mobile 360px: đạt, không có lỗi JavaScript hoặc tràn toàn trang. Audit launcher đã xử lý cấu hình payment/webhook kế thừa, trạng thái process bất thường và kịch bản mẫu bị ngắt qua ngày; dữ liệu vẫn được giữ. Biên bản: audit/demo-local-2026-10-05.md. Kết quả 107 regression trước vẫn được ghi riêng, không thay bằng smoke demo.

Mốc triển khai local đã hoàn thành và ứng dụng được giữ chạy để trình diễn. Các dòng UAT thủ công trong STUDIO_ACCEPTANCE.md dùng để tự nghiệm thu khi thuyết trình; không là điều kiện ngăn tiếp tục code. Các tích hợp Google/Telegram/thanh toán thật và phương án VPS là ngoài phạm vi demo hiện tại. Không còn chờ môi trường staging/prod hoặc dữ liệu studio thật.

## 12. Tiến độ ngày 06/10/2026 — dữ liệu giả lập phong phú

Đã bổ sung dữ liệu tiếng Việt theo yêu cầu: 20 lớp/802 thành viên, 20 hồ sơ chụp/17 lịch, 24 đơn thuê, 120 giao dịch, 8 đánh giá; thêm danh mục, 5 gói, 18 mẫu trang phục/phụ kiện, 3 mùa và 27 tài khoản. Có lịch sử hoàn tất và hồ sơ còn mở ở nhiều trạng thái để trình diễn công nợ, hậu kỳ, giao nhận và hoàn cọc.

Seed dùng ID ổn định, transaction và khóa tài nguyên chung. 44 bản ghi trước đó giữ nguyên; chạy lại tạo 0 bản ghi và giữ nguyên 17 collection/1.174 bản ghi. Đối soát thực tế 0 blocker; các khoản còn thu, hoàn cọc, chờ quyết toán và chi vận hành là tình huống mẫu có chủ ý. Lệnh `yarn demo:seed`, hướng dẫn DEMO_LOCAL.md, biên bản audit/realistic-seed-2026-10-06.md.

9 kiểm tra Chrome trên dữ liệu mới và 8 kiểm tra hồ sơ demo ban đầu đạt, 0 lỗi JavaScript; báo cáo 360px không tràn toàn trang. Bộ lọc mặc định chọn mùa hiện tại, có thể chuyển mùa để xem các lớp còn lại.

## 13. Quy tắc thuê theo ngày đã chốt — 16/10/2026

Capability hiện có: rental-orders. Đây là cập nhật nghiệp vụ đã được user làm rõ, không phải kết quả triển khai. Chi tiết: SPEC-rental-orders.md và audit/rental-requirements-2026-10-16.md.

Luồng customer: chọn ngày nhận/trả → xem mẫu/size/số lượng khả dụng toàn kỳ → xem phí theo ngày → gửi yêu cầu và đồng ý báo giá → đủ cọc được ghi nhận thì giữ hàng → giao/nhận trả/đối soát. Không yêu cầu lịch chụp. Không mặc định ngày hoặc hiện danh sách khả dụng trước khi khách chọn ngày.

| Thứ tự | Phần việc | Nghiệm thu chính |
|---|---|---|
| RENT-DAY01 | Giá/ngày riêng, cách tính số ngày và snapshot giá | Nhận/trả đều tính phí, cùng ngày=1; server tính tiền; báo giá cũ không đổi, không lấy giá cả kỳ thay giá/ngày ngầm |
| RENT-DAY02 | Catalog khả dụng theo khoảng ngày, size và lượng | Bắt buộc đủ ngày; trừ đơn thuê và lịch chụp chung kho; còn lượng nhỏ nhất đáp ứng toàn kỳ; hết mọi size thì không trả mẫu |
| RENT-DAY03 | Catalog/form customer chọn ngày trước | Không tải/hiện hàng trước khi chọn ngày; vào form trực tiếp vẫn chọn ngày được; CTA/draft/login giữ kỳ, xóa lọc phụ không xóa kỳ, đổi ngày kiểm tra lại lựa chọn |
| RENT-DAY04 | Ghi nhận cọc và giữ hàng đúng thời điểm | Đủ xác nhận+cọc thì chốt dưới khóa/transaction; cạnh tranh chiếc cuối không vượt tồn; khoản tiền thực đã nhận không bị mất khi cần xử lý thiếu hàng/hoàn |
| RENT-DAY05 | Giao diện quản lý giá và chi tiết báo giá | Staff nhập giá/ngày riêng theo giao diện admin hiện có; customer thấy đ/ngày, số ngày, tổng tiền và cọc riêng; lịch sử hiển thị đúng chế độ giá cũ |
| RENT-DAY06 | Regression và nghiệm thu local | Ngày/giá, size còn lại, thuê/chụp đồng thời, đổi kỳ, trả muộn, số tiền/idempotency, dữ liệu cũ và browser mobile/desktop |

RENT-DAY01/02 là nền cho RENT-DAY03/04; RENT-DAY05 theo contract giá đã chốt; RENT-DAY06 xác minh toàn hành trình. Tận dụng code kho/khóa tài nguyên hiện có, không tạo tồn available độc lập hoặc thay logic bằng bộ lọc UI. API danh mục loại và kho staff giữ hợp đồng hiện tại.

Kiểm thử tích hợp dùng DB test local riêng; không seed/reset studio_project_demo, không tính lại đơn đã chốt, không tự đặt mức cọc/phạt hoặc thêm cổng thanh toán.

### Kết quả triển khai RENT-DAY — 16/10/2026

Đã hoàn thành RENT-DAY01–06: giá/ngày riêng nullable, catalog/form chọn ngày trước, tồn nhỏ nhất qua toàn kỳ theo size trừ chung thuê/chụp, snapshot giá/ngày/số ngày, gia hạn theo đơn giá đã chốt, tự giữ hàng khi đủ xác nhận+cọc và ghi nhận đúng khoản thu khi thiếu hàng. Đơn cũ vẫn theo giá cả kỳ và giữ hàng thủ công. Không thêm dependency hoặc tính lại dữ liệu cũ.

Kiểm chứng đạt: 119 test frontend; 36 contract backend; 9 test tích hợp tương thích đơn cũ; 9 test tích hợp thuê theo ngày, gồm cọc từng phần và cạnh tranh chiếc cuối. TypeScript hai ứng dụng, ESLint tập trung, Prettier/diff check và build frontend đạt. Browser đã kiểm catalog/form/preview/login/tạo yêu cầu trên DB riêng, giá staff và responsive 360/390px; Playwright E2E đã cập nhật nhưng chưa chạy. Chi tiết và bằng chứng: [audit/rental-daily-2026-10-16.md](audit/rental-daily-2026-10-16.md).

Preview local hiện tại dùng code mới tại http://127.0.0.1:4013/costumes. Giữ nguyên dữ liệu demo; các mẫu chưa nhập giá/ngày hiện cần báo giá, không lấy giá kỳ cũ thay thế. Chưa commit/push hoặc deploy trong đợt này.
