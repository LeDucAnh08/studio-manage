# RENT-DAY — triển khai nghiệp vụ thuê theo ngày

User đã chốt SPEC-rental-orders.md và yêu cầu bắt đầu implement16/10/2026. Thứ tự và tiêu chí tổng thể tại IMPLEMENTATION_PLAN.md mục13. Không thay các công việc navbar/customer đang có trong frontend/tasks.

## Contract và thứ tự

1. Nền tảng: rentalDailyPrice nullable riêng; parser kỳ thuê VN dùng chung; số lượng khả dụng nhỏ nhất qua toàn kỳ. Không mặc định ngày, không lấy giá cũ thay giá/ngày.
2. Hai nhánh sau contract: backend quote/giữ hàng và frontend catalog/form/detail/staff giá. New order/quote pricingMode=daily, rentalDays snapshot; legacy thiếu mode vẫn period.
3. Chốt transaction: đủ cọc sau đồng ý thì kiểm tồn/giữ ngay cho daily; thiếu hàng vẫn ghi tiền thực và reservationIssue để xử lý, không mất giao dịch hoặc vượt tồn. Gia hạn daily tính từ snapshot, cancellation theo điều khoản cũ.
4. Kiểm chứng unit/contract → HTTP replica set riêng → browser customer/staff liên quan → docs/check/build.

## Ranh giới

Không thay dữ liệu demo/production hoặc seed/reset, không deploy/push. DB integration dùng studio_rental_daily_audit riêng; kiểm host/db trước cleanup. Kiểm bảo toàn báo giá cũ, kho dùng chung chụp/thuê, quyền, idempotency và retry.

Backend availability/catalog, frontend catalog/types/helper và frontend form/detail/staff được giao phạm vi file tách biệt. Root giữ RentalOrder/rentalController, contract service, integration và tổng hợp. Checkpoint sau foundation và sau luồng end-to-end; review theo tests/browser, không xin lại quyền đã được user cấp.
