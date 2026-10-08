# Đơn thuê trang phục/phụ kiện

Triển khai theo SPEC-rental-orders.md. Cấu hình rollout mặc định tắt tính năng; launcher demo đồ án bật chụp/thuê bằng env riêng và dùng database mẫu local. Có thể bật luồng thuê độc lập với flag của luồng chụp; cả hai vẫn dùng chung khóa tài nguyên và tồn kho.

## Demo local của đồ án

Chạy `node ops/demo.cjs start` từ root, mở **http://localhost:4001** và dùng tài khoản mẫu trong [DEMO_LOCAL.md](DEMO_LOCAL.md). API **http://localhost:5002** dùng database **studio_project_demo** trên Mongo replica set **rs0** tại **127.0.0.1:27029**. Launcher bật portal/chụp/thuê cho process local, không yêu cầu sửa `.env` hiện có. `node ops/demo.cjs stop` dừng ứng dụng; start lại giữ dữ liệu.

Đối soát dữ liệu demo bằng `ops/audit-studio-readiness.cjs` rồi trình diễn báo giá–cọc–giữ hàng–giao–trả–đối soát–hoàn cọc. Bộ kịch bản và cách ghi kết quả nằm trong [STUDIO_ACCEPTANCE.md](STUDIO_ACCEPTANCE.md). Không cần dữ liệu studio thật, staging, production hoặc chữ ký bên ngoài để triển khai đồ án. Kết quả test tự động không tự đánh dấu UAT bằng tay đã đạt.

## Bật bằng cấu hình riêng hoặc Docker, tùy chọn

1. MongoDB phải là replica set/mongos hỗ trợ transaction. Nếu nâng cấp/reset database đã có dữ liệu cần giữ, backup và kiểm tra restore local riêng trước. Với Docker, dùng quy trình hạ tầng trong WORKFLOW_RELEASE.md; không tạo lại volume dữ liệu.
2. Chạy `node ops/audit-studio-readiness.cjs` với MONGO_URI có tên database rõ, đối soát lịch cũ và khai báo tồn theo mẫu–size–tình trạng. Đánh dấu isRentalItem cho những mẫu studio thực sự cho thuê. Giá catalog chỉ để tham khảo.
3. Local không dùng Compose: CLIENT_PORTAL_ENABLED=true và CLIENT_RENTAL_ENABLED=true trong backend/.env. VITE_CLIENT_PORTAL_ENABLED=true và VITE_CLIENT_RENTAL_ENABLED=true trong frontend/.env, khởi động lại backend/Vite.
4. Với Docker Compose replica overlay, CLIENT_WORKFLOW_ENABLED và CLIENT_RENTAL_ENABLED lấy từ **root .env**, ghi đè backend/.env và mặc định false. CLIENT_PORTAL_ENABLED tiếp tục cấu hình trong backend/.env. Frontend VITE_CLIENT_PORTAL_ENABLED từ root .env mặc định true như phiên bản hiện tại; VITE_CLIENT_RENTAL_ENABLED mặc định false. Bật rental trên database demo đã chuẩn bị rồi build lại frontend. Cấu hình mẫu .env.rollout.example; không ghi đè .env chứa secret. Launcher local không dùng overlay này; tài liệu này không xác nhận đã chạy/deploy Docker.
5. Chạy kịch bản nhận hàng, trả tốt/hỏng/mất, gia hạn xung đột, hủy, thanh toán lặp, đối soát và hoàn cọc bằng tài khoản kiểm thử riêng trước khi đưa vào dùng.

## Luồng và quy tắc

- Catalog → /rental/start → đăng nhập khi gửi → /account/rentals/:id. Menu nội bộ Đơn thuê → /rental-orders/:id.
- Studio chốt đơn giá cho cả kỳ và cọc bảo đảm. Khách đồng ý phiên bản, kế toán/Admin ghi cọc, Admin kiểm tra và giữ hàng. Chưa đủ cọc hoặc không đủ tồn thì không xác nhận.
- Trước giao cần đủ phí thuê + cọc, ngày thực tế nằm trong kỳ và kiểm tra lại khả dụng. Gia hạn/hủy đang chờ quyết định chặn giao hàng.
- Ngày nhận và ngày trả đều chiếm hàng. Quá hạn chưa nhận trả tiếp tục giữ hàng; không tự tăng tồn. Khi bắt đầu chụp, hệ thống cũng kiểm tra lại nguồn lực để tránh dùng hàng đang bị đơn thuê quá hạn giữ.
- Nhận trả nhập tổng số tốt/hỏng/mất đúng số đã giao. Hỏng chuyển sang damaged, mất sang retired. Đây là sự kiện thực tế: nếu thiếu cho các lịch tương lai, Admin cần xem lại lịch và bố trí thay thế hoặc thỏa thuận hủy; hệ thống chặn giao/bắt đầu chụp khi không đủ.
- Studio gửi đối soát (có thể không có phụ phí), khách đồng ý rồi mới thu phát sinh/hoàn cọc dư. Không tự đặt mức phí/ngày, phạt trả muộn, hư hỏng hay mất. Thu/hoàn đúng tổng cuối mới hoàn tất.
- Gia hạn giữ nguyên kỳ cũ đến khi khách đồng ý và kiểm tra mới thành công; lịch sử báo giá/đề xuất/đối soát được giữ. Hủy trước giao có phí giữ lại do studio đề xuất và khách đồng ý.
- Khách rút yêu cầu chưa đồng ý báo giá bằng nút Rút yêu cầu thuê. Sau đồng ý, yêu cầu hủy được gửi ngay cả khi chưa giữ hàng/đã nhận cọc; đề xuất đang mở chặn giữ hàng và giao. Tiền đã nhận được đối soát và hoàn theo phương án khách đồng ý.
- Admin 0/1 giao–nhận và đối soát; Sale 2 tư vấn/báo giá; cộng tác viên sale 4 xem giao nhận; kế toán 5 ghi tiền; khách 6 chỉ đơn của mình.

Tắt CLIENT_RENTAL_ENABLED chỉ đóng API/tính năng mới. Các đơn confirmed/checked_out vẫn được bảo vệ trước API lịch/kho cũ; không tự giải phóng hàng. Bật lại để tiếp tục xử lý trả/hoàn tiền. Các khoản tiền liên kết không sửa/xóa qua API thu chi cũ; mẫu có lịch sử thuê không bị xóa cứng.

## Kiểm thử local

`node --test ops/tests/rental-audit.cjs` dùng database studio_rental_audit, chỉ trên localhost và yêu cầu replica set. Audit luồng chụp: `node --test ops/tests/workflow-audit.cjs ops/tests/workflow-contract.cjs ops/tests/readiness-audit.cjs`.

Trong frontend: `node ../node_modules/@playwright/test/cli.js test` với MONGO_TEST_URI chỉ vào replica set local; harness đổi sang studio_phase1_e2e. Kịch bản thuê tạo dữ liệu riêng, đi từ bản nháp khách đến hoàn cọc sau trả hàng hỏng và đánh giá. Không dùng database production cho kiểm thử tự động.

Báo cáo dịch vụ, công nợ và phân bổ kho đã có tại Quản lý → Báo cáo dịch vụ và kho; xem REPORTS_RELEASE.md. Nghiệm thu demo local tổng thể theo STUDIO_ACCEPTANCE.md. Dùng riêng database test cho kiểm thử tự động; không trỏ test harness vào studio_project_demo.
