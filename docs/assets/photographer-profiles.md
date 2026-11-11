# Nguồn nội dung và ảnh portfolio thợ

## Hướng biên tập

Thiết kế dùng phương án 1 đã chọn; mỗi người có lời giới thiệu ngôi thứ nhất,
câu định vị, phong cách, cách hướng dẫn, đối tượng phù hợp và bộ ảnh riêng.
Tham khảo cách giới thiệu con người/dấu ấn ở [Platon — Biography](https://www.platonphoto.com/biography)
và cách nối câu chuyện với tác phẩm ở [Joey L. — Bio](https://joeyl.com/about/bio),
[Quick Portfolio](https://joeyl.com/overview/category/quick-portfolio).
Chỉ tham khảo tổ chức thông tin; không chép tiểu sử, thành tích hoặc ảnh của họ
vào hồ sơ nhân sự studio.

Nội dung local được viết riêng để minh họa bốn định hướng: Lê Minh Đức — chân dung/
áo dài nhẹ nhàng; Nguyễn Gia Bảo — cảm xúc/tương tác; Phạm Minh Quân — gia đình/
trẻ nhỏ; Trần Anh Khoa — bố cục gia đình/áo dài chỉn chu. Đây là nội dung khởi tạo
theo yêu cầu, có thể thay bằng lời giới thiệu đã được thợ xác nhận. Không thêm
giải thưởng, số năm, khách hàng nổi tiếng hoặc đánh giá không có dữ liệu.

## Ảnh

Bốn ảnh chân dung là ảnh minh họa gốc được tạo bằng ImageGen tích hợp, không phải
ảnh thật xác minh danh tính nhân sự. Tất cả đã được mở kiểm tra và lưu WebP quality85,
900×1125 trong `frontend/public/images/concepts/`.

| Asset | Ảnh nguồn giữ nguyên | Hướng tạo ảnh |
| --- | --- | --- |
| `photographer-minh-duc.webp` | `C:/Users/Admin/.codex/generated_images/01a1c9d1-1687-79a1-975b-f72ba2a04d66/exec-24c25c45-e306-45d4-8522-881fb072fe5b.png` | Nam Việt khoảng 30 tuổi, sơ mi tối, máy ảnh ngang hông, ánh sáng studio mềm và nền kem |
| `photographer-gia-bao.webp` | `C:/Users/Admin/.codex/generated_images/01a1c9d1-476d-77b3-b0c7-bd7142326a15/exec-bdfc8edb-c60b-40c0-ac4d-df2040a813da.png` | Nam Việt trẻ, áo khoác olive, nụ cười thân thiện, ánh sáng ban ngày |
| `photographer-minh-quan.webp` | `C:/Users/Admin/.codex/generated_images/01a1c9d1-853e-7c01-9352-ec037132d78f/exec-79ea6077-5d6d-4d1a-9bb8-c20049b91d8b.png` | Nam Việt đeo kính, áo xanh nhạt, phong thái kiên nhẫn, nền studio sáng |
| `photographer-anh-khoa.webp` | `C:/Users/Admin/.codex/generated_images/01a1c9d1-476d-77b3-b0c7-bd7142326a15/exec-d396363c-832e-49b2-8da0-9b07af3f1ad7.png` | Nam Việt trưởng thành, blazer beige, thần thái điềm đạm, rèm và ánh sáng trung tính |

Ảnh tác phẩm dùng lại thư viện concept gốc của project, chia theo chuyên môn của
từng thợ và viết chú thích riêng; nguồn/prompt từng ảnh ở `concept-photography.md`.
Không sử dụng tác phẩm của nhiếp ảnh gia nổi tiếng. Quản lý có thể thay toàn bộ
ảnh/nội dung bằng tư liệu studio được phép công khai.

`ops/seed-concept-portfolios.cjs` chỉ bổ sung trường trống cho bốn hồ sơ đã có trên
database native local `studio_db`, giữ nội dung được người dùng chỉnh và không
đổi trạng thái xuất bản, tài khoản, đơn đặt hay thanh toán. Chạy không có `--apply`
để xem các trường còn thiếu; chạy lại sau khi điền đủ không đổi nội dung.
