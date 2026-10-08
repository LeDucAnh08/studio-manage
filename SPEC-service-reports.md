# Báo cáo dịch vụ và phân bổ kho

## Phạm vi đã được cho phép trong kế hoạch

Bổ sung trang đọc `/manage/reports` cho admin (0/1), kế toán (5); API `/api/reports/finance` và `/api/reports/inventory`. Không phụ thuộc cờ bật hành trình tạo đơn: báo cáo vẫn đọc hồ sơ đã tồn tại khi tắt cờ. Không sửa giao dịch hay dữ liệu nghiệp vụ.

## Định nghĩa

- Bộ lọc từ/đến ngày Việt Nam, gồm cả hai ngày, tối đa 366 ngày. Mặc định tháng hiện tại đến hôm nay. Ngày sai, mảng query, khoảng đảo hoặc quá dài trả 400.
- Thu/chi trong kỳ lấy duy nhất từ Transaction.date, phân loại bằng liên kết workflowBooking hoặc rentalOrder; không suy từ danh mục/khách hàng. Không cộng lại payments. Giao dịch không liên kết hoặc có hai liên kết giữ ở nhóm chưa phân loại. Thu thuê bao gồm cọc bảo đảm, không phải doanh thu.
- Giá trị chốt hiện tại lấy báo giá đã đồng ý; thuê dùng phí thuê, đối soát đã đồng ý hoặc phí hủy đã áp dụng. Chụp dùng giá cuối đã áp dụng hoặc báo giá. Không tính đề xuất chưa đồng ý và không cộng cọc thuê vào giá trị dịch vụ.
- Giá trị nghiệm thu/đối soát trong kỳ: chụp theo progress.acceptedAt; thuê theo settlement.acceptedAt; phí hủy theo thời điểm đồng ý hủy. Đây là báo cáo nghiệp vụ theo trạng thái hiện tại, không phải sổ doanh thu kế toán theo kỳ hoặc lịch sử snapshot. Không dùng updatedAt làm ngày hoàn tất. Trường hợp thiếu thời điểm đồng ý không gán ngày giả.
- Công nợ và hoàn tiền là ảnh chụp hiện tại của toàn bộ hồ sơ đã đồng ý, độc lập bộ lọc ngày thu/chi. Khoản còn thu thuê bao gồm cọc chưa thu trước nhận trả. Cọc đang bảo đảm = min(cọc thỏa thuận, tiền thu ròng), chỉ trước trả/hủy; tiền dư sau trả nhưng chưa đồng ý đối soát hiển thị riêng là chưa đối soát, không tự động coi là hoàn tiền.
- Drill-down phân trang 20: giao dịch theo kỳ, hồ sơ nghiệm thu/đối soát theo kỳ, còn thu hoặc cần hoàn toàn bộ hồ sơ; chọn dịch vụ. Trả mã hồ sơ và trạng thái, không trả roster/điện thoại/khóa retry. Khi frontend tắt hành trình, mã hồ sơ vẫn đọc được nhưng không dẫn vào route đang tắt.

## Kho

- Báo cáo phân bổ, không tuyên bố số lần mặc đồ thực tế. Nguồn chụp duy nhất là Schedule, trạng thái pending/confirmed/completed; không cộng bản sao trong BookingWorkflow.
- Theo mẫu–size: số sản phẩm × ngày trong khoảng nhận/trả gồm hai đầu, tách chụp và thuê. Thuê confirmed/checked_out dùng kỳ đã chốt; returned/completed dùng ngày giao/nhận trả thực tế nếu có. Đơn quá hạn đang giữ hàng kéo dài đến cuối khoảng báo cáo, giống quy tắc kiểm tra khả dụng hiện tại.
- Tỷ lệ = số sản phẩm × ngày / (tồn tốt hiện tại × số ngày). Đây là mức phân bổ so với năng lực hiện tại, không phải tỷ lệ sử dụng lịch sử với tồn lịch sử. Không chặn ở 100%; vượt tồn là cảnh báo.
- Lịch cũ thiếu phân bổ size/số lượng, dữ liệu ngày sai và tham chiếu mẫu đã mất có cảnh báo. Mẫu có lịch thiếu phân bổ không hiển thị tỷ lệ chắc chắn. Tồn tốt 0 hiển thị không xác định và cảnh báo nếu có phân bổ. Đỉnh giữ hàng theo ngày và số ngày vượt tồn giúp studio xử lý xung đột.
- Trả danh sách phân trang, tìm theo tên mẫu; tổng kho và cảnh báo tính trên cùng bộ lọc. Truy vấn chỉ đọc các trường cần thiết, không xuất thông tin liên hệ.

## Nghiệm thu

Kiểm chứng trên MongoDB local: ranh giới ngày VN, tiền cọc/hoàn cọc, báo giá/đối soát chưa đồng ý, hủy và thiếu thời điểm; snapshot ngoài kỳ; phân quyền; phân trang; lịch chụp không đếm hai lần; nhận/trả cùng ngày; quá hạn; stock tốt khác stock hỏng; lịch legacy chưa có size; không suy lượng từ legacy. Trình duyệt kiểm tra bộ lọc, đối chiếu hồ sơ, trạng thái tải/lỗi và mobile.
