## 🎓 Student Management – Quản lí học sinh
### Giới thiệu
Student Management là hệ thống quản lý học sinh hiện đại, trực quan và dễ sử dụng — giúp nhà trường, giáo viên và nhân viên hành chính quản lý toàn bộ thông tin học sinh một cách tập trung.
Dự án được phát triển bằng HTML, CSS và JavaScript, kết hợp với thư viện Chart.js để hiển thị thống kê sinh động.

### Mục tiêu hệ thống
- Quản lý thông tin học sinh, lớp học và giáo viên.
- Ghi nhận điểm danh, chấm điểm, và thống kê báo cáo học tập.
- Hỗ trợ xuất báo cáo, in ấn, và tra cứu dữ liệu nhanh chóng.
- Giao diện thân thiện, màu sắc hiện đại, biểu tượng rõ ràng.

### Danh sách các trang
#### 1️⃣ Trang Bảng điều khiển (Dashboard – tablecontrol.html)
- Hiển thị các chỉ số thống kê tổng quan:
- Tổng số học sinh
- Tỉ lệ điểm danh hôm nay
- Tổng số lớp
- Biểu đồ thống kê:
- Điểm danh 7 ngày qua
- Top lớp có sĩ số cao
- Cho phép người quản lý nắm bắt tình hình toàn hệ thống chỉ trong một màn hình.

#### 2️⃣ Trang Quản lý học sinh (student.html)
- Danh sách học sinh với các cột:
- Mã HS | Họ tên | Lớp | Ngày sinh | Liên lạc | Trạng thái | Thao tác
- Nút chức năng: + Thêm học sinh, - Xóa học sinh
- Bộ lọc tìm kiếm: Tìm theo tên, Lọc theo lớp, Lọc theo trạng thái
- Sửa thông tin học sinh (Sửa)
- Tìm kiếm real-time qua thanh input

#### 3️⃣ Trang Quản lý lớp học (class.html)
- Chọn Năm học và Lớp học
- Hiển thị: Sĩ số học sinh, Danh sách gồm: STT, Họ tên, Giới tính, Năm sinh, Địa chỉ
+ Thêm học sinh, Xuất Excel
- Giúp giáo viên dễ dàng quản lý học sinh trong từng lớp và năm học cụ thể.

#### 4️⃣ Trang Điểm danh học sinh (attendance.html)
- Lọc theo Năm học và Lớp học
- Hiển thị: Tổng ngày học, Tỉ lệ có mặt trung bình
- Bảng điểm danh
- Lưu điểm danh
- Theo dõi chuyên cần từng học sinh theo tháng và lớp.

#### 5️⃣ Trang Báo cáo học tập (report.html)
- Hai chế độ xem: Báo cáo môn học,  Báo cáo tổng kết học kì
- Chọn: Năm học, Học kì, Môn học
- Hiển thị: Tổng số lớp, Tổng số học sinh, Số lượng đạt, Tỉ lệ đạt (%)
- Bảng chi tiết: Lớp, Sĩ số, Số lượng đạt, Tỉ lệ, Giỏi/Khá/Trung bình/Yếu, Điểm TB lớp
-  Đánh giá toàn diện chất lượng học tập của từng lớp, môn và học kì.

#### 6️⃣ Trang Điểm số (scoretable.html)
- Hai chế độ xem: Danh sách học sinh (Điểm tổng), và Bảng điểm môn học (từng môn)
- Quản lý điểm số từng học sinh theo môn học.
- Cột: Họ tên, Lớp, Môn học, Điểm miệng, 15p, 1 tiết, Cuối kì, Điểm TB
- Cho phép nhập hoặc chỉnh sửa điểm.
- Tự động tính điểm trung bình.
- Xuất file Excel.
- Cảnh báo khi học sinh có điểm dưới 5.
- Giúp giáo viên nhập và theo dõi kết quả học tập nhanh chóng.

#### 7️⃣ Trang Thời khóa biểu (timetable.html)
- Quản lý thời khóa biểu theo lớp và ngày trong tuần.
- Hiển thị: Môn học, Giáo viên giảng dạy, Phòng học
- Có thể lọc theo lớp và xuất file.
- Xem, chỉnh sửa hoặc thêm tiết học.
- Cung cấp lịch học trực quan cho giáo viên và học sinh.

#### 8️⃣ Trang Tra cứu (find.html)
- Cho phép tra cứu thông tin nhanh: Học sinh, Lớp học, Môn học, Điểm số
- Tìm kiếm tức thì
- Hiển thị kết quả chi tiết với liên kết tới trang tương ứng 
- Tiết kiệm thời gian tìm kiếm và truy xuất dữ liệu trong hệ thống.

#### 9️⃣ Trang Giáo viên (teacher.html)
- Danh sách giáo viên: Mã GV, Họ tên, Môn giảng dạy, Liên lạc, Trạng thái
- Chức năng: Thêm giáo viên, Xóa giáo viên, Xuất Excel
- Quản lý hồ sơ giáo viên và phân công giảng dạy cho từng môn học.

#### 🔟 Trang Quy định (rules.html)
