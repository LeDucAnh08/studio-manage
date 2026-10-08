# Triển khai và kiểm chứng demo local — 05/10/2026

Theo quyết định của người thực hiện đồ án, môi trường triển khai/nghiệm thu là local bền vững. Không cần staging, production hoặc database studio thật. Các runbook đã được cập nhật theo phạm vi này; hướng dẫn Docker/VPS còn là tùy chọn.

## Kết quả triển khai

- Ứng dụng bản build: http://localhost:4001. API: http://localhost:5002. MongoDB replica set `rs0`: `127.0.0.1:27029`, database `studio_project_demo`.
- Launcher `node ops/demo.cjs start|stop|status` quản lý MongoDB, build backend/frontend, serve SPA và proxy API. Các process chạy nền ẩn. Có status riêng, kiểm tra workspace/stop token và cổng bận; không dừng chương trình khác. `yarn demo`, `yarn demo:stop`, `yarn demo:status`, `yarn demo:smoke` là các lệnh tương ứng.
- Portal/chụp/thuê được bật bằng env riêng cho runtime/build. JWT secret local được giữ qua restart. Không sửa `.env` hoặc database `studio_db` cổng 27017; không chuyển topology của database hiện có.
- Seed tạo 22 record mẫu: 5 tài khoản theo vai trò, 2 loại trang phục, 3 mẫu trang phục/phụ kiện, 2 gói chụp và 10 danh mục thu chi. Seed giữ record hiện có bằng ID ổn định/natural key; tạo index bổ sung, không drop database hoặc sync/drop index.
- Kịch bản dùng API thật theo vai trò: chụp hoàn tất có nghiệm thu/thanh toán/đánh giá; thuê hoàn tất, trả tốt đủ số lượng và hoàn cọc; một hồ sơ chụp đã giữ nguồn lực cho ngày sắp tới. Có 2 Booking, 2 workflow/Schedule, 1 rental và 6 Transaction liên kết.
- Tài khoản mẫu và cách chạy/dừng/trình diễn nằm trong [DEMO_LOCAL.md](../DEMO_LOCAL.md).
- GitHub Actions giữ quality gate; job VPS chỉ chạy khi repository variable ENABLE_VPS_DEPLOY=true, phù hợp đồ án không có VPS. YAML đã được parse local; chưa kích hoạt workflow GitHub.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Backend compile, frontend TypeScript + production build | Đạt khi launcher khởi động |
| MongoDB primary và API `/api/health` | Đạt; các command nghiệp vụ thực thi/commit trên replica set local |
| Kịch bản API chụp + thuê + lịch sắp tới | Đạt trạng thái completed/completed/confirmed; 6 giao dịch |
| Readiness trên database demo đang chạy | ready=true; 0 blocker, 1 warning OUTSTANDING_PAYMENT: 750.000đ của lịch sắp chụp |
| Seed/scenario chạy lại | Seed created=0, retained=22; scenario retained; không nhân đôi payment hoặc ghi đè catalogue/account |
| Khôi phục từ lần chuẩn bị bị ngắt | Đạt: phần chụp đã tạo được giữ nguyên, thuê chạy tiếp sau sửa key hợp lệ; không reset dữ liệu |
| Stop/start giữ dữ liệu | Snapshot/hash của cả 16 collection nghiệp vụ/resource giữ nguyên; chỉ metadata lần seed thay đổi |
| Chrome trên ứng dụng đã build | 8 kiểm tra đạt, 5 vai trò; không có uncaught JavaScript error |
| Mobile 360px | Báo cáo tiền/kho hiển thị; bảng cuộn trong vùng riêng, không tràn toàn trang |
| Cấu hình payment demo | API client trả các PAYMENT_* trống và paymentReady=false dù process launcher được thử với các giá trị giả kế thừa |
| Prettier/syntax các script mới, git diff whitespace | Đạt |

Chrome kiểm tra đăng nhập admin/dashboard, chi tiết chụp hoàn tất, thuê/nhận trả, tài chính mobile/công nợ, kho mobile, client đọc hai hồ sơ/feedback, photographer đọc lịch được phân công và Sale đọc đơn thuê. Các ảnh đã được xem lại: dashboard có thu 1.900.000đ, chi 600.000đ, chênh lệch 1.300.000đ; báo cáo tách dòng tiền khỏi giá trị dịch vụ và cho thấy công nợ 750.000đ. Kho có 52 món tốt và không có mẫu–size vượt tồn trong kỳ demo.

Các bằng chứng local thuộc thư mục git-ignore `.workflow-tools`: `demo-browser.json`, `demo-env-isolation.json`, `demo-persistence-before.json`, `demo-persistence-after.json`, `demo-readiness-*.json`, `screenshots/demo-dashboard.png`, `screenshots/demo-reports-mobile.png`, `screenshots/demo-inventory-mobile.png`. Đây là dữ liệu giả lập của đồ án, không phải dữ liệu khách hàng thật.

Lần regression trước khi thêm launcher đã đạt 107 kiểm thử và full lint/format/build, xem [release-readiness-2026-10-05.md](release-readiness-2026-10-05.md). Không cộng 8 kiểm tra smoke thành kết quả chạy lại của toàn bộ suite; lần này không thay đổi logic nghiệp vụ backend/frontend đã kiểm chứng.

## Audit và giới hạn đã xử lý

- Rental key chỉ nhận chữ/số/underscore/hyphen. Đã sửa key scenario, giữ key/payment photo cũ và chạy tiếp bằng journal. Không sửa API để chấp nhận input sai.
- Demo không kế thừa PAYMENT_* hoặc Telegram/GAS webhook từ cấu hình ngoài. Không tạo thư mục Google hoặc gửi Telegram thật; link Drive trong fixture là link minh họa.
- MongoDB/backend thoát bất thường chuyển runtime sang failed; kiểm tra cả exitCode/signalCode trước khi báo ready, kể cả sau audit. Stop chờ MongoDB shutdown trước khi kết thúc process còn lại và không báo đã dừng khi runtime vẫn đáp ứng.
- Nếu một kịch bản mẫu chưa xong bị ngắt qua ngày mới, kỳ thuê trong journal có thể đã hết hạn. Launcher giữ dữ liệu, ghi scenario=incomplete và vẫn mở UI để xem/xử lý hoặc tạo yêu cầu mới; không tự sửa báo giá/kỳ đã chốt hoặc xóa thanh toán.
- Các kỳ demo được giữ theo lần tạo đầu tiên; restart không tự đổi ngày để làm mới lịch. Người trình diễn có thể tạo các yêu cầu mới bằng UI.

21 dòng UAT trong STUDIO_ACCEPTANCE.md là checklist thao tác thủ công, không được tự đánh dấu tất cả đã chạy. Bằng chứng trên là API/Chrome tự động và kiểm tra ảnh. Không cần sign-off studio để tiếp tục đồ án; tích hợp Google/Telegram/chuyển khoản thật nằm ngoài lần demo này. Chưa thực hiện restore backup riêng; dữ liệu được bảo toàn qua stop/start, và hướng dẫn lưu bản sao local đã có.
