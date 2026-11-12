# ADR-019: Trạng thái thực hiện theo khung giờ chụp

## Trạng thái và ngày

Accepted — 12/11/2026, Asia/Bangkok. Thay thế phần ánh xạ `active` và tiến độ trong ADR-011.

## Bối cảnh

Theo yêu cầu người dùng, “Đang thực hiện” chỉ áp dụng trong khung giờ chụp của chính hồ sơ. Việc gộp hậu kỳ và chỉnh sửa vào trạng thái này khiến đơn vẫn báo đang thực hiện ngoài buổi chụp.

## Quyết định

- Lấy lịch thực tế qua `workflow.resources.schedule`, tính theo `Asia/Ho_Chi_Minh`; không dùng lịch đề xuất hoặc thời gian yêu cầu ban đầu để kích hoạt trạng thái.
- Với workflow đã chốt lịch/đang chụp/hậu kỳ/chỉnh sửa: trước giờ bắt đầu là `confirmed` (Đã chốt lịch); từ giờ bắt đầu đến trước giờ kết thúc là `active` (Đang thực hiện); từ giờ kết thúc là `editing` (Đang hậu kỳ).
- Thiếu lịch hợp lệ không bao giờ hiển thị `active`. Các trạng thái chờ duyệt, từ chối, hủy, đã bàn giao và hoàn tất vẫn giữ ưu tiên nghiệp vụ. Yêu cầu thay đổi dùng `previousLifecycle` và lịch đang có hiệu lực.
- Summary và workflow DTO thêm `shootWindow: { startAt, endAt } | null`. Bộ lọc `stage=active` và `stage=editing` dùng cùng điều kiện trước phân trang. Giao diện tự cập nhật theo đồng hồ và tải lại bộ lọc khi hồ sơ hiển thị qua mốc thời gian hoặc cửa sổ nhận focus.
- Tiến độ dùng bảy mốc, thêm Đang hậu kỳ sau Đang thực hiện. Không tự thay đổi lifecycle lưu trong cơ sở dữ liệu hay tự đánh dấu bàn giao/hoàn tất.

## Hệ quả và kiểm chứng

Không cần migration. Kiểm thử bao gồm trước/bằng/sau hai biên, múi giờ Việt Nam, lịch riêng từng hồ sơ, thiếu lịch, trạng thái kết thúc, đối chiếu summary/chi tiết/bộ lọc và phân trang với MongoDB tạm riêng.
