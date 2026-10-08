# Đặc tả đơn thuê — 05/10/2026

## Mục tiêu và phạm vi

Khép kín một đơn thuê trang phục/phụ kiện: khách chọn mẫu–size–số lượng và ngày nhận/trả; studio gửi báo giá; khách đồng ý; kế toán ghi cọc; studio xác nhận giữ hàng, giao hàng, nhận trả và ghi tình trạng; hai bên xác nhận phát sinh; thu/hoàn tiền để hoàn tất. Gia hạn và hủy có đề xuất/đồng ý, lưu lịch sử và không bỏ giữ hàng trước khi thay đổi thành công.

Đây là capability `rental-orders`, phụ thuộc kho Costume, lịch Schedule, tài khoản và shared resource transaction hiện có. Báo cáo tổng hợp là capability tiếp theo, không trộn vào lần triển khai này.

## Quyết định trong kế hoạch đã được phép triển khai

- Dùng chung kho với buổi chụp; chỉ tình trạng good có thể phân bổ. Ngày nhận/trả đều chiếm hàng; yêu cầu và báo giá chưa giữ hàng.
- Giá catalog chỉ để tham khảo. Báo giá chốt đơn giá cho cả kỳ thuê, phí thuê và cọc bảo đảm riêng biệt; không tự đặt phí/ngày hay phụ phí. Cọc được giữ đến nhận trả, sau đó đối soát khoản phải thu/hoàn.
- Trước đồng ý báo giá, khách được rút yêu cầu không phát sinh tiền. Sau đồng ý, hủy trước giao cần đề xuất/đồng ý và đối soát dù đơn chưa được giữ hàng. Yêu cầu hủy đang mở chặn xác nhận giữ hàng.
- Khách đồng ý phiên bản cụ thể; không thay đổi lịch sử khi sửa danh mục. Trước giao hàng phải đủ phí thuê + cọc và phải kiểm tra lại nguồn lực. Chưa trả hàng quá hạn không được tự coi là hàng khả dụng.
- Nhận trả ghi số lượng tốt/hỏng/mất cho từng dòng, tổng đúng số đã giao. Hỏng chuyển sang damaged, mất sang retired; thiếu hàng cho lịch tương lai cần được studio xử lý, không che giấu sự kiện thực tế.
- Phí phát sinh được studio đề xuất theo điều khoản, khách đồng ý rồi mới là công nợ. Hoàn tất chỉ sau nhận trả, đồng ý đối soát và net tiền đúng số cuối cùng.
- Admin 0/1 quản lý và giao–nhận; Sale 2 tư vấn/báo giá; cộng tác viên sale 4 theo dõi giao nhận; kế toán 5 ghi tiền; khách 6 chỉ đơn của mình. Giữ nhãn vai trò hiện tại, không tự đổi cộng tác viên sale thành nhân viên kho. Không dùng quyền nhiếp ảnh gia để truy cập đơn thuê không được giao.
- Giao dịch MongoDB thực và khóa tài nguyên dùng chung; expectedVersion và Idempotency-Key chống lặp/ghi đè. API cũ không sửa/xóa tiền hoặc xóa mẫu có lịch sử thuê.

## Cấu trúc và triển khai

1. `backend/src/models/RentalOrder.ts`, service khả dụng và controller/routes: dữ liệu, quyền, trạng thái, snapshot, tiền và giao nhận.
2. Nối kiểm tra giữ hàng vào cả xác nhận buổi chụp và lịch cũ; bảo vệ sửa kho/thu chi.
3. `frontend/src/services/rentalService.ts`, trang tạo/list/detail; CTA catalog, account và nav nội bộ.
4. Kiểm thử HTTP/replica set và Chrome; cập nhật plan/audit.

TypeScript/Express/Mongoose và React hiện có; không thêm dependencies. Kiểu tiền là số nguyên VND, ngày theo Việt Nam. Biểu mẫu có label/id, lỗi rõ ràng và hành động theo vai trò/trạng thái.

## Kiểm chứng

`node node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json`

Trong frontend: `node ../node_modules/typescript/bin/tsc --noEmit`, `node ../node_modules/vite/bin/vite.js build`, `node ../node_modules/vitest/vitest.mjs run`.

Audit local: `node --test ops/tests/rental-audit.cjs`; Chrome: `node ../node_modules/@playwright/test/cli.js test` với MONGO_TEST_URI local replica set riêng.

Đạt khi: khách tạo/theo dõi được đơn; khách khác không đọc/thao tác; không giữ vượt kho giữa thuê và chụp, kể cả đồng thời; thử lại không nhân đôi tiền; gia hạn xung đột giữ nguyên kỳ cũ; ghi nhận trả đúng tình trạng; phát sinh cần đồng ý; thu/hoàn đúng số cuối; UI thực hiện được hành trình hoàn tất ở 360px.

## Ranh giới

Thực hiện code/schema additive theo plan đã được người dùng yêu cầu tiếp tục. Chưa thay đổi dữ liệu production, chưa deploy, không xóa lịch sử, không thêm cổng thanh toán hoặc tự tạo mức phí/quy định phạt. Các quy định phí cụ thể tiếp tục do studio nhập trong báo giá/đề xuất.
