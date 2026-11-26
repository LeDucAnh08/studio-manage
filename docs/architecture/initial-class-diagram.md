# Thiết kế sơ đồ lớp ban đầu — Hệ thống quản lý studio

Ngày cập nhật: 26/11/2026.

Tài liệu liệt kê các thực thể nghiệp vụ, thuộc tính cơ bản và quan hệ để vẽ sơ đồ lớp ở mức thiết kế ban đầu. Đây là bản rút gọn, không phải sơ đồ đầy đủ của toàn bộ collection và mọi trường trong mã nguồn.

Thiết kế phản ánh các thay đổi hiện hành: có **Role**, **Class**, **PackageDetail** và không còn **Season**.

## 1. Quy ước

- Mỗi lớp trong phần 2 có `_id: ObjectId`; riêng `Role` dùng `_id: Number`.
- `String`: chuỗi; `Number`: số; `Boolean`: đúng/sai; `Date`: ngày giờ.
- Kiểu `User`, `Class`, `Package`… biểu diễn tham chiếu tới lớp tương ứng.
- `[]` là danh sách; `Object` là đối tượng có cấu trúc.
- Các thuộc tính tùy chọn có thể chưa có giá trị, tùy nghiệp vụ và giai đoạn xử lý.
- Có thể bỏ `createdAt`, `updatedAt` và các trường kỹ thuật như `version`, token, khóa xử lý, lịch sử thao tác để sơ đồ gọn hơn.
- Các bảng ở phần 2 tương ứng với các model nghiệp vụ chính hiện có. Các lớp chi tiết lưu nhúng và lớp logic đề xuất được ghi riêng ở phần 3.

## 2. Các bảng/lớp và thuộc tính cơ bản

### 2.1. Tài khoản và nhân sự

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **Role — Vai trò** | `_id: Number`<br>`name: String`<br>`description: String` |
| **User — Tài khoản** | `username: String`<br>`password: String`<br>`name: String`<br>`email: String`<br>`roles: Role[]`<br>`isActive: Boolean` |
| **PhotographerProfile — Hồ sơ thợ chụp** | `photographer: User`<br>`bio: String`<br>`portraitUrl: String`<br>`specialty: String`<br>`style: String`<br>`published: Boolean` |

Vai trò hiện hành:

| Mã | Vai trò |
| --- | --- |
| 0 | Superadmin |
| 1 | Admin |
| 3 | Thợ chụp ảnh |
| 6 | Khách hàng |

Mật khẩu trong triển khai được lưu dưới dạng đã băm. Không tạo các lớp Sale hoặc Kế toán trong thiết kế hiện hành.

### 2.2. Lớp học và học sinh

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **Class — Lớp học** | `className: String`<br>`school: String`<br>`contactName: String`<br>`contactPhone: String`<br>`contactAddress: String`<br>`total: Number`<br>`totalMale: Number`<br>`totalFemale: Number` |
| **Student — Học sinh** | `customer: Class`<br>`name: String`<br>`gender: String`<br>`height: Number`<br>`weight: Number`<br>`shirtSize: String`<br>`pantsSize: String`<br>`notes: String` |

`Class` lưu thông tin lớp và người liên hệ đại diện. Tài khoản khách hàng thuộc lớp `User`.

Trong mã nguồn, trường tham chiếu lớp vẫn mang tên `customer` để giữ tương thích với dữ liệu/API; đối tượng được tham chiếu là **Class**, không còn là model Customer.

### 2.3. Trang phục

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **CostumeType — Loại trang phục** | `name: String`<br>`description: String` |
| **Costume — Trang phục/phụ kiện** | `type: CostumeType`<br>`name: String`<br>`imageUrl: String`<br>`gender: String`<br>`itemKind: String`<br>`isRentalItem: Boolean`<br>`rentalDailyPrice: Number` |

Tồn kho theo size có thể biểu diễn bằng lớp chi tiết `CostumeInventory` ở phần 3.

### 2.4. Chụp kỉ yếu và lịch chụp

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **Package — Gói chụp kỉ yếu** | `name: String`<br>`pricePerMember: Number`<br>`depositPercent: Number`<br>`duration: String`<br>`costumes: CostumeType[]`<br>`deliveryDays: Number`<br>`description: String` |
| **PackageDetail — Nội dung chi tiết gói** | `package: Package`<br>`audience: String`<br>`deliverables: String`<br>`shootScope: String`<br>`benefits: String[]`<br>`preparationNotes: String`<br>`depositPolicy: String`<br>`cancellationPolicy: String`<br>`gallery: Object[]` |
| **Booking — Đơn đặt chụp kỉ yếu** | `client: User`<br>`package: Package`<br>`className: String`<br>`school: String`<br>`members: Number`<br>`contactName: String`<br>`phone: String`<br>`startAt: Date`<br>`endAt: Date`<br>`location: String`<br>`status: String` |
| **BookingWorkflow — Hồ sơ xử lý đơn kỉ yếu** | `booking: Booking`<br>`customer: Class`<br>`lifecycle: String`<br>`assignedPhotographer: User`<br>`assignedSupportPhotographers: User[]`<br>`quote: Object`<br>`payments: Object[]` |
| **Schedule — Lịch chụp** | `customer: Class`<br>`workflowBooking: Booking`<br>`conceptOrder: ConceptOrder`<br>`shootDate: Date`<br>`startTime: String`<br>`endTime: String`<br>`location: String`<br>`leadPhotographer: User`<br>`supportPhotographers: User[]`<br>`bookedBy: User`<br>`status: String` |

Lưu ý khi vẽ:

- `PackageDetail` là collection riêng, không phải thuộc tính nhúng của `Package`.
- `Booking` lưu yêu cầu đặt chụp; `BookingWorkflow` quản lý quá trình xử lý đơn.
- Có thể giữ báo giá `quote` ở dạng đối tượng trong bản thiết kế cơ bản, chưa cần tách toàn bộ cấu trúc báo giá.
- `Schedule.workflowBooking` tham chiếu **Booking**, dù tên trường có chữ workflow.
- `Schedule.bookedBy` là **người phụ trách**, sử dụng tài khoản quản trị.
- Lịch concept có thể không gắn với một lớp học.

### 2.5. Chụp concept

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **Concept — Concept chụp ảnh** | `name: String`<br>`description: String`<br>`coverUrl: String`<br>`styleSummary: String`<br>`preparation: String`<br>`active: Boolean` |
| **ConceptPackage — Gói chụp concept** | `concept: Concept`<br>`name: String`<br>`price: Number`<br>`durationMinutes: Number`<br>`maxPeople: Number`<br>`retouchQuota: Number`<br>`extraPhotoPrice: Number`<br>`active: Boolean` |
| **ConceptOrder — Đơn chụp concept** | `client: User`<br>`concept: Concept`<br>`package: ConceptPackage`<br>`photographer: User`<br>`editor: User`<br>`contactName: String`<br>`phone: String`<br>`people: Number`<br>`startAt: Date`<br>`endAt: Date`<br>`brief: String`<br>`status: String` |

### 2.6. Thuê trang phục

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **RentalOrder — Đơn thuê trang phục** | `client: User`<br>`contactName: String`<br>`phone: String`<br>`requestedReceiveDate: Date`<br>`requestedReturnDate: Date`<br>`requestedLines: RentalLine[]`<br>`quote: Object`<br>`payments: Object[]`<br>`status: String`<br>`checkedOutAt: Date`<br>`returnedAt: Date` |

`RentalLine` được mô tả trong phần 3. Giá và điều khoản đã chấp nhận của đơn nằm trong báo giá; không lấy giá hiện tại của trang phục để thay thế giá đã chốt.

### 2.7. Album và ảnh

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **BookingAlbum — Album kỉ yếu** | `booking: Booking`<br>`title: String`<br>`status: String`<br>`shared: Boolean`<br>`limit: Number` |
| **BookingAlbumPhoto — Ảnh kỉ yếu** | `album: BookingAlbum`<br>`drive: Object`<br>`selected: Boolean`<br>`available: Boolean`<br>`note: String`<br>`order: Number` |
| **ConceptAlbum — Album concept** | `order: ConceptOrder`<br>`title: String`<br>`status: String`<br>`extraAmount: Number`<br>`allowDownload: Boolean` |
| **ConceptPhoto — Ảnh concept** | `album: ConceptAlbum`<br>`drive: Object`<br>`selected: Boolean`<br>`available: Boolean`<br>`note: String`<br>`order: Number` |

`drive` chứa thông tin file ảnh trên Drive. `order` trong hai lớp ảnh là thứ tự hiển thị; `ConceptAlbum.order` là tham chiếu tới đơn concept.

### 2.8. Thu chi và đánh giá

| Lớp | Thuộc tính cơ bản |
| --- | --- |
| **Category — Danh mục thu chi** | `name: String`<br>`type: String` |
| **Transaction — Giao dịch** | `categoryId: Category`<br>`customer: Class`<br>`workflowBooking: Booking`<br>`conceptOrder: ConceptOrder`<br>`rentalOrder: RentalOrder`<br>`type: String`<br>`amount: Number`<br>`date: Date`<br>`description: String`<br>`createdBy: User` |
| **Feedback — Đánh giá kỉ yếu** | `workflowBooking: Booking`<br>`customer: Class`<br>`rating: Number`<br>`comment: String`<br>`isRead: Boolean` |

- `Category.type` và `Transaction.type` phân biệt thu/chi.
- Các trường liên kết đơn trong `Transaction` là tùy trường hợp; không bắt buộc một giao dịch thuộc cả ba loại đơn.
- `Feedback` ở đây là bản ghi đánh giá kỉ yếu. Phản hồi của đơn thuê và các vòng chỉnh sửa ảnh concept được lưu trong đơn/album tương ứng.

## 3. Các lớp chi tiết có thể bổ sung

Ba lớp dưới đây biểu diễn dữ liệu đang lưu nhúng, **không phải collection độc lập**.

| Lớp chi tiết | Thuộc tính cơ bản | Lớp chứa |
| --- | --- | --- |
| **CostumeInventory — Tồn kho theo size** | `size: String`<br>`quantity: Number`<br>`condition: String` | `Costume` |
| **RentalLine — Chi tiết trang phục thuê** | `costumeId: Costume`<br>`name: String`<br>`size: String`<br>`quantity: Number`<br>`unitPrice: Number` | `RentalOrder` |
| **WardrobeMeasurement — Số đo người chụp concept** | `size: String`<br>`heightCm: Number`<br>`weightKg: Number` | `ConceptOrder` |

Nếu muốn thể hiện riêng các lần thanh toán, có thể bổ sung lớp logic **Payment**:

```text
Payment
  kind: String
  amount: Number
  method: String
  reference: String
```

`Payment` trong phần này là cách biểu diễn rút gọn ở mức thiết kế, không phải model/collection chung hiện có. Các khoản thanh toán được lưu nhúng trong workflow hoặc đơn tương ứng; cấu trúc cụ thể khác nhau giữa các dịch vụ. Một khoản thanh toán thuộc một hồ sơ/đơn tương ứng, không đồng thời thuộc tất cả các loại đơn.

## 4. Quan hệ nối giữa các lớp

### 4.1. Quy ước bội số

- `1–N`: một–nhiều; phía nhiều có thể chưa có bản ghi ở giai đoạn ban đầu.
- `N–N`: nhiều–nhiều.
- `1–0..1`: một thực thể có tối đa một thực thể liên quan và có thể chưa có.
- Khi vẽ UML, ghi rõ `0..*`, `1..*` hoặc `0..1` theo mức bắt buộc của nghiệp vụ.

### 4.2. Tài khoản, lớp học và trang phục

| Hai lớp cần nối | Quan hệ | Ý nghĩa |
| --- | --- | --- |
| `User — Role` | N–N | Một tài khoản có nhiều vai trò; một vai trò có nhiều tài khoản |
| `User — PhotographerProfile` | 1–0..1 | Tài khoản thợ chụp có thể có một hồ sơ |
| `Class — Student` | 1–N | Một lớp có nhiều học sinh |
| `CostumeType — Costume` | 1–N | Một loại gồm nhiều trang phục |
| `Package — CostumeType` | N–N | Một gói có nhiều loại trang phục; một loại dùng trong nhiều gói |

### 4.3. Chụp kỉ yếu và lịch chụp

| Hai lớp cần nối | Quan hệ | Ý nghĩa |
| --- | --- | --- |
| `Package — PackageDetail` | 1–0..1 | Một gói có tối đa một bản nội dung chi tiết |
| `User — Booking` | 1–N | Khách hàng tạo nhiều đơn kỉ yếu |
| `Package — Booking` | 1–N | Một gói được đặt trong nhiều đơn |
| `Booking — BookingWorkflow` | 1–0..1 | Một đơn có tối đa một hồ sơ xử lý |
| `Class — BookingWorkflow` | 1–N | Một lớp có thể liên kết nhiều hồ sơ đơn; hồ sơ có thể chưa gắn lớp |
| `User — BookingWorkflow` | N–N | Quan hệ phân công thợ chính/phụ |
| `Class — Schedule` | 1–N | Một lớp có nhiều lịch; lịch concept có thể không gắn lớp |
| `Booking — Schedule` | 1–0..1 | Đơn kỉ yếu có thể có một lịch xác nhận |
| `User — Schedule` | N–N | Quan hệ ekip: một lịch có nhiều thợ; một thợ có nhiều lịch |
| `User — Schedule` | 1–N | Quan hệ riêng mang tên người phụ trách, qua bookedBy |

Quan hệ `Class — BookingWorkflow` là đường liên kết lớp với đơn kỉ yếu. Không cần thêm một khóa ngoại trực tiếp từ Booking tới Class trong sơ đồ bám theo cấu trúc hiện tại.

### 4.4. Concept và thuê trang phục

| Hai lớp cần nối | Quan hệ | Ý nghĩa |
| --- | --- | --- |
| `Concept — ConceptPackage` | 1–N | Một concept có nhiều gói |
| `ConceptPackage — ConceptOrder` | 1–N | Một gói concept có nhiều đơn |
| `Concept — ConceptOrder` | 1–N | Một concept xuất hiện trong nhiều đơn |
| `User — ConceptOrder` | 1–N | Quan hệ khách hàng tạo đơn |
| `User — ConceptOrder` | 1–N | Quan hệ riêng mang tên thợ chụp |
| `User — ConceptOrder` | 1–N | Quan hệ riêng mang tên người hậu kỳ; đơn có thể chưa phân công hậu kỳ |
| `ConceptOrder — Schedule` | 1–0..1 | Một đơn concept có tối đa một lịch liên kết |
| `User — RentalOrder` | 1–N | Một khách hàng tạo nhiều đơn thuê |
| `RentalOrder — RentalLine` | 1–N | Một đơn chứa nhiều dòng trang phục |
| `Costume — RentalLine` | 1–N | Một trang phục xuất hiện trong nhiều dòng thuê |

Lịch chụp có thể thuộc đơn kỉ yếu hoặc concept; không bắt buộc đồng thời thuộc cả hai. Lịch quản lý cũ cũng có thể chưa liên kết đơn.

### 4.5. Album, tài chính và đánh giá

| Hai lớp cần nối | Quan hệ | Ý nghĩa |
| --- | --- | --- |
| `Booking — BookingAlbum` | 1–0..1 | Một đơn có tối đa một album kỉ yếu |
| `BookingAlbum — BookingAlbumPhoto` | 1–N | Một album có nhiều ảnh |
| `ConceptOrder — ConceptAlbum` | 1–0..1 | Một đơn có tối đa một album concept |
| `ConceptAlbum — ConceptPhoto` | 1–N | Một album có nhiều ảnh |
| `Category — Transaction` | 1–N | Một danh mục phân loại nhiều giao dịch |
| `User — Transaction` | 1–N | Người tạo giao dịch |
| `Class — Transaction` | 1–N | Giao dịch của lớp; giao dịch có thể không gắn lớp |
| `Booking — Transaction` | 1–N | Các giao dịch liên quan đơn kỉ yếu |
| `ConceptOrder — Transaction` | 1–N | Các giao dịch liên quan đơn concept |
| `RentalOrder — Transaction` | 1–N | Các giao dịch liên quan đơn thuê |
| `Booking — Feedback` | 1–0..1 | Một đơn kỉ yếu có tối đa một bản ghi đánh giá |
| `Class — Feedback` | 1–N | Một lớp có thể có nhiều bản ghi đánh giá |

### 4.6. Các quan hệ chứa dữ liệu nhúng

| Quan hệ | Cách nối |
| --- | --- |
| `Costume — CostumeInventory` | Composition, 1–N |
| `RentalOrder — RentalLine` | Composition, 1–N |
| `ConceptOrder — WardrobeMeasurement` | Composition, 1–N |
| `BookingWorkflow — Payment` | Composition, 1–N, nếu bổ sung lớp logic Payment |
| `ConceptOrder — Payment` | Composition, 1–N, nếu bổ sung lớp logic Payment |
| `RentalOrder — Payment` | Composition, 1–N, nếu bổ sung lớp logic Payment |

## 5. Cách sử dụng đường nối khi vẽ

- **Đường liền thông thường:** quan hệ giữa các thực thể độc lập, ví dụ User — Booking, Class — Student.
- **Hình thoi đặc ở phía lớp chứa:** dùng cho composition của dữ liệu nhúng, ví dụ Costume ◆— CostumeInventory, RentalOrder ◆— RentalLine.
- **Tên quan hệ:** nên ghi trên đường nối khi hai lớp có nhiều mối quan hệ khác nhau, đặc biệt User — Schedule và User — ConceptOrder.
- **Không dùng mũi tên kế thừa** giữa Admin, Thợ chụp và Khách hàng: hệ thống phân biệt các nhóm bằng User.roles.
- Quan hệ nhiều–nhiều trong MongoDB có thể lưu bằng mảng tham chiếu; sơ đồ lớp không bắt buộc thêm bảng nối UserRole hoặc PackageCostumeType.

## 6. Phạm vi có thể bỏ khỏi sơ đồ ban đầu

Không cần đưa các collection kỹ thuật như EmailOutbox, BackgroundOperation, cấu hình studio hoặc bản ghi webhook SePay vào bản sơ đồ nghiệp vụ rút gọn này.

Các lớp quản lý vòng chọn ảnh, ảnh bàn giao tải lên, yêu cầu cấp tài khoản và chi tiết lịch sử có thể bổ sung ở sơ đồ thiết kế chi tiết sau. Không thêm lại Season, tích hợp Telegram hoặc các vai trò đã ngừng sử dụng.
