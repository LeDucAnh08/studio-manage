# Vận hành BullMQ và Redis

Triển khai ngày 25/11/2026. BullMQ 5.81.6 và ioredis 5.11.1 được khóa trong package/lockfile. Ba queue: email, maintenance, album-sync. API và worker dùng chung mã backend; worker chạy từ `backend/dist/workers/main.js`, không mở HTTP listener. Mặc định mã nguồn vẫn là legacy nếu chưa cấu hình opt-in.

## Môi trường local hiện tại

Máy có Redis 7.0.15 trong Ubuntu WSL, chưa có Docker executable. Instance dành cho ứng dụng dùng cổng loopback 6385, instance test dùng 6386. Cả hai có mật khẩu riêng, AOF/everysec, noeviction và giới hạn 256 MB. Dữ liệu/cấu hình/PID/log nằm trong `.workflow-tools/background-jobs`, không đưa vào Git. Không dùng Redis này làm cache có eviction.

MongoDB chính tiếp tục là studio_db trên Windows theo backend/.env; không chạy MongoDB thay thế. Cấu hình Resend thật và SePay provider Test do người dùng chọn được giữ nguyên; không bật mô phỏng thanh toán nội bộ.

## Khởi động và cập nhật

Tại thư mục gốc, chạy lần lượt:

```powershell
yarn jobs:redis
yarn workspace studio-management-backend build
yarn dev
```

Lần đầu chuyển từ legacy, mở terminal khác sau khi API đã sẵn sàng:

```powershell
yarn jobs:enable
```

Lệnh enable kiểm tra Redis, lease email và database Windows hiện tại, sao lưu .env vào thư mục ignored, chỉ thêm/sửa BACKGROUND_JOBS_MODE, REDIS_URL và BACKGROUND_JOBS_PREFIX. Lệnh chạm timestamp app.ts để nodemon nạp lại cấu hình, chờ API đăng ký đúng namespace rồi khởi động worker. Nếu API không nạp được, lệnh khôi phục nguyên .env trước lần thử đó. Lệnh không seed, không đổi chế độ email/thanh toán hay chủ động gửi email thử trên database chính.

Sau lần bật đầu, khi worker đã dừng hoặc sau khi khởi động lại Windows:

```powershell
yarn jobs:redis
yarn jobs:start
yarn jobs:status
```

API cần được khởi động bằng yarn dev như trước. Worker local được chạy nền ẩn, dùng bản build hiện tại; sau khi sửa processor/service cần build lại, dừng worker rồi start lại. Không chạy thêm worker legacy, worker:dev hoặc email:outbox process song song với worker BullMQ.

```powershell
yarn jobs:stop
yarn workspace studio-management-backend build
yarn jobs:start
```

jobs:stop đối chiếu PID với heartbeat MongoDB rồi yêu cầu đúng instance tự đóng. Worker ngừng nhận job mới, chờ công việc đang chạy và đóng kết nối; có giới hạn thời gian. Nếu chưa dừng được, lệnh báo lỗi, không tự taskkill tiến trình khác. jobs:status kiểm tra Redis và PID; xác nhận sức khỏe đầy đủ qua endpoint quản trị bên dưới.

## Theo dõi

GET /api/background-jobs/health chỉ cho quản trị 0/1. Trả mode, heartbeat gần nhất, số waiting/active/delayed/failed và oldestWaitingAgeMs của từng queue (null khi không có job chờ), không trả credential, nội dung email hoặc dữ liệu album. Nếu Redis chưa sẵn sàng thì endpoint trả lỗi có giới hạn thời gian. Log worker ở `.workflow-tools/background-jobs/worker.log`.

Đối chiếu heartbeat còn mới trong khoảng 20 giây, job failed và thời gian chờ khi điều tra. Instance hiện tại chỉ cung cấp dữ liệu/log để vận hành, chưa có dịch vụ cảnh báo chủ động bên ngoài. Hoàn tất giữ tối đa 24 giờ/1.000 job, lỗi giữ tối đa 7 ngày/2.000 job mỗi queue; MongoDB giữ kết quả nghiệp vụ lâu hơn Redis.

GET /api/background-jobs/operations/latest?service=yearbook|concept&orderId=ID và /operations/:id kiểm tra quyền ekip/quản trị hiện tại. Không cho khách hàng, thợ không được phân công hoặc tài khoản đã vô hiệu hóa đọc trạng thái tác vụ studio. Các API tạo operation cũng giữ quyền và feature gates hiện có.

## Đảm bảo dữ liệu

EmailOutbox được lưu trong cùng transaction với thay đổi nghiệp vụ. Dispatcher chỉ enqueue sau commit; job chứa schemaVersion và ID, không chứa nội dung email/token. Processor xử lý một ID, giữ lease và khóa Resend; attempts và cửa sổ 23 giờ được giữ qua cả retry/khôi phục queue. Tổng số lần gửi tối đa 10; failed/delivery_unknown/skipped/sent không được vòng quét tự khởi động lại. Chạy lại có thể xảy ra sau crash, không bảo đảm exactly-once tuyệt đối với nhà cung cấp bên ngoài.

Đồng bộ album trả 202 sau khi BackgroundOperation đã được lưu. Chỉ một operation còn active cho mỗi album. Worker tải đủ Drive ở ngoài transaction, kiểm tra lại tài khoản/quyền/phân công/version và lease trước khi áp dụng. Snapshot album và trạng thái succeeded của operation commit cùng transaction. Lỗi giữ nguyên ảnh đang công bố, lựa chọn và ghi chú; job tạm thời thử tối đa 5 lần. Lỗi quyền/phiên bản/đầu vào là dứt điểm; giao diện cho phép chỉnh và gửi yêu cầu mới bằng mã mới.

Dispatcher phục hồi yêu cầu chưa xong khi crash giữa commit/enqueue hoặc khi Redis mất job. Dedupe bằng jobId không thay thế kiểm tra trạng thái MongoDB. Queue failed được chốt failed/delivery_unknown, không enqueue vô hạn. Không dùng FLUSHALL hoặc FLUSHDB để xử lý lỗi; chỉ thao tác queue/prefix đã xác minh và có bản sao lưu.

maintenance gọi các service expiry hiện có theo thời gian hiện tại. API tiếp tục kiểm tra deadline/tài nguyên và giữ sweeper dự phòng. Webhook HMAC, ghi nhận tiền, xác nhận lịch và giữ kho vẫn dùng transaction hiện có; Redis down không tạo thêm tiền hoặc gia hạn QR.

## Thử lại và quay về legacy

Album lỗi: xem thông báo, tải lại album nếu version đổi, giữ nội dung đang nhập và gửi lại bằng nút hiện có. Người mất quyền phải được xử lý quyền trước, không sửa job payload để vượt quyền.

Email lỗi: kiểm tra log nhà cung cấp và trạng thái MongoDB. CLI email:outbox retry chỉ cho failed trong cửa sổ gốc, còn ngân sách thử; giữ payload/key/firstAttemptAt/attempts. Khi BullMQ bật, CLI không tự xử lý cả batch. delivery_unknown hoặc trường hợp đã hết hạn chống trùng cần đối soát, không reset firstAttemptAt hay đánh dấu sent tùy ý.

Rollback có kiểm soát:

1. Chờ operation album pending/running hoàn tất; không chuyển mode trong lúc album chưa được xử lý. Nếu Redis đang hỏng, phục hồi Redis hoặc điều tra operation trước, không tự xóa yêu cầu.
2. Chạy jobs:stop và xác nhận worker đã dừng; đối chiếu lease sending/running. Không coi pause là active job đã xong.
3. Chỉ đổi BACKGROUND_JOBS_MODE=legacy trong backend/.env, giữ nguyên mọi cấu hình khác; khởi động lại API/nodemon. API ghi mode legacy vào backgroundjobruntime và worker cũ bị chặn trước khi thực thi.
4. Legacy dùng cùng outbox và mốc thời gian đã lưu. Giữ Redis/AOF và các job cũ để đối chiếu; không reset số lần thử. Khi bật lại, job đã có kết quả được bỏ qua theo MongoDB.

Luồng rollback/mode barrier, synchronous fallback cho cả hai loại album và khôi phục job đã được kiểm tra trên database/prefix cô lập. Không diễn tập gửi email thật hoặc thay đổi thanh toán trên studio_db.

## Docker và triển khai máy chủ

docker-compose.queue.yml chỉ có Redis, image Redis 7.4-alpine đã khóa digest; không khởi động MongoDB. Cần file `.workflow-tools/background-jobs/docker-redis.conf` sinh từ cấu hình local (jobs:redis tạo file này trước khi thử khởi động WSL). Sau đó có thể dùng docker compose -f docker-compose.queue.yml up -d trên máy có Docker, dùng chính endpoint loopback 6385. Không chạy đồng thời Redis WSL và Docker trên cùng cổng.

Trên máy này đã kiểm chứng Redis WSL thật, chưa build/chạy Docker vì không có executable. Docker/VPS hoàn chỉnh là bước triển khai riêng: API và worker cùng image/backend build, Redis private, MongoDB replica set và volume ảnh bền vững. Không dùng nguyên .env local provider Test để đưa lên production hoặc tự di chuyển studio_db.

## Bằng chứng kiểm tra

`audit/bullmq-integration-2026-11-25`: 97/97 kiểm tra backend liên quan trong backend-final.log, 13 test giao diện và Chromium desktop/mobile. Test backend dùng MongoDB replica set dùng một lần, Redis cổng 6386 và transport/Drive giả; không gọi email/payment thật. Browser chạy component thực với API giả, không được mô tả là browser end-to-end qua backend thật.

Yarn audit đã chạy trên lockfile: không có advisory thuộc chuỗi BullMQ/ioredis/msgpackr. Toàn bộ workspace vẫn có advisory cũ, gồm hai critical ở proxy-addr và mongoose; xem audit-summary.json và dependency-audit.jsonl. Không coi audit toàn workspace là sạch hoặc coi Docker/production đã sẵn sàng phát hành chỉ dựa trên việc queue local chạy.

## Chạy test sau khi đã bật local

Các script test backend nạp tests/environment.cjs trước dotenv: mặc định legacy và tắt provider; từng suite tích hợp tự chọn queue/provider giả. ops/run-concept-tests.cjs cũng nạp preload này, dùng replica set cô lập và concurrency 1. Không dùng .env của ứng dụng thật để gửi email hoặc thử thanh toán trong test. Test queue cần Redis test đã chạy và quyền WSL cho tình huống restart; nếu sandbox chặn WSL thì lượt đó không được tính là đạt.
