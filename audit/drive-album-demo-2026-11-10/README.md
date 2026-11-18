# Demo album Drive có chú thích

Bản phát lại 15 bước được chụp từ bài kiểm thử HTTP/MongoDB/Chrome thật, dùng dữ liệu demo riêng và ảnh portfolio có sẵn trong project. Google Drive upstream được giả lập; đây không phải bằng chứng kết nối Google thật.

Trình diễn: **Hồ sơ đơn → Bàn giao ảnh → Xem ảnh bàn giao**, studio tạo/lấy ảnh/xuất bản/chia sẻ trong tab Ảnh chọn → khách chọn bằng tài khoản hoặc link chung → studio xuất tên file/chuẩn bị và giao ảnh trong tab Ảnh đã chỉnh → khách tải/góp ý → chủ đơn nghiệm thu trong cùng màn → thu hồi link. Alias album cũ cũng được kiểm tra chuyển đúng về màn chung.

Mở lại trình phát:

```powershell
node ops/album-demo-preview.cjs
```

Vào http://127.0.0.1:4024. Tự chuyển bước mỗi 5,5 giây; có tạm dừng, trước/tiếp, chọn bước và xem ảnh lớn. Trình phát chỉ đọc ảnh đã ghi, không có quyền sửa đơn hoặc đọc secrets.

Ghi lại từ đầu bằng database test local riêng (MongoDB replica set phải chạy):

```powershell
$env:ALBUM_BROWSER_TEST='true'
$env:ALBUM_ANNOTATION_DEMO='true'
npm --prefix backend run test:album
```

Kiểm chứng sau hợp nhất: 10 backend/browser tests pass; trình phát có 15 bước. Luồng tài khoản khách và public link dùng chung lựa chọn; không lỗi JavaScript hoặc tràn ngang ở viewport 390px. Server phát lại cổng 4024 được giữ để người dùng xem.
