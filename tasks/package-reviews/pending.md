# Pending: Đánh giá trong chi tiết gói chụp

Người dùng yêu cầu tạm pending ngày 31/10/2026 để đẩy các phần đã hoàn tất lên develop.

Yêu cầu đã chốt: chỉ hiển thị đánh giá từ các đơn chụp đã hoàn tất của đúng gói; không thêm form gửi đánh giá trực tiếp trên trang gói. Dự kiến có điểm trung bình, số lượt và nhận xét; gói chưa có đánh giá hiển thị trạng thái trống. Không công khai thông tin liên hệ của khách.

Chưa triển khai trong đợt đẩy này. Đã loại bỏ API và kiểu dữ liệu viết dở, chưa có giao diện, chưa thay đổi database. Khi tiếp tục có thể dùng `Feedback.workflowBooking`, `Booking.package` và `BookingWorkflow.lifecycle === 'completed'` cùng liên kết `workflow.feedback.record` để xác minh nguồn đánh giá. Luồng gửi feedback sau hoàn tất đơn hiện có giữ nguyên.
