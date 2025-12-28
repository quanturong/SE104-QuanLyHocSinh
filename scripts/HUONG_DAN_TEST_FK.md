# Hướng dẫn Test Foreign Key Constraints

## 📋 Dữ liệu đã được tạo

Script `create-test-data-for-fk-constraints.js` đã tạo sẵn các dữ liệu test sau:

---

## 🔴 TEST CASE 3.1: XÓA MÔN HỌC

**Môn học test:** `MON_TEST_FK`

**Dữ liệu đã tạo:**
- ✅ Môn học: `MON_TEST_FK`
- ✅ Giáo viên: `MaGiaoVien = 711` (dạy môn này)
- ✅ Học sinh: `HS_FK_TEST`
- ✅ Điểm môn học: `BangDiemMonHoc` (HS_FK_TEST - MON_TEST_FK)
- ✅ Thời khóa biểu: `ThoiKhoaBieu` (lớp LOP_FK_TEST)
- ✅ Phân công giảng dạy: `PhanCongGiangDay` (GV711 - MON_TEST_FK - LOP_FK_TEST)
- ✅ Báo cáo: `BaoCaoTongKetMon` (MON_TEST_FK - LOP_FK_TEST)

**Cách test:**
```sql
-- Mở SQLite CLI
sqlite3 database.db

-- Thử xóa môn học
DELETE FROM MonHoc WHERE MaMonHoc = 'MON_TEST_FK';
```

**Kỳ vọng:** Lỗi `FOREIGN KEY constraint failed`

---

## 🔴 TEST CASE 4.1: XÓA LỚP

**Lớp test:** `LOP_FK_TEST`

**Dữ liệu đã tạo:**
- ✅ Lớp: `LOP_FK_TEST`
- ✅ Học sinh trong lớp: `HS_FK_TEST` (HocSinh_LopNamHoc)
- ✅ Lớp năm học: `Lop_NamHoc` (NH2025-2026)
- ✅ Thời khóa biểu: `ThoiKhoaBieu` (NH2025-2026)
- ✅ Phân công giảng dạy: `PhanCongGiangDay` (NH2025-2026)
- ✅ Báo cáo môn: `BaoCaoTongKetMon` (NH2025-2026)
- ✅ Báo cáo học kỳ: `BaoCaoTongKetHK` (NH2025-2026)

**Cách test:**
```sql
-- Thử xóa lớp trực tiếp (bỏ qua code xử lý)
DELETE FROM LopHoc WHERE MaLop = 'LOP_FK_TEST';
```

**Kỳ vọng:** Lỗi `FOREIGN KEY constraint failed` (nếu code chưa xử lý đúng)

**Lưu ý:** Code hiện tại đã xử lý để xóa tất cả dữ liệu liên quan trước khi xóa `LopHoc`, nên test này chỉ để kiểm tra foreign key constraint hoạt động.

---

## 🔴 TEST CASE 5.1: XÓA NĂM HỌC

**Năm học test:** `NH_FK_TEST`

**Dữ liệu đã tạo:**
- ✅ Năm học: `NH_FK_TEST` (2025-09-01 đến 2026-06-30)
- ✅ Học kỳ: `NamHoc_HocKy` (Học kỳ 1)
- ✅ Lớp: `LOP_NH_FK_TEST`
- ✅ Lớp năm học: `Lop_NamHoc` (LOP_NH_FK_TEST - NH_FK_TEST)
- ✅ Học sinh: `HS_NH_FK_TEST`
- ✅ Học sinh lớp năm học: `HocSinh_LopNamHoc` (HS_NH_FK_TEST - LOP_NH_FK_TEST - NH_FK_TEST)

**Cách test:**
```sql
-- Thử xóa năm học trực tiếp (bỏ qua code xử lý)
DELETE FROM NamHoc WHERE MaNamHoc = 'NH_FK_TEST';
```

**Kỳ vọng:** Lỗi `FOREIGN KEY constraint failed` (nếu code chưa xử lý đúng)

**Lưu ý:** Code hiện tại đã có xử lý để xóa tất cả dữ liệu liên quan trước khi xóa `NamHoc`, nên test này chỉ để kiểm tra foreign key constraint hoạt động.

---

## 🧪 CÁCH TEST QUA UI

### Test Case 3.1: Xóa môn học
1. Vào trang quản lý môn học
2. Thử xóa môn `MON_TEST_FK`
3. **Kỳ vọng:** Báo lỗi không thể xóa vì đang được sử dụng

### Test Case 4.1: Xóa lớp
1. Vào trang quản lý lớp học
2. Chọn năm học `NH2025-2026`
3. Thử xóa lớp `LOP_FK_TEST`
4. **Kỳ vọng:** Code sẽ xử lý đúng (xóa tất cả dữ liệu liên quan trước)

### Test Case 5.1: Xóa năm học
1. Vào trang quản lý năm học
2. Thử xóa năm học `NH_FK_TEST`
3. **Kỳ vọng:** Code sẽ xử lý đúng (xóa tất cả dữ liệu liên quan trước)

---

## 🗑️ XÓA DỮ LIỆU TEST SAU KHI HOÀN THÀNH

Nếu muốn xóa dữ liệu test, chạy script sau:

```sql
-- Xóa theo thứ tự để tránh foreign key constraint
DELETE FROM BaoCaoTongKetHK WHERE MaLop = 'LOP_FK_TEST';
DELETE FROM BaoCaoTongKetMon WHERE MaLop = 'LOP_FK_TEST' OR MaMonHoc = 'MON_TEST_FK';
DELETE FROM PhanCongGiangDay WHERE MaLop = 'LOP_FK_TEST' OR MaMonHoc = 'MON_TEST_FK';
DELETE FROM ThoiKhoaBieu WHERE MaLop = 'LOP_FK_TEST' OR MaMonHoc = 'MON_TEST_FK';
DELETE FROM HocSinh_LopNamHoc WHERE MaHocSinh IN ('HS_FK_TEST', 'HS_NH_FK_TEST') OR MaLop IN ('LOP_FK_TEST', 'LOP_NH_FK_TEST');
DELETE FROM Lop_NamHoc WHERE MaLop IN ('LOP_FK_TEST', 'LOP_NH_FK_TEST');
DELETE FROM BangDiemMonHoc WHERE MaHocSinh = 'HS_FK_TEST' OR MaMonHoc = 'MON_TEST_FK';
DELETE FROM NamHoc_HocKy WHERE MaNamHoc = 'NH_FK_TEST';
DELETE FROM HoSoHocSinh WHERE MaHocSinh IN ('HS_FK_TEST', 'HS_NH_FK_TEST');
DELETE FROM GiaoVien WHERE MaGiaoVien = 711;
DELETE FROM LopHoc WHERE MaLop IN ('LOP_FK_TEST', 'LOP_NH_FK_TEST');
DELETE FROM MonHoc WHERE MaMonHoc = 'MON_TEST_FK';
DELETE FROM NamHoc WHERE MaNamHoc = 'NH_FK_TEST';
```

---

## ✅ KIỂM TRA DỮ LIỆU ĐÃ TẠO

```sql
-- Kiểm tra môn học
SELECT * FROM MonHoc WHERE MaMonHoc = 'MON_TEST_FK';

-- Kiểm tra giáo viên
SELECT * FROM GiaoVien WHERE MaGiaoVien = 711;

-- Kiểm tra học sinh
SELECT * FROM HoSoHocSinh WHERE MaHocSinh IN ('HS_FK_TEST', 'HS_NH_FK_TEST');

-- Kiểm tra lớp
SELECT * FROM LopHoc WHERE MaLop IN ('LOP_FK_TEST', 'LOP_NH_FK_TEST');

-- Kiểm tra năm học
SELECT * FROM NamHoc WHERE MaNamHoc = 'NH_FK_TEST';

-- Kiểm tra các bảng tham chiếu
SELECT COUNT(*) FROM BangDiemMonHoc WHERE MaMonHoc = 'MON_TEST_FK';
SELECT COUNT(*) FROM ThoiKhoaBieu WHERE MaMonHoc = 'MON_TEST_FK';
SELECT COUNT(*) FROM PhanCongGiangDay WHERE MaMonHoc = 'MON_TEST_FK';
SELECT COUNT(*) FROM HocSinh_LopNamHoc WHERE MaLop = 'LOP_FK_TEST';
SELECT COUNT(*) FROM Lop_NamHoc WHERE MaLop = 'LOP_FK_TEST';
SELECT COUNT(*) FROM HocSinh_LopNamHoc WHERE MaNamHoc = 'NH_FK_TEST';
SELECT COUNT(*) FROM Lop_NamHoc WHERE MaNamHoc = 'NH_FK_TEST';
```

