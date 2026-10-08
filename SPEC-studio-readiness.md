# Kiểm tra dữ liệu trước nghiệm thu/rollout

Tiếp nối bước nghiệm thu đã có trong IMPLEMENTATION_PLAN.md. Công cụ mới chỉ đọc MongoDB, không tự sửa dữ liệu, giải phóng kho, tạo index, ghi thanh toán hoặc bật flag.

## Đầu vào và kết quả

- `MONGO_URI` phải được cung cấp rõ và có tên database; không kiểm tra database mặc định `test` do thiếu tên. Không tự lấy URI từ .env, không in URI/credential hoặc tên/điện thoại/roster.
- `node ops/audit-studio-readiness.cjs [--out <file.json>]`. Có generatedAt, ngày VN, database, topology, số hồ sơ kiểm tra và findings theo mã. Giới hạn 20 ví dụ/mã; count vẫn đầy đủ. Exit 0 khi không có blocker; 2 khi cần xử lý; 1 khi không kết nối/tham số sai.
- `ready` chỉ xác nhận các kiểm tra dữ liệu/topology, không xác nhận UAT, backup/restore hay transaction thực tế bằng credential của backend. Đọc khi studio tạm ngừng thao tác để tránh cảnh báo tạm thời giữa các truy vấn.

## Các kiểm tra

1. Replica set/mongos, primary và các unique index chống trùng booking, rental, schedule, payment. Chỉ list index, không tạo index.
2. Lịch tương lai/đang chiếm hàng: thời gian, nhân sự role3 đang hoạt động, trùng nhân sự theo khoảng nửa mở; allocations duy nhất mẫu–size, số lượng/ngày hợp lệ, bao phủ ngày chụp và khớp mẫu chọn.
3. Tồn tốt theo mẫu–size; phân bổ từ Schedule và rental confirmed/checked_out cộng chung, không cộng bản sao workflow. Ngày nhận/trả đều giữ hàng. Đơn quá hạn chưa trả có hold tới vô hạn cho kiểm tra nguồn lực tương lai. Vượt tồn là blocker cần bố trí nguồn lực, không tự đảo việc trả hỏng/mất.
4. Workflow và Schedule có liên kết hai chiều, customer/nhân sự/phân bổ/quote chốt khớp; hủy giải phóng schedule. Không tự suy owner từ tên/điện thoại.
5. Payment và Transaction khớp hai chiều về chủ hồ sơ, payment ID, transaction ID, amount, type và ngày VN. Giao dịch thiếu/hai liên kết hoặc orphan là blocker; giao dịch legacy hoàn toàn chưa liên kết hợp lệ là warning để đối chiếu, không gán dịch vụ.
6. Quote/cancel/settlement đã đồng ý và số tiền hợp lệ; hoàn tất phải nghiệm thu/đối soát, nhận trả và thu ròng đúng giá cuối. Không yêu cầu payment/handover cũ phải sau thời điểm đồng ý quote hiện tại vì có sửa/gia hạn.
7. Giao/nhận trả có ngày thực tế và đủ tổng tốt/hỏng/mất theo từng dòng. Completed rental không còn giữ kho. Nợ/hoàn còn mở, quá hạn, missed handover và chờ đối soát là warning vận hành, không tự xem là dữ liệu hỏng.

## Nghiệm thu công cụ

Fixture Mongo local riêng, có index thật theo model. Xác nhận clean dataset, missing index, trùng nhân sự/kho, overdue hold, ảnh mirror không đếm đôi, partial/orphan/mismatch payment, trả thiếu/chưa đối soát và completed sai. Chụp dữ liệu trước/sau để chứng minh không ghi. Test không dùng database studio.

## Cấu hình rollout

Frontend portal/rental flags phải truyền bằng Docker build args để có thể bật/tắt rõ, không phụ thuộc file .env trong build context. Giữ mặc định portal true như ứng dụng hiện tại; rental false. Overlay replica-set lấy backend workflow/rental flags từ root .env và mặc định false; CLIENT_PORTAL_ENABLED tiếp tục lấy backend/.env. Ghi rõ ưu tiên này trong runbook. Local không dùng Compose vẫn đọc backend/.env và frontend/.env. Không sửa file chứa secret hoặc deploy trong bước chuẩn bị.
