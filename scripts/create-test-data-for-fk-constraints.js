const sequelize = require("../config/db");

async function createTestDataForFKConstraints() {
  try {
    console.log("📋 Đang tạo dữ liệu test cho Foreign Key Constraints...\n");

    // ============================================
    // TEST CASE 3.1: XÓA MÔN HỌC (MonHoc)
    // ============================================
    console.log("📚 TEST CASE 3.1: Tạo dữ liệu để test xóa môn học\n");

    // 1. Tạo môn học test
    const testMonHoc = "MON_TEST_FK";
    const [existingMon] = await sequelize.query(`
      SELECT MaMonHoc FROM MonHoc WHERE MaMonHoc = ?
    `, { replacements: [testMonHoc] });

    if (existingMon.length === 0) {
      await sequelize.query(`
        INSERT INTO MonHoc (MaMonHoc, TenMonHoc) VALUES (?, 'Môn Test Foreign Key')
      `, { replacements: [testMonHoc] });
      console.log(`✅ Đã tạo môn học: ${testMonHoc}`);
    } else {
      console.log(`⚠️  Môn học đã tồn tại: ${testMonHoc}`);
    }

    // 2. Tạo giáo viên với môn học test
    const [existingGV] = await sequelize.query(`
      SELECT MaGiaoVien FROM GiaoVien WHERE Email = 'test.fk.giaovien@example.com'
    `);
    let maGiaoVien = null;
    if (existingGV.length === 0) {
      await sequelize.query(`
        INSERT INTO GiaoVien (HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay)
        VALUES ('Giáo Viên Test FK', 'Nam', '1985-01-01', 'Test', 'test.fk.giaovien@example.com', ?)
      `, { replacements: [testMonHoc] });
      const [newGV] = await sequelize.query(`
        SELECT MaGiaoVien FROM GiaoVien WHERE Email = 'test.fk.giaovien@example.com'
      `);
      maGiaoVien = newGV[0].MaGiaoVien;
      console.log(`✅ Đã tạo giáo viên: MaGiaoVien = ${maGiaoVien} (dạy môn ${testMonHoc})`);
    } else {
      maGiaoVien = existingGV[0].MaGiaoVien;
      console.log(`⚠️  Giáo viên đã tồn tại: MaGiaoVien = ${maGiaoVien}`);
    }

    // 3. Tạo học sinh test
    const testMaHocSinh = "HS_FK_TEST";
    const [existingHS] = await sequelize.query(`
      SELECT MaHocSinh FROM HoSoHocSinh WHERE MaHocSinh = ?
    `, { replacements: [testMaHocSinh] });

    if (existingHS.length === 0) {
      await sequelize.query(`
        INSERT INTO HoSoHocSinh (MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, TrangThai)
        VALUES (?, 'Học Sinh Test FK', 'Nam', '2008-05-15', 'Test', 'test.fk.hocsinh@example.com', 'DangHoc')
      `, { replacements: [testMaHocSinh] });
      console.log(`✅ Đã tạo học sinh: ${testMaHocSinh}`);
    } else {
      console.log(`⚠️  Học sinh đã tồn tại: ${testMaHocSinh}`);
    }

    // 4. Tạo điểm môn học (BangDiemMonHoc)
    const [existingDiem] = await sequelize.query(`
      SELECT MaDiem FROM BangDiemMonHoc 
      WHERE MaHocSinh = ? AND MaMonHoc = ? AND NamHoc = 'NH2025-2026' AND HocKy = 1
    `, { replacements: [testMaHocSinh, testMonHoc] });

    if (existingDiem.length === 0) {
      await sequelize.query(`
        INSERT INTO BangDiemMonHoc (MaHocSinh, MaMonHoc, HocKy, NamHoc, Diem15Phut, Diem1Tiet, DiemTBMon)
        VALUES (?, ?, 1, 'NH2025-2026', 8.0, 7.5, 7.75)
      `, { replacements: [testMaHocSinh, testMonHoc] });
      console.log(`✅ Đã tạo điểm môn học (BangDiemMonHoc) cho ${testMaHocSinh} - ${testMonHoc}`);
    } else {
      console.log(`⚠️  Điểm môn học đã tồn tại`);
    }

    // 5. Tạo lớp test
    const testMaLop = "LOP_FK_TEST";
    const [existingLop] = await sequelize.query(`
      SELECT MaLop FROM LopHoc WHERE MaLop = ?
    `, { replacements: [testMaLop] });

    if (existingLop.length === 0) {
      await sequelize.query(`
        INSERT INTO LopHoc (MaLop, KhoiLop) VALUES (?, 12)
      `, { replacements: [testMaLop] });
      console.log(`✅ Đã tạo lớp: ${testMaLop}`);
    } else {
      console.log(`⚠️  Lớp đã tồn tại: ${testMaLop}`);
    }

    // 6. Tạo Lop_NamHoc
    const [existingLopNamHoc] = await sequelize.query(`
      SELECT MaLop FROM Lop_NamHoc WHERE MaLop = ? AND MaNamHoc = 'NH2025-2026'
    `, { replacements: [testMaLop] });

    if (existingLopNamHoc.length === 0) {
      await sequelize.query(`
        INSERT INTO Lop_NamHoc (MaLop, MaNamHoc, SiSo, MaGVChuNhiem)
        VALUES (?, 'NH2025-2026', 30, ?)
      `, { replacements: [testMaLop, maGiaoVien] });
      console.log(`✅ Đã tạo Lop_NamHoc: ${testMaLop} - NH2025-2026`);
    } else {
      console.log(`⚠️  Lop_NamHoc đã tồn tại`);
    }

    // 7. Tạo HocSinh_LopNamHoc
    const [existingHSLop] = await sequelize.query(`
      SELECT MaHocSinh FROM HocSinh_LopNamHoc 
      WHERE MaHocSinh = ? AND MaLop = ? AND MaNamHoc = 'NH2025-2026'
    `, { replacements: [testMaHocSinh, testMaLop] });

    if (existingHSLop.length === 0) {
      await sequelize.query(`
        INSERT INTO HocSinh_LopNamHoc (MaHocSinh, MaLop, MaNamHoc, TrangThai)
        VALUES (?, ?, 'NH2025-2026', 'DangHoc')
      `, { replacements: [testMaHocSinh, testMaLop] });
      console.log(`✅ Đã tạo HocSinh_LopNamHoc: ${testMaHocSinh} - ${testMaLop}`);
    } else {
      console.log(`⚠️  HocSinh_LopNamHoc đã tồn tại`);
    }

    // 8. Tạo ThoiKhoaBieu
    const [existingTKB] = await sequelize.query(`
      SELECT MaLop FROM ThoiKhoaBieu 
      WHERE MaLop = ? AND NamHoc = 'NH2025-2026' AND HocKy = 1 AND Thu = 2 AND TietHoc = 1
    `, { replacements: [testMaLop] });

    if (existingTKB.length === 0) {
      await sequelize.query(`
        INSERT INTO ThoiKhoaBieu (MaLop, NamHoc, HocKy, Thu, TietHoc, MaMonHoc, MaGiaoVien)
        VALUES (?, 'NH2025-2026', 1, 2, 1, ?, ?)
      `, { replacements: [testMaLop, testMonHoc, maGiaoVien] });
      console.log(`✅ Đã tạo ThoiKhoaBieu: ${testMaLop} - ${testMonHoc}`);
    } else {
      console.log(`⚠️  ThoiKhoaBieu đã tồn tại`);
    }

    // 9. Tạo PhanCongGiangDay
    const [existingPC] = await sequelize.query(`
      SELECT MaPhanCong FROM PhanCongGiangDay 
      WHERE MaGiaoVien = ? AND MaMonHoc = ? AND MaLop = ? AND NamHoc = 'NH2025-2026'
    `, { replacements: [maGiaoVien, testMonHoc, testMaLop] });

    if (existingPC.length === 0) {
      await sequelize.query(`
        INSERT INTO PhanCongGiangDay (MaGiaoVien, MaMonHoc, MaLop, NamHoc, HocKy)
        VALUES (?, ?, ?, 'NH2025-2026', 1)
      `, { replacements: [maGiaoVien, testMonHoc, testMaLop] });
      console.log(`✅ Đã tạo PhanCongGiangDay: GV${maGiaoVien} - ${testMonHoc} - ${testMaLop}`);
    } else {
      console.log(`⚠️  PhanCongGiangDay đã tồn tại`);
    }

    // 10. Tạo BaoCaoTongKetMon
    const [existingBCM] = await sequelize.query(`
      SELECT MaBCM FROM BaoCaoTongKetMon 
      WHERE MaMonHoc = ? AND MaLop = ? AND NamHoc = 'NH2025-2026' AND HocKy = 1
    `, { replacements: [testMonHoc, testMaLop] });

    if (existingBCM.length === 0) {
      await sequelize.query(`
        INSERT INTO BaoCaoTongKetMon (MaMonHoc, HocKy, MaLop, SiSo, SoLuongDat, TiLe, NamHoc)
        VALUES (?, 1, ?, 30, 25, 83.33, 'NH2025-2026')
      `, { replacements: [testMonHoc, testMaLop] });
      console.log(`✅ Đã tạo BaoCaoTongKetMon: ${testMonHoc} - ${testMaLop}`);
    } else {
      console.log(`⚠️  BaoCaoTongKetMon đã tồn tại`);
    }

    // ============================================
    // TEST CASE 4.1: XÓA LỚP (LopHoc)
    // ============================================
    console.log("\n📚 TEST CASE 4.1: Dữ liệu để test xóa lớp\n");
    console.log(`✅ Đã tạo lớp ${testMaLop} với đầy đủ dữ liệu tham chiếu:`);
    console.log(`   - HocSinh_LopNamHoc: ${testMaHocSinh}`);
    console.log(`   - Lop_NamHoc: NH2025-2026`);
    console.log(`   - ThoiKhoaBieu: có dữ liệu`);
    console.log(`   - PhanCongGiangDay: có dữ liệu`);
    console.log(`   - BaoCaoTongKetMon: có dữ liệu`);

    // Tạo thêm BaoCaoTongKetHK
    const [existingBCHK] = await sequelize.query(`
      SELECT MaBCHK FROM BaoCaoTongKetHK 
      WHERE MaLop = ? AND NamHoc = 'NH2025-2026' AND HocKy = 1
    `, { replacements: [testMaLop] });

    if (existingBCHK.length === 0) {
      await sequelize.query(`
        INSERT INTO BaoCaoTongKetHK (HocKy, MaLop, SiSo, SoLuongDat, TiLe, NamHoc)
        VALUES (1, ?, 30, 25, 83.33, 'NH2025-2026')
      `, { replacements: [testMaLop] });
      console.log(`✅ Đã tạo BaoCaoTongKetHK: ${testMaLop}`);
    } else {
      console.log(`⚠️  BaoCaoTongKetHK đã tồn tại`);
    }

    // ============================================
    // TEST CASE 5.1: XÓA NĂM HỌC (NamHoc)
    // ============================================
    console.log("\n📚 TEST CASE 5.1: Dữ liệu để test xóa năm học\n");
    
    // Tạo năm học test
    const testNamHoc = "NH_FK_TEST";
    const [existingNamHoc] = await sequelize.query(`
      SELECT MaNamHoc FROM NamHoc WHERE MaNamHoc = ?
    `, { replacements: [testNamHoc] });

    if (existingNamHoc.length === 0) {
      await sequelize.query(`
        INSERT INTO NamHoc (MaNamHoc, NgayBatDau, NgayKetThuc)
        VALUES (?, '2025-09-01', '2026-06-30')
      `, { replacements: [testNamHoc] });
      console.log(`✅ Đã tạo năm học: ${testNamHoc}`);
    } else {
      console.log(`⚠️  Năm học đã tồn tại: ${testNamHoc}`);
    }

    // Tạo NamHoc_HocKy
    const [existingNHHK] = await sequelize.query(`
      SELECT MaNamHoc FROM NamHoc_HocKy WHERE MaNamHoc = ? AND HocKy = 1
    `, { replacements: [testNamHoc] });

    if (existingNHHK.length === 0) {
      await sequelize.query(`
        INSERT INTO NamHoc_HocKy (MaNamHoc, HocKy, NgayBatDau, NgayKetThuc)
        VALUES (?, 1, '2025-09-01', '2026-01-15')
      `, { replacements: [testNamHoc] });
      console.log(`✅ Đã tạo NamHoc_HocKy: ${testNamHoc} - Học kỳ 1`);
    } else {
      console.log(`⚠️  NamHoc_HocKy đã tồn tại`);
    }

    // Tạo lớp cho năm học test
    const testLopNamHoc = "LOP_NH_FK_TEST";
    const [existingLopNH] = await sequelize.query(`
      SELECT MaLop FROM LopHoc WHERE MaLop = ?
    `, { replacements: [testLopNamHoc] });

    if (existingLopNH.length === 0) {
      await sequelize.query(`
        INSERT INTO LopHoc (MaLop, KhoiLop) VALUES (?, 10)
      `, { replacements: [testLopNamHoc] });
      console.log(`✅ Đã tạo lớp: ${testLopNamHoc}`);
    }

    // Tạo Lop_NamHoc cho năm học test
    const [existingLopNH2] = await sequelize.query(`
      SELECT MaLop FROM Lop_NamHoc WHERE MaLop = ? AND MaNamHoc = ?
    `, { replacements: [testLopNamHoc, testNamHoc] });

    if (existingLopNH2.length === 0) {
      await sequelize.query(`
        INSERT INTO Lop_NamHoc (MaLop, MaNamHoc, SiSo)
        VALUES (?, ?, 25)
      `, { replacements: [testLopNamHoc, testNamHoc] });
      console.log(`✅ Đã tạo Lop_NamHoc: ${testLopNamHoc} - ${testNamHoc}`);
    }

    // Tạo HocSinh_LopNamHoc cho năm học test
    const testHSNamHoc = "HS_NH_FK_TEST";
    const [existingHSNH] = await sequelize.query(`
      SELECT MaHocSinh FROM HoSoHocSinh WHERE MaHocSinh = ?
    `, { replacements: [testHSNamHoc] });

    if (existingHSNH.length === 0) {
      await sequelize.query(`
        INSERT INTO HoSoHocSinh (MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, TrangThai)
        VALUES (?, 'Học Sinh Test NamHoc FK', 'Nữ', '2009-03-20', 'Test', 'test.namhoc@example.com', 'DangHoc')
      `, { replacements: [testHSNamHoc] });
      console.log(`✅ Đã tạo học sinh: ${testHSNamHoc}`);
    }

    const [existingHSLNH] = await sequelize.query(`
      SELECT MaHocSinh FROM HocSinh_LopNamHoc 
      WHERE MaHocSinh = ? AND MaLop = ? AND MaNamHoc = ?
    `, { replacements: [testHSNamHoc, testLopNamHoc, testNamHoc] });

    if (existingHSLNH.length === 0) {
      await sequelize.query(`
        INSERT INTO HocSinh_LopNamHoc (MaHocSinh, MaLop, MaNamHoc, TrangThai)
        VALUES (?, ?, ?, 'DangHoc')
      `, { replacements: [testHSNamHoc, testLopNamHoc, testNamHoc] });
      console.log(`✅ Đã tạo HocSinh_LopNamHoc: ${testHSNamHoc} - ${testLopNamHoc} - ${testNamHoc}`);
    }

    console.log(`\n✅ Đã tạo năm học ${testNamHoc} với đầy đủ dữ liệu tham chiếu:`);
    console.log(`   - NamHoc_HocKy: Học kỳ 1`);
    console.log(`   - HocSinh_LopNamHoc: ${testHSNamHoc}`);
    console.log(`   - Lop_NamHoc: ${testLopNamHoc}`);

    // ============================================
    // TÓM TẮT
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 TÓM TẮT DỮ LIỆU TEST ĐÃ TẠO:");
    console.log("=".repeat(60));
    console.log("\n🔴 TEST CASE 3.1: XÓA MÔN HỌC");
    console.log(`   Môn học: ${testMonHoc}`);
    console.log(`   - Đang được sử dụng trong:`);
    console.log(`     ✓ BangDiemMonHoc (học sinh: ${testMaHocSinh})`);
    console.log(`     ✓ ThoiKhoaBieu (lớp: ${testMaLop})`);
    console.log(`     ✓ PhanCongGiangDay (giáo viên: ${maGiaoVien})`);
    console.log(`     ✓ GiaoVien.MaMonGiangDay (giáo viên: ${maGiaoVien})`);
    console.log(`     ✓ BaoCaoTongKetMon (lớp: ${testMaLop})`);
    console.log(`\n   💡 Test: DELETE FROM MonHoc WHERE MaMonHoc = '${testMonHoc}';`);
    console.log(`   Kỳ vọng: FOREIGN KEY constraint failed`);

    console.log("\n🔴 TEST CASE 4.1: XÓA LỚP");
    console.log(`   Lớp: ${testMaLop}`);
    console.log(`   - Đang được tham chiếu bởi:`);
    console.log(`     ✓ HocSinh_LopNamHoc (học sinh: ${testMaHocSinh})`);
    console.log(`     ✓ Lop_NamHoc (năm học: NH2025-2026)`);
    console.log(`     ✓ ThoiKhoaBieu (năm học: NH2025-2026)`);
    console.log(`     ✓ PhanCongGiangDay (năm học: NH2025-2026)`);
    console.log(`     ✓ BaoCaoTongKetMon (năm học: NH2025-2026)`);
    console.log(`     ✓ BaoCaoTongKetHK (năm học: NH2025-2026)`);
    console.log(`\n   💡 Test: DELETE FROM LopHoc WHERE MaLop = '${testMaLop}';`);
    console.log(`   Kỳ vọng: FOREIGN KEY constraint failed (nếu code chưa xử lý)`);

    console.log("\n🔴 TEST CASE 5.1: XÓA NĂM HỌC");
    console.log(`   Năm học: ${testNamHoc}`);
    console.log(`   - Đang được tham chiếu bởi:`);
    console.log(`     ✓ NamHoc_HocKy (học kỳ 1)`);
    console.log(`     ✓ HocSinh_LopNamHoc (học sinh: ${testHSNamHoc}, lớp: ${testLopNamHoc})`);
    console.log(`     ✓ Lop_NamHoc (lớp: ${testLopNamHoc})`);
    console.log(`\n   💡 Test: DELETE FROM NamHoc WHERE MaNamHoc = '${testNamHoc}';`);
    console.log(`   Kỳ vọng: FOREIGN KEY constraint failed (nếu code chưa xử lý)`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Hoàn thành! Dữ liệu test đã sẵn sàng.");
    console.log("=".repeat(60));

    await sequelize.close();
  } catch (error) {
    console.error("\n❌ Lỗi:", error);
    await sequelize.close();
    process.exit(1);
  }
}

createTestDataForFKConstraints();

