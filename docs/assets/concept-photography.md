# Ảnh concept

Ảnh minh họa cho hai màn đã chốt được tạo riêng bằng ImageGen tích hợp, dựa trên mockup được chọn; không cắt ảnh UI để dùng làm ảnh chụp. Các PNG gốc được giữ trong thư mục generated_images của Codex. Ảnh sử dụng trong project lưu tại `frontend/public/images/concepts/`, WebP quality 85, rộng tối đa 1400 px.

## Prompt chung

Phần “Phong cách bộ ảnh” trong chi tiết gói sử dụng lại các ảnh minh họa cùng concept từ danh sách bên dưới, kèm chú thích về bố cục/ánh sáng. Các ảnh này không phải bằng chứng khách hàng hoặc cặp ảnh trước/sau hậu kỳ. Trang quản lý gói có mục “Bộ ảnh giới thiệu” để thay bằng ảnh thực tế được phép sử dụng; cặp trước/sau nên cùng khung hình và ghi rõ hai chú thích.

Ảnh studio chân thực, ánh sáng mềm, tông kem ấm và da tự nhiên, bối cảnh tinh giản. Không chữ, logo, watermark hoặc UI. Mỗi lần tạo một ảnh, không dùng collage/sprite. Chân dung và áo dài giữ người mẫu/trang phục nhất quán giữa các ảnh. Ảnh dọc 3:4 cho gallery; ảnh ngang 3:2 cho hero và card. Dùng ảnh từ mockup đã chọn làm tham chiếu bố cục, chủ thể và bảng màu.

| File | Biến thể prompt |
| --- | --- |
| portrait-01.webp | Nữ trưởng thành Việt Nam, tóc dài gợn sóng, áo trắng/kem, chân dung ngang, cười nhẹ, tay gần má |
| portrait-02.webp | Cùng người mẫu, ngồi trên ghế gỗ, góc ba phần tư |
| portrait-03.webp | Cùng người mẫu, góc nghiêng hướng về cửa sổ |
| portrait-04.webp | Cùng người mẫu, đứng tự nhiên trước nền kem |
| portrait-05.webp | Cùng người mẫu, tay vuốt tóc, cười nhẹ |
| portrait-06.webp | Cùng người mẫu, tựa cằm trên tay, nhìn sang bên |
| portrait-07.webp | Cùng người mẫu, ngồi cạnh rèm trung tính, nhìn máy ảnh |
| portrait-08.webp | Cùng người mẫu, khoảnh khắc cười tự nhiên |
| portrait-artistic.webp | Chân dung nữ Việt Nam với áo đen, nền tối và ánh sáng studio có chủ đích |
| couple-cover.webp | Cặp đôi Việt Nam trưởng thành, trang phục trung tính, ôm tự nhiên trong studio |
| couple-02.webp | Cùng cặp đôi, ngồi gần và nhìn nhau |
| couple-03.webp | Cùng cặp đôi, đứng ôm và cười tự nhiên |
| family-cover.webp | Bố mẹ và bé trong studio tông ấm, tương tác gần gũi |
| family-full-cover.webp | Gia đình nhiều thế hệ Việt Nam, trang phục trung tính, studio ấm áp |
| family-02.webp | Cùng gia đình nhỏ, bố mẹ ôm bé trên ghế |
| family-03.webp | Bé cùng bố/mẹ, cận cảnh vui vẻ |
| aodai-cover.webp | Nữ trưởng thành Việt Nam trong áo dài hồng pastel, nền kem và hoa nhẹ |
| aodai-02.webp | Cùng người mẫu/áo dài, dáng toàn thân, ánh sáng cửa sổ |
| aodai-03.webp | Cùng người mẫu/áo dài, góc ba phần tư, cầm bó hoa nhỏ |

`node ops/seed-concept-catalog.cjs --apply` bổ sung nội dung và đường dẫn ảnh vào các mục local đã biết khi trường đang trống; không ghi đè ảnh/nội dung người dùng đã sửa. Có thể chỉnh tại Quản lý concept. Thư viện ảnh minh họa không gắn với ảnh khách hàng hoặc album bàn giao.
