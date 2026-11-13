# ADR-025: Dashboard thống kê của thợ chụp

## Trạng thái và ngày

Accepted — 13/11/2026, theo mockup đã duyệt sau khi bỏ “Lịch chụp gần nhất”.

## Quyết định

- Workspace cá nhân của thợ dùng dashboard riêng tại `/`; quản lý và kế toán giữ dashboard hiện có. Sáu chỉ số, biểu đồ cột chồng Concept/Kỉ yếu và ba hồ sơ ưu tiên thay thế lịch gần nhất. Không khôi phục “Lịch bận của tôi”.
- `GET /api/dashboard/photographer` yêu cầu role 3, nhận `period=month|previous|quarter|year`, `service` rỗng/concept/yearbook, `season`, `metric`, `group`, `page`. Dùng chung pipeline phân công với danh sách đơn: thợ chính/phụ/ekip kỉ yếu và thợ/hậu kỳ concept. Mọi nhánh bị giới hạn theo ID đăng nhập, kể cả người có thêm role kế toán; không chấp nhận ID người khác để mở rộng phạm vi.
- Khoảng kỳ và mốc ngày theo giờ Việt Nam. Bộ lọc mùa dựa trên ngày chụp trong khoảng ngày của mùa. Không phân trang trước khi tính tổng; drilldown phân trang 20 hồ sơ sau khi chọn đúng tập thống kê.
- “Buổi chụp” chỉ tính lịch đã xác nhận/thực hiện, không tính đề xuất, đơn chờ duyệt/cọc, hủy/từ chối hoặc phân công chỉ làm hậu kỳ. “Sắp tới” lấy khung giờ thực trong 7 ngày tiếp theo và trong kỳ đã chọn. Biểu đồ dùng cùng tập buổi chụp và cùng bộ lọc.
- “Chờ nghiệm thu” nhận album concept đã delivered và workflow kỉ yếu đã bàn giao nhưng chưa được chấp nhận. Không đếm chúng là đang hậu kỳ. “Hoàn thành” dùng ngày sự kiện `workflow.completed` hoặc `album.accept`; không dùng ngày chụp/updatedAt để thay thế ngày hoàn tất còn thiếu ở dữ liệu cũ.
- “Quá hạn” chỉ tính hồ sơ đang hậu kỳ có hạn bàn giao cụ thể trước ngày Việt Nam hiện tại. Hạn của hôm nay chưa bị quá hạn. Kỉ yếu dùng hạn trong báo giá đã lưu; concept hiện chỉ có mô tả thời hạn, nên không tự suy diễn ngày từ văn bản. Hồ sơ thiếu hạn hiển thị “Chưa có hạn bàn giao”, nằm sau hồ sơ có hạn trong danh sách ưu tiên.
- Bấm chỉ số/cột biểu đồ mở danh sách ngay trong dashboard. Khi mở hồ sơ thật rồi quay lại, `bookingOrdersReturnTo` cho phép root nội bộ `/` hoặc `/?...` bên cạnh đường danh sách đơn hiện có. Giữ bộ lọc và trang; các Back không gạch chân và giữ focus bàn phím.
- Làm mới khi đổi bộ lọc, lấy lại focus hoặc đến mốc khung giờ/ngày tiếp theo; hủy/bỏ qua phản hồi cũ khi chuyển tài khoản hoặc bộ lọc. Không thêm thư viện, không ghi dữ liệu nghiệp vụ hay thay đổi cấu hình thanh toán.

## Kiểm chứng

Kiểm thử số liệu với hơn một trang lịch, biên tháng Việt Nam, thợ phụ/hậu kỳ, chờ nghiệm thu, ngày hoàn tất, hạn hôm nay/thiếu hạn, tổng biểu đồ và trang drilldown. Kiểm thử HTTP về quyền/scope của cả hai nhánh, nhiều vai trò và query không hợp lệ. Kiểm thử UI về bộ lọc, lỗi/thử lại, phản hồi cũ, drilldown và Back. Dashboard quản lý/tài chính được kiểm tra hồi quy. Bằng chứng trình duyệt/đối chiếu ở `audit/photographer-dashboard-2026-11-13`; báo cáo tại `design-qa.md`.
