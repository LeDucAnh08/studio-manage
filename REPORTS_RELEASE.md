# Vận hành báo cáo dịch vụ và kho

## Mở báo cáo

Sau khi cập nhật backend và frontend, đăng nhập admin (0/1) hoặc kế toán (5), mở **Quản lý → Báo cáo dịch vụ và kho** (`/manage/reports`). API đọc `/api/reports/finance`, `/api/reports/inventory`. Báo cáo không có flag riêng và vẫn đọc hồ sơ có sẵn khi tắt việc tạo đơn mới. Không có migration dữ liệu hoặc thao tác ghi từ báo cáo.

Chọn từ/đến ngày, bấm Xem báo cáo. Ngày theo Việt Nam; gồm hai đầu, tối đa 366 ngày. Dùng Làm mới sau khi studio vừa ghi nhận thanh toán, trả hàng hoặc thay đổi dịch vụ. Các truy vấn đọc dữ liệu đang thay đổi; không phải bản khóa sổ kế toán.

## Cách đối chiếu

1. **Trong kỳ:** tổng tiền thu/chi phải bằng sổ Transaction theo cùng ngày Việt Nam. Tiền chụp và thuê phân loại bằng liên kết hồ sơ; giao dịch thiếu hoặc có hai liên kết nằm ở Chưa phân loại. Không đoán dịch vụ bằng mô tả/danh mục. Chọn Giao dịch trong kỳ rồi dịch vụ để xem từng dòng.
2. **Giá trị nghiệm thu/đối soát:** theo ngày khách nghiệm thu ảnh hoặc đồng ý đối soát thuê; phí hủy theo ngày đồng ý hủy. Theo trạng thái hiện tại, không dùng ngày cập nhật/feedback hoặc ngày đề xuất làm ngày doanh thu. Báo cáo này không lưu lịch sử khóa sổ: hủy sau nghiệm thu có thể thay đổi kết quả kỳ cũ.
3. **Công nợ hiện tại:** gồm mọi hồ sơ có báo giá đã đồng ý, không phụ thuộc kỳ đang chọn. Phí thuê không gồm cọc; khoản còn thu trước nhận trả gồm cọc còn thiếu. Tiền dư sau trả khi chưa đồng ý đối soát là Chờ đối soát; chỉ sau đồng ý mới hiện Cần hoàn. Nhấn mã hồ sơ để đối chiếu lịch sử khi hành trình đó được bật ở frontend.
4. **Kho:** chụp lấy từ lịch đã phân bổ; thuê đang giữ theo kỳ chốt, đơn đã trả theo ngày giao/nhận trả thực tế. Ngày đầu và cuối đều chiếm hàng. Đơn quá hạn chưa trả tiếp tục giữ hàng. Kho hỏng/sửa/ngừng dùng không thuộc mẫu số tồn tốt.
5. **Tỷ lệ kho:** phân bổ món × ngày / (tồn tốt hiện tại × số ngày). Có thể vượt 100%; kiểm tra cột số ngày vượt tồn. Không dùng tỷ lệ này làm số lần mặc đồ thực tế hoặc năng lực kho lịch sử. Mẫu có lịch thiếu size, khoảng ngày lỗi hoặc tham chiếu đã xóa hiển thị chưa xác định; peak từ dữ liệu thiếu chỉ là mức tối thiểu.

## Kịch bản nghiệm thu trên demo local

Đồ án dùng dữ liệu mẫu của demo local; không yêu cầu một database studio thật hoặc staging. Chạy launcher theo [DEMO_LOCAL.md](DEMO_LOCAL.md), đăng nhập admin/kế toán tại **http://localhost:4001**, mở báo cáo và đối chiếu các giá trị dưới đây. Đây là kết quả cần đạt; chỉ ghi đã đạt sau khi có test/evidence tương ứng, không coi bảng kịch bản là kết quả thực hiện.

| Kịch bản | Kết quả cần xác nhận |
|---|---|
| Thuê phí 1.000.000đ, cọc 500.000đ; nhận 1.500.000đ | Tiền thu 1.500.000đ; giá trị chốt 1.000.000đ; cọc đang bảo đảm 500.000đ |
| Trả hàng, đề xuất phí sửa 200.000đ chưa đồng ý | Giá trị chốt chưa tăng; tiền dư chờ đối soát 500.000đ; chưa tự động tạo khoản cần hoàn |
| Đồng ý đối soát 1.200.000đ, chưa hoàn | Giá trị đối soát 1.200.000đ; cần hoàn 300.000đ; cọc đang bảo đảm 0đ |
| Hoàn 300.000đ kỳ sau | Kỳ sau có chi/hoàn 300.000đ; công nợ hoàn hiện tại về 0đ |
| Ảnh nghiệm thu, còn thiếu thanh toán | Giá trị nghiệm thu tính theo ngày đồng ý; còn thu hiện tại vẫn hiển thị cho tới khi nhận đủ |
| Đổi bộ lọc sang kỳ không có giao dịch | Không có tiền trong kỳ; công nợ hiện tại giữ nguyên |
| 2 món chụp + 3 món thuê, chung 3 ngày; tồn tốt 5 | Phân bổ chụp 6, thuê 9 món × ngày; peak 5; tỷ lệ 100% |
| Lịch cũ có mẫu nhưng không có size/số lượng | Cảnh báo đối soát; không suy số lượng từ tổng kho; tỷ lệ chưa xác định |
| Nhận và trả cùng một ngày | Tính 1 ngày, không phải 0 |
| Quá hạn chưa trả / ghi nhận đã trả | Tiếp tục giữ đến cuối khoảng báo cáo; khi có ngày nhận trả thì kết thúc theo ngày thực tế |
| Đăng nhập sale/CTV/photographer/khách | Không có quyền xem báo cáo toàn studio; API trả 403 |

Demo dùng database local riêng **studio_project_demo**; số dư/giá và ngày trong fixture có thể khác bảng ví dụ. Tạo hồ sơ mẫu mới hoặc đối chiếu theo dữ liệu hiện có, không tự sửa Transaction để khớp ví dụ. Bộ nghiệm thu đồ án theo [STUDIO_ACCEPTANCE.md](STUDIO_ACCEPTANCE.md), hành trình chụp/thuê theo WORKFLOW_RELEASE.md và RENTAL_RELEASE.md. Hướng dẫn Docker/VPS chỉ áp dụng nếu sau này chọn môi trường đó; không phải điều kiện triển khai local.
