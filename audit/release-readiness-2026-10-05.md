# Kiểm chứng chuẩn bị nghiệm thu — 05/10/2026

Phạm vi: chuẩn bị nghiệm thu hai dịch vụ chụp/thuê và báo cáo theo IMPLEMENTATION_PLAN.md. Hoàn thành công cụ đối soát, cấu hình build/rollout, bộ UAT và regression local; chưa nghiệm thu dữ liệu studio hoặc triển khai production.

## Thay đổi

- `ops/audit-studio-readiness.cjs`: đọc MongoDB bằng native driver, không import model để tránh tự tạo index. Kiểm tra topology/primary, unique index, lịch nhân sự, tồn tốt mẫu–size dùng chung, liên kết hai chiều hồ sơ–Schedule và payment–Transaction, bằng chứng đồng ý/hủy/hoàn tất, giao–nhận trả. Đơn thuê quá hạn vẫn giữ kho; gia hạn sau giao hợp lệ có thể tạo nợ mới mà không làm sai lần giao trước.
- Findings có mã/severity/count và tối đa 20 ví dụ mỗi mã; không trả roster, tên/điện thoại, bank instructions, command key hoặc URI/credential. `MONGO_URI` phải được đặt rõ gồm tên database. `--out` ghi file bằng chứng mới và từ chối ghi đè. Exit 0/2/1 lần lượt là không blocker/có blocker/lỗi kiểm tra.
- `frontend/Dockerfile` và base Compose truyền cả portal/rental bằng build args. Portal giữ mặc định true của phiên bản hiện tại; rental false. Replica overlay lấy workflow/rental backend flags từ root `.env`, mặc định false, ghi đè backend `.env`; portal backend tiếp tục dùng backend `.env`. Không thay đổi file `.env` thực tế.
- Sửa rollback: khi cả workflow/rental flags tắt, Schedule liên kết chụp ở trạng thái pending/confirmed/completed vẫn yêu cầu transaction và kiểm tra khả dụng cho API lịch/kho cũ. Trước đây trường hợp chỉ còn nguồn lực chụp, không có đơn thuê giữ hàng, có thể bỏ qua kiểm tra. Regression HTTP xác nhận tạo lịch trùng photographer/vượt tồn và cập nhật vào slot đã giữ đều bị 409; cập nhật thất bại giữ ngày cũ.
- Sửa lỗi ESLint trong kiểm tra đường dẫn trở về bằng cách giữ quy tắc loại control characters mà không dùng control-character regex. Thêm 3 test giữ context chụp/thuê và chặn destination không hợp lệ. Chuẩn hóa định dạng các file frontend còn làm full Prettier gate thất bại từ giai đoạn trước.
- `STUDIO_ACCEPTANCE.md` có 21 kịch bản UAT, bảng môi trường/phiên bản/backup/restore, cách xử lý findings, mở pilot, theo dõi và rollback giữ dữ liệu/replica set. Tất cả kết quả studio còn để Chưa chạy/Chưa có. Các release runbook dẫn về bộ nghiệm thu hiện tại.

## Kết quả local

| Gate | Kết quả |
|---|---|
| Backend contract + Mongo integration | 32/32 đạt |
| Frontend unit/component | 17/17 đạt |
| Audit nghiệp vụ/readiness/config trong `ops/tests` | 54/54 đạt |
| Chrome E2E | 4/4 đạt: intake giữ draft, thuê tới hoàn cọc, báo cáo trên mobile, chụp tới sửa/bàn giao/đối soát |
| Tổng kiểm thử | 107 đạt, không fail/skip |
| TypeScript backend/frontend | Đạt |
| Full frontend ESLint | Đạt, 0 error; còn 8 warning Fast Refresh/hook dependency đã có |
| Full Prettier backend/frontend | Đạt |
| Prettier các file audit/test mới và regression rollback | Đạt |
| Backend production build | Đạt (`tsc -p backend/tsconfig.json`) |
| Frontend production build | Đạt với portal/rental bật; build với cả hai tắt cũng đạt trong phiên này |
| Compose base + replica overlay | `docker compose ... config --quiet` exit 0; chỉ kiểm tra cấu hình, không build/start Docker |
| Audit code/config cuối | Không phát hiện blocker; sửa diễn đạt write flags và transaction theo từng command |

Các bài Mongo chỉ dùng replica set `rs0` ở `127.0.0.1:27028`. Harness xác nhận localhost và tên database cô lập trước khi xóa/tạo fixture: `studio_phase1_integration`, `studio_workflow_audit`, `studio_rental_audit`, `studio_report_audit`, `studio_workflow_readiness_audit`, `studio_readiness_audit`, `studio_phase1_e2e`. Không chạy seed hoặc ghi vào database studio.

Readiness tests so sánh dữ liệu/index trước–sau để xác nhận không ghi, không tạo index thiếu; kiểm tra thiếu index, trùng nhân sự/vượt tồn, lịch liền kề, completed không giữ nhân sự, quá hạn, gia hạn/nợ hợp lệ, mirror/cancel sai, payment mismatch/partial/dual/orphan, return/completion thiếu bằng chứng, dữ liệu malformed, giới hạn examples, receipt giao hàng, phí rút/hủy và CLI không ghi đè/redaction. File `.workflow-tools/readiness-*.json` sinh bởi test là bằng chứng trên fixture giả, không phải kết quả studio.

Các lệnh chính đã chạy từ thư mục tương ứng:

```text
backend: node --test tests/client-bookings.cjs tests/account-requests.cjs tests/costume-catalog.cjs tests/phase1-mongo-integration.cjs
root: node --test ops/tests/workflow-audit.cjs ops/tests/workflow-contract.cjs ops/tests/readiness-audit.cjs ops/tests/rental-audit.cjs ops/tests/report-audit.cjs ops/tests/studio-readiness-audit.cjs ops/tests/rollout-config.cjs
frontend: node ../node_modules/vitest/vitest.mjs run
frontend: node ../node_modules/@playwright/test/cli.js test
root: node node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
root: node node_modules/typescript/bin/tsc -p backend/tsconfig.json
frontend: node ../node_modules/typescript/bin/tsc --noEmit
frontend: node ../node_modules/eslint/bin/eslint.js .
backend/frontend: node ../node_modules/prettier/bin/prettier.cjs --check <src patterns>
frontend: node ../node_modules/vite/bin/vite.js build
root: docker compose -f docker-compose.yml -f docker-compose.workflow.yml config --quiet
```

Build còn cảnh báo dữ liệu Browserslist cũ và circular chunk vendor-charts/vendor-react; không thay đổi dependency hoặc chunk strategy trong phần chuẩn bị này. Compose cảnh báo trường version cũ và không đọc được Docker user config trong sandbox; parse/merge vẫn thành công. Chưa kiểm chứng Docker image hoặc service runtime.

## Điều kiện chưa hoàn thành

- Chưa chọn bản sao database studio/staging, chưa chạy audit trên dữ liệu thật.
- Chưa có xác nhận nghiệp vụ/kế toán/QA cho 21 kịch bản UAT, mobile/bàn phím hoặc điều khoản studio.
- Chưa có backup và restore thử, transaction commit bằng credential backend đích, image digest hay canary production.
- `ready=true` chỉ phản ánh kiểm tra dữ liệu/topology; `transactionCommitVerified=false` là chủ ý của công cụ chỉ đọc. Không dùng kết quả local để ký nghiệm thu studio.

HEAD tham chiếu lúc kiểm chứng: root `70ab6ee`, backend `fc19699`, frontend `98e93d1`; cả ba repository có thay đổi local, chưa phải SHA bản phát hành. Ghi SHA/digest thực tế khi chốt release. Chưa commit, push, bật flag thực tế, thay đổi hạ tầng hoặc deploy production.

Bước tiếp theo: chọn bản sao studio đã ẩn danh hoặc staging rõ ràng, chạy audit chỉ đọc, đối soát findings và thực hiện UAT theo [STUDIO_ACCEPTANCE.md](../STUDIO_ACCEPTANCE.md).
