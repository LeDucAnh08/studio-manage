# RENT-DAY tasks

- [x] DAY01: Giá/ngày nullable + parser ngày VN + unit validation. Verify: focused backend/helper tests, no fallback legacy price.
- [x] DAY02: Public catalog bắt buộc kỳ thuê + availableBySize toàn kỳ. Depends DAY01; verify stock/schedules/overdue/invalid dates/filter tests.
- [x] Checkpoint foundation: helper/API contracts khớp backend/frontend, typecheck và tests focused.
- [x] DAY03: Customer catalog date-first, URL/filter/CTA giữ kỳ, stale response ignored. Depends DAY01/02; verify component tests và browser.
- [x] DAY04: Form date-first/draft/login/quantity/estimates. Depends DAY01/02; verify missing dates/changed period/quantities/failed retry.
- [x] DAY05: Daily snapshots, quote sums/extension và bảo toàn legacy. Depends DAY01; verify pricing/money/version/history HTTP tests.
- [x] DAY06: Tự giữ daily sau xác nhận+cọc, ghi nhận tiền khi thiếu hàng, retry và legacy manual. Depends DAY02/05; verify concurrent last-item/rental+shoot/deposit replay, gồm cọc từng phần tới đủ cọc.
- [x] DAY07: Staff dailyprice field + detail per-mode/issue. Depends DAY01/05/06; verify nullable/no zero fallback/legacy labels; browser mở trình sửa giá và hủy, không lưu.
- [x] Checkpoint core: request → quote → deposit → held kiểm bằng Mongo integration; missing stock doesn't erase payment. Không coi là browser E2E đã chạy.
- [x] DAY08: Regression, isolated DB integration, desktop/mobile smoke, checks/build/docs. Full frontend119/119 (18file), backendcontract36/36, legacy9/9, daily9/9; tscboth/lintfocused/format/diff/build đạt. Không ghi DB demo, giữ sửa navbar trước đó.

Evidence: [audit/rental-daily-2026-10-16.md](../audit/rental-daily-2026-10-16.md). Browser với API thật/DB test riêng đã kiểm đến tạo yêu cầu, catalog360/form390 không tràn; không thao tác toàn bộ quote–cọc–giao–trả trên browser. Playwright spec cập nhật và qua syntax/format, **chưa chạy Playwright**.

- [x] Khôi phục Mongo từ `.workflow-tools/demo-mongo-data`, backend5002/frontend4013; health và `/costumes` HTTP200. API thiếu ngày400, kỳ20–22/10 trả21mẫu/3ngày, chưa có giá/ngày; kiểm chỉ đọc, không seed/reset. Dọn DB test browser đúng host/database/rs0 và dừng preview cô lập4020/5020.

Giới hạn bàn giao: browser transport không còn kết nối sau plugin reload; chưa xác minh kết quả đóng tab QA/reset viewport/mở tab preview thật. Không tuyên bố các tab đã được đóng hoặc đã reset viewport.
