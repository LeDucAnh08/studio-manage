# ADR-037: BullMQ và Redis cho tác vụ nền

## Trạng thái

Chấp nhận theo yêu cầu ngày 25/11/2026; triển khai và kiểm chứng local. Kiểm chứng môi trường/cutover cụ thể được ghi tại audit/bullmq-integration-2026-11-25.

## Bối cảnh

API đã có EmailOutbox lưu MongoDB, worker email và timer expiry trong cùng tiến trình. Đồng bộ album Drive còn giữ request HTTP trong lúc tải danh sách. Người dùng yêu cầu triển khai thiết kế BullMQ + Redis và kế hoạch 9 task, giữ database, quyền và cấu hình thanh toán/email.

## Quyết định

Dùng BullMQ 5.81.6 và ioredis 5.11.1 đã khóa phiên bản. Redis điều phối queue, không làm nguồn dữ liệu tiền/tồn kho. Worker riêng dùng cùng service với API; ba queue email/maintenance/album-sync. MongoDB outbox và BackgroundOperation là nguồn phục hồi công việc. Namespace được dẫn xuất từ database/host/môi trường/mode email, kèm prefix kiểm tra hợp lệ.

Chọn nhánh release-v5.x đã kiểm chứng API scheduler/connections thay vì đổi đồng thời lên major 6. Redis local có sẵn qua Ubuntu WSL được tách instance có mật khẩu/AOF/noeviction; Compose Redis khóa digest là phương án cho máy có Docker.

## Hợp đồng

- Bảo toàn transaction tiền/tài nguyên và deadline, HMAC webhook, bốn role 0/1/3/6, quyền sở hữu và phân công. API/timer expiry vẫn kiểm tra an toàn khi queue trễ hoặc Redis down.
- Không dual-write MongoDB–Redis trong transaction: lưu yêu cầu bền vững trước, dispatcher enqueue sau. Job chỉ mang ID/schemaVersion. Khôi phục phải giữ trạng thái cuối, giới hạn retry và cùng provider key; không giả định exactly-once.
- Operation album trả 202, kiểm tra quyền ở API và worker trong transaction. Snapshot và trạng thái succeeded commit cùng nhau; giữ ảnh/lựa chọn/ghi chú nếu lỗi. Chỉ chuyển sync, không tự chuyển publish/delivery/ZIP sang queue.
- Mode mặc định legacy. API đăng ký mode/namespace; worker phải khớp và bị chặn sau rollback. Cutover/drain/rollback có hướng dẫn, không reset lịch sử gửi hoặc xóa Redis để thử lại.

## Hệ quả và giới hạn

Thêm dịch vụ Redis và tiến trình worker cần khởi động/giám sát. Đã cung cấp heartbeat, queue counts, log, retention, lệnh start/stop/enable và hướng dẫn vận hành; chưa có cảnh báo bên ngoài. Redis hỏng không chặn commit nghiệp vụ, nhưng email và sync chờ phục hồi. Email bất định cần đối soát nhà cung cấp khi hết cửa sổ chống trùng.

Docker/production chưa được chạy trên máy thiếu Docker; không tự chuyển MongoDB Windows hoặc phát hành VPS. Các advisory cũ của workspace được ghi riêng; không có advisory trong dependency chain queue mới tại lần kiểm tra này.

Chi tiết và bằng chứng: [runbook](../background-jobs.md), [kế hoạch](../../tasks/plan.md), [checklist](../../tasks/todo.md).
