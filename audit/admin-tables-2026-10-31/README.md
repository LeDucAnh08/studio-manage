# Bảng admin — kiểm chứng 31/10/2026

Yêu cầu và phạm vi tại [ADR-009](../../docs/decisions/009-admin-tables.md).

Đã kiểm tra Chrome E2E `frontend/e2e/admin-tables.spec.cjs`: 1/1 đạt, kiểm tra 15 mục ở cả 1440px và 390px. Tạo dữ liệu bằng model trong database local cô lập `studio_phase1_e2e`, có kiểm tra tên database trước ghi; cleanup bằng setup/teardown hiện có. Không ghi đơn hoặc thay đổi dữ liệu trong `studio_db`.

Các mục: Đơn chụp ảnh, Đơn thuê, Khách hàng, Học sinh, Lịch chụp, Tài chính, Người dùng, Phản hồi, Danh mục thu/chi, Kho trang phục, Loại trang phục, Gói chụp, Mùa chụp, Báo cáo và bảng lịch sắp tới ở Dashboard. Mọi bảng có header, vẫn hiện trên mobile, cuộn ngang được trong vùng riêng; toàn trang không tràn ngang. Modal phản hồi hiển thị nội dung/góp ý đầy đủ.

Kiểm thử:

- 76/76: `AdminTables`, `BookingWorkflowListPage`, `CustomerOrders`, `CustomerOrdersPage`, `DailyRentalPricing`, `PackageContentPage`.
- Nhóm kiểm tra ban đầu: bảng và form lịch/kho (6/6), tài chính/dashboard/báo cáo (8/8), khách hàng (4/4), thành phần form/bảng (8/8) đều đạt. Một assert của danh sách đơn chụp được cập nhật để kiểm tra trạng thái ở hàng bảng thay vì bên trong link card cũ; toàn bộ 6 ca đơn chụp đã đạt ở lượt cuối.
- TypeScript và ESLint đạt; 7 warning ESLint có sẵn, không có error. Định dạng toàn `src` đạt sau format.
- `yarn build`: đạt, tạo bundle production thành công.
- Ảnh desktop và mobile của Đơn chụp, Đơn thuê, Khách hàng, Phản hồi và Gói chụp nằm cùng thư mục. Ảnh mobile chụp sau khi kiểm tra cuộn sang các cột bên phải.

Các bộ lọc và phân trang dữ liệu server được giữ nguyên; thêm bộ lọc và URL phân trang đơn thuê qua API hiện có. Giá/tiền và quyền xem/thao tác giữ nguyên; bản khách hàng tiếp tục dùng layout Đơn của tôi hiện có.
