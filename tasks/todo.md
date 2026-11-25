# Công việc tích hợp BullMQ và Redis

Theo [kế hoạch ngày 25/11/2026](plan.md). Đã hoàn tất Q01–Q08 trong phạm vi local ngày 25/11/2026; BullMQ đã được bật và worker có heartbeat. Sơ đồ và báo cáo v05 phản ánh triển khai hiện tại. Docker/VPS chưa chạy, được tách khỏi nghiệm thu local. Checklist thuê theo ngày đã hoàn tất được lưu trong archive.

## Q01 Redis cô lập và dependency

- [x] Khóa phiên bản tương thích Node; Redis AOF/volume/noeviction/private network và healthcheck.
- [x] Smoke enqueue/consume/restart ở prefix test; không kéo service MongoDB hoặc ghi DB chính.
- [x] Kiểm chứng: Backend build, config validation và restart giữ job.

Phụ thuộc: Không. File/phạm vi theo kế hoạch: backend/package.json, lockfile hiện có, docker-compose.queue.yml, backend/src/config/queue.ts. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

## Q02 Worker riêng và hợp đồng queue

- [x] Entrypoint không HTTP; schemaVersion/ID, prefix/mode nhất quán, mặc định legacy.
- [x] Producer timeout hữu hạn; worker reconnect/error handler, shutdown có giới hạn; không log secret.
- [x] Kiểm chứng: Unit config, Redis outage không treo API, SIGTERM và mode sai.

Phụ thuộc: Q01. File/phạm vi theo kế hoạch: backend/src/workers/main.ts, services/jobQueue.ts, config/queue.ts, backend/package.json. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

## Q03 Processor email một bản ghi

- [x] Refactor theo outboxId dùng lại lease và kiểm tra đơn/tài khoản/deadline; legacy dùng chung hàm.
- [x] Giữ khóa Resend/attempts/firstAttemptAt; phân loại retry/terminal; payload không chứa email/token.
- [x] Kiểm chứng: Transport giả, email-config/sandbox-startup/email-notifications; crash/replay và cửa sổ bất định.

Phụ thuộc: Q02. File/phạm vi theo kế hoạch: backend/src/services/email.ts, workers/email.ts, tests/email-notifications.cjs, test queue email mới. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

## Q04 Dispatcher và chuyển đường gửi email

- [x] Enqueue sau commit, ID ổn định; đối chiếu được crash hai cửa sổ và mất queue.
- [x] Chỉ recovery việc đủ điều kiện; giới hạn retry tổng, không enqueue vô hạn failed terminal; cutover/rollback không reset lịch sử.
- [x] Kiểm chứng: Hai dispatcher/worker, Redis down/lost key, retention, lease và chuyển mode hai chiều.

Phụ thuộc: Q03. File/phạm vi theo kế hoạch: backend/src/workers/outboxDispatcher.ts, app.ts, models/EmailOutbox.ts nếu cần, test recovery mới. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

### Checkpoint A

- [x] Các task trước đạt focused test/build, có bằng chứng cho luồng thành công và sự cố theo kế hoạch; ghi giới hạn thực tế trước bước kế tiếp.

## Q05 Job quét đơn hết hạn

- [x] Scheduler định danh ổn định gọi lại expiry theo thời gian thực; giữ API deadline và sweeper dự phòng.
- [x] Chạy lại không sai; webhook và ghi nhận tiền tiếp tục trong transaction, queue trễ không gia hạn QR.
- [x] Kiểm chứng: booking-expiry/package-booking/rental-auto-checkout/sepay-deposits, cọc cạnh tranh expiry và Redis down.

Phụ thuộc: Checkpoint A. File/phạm vi theo kế hoạch: backend/src/workers/maintenance.ts, workers/main.ts, app.ts, test maintenance mới. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

### Checkpoint B

- [x] Các task trước đạt focused test/build, có bằng chứng cho luồng thành công và sự cố theo kế hoạch; ghi giới hạn thực tế trước bước kế tiếp.

## Q06a API operation đồng bộ album

- [x] Lưu request key, actor/phạm vi, expectedVersion và yêu cầu bền vững trước HTTP 202.
- [x] API trạng thái kiểm tra quyền; pending/running/succeeded/failed rõ ràng; không lưu secret vào Redis.
- [x] Kiểm chứng: HTTP 202/idempotency/ownership/phân công; client khác không đọc/ghi operation.

Phụ thuộc: Checkpoint B. File/phạm vi theo kế hoạch: backend/src/models/BackgroundOperation.ts, routes/bookingAlbum.ts, services/conceptAlbum.ts, endpoint operation mới. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

## Q06b Giao diện trạng thái đồng bộ album

- [x] Hiển thị chờ/đang chạy/kết quả, lấy trạng thái qua API; không coi enqueue là thành công.
- [x] Giữ snapshot đang công bố, xử lý lỗi/tiếp tục theo dõi khi mở lại; dừng polling khi hết phiên.
- [x] Kiểm chứng: Component states và browser desktop/mobile với API test; Back/context và quyền cũ giữ nguyên.

Phụ thuộc: Q06a. File/phạm vi theo kế hoạch: Service client album và control đồng bộ hiện có của concept/kỉ yếu, component test liên quan. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

## Q07 Worker đồng bộ album

- [x] Lấy đủ dữ liệu Drive ngoài transaction; recheck quyền/đơn/version rồi commit snapshot ngắn.
- [x] Giữ selections/notes/ảnh công bố khi lỗi; retry giới hạn, lỗi quyền/version terminal, không tự publish/deliver.
- [x] Kiểm chứng: Drive mock phân trang/quota/timeout, crash/replay, thu hồi quyền và version conflict.

Phụ thuộc: Q06a và Q06b. File/phạm vi theo kế hoạch: backend/src/services/backgroundOperations.ts, services/bookingAlbum.ts, services/conceptAlbum.ts, test album queue mới. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

### Checkpoint C

- [x] Các task trước đạt focused test/build, có bằng chứng cho luồng thành công và sự cố theo kế hoạch; ghi giới hạn thực tế trước bước kế tiếp.

## Q08 Vận hành và đóng gói

- [x] API/worker cùng build, local giữ MongoDB Windows; heartbeat/age/failed, retention và runbook retry.
- [x] Rehearsal cutover/rollback cô lập; cập nhật báo cáo theo thực tế sau nghiệm thu, phần VPS thành task riêng nếu làm.
- [x] Kiểm chứng: Build backend/frontend; focused tests concurrency 1–2, restart/recovery, không log bí mật hoặc ghi DB/email/payment thật.

Phụ thuộc: Q05 và Checkpoint C. File/phạm vi theo kế hoạch: Compose queue/worker, README.md, docs/background-jobs.md, launcher hiện có nếu cần. Phạm vi M, giới hạn khoảng 3–5 file mỗi lượt; tách tiếp nếu vượt phạm vi.

## Nghiệm thu cuối

- [x] Đủ bằng chứng cutover, rollback, khôi phục queue và quyền; không thay dữ liệu nghiệp vụ/cấu hình email và thanh toán của main app; chỉ bật ba cấu hình queue đã được yêu cầu, không phục hồi vai trò đã ngừng sử dụng.
- [x] Cập nhật tài liệu từ đề xuất sang đã thực hiện chỉ khi hoàn tất kiểm chứng.

## Bằng chứng và giới hạn nghiệm thu local

- Backend: 97/97 kiểm tra backend liên quan đạt trong lượt cuối backend-final.log, gồm queue, album, email/config, expiry, rental, SePay và quyền. Fixture queue ban đầu thiếu reservation.expiresAt đã được sửa và chạy lại đạt. Có test Redis thật restart/outage, mất job, retry budget, mode barrier, entrypoint worker và shutdown; provider email/Drive dùng giả.
- Frontend: 13 kiểm tra đạt; TypeScript, lint các file thay đổi và build đạt. Chromium chạy màn album thực với API giả trên desktop/mobile: chờ/chạy/lỗi/thành công, giữ draft và dừng polling khi hết phiên; không phải browser E2E qua backend thật.
- Local: cutover thành công, worker drain/start lại, admin đọc health được; photographer/customer bị chặn. Đối chiếu tài khoản, seed marker, số đơn và tổng giao dịch trước/sau không đổi; cấu hình cũ ngoài ba khóa queue giữ nguyên.
- Báo cáo v05 có 22 trang, đã render Word và kiểm tra đủ 22 trang; tiêu đề đen, không phục hồi vai trò đã bỏ.
- Chưa chạy toàn bộ suite backend, Docker/VPS, thử lỗi với Resend/SePay thật hoặc mọi tình huống crash ở production. Compose chỉ bổ sung Redis; không triển khai cả stack container. Audit còn advisory cũ của workspace, gồm hai critical; chuỗi dependency queue mới không có advisory ở lần kiểm tra này.

Chi tiết log: audit/bullmq-integration-2026-11-25; hướng dẫn: docs/background-jobs.md. Các tiêu chí kiểm chứng trong task được nghiệm thu theo bằng chứng local và ranh giới trên, không phải cam kết đã diễn tập mọi lỗi trên hệ thống thật.
