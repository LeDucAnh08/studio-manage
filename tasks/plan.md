# Kế hoạch tích hợp BullMQ và Redis cho Yume Studio

Ngày 25/11/2026. Trạng thái: đã triển khai và bật local ngày 25/11/2026 theo yêu cầu người dùng. Q01–Q08 được nghiệm thu trong phạm vi local; Docker/VPS là bước riêng chưa thực hiện. Công việc ở [todo.md](todo.md). Kế hoạch thuê theo ngày đã hoàn tất được lưu nguyên tại [archive/rent-day-2026-10-16-plan.md](archive/rent-day-2026-10-16-plan.md) và checklist tương ứng.

## Mục tiêu và bối cảnh trước tích hợp

Tách tác vụ nền sang worker Node.js riêng, dùng BullMQ lưu queue trên Redis. Giai đoạn 1 chuyển gửi email và bổ sung quét đơn hết hạn; giai đoạn 2 đồng bộ album Google Drive. MongoDB vẫn giữ dữ liệu nghiệp vụ và các yêu cầu công việc cần phục hồi. Không chuyển ghi nhận tiền, kiểm tra lịch/tồn kho hay xác nhận đơn sang queue.

Tại thời điểm lập kế hoạch đã đối chiếu: `models/EmailOutbox.ts` có dedupeKey, attempts, nextAttemptAt, lease và kết quả nhà cung cấp; `services/email.ts` quét 15 giây trong tiến trình API, gửi Resend dùng idempotency key và cửa sổ bất định 23 giờ. `app.ts` và `bookingExpiry.ts` chạy các timer expiry. `routes/bookingAlbum.ts`, `services/bookingAlbum.ts`, `conceptAlbum.ts`, `driveAlbumSource.ts` tải danh sách Drive trước khi lưu snapshot có kiểm tra phiên bản. Các đường dẫn trên thuộc `backend/src`.

Local đang dùng MongoDB Windows có xác thực/replica set và database studio_db. Đã có Dockerfile/Compose nhưng chưa coi stack container là đã được kiểm chứng cho cấu hình hiện hành.

## Kiến trúc đích

[Sơ đồ SVG](../docs/architecture/yume-bullmq-redis.svg) và [PNG](../docs/architecture/yume-bullmq-redis.png) đã được cập nhật theo kiến trúc logic đang triển khai local. Vite phục vụ local; Nginx dành cho phương án triển khai đã kiểm chứng.

1. API kiểm tra quyền và xử lý nghiệp vụ, ghi dữ liệu cùng yêu cầu email vào MongoDB trong transaction hiện có. Không gọi Redis trong transaction; không giả định transaction phân tán MongoDB–Redis.
2. Dispatcher đọc yêu cầu đến hạn sau commit, enqueue BullMQ. Redis giữ trạng thái queue và lịch chạy; MongoDB giữ trạng thái nghiệp vụ và yêu cầu chưa hoàn tất để đối chiếu/khôi phục.
3. Worker riêng dùng chung service nghiệp vụ, xử lý email, expiry và sau đó album. Job chỉ chứa ID/loại/schemaVersion, không chứa token hoặc nội dung email.
4. Worker cập nhật kết quả về MongoDB. Giao diện đọc trạng thái qua API có quyền; trình duyệt không truy cập Redis.

| Queue       | Payload dự kiến              | Công việc                                      | Giai đoạn |
| ----------- | ---------------------------- | ---------------------------------------------- | --------- |
| email       | schemaVersion, outboxId      | Xử lý đúng một email còn hợp lệ                | 1         |
| maintenance | schemaVersion, loại lần quét | Gọi hàm expiry đang có theo thời gian hiện tại | 1         |
| album-sync  | schemaVersion, operationId   | Đồng bộ yêu cầu album đã lưu bền vững          | 2         |

Prefix phải riêng theo môi trường/database; API và worker cùng prefix, phiên bản payload và mode. jobId dùng ID/hash ổn định không có dấu hai chấm, không lấy thẳng dedupeKey đang chứa `:`. Redis chỉ dùng cho queue trong phạm vi này, chưa bổ sung cache.

## Hợp đồng gửi email và phục hồi

Tách processor xử lý một outboxId; giữ lease, kiểm tra tài khoản/email/mode, trạng thái đơn, deadline cọc và khóa Resend. Không đưa hàm batch quét 20 email vào từng job; không nuốt lỗi rồi báo BullMQ thành công.

BullMQ điều phối retry có backoff; processor trả kết quả thành công/bỏ qua hoặc phân loại lỗi tạm thời/dứt điểm. Chỉ có một cơ chế lên lịch retry chủ động. MongoDB lưu tổng attempts, firstAttemptAt, nextAttemptAt và trạng thái cuối qua cả job được tạo lại. Không reset cửa sổ 23 giờ hoặc tự gửi lại delivery_unknown khi ngoài cửa sổ chống trùng của nhà cung cấp.

Giữ lease và cập nhật có điều kiện trong MongoDB; dùng cùng khóa gửi Resend qua mọi retry. Queue có thể thực thi lại job sau crash, không tuyên bố gửi đúng một lần tuyệt đối. jobId chỉ chống thêm trùng khi job còn tồn tại trong Redis; idempotency nghiệp vụ vẫn bắt buộc sau retention hoặc mất queue.

Dispatcher đối chiếu được ba tình huống: commit trước enqueue; enqueue trước ghi nhận kết quả; Redis mất job sau khi đã đánh dấu queued. Không chỉ dựa vào queued=true. Recovery chỉ enqueue công việc còn đủ điều kiện, đúng nextAttemptAt, giới hạn lần thử và thời hạn; sent/skipped/delivery_unknown/lỗi dứt điểm không bị tự khởi động lại. Job failed được lưu để điều tra, không có vòng quét enqueue lại vô hạn. Dừng worker sau nhà cung cấp nhận nhưng trước ghi MongoDB phải giữ trạng thái bất định và cùng idempotency key.

## Hết hạn và thanh toán

Scheduler chỉ kích hoạt quét; deadline thực lấy từ MongoDB và thời gian hiện tại. Giữ kiểm tra expiresAt trên API và countdown hiện có. Đợt đầu giữ sweeper API làm dự phòng có kiểm soát, gọi trùng phải vô hại nhờ điều kiện/version/transaction. Queue trễ hoặc Redis down không làm QR hết hạn dùng được, giải phóng nhầm đơn đã cọc hay mất khoản tiền đã nhận.

Webhook SePay vẫn xác thực HMAC, chống lặp và ghi tiền trong transaction hiện tại. Chỉ email/thông báo sau commit đi qua outbox; không trả thành công trước khi chứng từ cần thiết được lưu bền vững.

## Album giai đoạn 2

API kiểm tra quyền, request key, expectedVersion và lưu BackgroundOperation trước khi trả HTTP 202. Giao diện hiển thị pending/running/succeeded/failed, theo dõi qua API có quyền và giữ nguyên ảnh đang công bố trong lúc chờ. Không tạo thành công giả khi mới enqueue.

Worker kiểm tra lại quyền hiện tại, trạng thái đơn, nguồn Drive và phiên bản trước commit. Tải đủ danh sách ở ngoài transaction; commit snapshot bằng transaction ngắn. Giữ selections/notes và snapshot cũ khi lỗi quota, timeout, phân trang thiếu, version conflict hoặc quyền bị thu hồi. Đồng bộ xong không tự công bố hay bàn giao. Chưa chuyển tải ảnh/tạo ZIP sang queue; mở rộng cần hợp đồng riêng.

## Cấu hình và vận hành

- BACKGROUND_JOBS_MODE=legacy|bullmq, mặc định legacy; REDIS_URL và prefix theo môi trường. Worker entrypoint riêng không mở HTTP; mode/prefix không khớp phải báo lỗi. Không log URL có mật khẩu.
- Khóa phiên bản BullMQ/client/Redis tương thích runtime qua Q01; không dùng tag latest. Producer có thời gian chờ hữu hạn; worker reconnect, bắt error và đóng nhẹ nhàng khi SIGINT/SIGTERM.
- Redis dùng AOF, volume bền vững, noeviction, healthcheck, giới hạn bộ nhớ và mạng private/loopback có quyền truy cập. Không ghép chung cache có chính sách eviction. Không mở cổng Redis public.
- Local thêm overlay chỉ chạy Redis; API/worker tiếp tục dùng MongoDB Windows đang chọn. Không khởi chạy MongoDB thay thế, không đổi URI/database chính.
- VPS là phương án riêng: Nginx phục vụ React/proxy API; API/worker cùng build; Redis private, MongoDB replica set, volume ảnh bền vững. Không tự chuyển local DB hay thay cấu hình Resend/SePay.
- Đo waiting/active/failed, tuổi job chờ, heartbeat worker, lỗi Redis và email bất định. Log correlation ID không chứa bí mật. Completed có retention giới hạn, failed giữ lâu hơn. Retry thủ công nếu thêm chỉ dành quản trị 0/1, vẫn kiểm tra điều kiện hiện tại.

## Thứ tự và checkpoint

Q01 dependency/Redis cô lập → Q02 worker/config → Q03 processor email → Q04 dispatcher/cutover. Checkpoint A: email, outage, crash và rollback đạt. Q05 maintenance; checkpoint B: cạnh tranh expiry/thanh toán đúng. Q06a API operation → Q06b UI trạng thái → Q07 album worker; checkpoint C: bảo toàn snapshot/quyền/version. Q08 vận hành, rehearsal và tài liệu. Chi tiết tiêu chí và file tại todo.md. Đây là thứ tự công việc, chưa cam kết số ngày khi chưa kiểm chứng rủi ro.

## Chuyển đổi và quay lại

Thử trên database/prefix cô lập trước. Cutover: ngừng nhận việc legacy, chờ/đối chiếu lease, kiểm tra tương thích rồi bật dispatcher và BullMQ worker. Không chủ ý chạy hai đường gửi cùng lúc; lease là lớp phòng vệ.

Rollback: pause queue, dừng dispatcher, đóng worker với timeout, chờ/đối chiếu lease rồi chuyển legacy dùng nguyên outbox. Pause không đồng nghĩa active job đã kết thúc. Không reset attempts/firstAttemptAt hoặc xóa queue để gửi lại. Job cũ trong Redis không được chạy khi mode không khớp và cần đối chiếu trước lần bật lại.

## Kiểm chứng và ranh giới

Test MongoDB commit khi Redis down rồi phục hồi; crash trước/sau enqueue và trước/sau nhà cung cấp nhận; hai dispatcher/worker; queue mất dữ liệu; retention; retry hết hạn/failed terminal; shutdown; cutover/rollback. Test expiry cạnh tranh đủ/thiếu cọc, hủy, giữ kho/lịch, không tạo giao dịch/lịch trùng. Test album 202, quyền thu hồi, version cũ, Drive quota/phân trang, snapshot và phiên đăng nhập hết hạn.

Build backend/frontend và chạy test email-config, sandbox-startup, email-notifications, booking-expiry, package-booking, rental-auto-checkout, sepay-deposits, album và quyền tương ứng, với worker test concurrency thấp. Component/browser test khi thay UI. Không coi bộ test tổng đạt nếu còn lỗi.

Không seed/reset studio_db, FLUSHALL/FLUSHDB, gửi Resend hoặc chuyển tiền thật để thử lỗi. Dùng transport giả, database và Redis prefix test đã xác minh trước cleanup. Giữ vai trò 0/1/3/6, quyền ownership/phân công, tài nguyên và mọi điều kiện nghiệp vụ. Không phục hồi sale/kế toán, không tự nâng quyền hay bật mô phỏng thanh toán trên database chính.

## Tham chiếu kỹ thuật

- [Connections](https://docs.bullmq.io/guide/connections): producer/worker có yêu cầu retry kết nối khác nhau.
- [Going to production](https://docs.bullmq.io/guide/going-to-production): AOF, noeviction, log, shutdown, retention.
- [Idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs): chịu được thực thi lại.
- [Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs): attempts/backoff/jitter.
- [Job IDs](https://docs.bullmq.io/guide/jobs/job-ids): giới hạn ký tự và chống trùng khi job còn lưu.
- [Job schedulers](https://docs.bullmq.io/guide/job-schedulers): đối chiếu API với phiên bản được khóa khi thực hiện.

## Kết quả thực hiện ngày 25/11/2026

Đã khóa BullMQ 5.81.6/ioredis 5.11.1, thêm Redis WSL 7.0.15 có mật khẩu/AOF/noeviction trên 6385 và worker backend riêng cho cả ba queue. API lưu operation trước 202; dispatcher phục hồi từ MongoDB; worker kiểm tra quyền/version hiện tại và commit album cùng kết quả operation. UI theo dõi trạng thái, giữ nội dung cũ khi lỗi và dừng polling khi hết phiên.

Đã bật BullMQ trên studio_db hiện tại bằng launcher có sao lưu, kiểm tra mode/namespace và heartbeat. Chỉ thay ba khóa queue; không đổi MongoDB URI, chế độ Resend, SePay provider Test, tài khoản, seed hay số liệu nghiệp vụ. Đã thử dừng nhẹ nhàng rồi khởi động lại worker. Default của mã nguồn vẫn legacy; test thông thường dùng preload riêng, không kế thừa opt-in/provider từ .env local.

Bằng chứng: 97/97 kiểm tra backend liên quan ở lượt nghiệm thu cuối (queue, album, email/config, expiry, rental, SePay và quyền); 13 test frontend; build backend/frontend, lint/TypeScript và browser desktop/mobile với API giả. Chi tiết fixture sửa, phạm vi fault tests, audit dependency và các giới hạn được ghi ở [todo.md](todo.md) và [runbook](../docs/background-jobs.md). Không tuyên bố toàn bộ suite backend, Docker hoặc production đạt.

Đã cập nhật sơ đồ kiến trúc và báo cáo Word v05, 22 trang được render và kiểm tra toàn bộ, tiêu đề đen. Tài liệu thiết kế phía trên giữ hợp đồng/thứ tự thực hiện; kết quả và giới hạn nghiệm thu trong mục này cùng runbook là trạng thái hiện hành.
