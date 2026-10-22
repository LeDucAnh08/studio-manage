# Dữ liệu danh mục thuê phục vụ trình diễn — 20/10/2026

Đã cập nhật trực tiếp 21 sản phẩm trên database demo local `studio_project_demo` (17 trang phục, 4 phụ kiện). Trước thay đổi cả 21 mẫu chưa có giá/ngày; sau thay đổi đủ 21 giá dương và mô tả rõ món đi kèm. Ba tên còn tiền tố “Demo” đã được thay bằng tên sản phẩm.

Đây là giá và thông tin sản phẩm giả định cho đồ án. Giá/ngày được khai báo riêng, không quy đổi tự động từ giá thuê cả kỳ cũ.

| Nhóm hàng                  |    Giá demo/ngày |
| -------------------------- | ---------------: |
| Áo dài                     | 100.000–135.000đ |
| Vest                       | 140.000–180.000đ |
| Áo choàng cử nhân          |   70.000–75.000đ |
| Áo bà ba                   |   85.000–90.000đ |
| Sơ mi                      |          40.000đ |
| Chân váy                   |          50.000đ |
| Nón lá                     |   10.000–15.000đ |
| Bộ sách đạo cụ, mũ cử nhân |          20.000đ |

Danh sách cụ thể và mô tả từng mẫu: `ops/fixtures/rental-catalog-presentation.cjs`. Mỗi bộ sách gồm 3 quyển nhưng tính là một đơn vị thuê; vest và áo dài ghi rõ phần trang phục đi kèm; mũ, nón và phụ kiện rời được phân biệt trong mô tả.

## Phạm vi bảo toàn dữ liệu

- Chỉ cập nhật `name`, `description`, `rentalDailyPrice` của 21 ID sản phẩm đã biết. Thêm marker hoàn tất và tăng phiên bản khóa tài nguyên dùng chung.
- Đối chiếu hash của 1.175 bản ghi thuộc 16 collection: mọi trường ngoài ba trường sản phẩm trên giữ nguyên. Khóa kỹ thuật và marker mới được loại khỏi đối chiếu; các project marker cũ vẫn được đối chiếu.
- Giữ nguyên giá cả kỳ, tồn kho theo size/tình trạng, ID loại hàng, gói chụp, đơn thuê, lịch, báo giá, tiền thu/hoàn và tên đã chụp vào snapshot lịch sử.
- Không chuyển loại hàng legacy, vì ID loại còn được tham chiếu bởi gói chụp đã chốt. Riêng nón lá legacy tiếp tục giữ loại cũ “Áo dài kỷ yếu”, với `itemKind: accessory` như trước.
- Có bản sao EJSON của sản phẩm trước thay đổi trong `.workflow-tools/catalog-presentation-before-*.json` (git-ignore). Chạy lại công cụ trả `already-applied`, `changed: 0`.

## Kiểm chứng

- `node --test ops/tests/catalog-presentation.cjs`: 8/8 kiểm thử đạt; DB kiểm thử riêng đã được dọn sau chạy.
- Build TypeScript backend đạt. Hai seed có kiểm tra schema để dừng nếu bản build cũ chưa hỗ trợ giá/ngày.
- `node ops/seed-realistic.cjs --validate`: đạt, không ghi DB; kiểm tra model cho 18 mẫu realistic và các fixture nghiệp vụ.
- API danh mục kỳ 22–24/10/2026 trả đủ 21 mẫu, giá/ngày dương, `rentalDays: 3`; nội dung sản phẩm không còn nhãn “Demo” hoặc ghi chú dev.
- Đối soát trước/sau ở cùng mốc 20/10/2026: `ready: true`, không phát sinh blocker; các cảnh báo nghiệp vụ có sẵn giữ nguyên. Số hồ sơ giữ nguyên: 19 lịch, 22 workflow, 25 đơn thuê, 126 giao dịch.
- Không thay ảnh hoặc UI trong hạng mục này. Kiểm chứng dữ liệu qua DB và API, chưa xác nhận bằng ảnh chụp trình duyệt.
