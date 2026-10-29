# Đơn thuê trang phục/phụ kiện

Triển khai theo SPEC-rental-orders.md. Cấu hình rollout mặc định tắt tính năng; launcher demo đồ án bật chụp/thuê bằng env riêng và dùng database mẫu local. Có thể bật luồng thuê độc lập với flag của luồng chụp; cả hai vẫn dùng chung khóa tài nguyên và tồn kho.

## Demo local của đồ án

Chạy `node ops/demo.cjs start` từ root, mở **http://localhost:4001** và dùng tài khoản mẫu trong [DEMO_LOCAL.md](DEMO_LOCAL.md). API **http://localhost:5002** dùng database **studio_project_demo** trên Mongo replica set **rs0** tại **127.0.0.1:27029**. Launcher bật portal/chụp/thuê cho process local, không yêu cầu sửa `.env` hiện có. `node ops/demo.cjs stop` dừng ứng dụng; start lại giữ dữ liệu.

Đối soát dữ liệu demo bằng `ops/audit-studio-readiness.cjs` rồi trình diễn báo giá–cọc–giữ hàng–giao–trả–đối soát–hoàn cọc. Bộ kịch bản và cách ghi kết quả nằm trong [STUDIO_ACCEPTANCE.md](STUDIO_ACCEPTANCE.md). Không cần dữ liệu studio thật, staging, production hoặc chữ ký bên ngoài để triển khai đồ án. Kết quả test tự động không tự đánh dấu UAT bằng tay đã đạt.

## Bật bằng cấu hình riêng hoặc Docker, tùy chọn

1. MongoDB phải là replica set/mongos hỗ trợ transaction. Nếu nâng cấp/reset database đã có dữ liệu cần giữ, backup và kiểm tra restore local riêng trước. Với Docker, dùng quy trình hạ tầng trong WORKFLOW_RELEASE.md; không tạo lại volume dữ liệu.
2. Chạy `node ops/audit-studio-readiness.cjs` với MONGO_URI có tên database rõ, đối soát lịch cũ và khai báo tồn theo mẫu–size–tình trạng. Đánh dấu isRentalItem cho những mẫu studio thực sự cho thuê. Giá catalog chỉ để tham khảo.
3. Thuê trang phục mặc định mở cùng cổng khách hàng; không cần cờ riêng. Hai biến cũ `CLIENT_RENTAL_ENABLED` và `VITE_CLIENT_RENTAL_ENABLED` không còn tác dụng. Quyền đăng nhập, vai trò và kiểm tra dữ liệu vẫn được áp dụng.
4. Docker Compose giữ cờ chung CLIENT_PORTAL_ENABLED và VITE_CLIENT_PORTAL_ENABLED; CLIENT_WORKFLOW_ENABLED vẫn dành riêng cho quy trình chụp. Sau cập nhật code, khởi động lại backend/Vite hoặc build lại frontend triển khai. Không thay `.env` chứa secret.
5. Chạy kịch bản nhận hàng, trả tốt/hỏng/mất, gia hạn xung đột, hủy, thanh toán lặp, đối soát và hoàn cọc bằng tài khoản kiểm thử riêng trước khi đưa vào dùng.

## Luồng và quy tắc

- Chọn ngày nhận/trả trong catalog → xem hàng còn trống → /rental/start → đăng nhập khi gửi → /account/rentals/:id. Vào form trực tiếp vẫn phải chọn ngày trước khi xem hàng. Không mặc định ngày; kỳ thuê được giữ qua URL, bản nháp và đăng nhập. Menu nội bộ Đơn thuê → /rental-orders/:id.
- Staff nhập `rentalDailyPrice` riêng trong Trang phục. Bỏ trống nghĩa là cần báo giá, không phải 0đ và không dùng `rentalPrice` cũ thay thế. Chưa cập nhật giá/ngày cho dữ liệu demo trong đợt triển khai này.
- Đơn mới có `pricingMode=daily`: phí = tổng đơn giá/ngày × số lượng × số ngày lịch Việt Nam, tính cả ngày nhận và trả (cùng ngày = 1). Server tính phí; báo giá lưu chế độ giá, số ngày và đơn giá đã chốt. Cọc bảo đảm tách riêng. Đơn cũ thiếu chế độ giá vẫn tính theo cả kỳ và giữ quy trình xác nhận thủ công.
- Khách đồng ý báo giá và kế toán/Admin ghi nhận đủ cọc thì đơn mới tự giữ hàng dưới transaction/khóa dùng chung với chụp. Cọc bằng 0 thì giữ ngay khi đồng ý. Chưa đủ cọc chưa giữ. Nếu thực nhận cọc nhưng hết hàng, tiền và giao dịch vẫn được lưu, đơn có `reservationIssue` và chưa giữ hàng; Admin kiểm tra để thử giữ lại hoặc xử lý hủy/hoàn theo đồng ý của khách.
- API `/api/public/costumes` bắt buộc `receiveDate` và `returnDate` định dạng YYYY-MM-DD, ngày nhận từ hôm nay ở Việt Nam, tối đa 366 ngày. `availableBySize` là lượng nhỏ nhất còn trống trong toàn kỳ; chỉ trả size có lượng dương, hết mọi size thì ẩn mẫu. Bộ lọc giá áp dụng giá/ngày. API loại hàng và kho staff không bắt buộc kỳ thuê.
- Trước giao cần đủ phí thuê + cọc, ngày thực tế nằm trong kỳ và kiểm tra lại khả dụng. Gia hạn/hủy đang chờ quyết định chặn giao hàng.
- Ngày nhận và ngày trả đều chiếm hàng. Quá hạn chưa nhận trả tiếp tục giữ hàng; không tự tăng tồn. Khi bắt đầu chụp, hệ thống cũng kiểm tra lại nguồn lực để tránh dùng hàng đang bị đơn thuê quá hạn giữ.
- Nhận trả nhập tổng số tốt/hỏng/mất đúng số đã giao. Hỏng chuyển sang damaged, mất sang retired. Đây là sự kiện thực tế: nếu thiếu cho các lịch tương lai, Admin cần xem lại lịch và bố trí thay thế hoặc thỏa thuận hủy; hệ thống chặn giao/bắt đầu chụp khi không đủ.
- Studio gửi đối soát (có thể không có phụ phí), khách đồng ý rồi mới thu phát sinh/hoàn cọc dư. Không tự đặt giá/ngày trong danh mục, phạt trả muộn, hư hỏng hay mất. Thu/hoàn đúng tổng cuối mới hoàn tất.
- Gia hạn giữ nguyên kỳ cũ đến khi khách đồng ý và kiểm tra mới thành công; lịch sử báo giá/đề xuất/đối soát được giữ. Đơn theo ngày tính tổng phí gia hạn từ đơn giá đã chốt và toàn kỳ mới; đổi giá danh mục không đổi báo giá. Đơn cũ vẫn dùng phí gia hạn được thỏa thuận. Hủy trước giao có phí giữ lại do studio đề xuất và khách đồng ý.
- Khách rút yêu cầu chưa đồng ý báo giá bằng nút Rút yêu cầu thuê. Sau đồng ý, yêu cầu hủy được gửi ngay cả khi chưa giữ hàng/đã nhận cọc; đề xuất đang mở chặn giữ hàng và giao. Tiền đã nhận được đối soát và hoàn theo phương án khách đồng ý.
- Admin 0/1 giao–nhận và đối soát; Sale 2 tư vấn/báo giá; cộng tác viên sale 4 xem giao nhận; kế toán 5 ghi tiền; khách 6 chỉ đơn của mình.

Không còn thao tác bật/tắt riêng tính năng thuê. Các khoản tiền liên kết không sửa/xóa qua API thu chi cũ; mẫu có lịch sử thuê không bị xóa cứng. Kiểm tra và bảo vệ tồn kho tiếp tục dùng transaction/khóa chung.

## Kiểm thử local

`node --test ops/tests/rental-audit.cjs` dùng database studio_rental_audit, chỉ trên localhost và yêu cầu replica set. Audit luồng chụp: `node --test ops/tests/workflow-audit.cjs ops/tests/workflow-contract.cjs ops/tests/readiness-audit.cjs`.

`node --test ops/tests/rental-daily-audit.cjs` dùng database `studio_rental_daily_audit` trên replica set localhost:27029; kiểm tra ngày/giá, catalog, cọc từng phần, tự giữ hàng, đồng thời thuê/chụp, receipt khi thiếu hàng, retry/hoàn và lịch sử gia hạn. Harness kiểm tra host/tên DB trước khi dọn dữ liệu. Không trỏ vào database demo. Biên bản triển khai: [audit/rental-daily-2026-10-16.md](audit/rental-daily-2026-10-16.md).

Trong frontend: `node ../node_modules/@playwright/test/cli.js test` với MONGO_TEST_URI chỉ vào replica set local; harness đổi sang studio_phase1_e2e. Kịch bản thuê tạo dữ liệu riêng, đi từ bản nháp khách đến hoàn cọc sau trả hàng hỏng và đánh giá. Không dùng database production cho kiểm thử tự động.

Báo cáo dịch vụ, công nợ và phân bổ kho đã có tại Quản lý → Báo cáo dịch vụ và kho; xem REPORTS_RELEASE.md. Nghiệm thu demo local tổng thể theo STUDIO_ACCEPTANCE.md. Dùng riêng database test cho kiểm thử tự động; không trỏ test harness vào studio_project_demo.
