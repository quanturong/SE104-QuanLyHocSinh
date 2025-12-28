const sequelize = require("../config/db");

async function createTestData() {
  try {
    console.log("📋 Đang tạo dữ liệu test cho import CSV...\n");

    // Tạo 2 học sinh test
    const testStudents = [
      {
        MaHocSinh: "HS99901",
        HoTen: "Nguyễn Văn Test 1",
        GioiTinh: "Nam",
        NgaySinh: "2008-05-15",
        DiaChi: "123 Đường Test, Quận Test",
        Email: "test.hocsinh1@example.com",
        TrangThai: "DangHoc"
      },
      {
        MaHocSinh: "HS99902",
        HoTen: "Trần Thị Test 2",
        GioiTinh: "Nữ",
        NgaySinh: "2008-08-20",
        DiaChi: "456 Đường Test, Quận Test",
        Email: "test.hocsinh2@example.com",
        TrangThai: "DangHoc"
      }
    ];

    // Tạo 2 giáo viên test
    const testTeachers = [
      {
        HoTen: "Lê Văn Test GV1",
        GioiTinh: "Nam",
        NgaySinh: "1985-03-10",
        DiaChi: "789 Đường Test, Quận Test",
        Email: "test.giaovien1@example.com",
        MaMonGiangDay: "TOAN"
      },
      {
        HoTen: "Phạm Thị Test GV2",
        GioiTinh: "Nữ",
        NgaySinh: "1987-07-25",
        DiaChi: "321 Đường Test, Quận Test",
        Email: "test.giaovien2@example.com",
        MaMonGiangDay: "VAN"
      }
    ];

    // Kiểm tra và tạo môn học nếu chưa có
    const [existingMonHoc] = await sequelize.query(`
      SELECT MaMonHoc FROM MonHoc WHERE MaMonHoc IN ('TOAN', 'VAN')
    `);
    const existingMonHocCodes = existingMonHoc.map(m => m.MaMonHoc);

    if (!existingMonHocCodes.includes('TOAN')) {
      await sequelize.query(`
        INSERT INTO MonHoc (MaMonHoc, TenMonHoc) VALUES ('TOAN', 'Toán')
      `);
      console.log("✅ Đã tạo môn học: TOAN");
    }

    if (!existingMonHocCodes.includes('VAN')) {
      await sequelize.query(`
        INSERT INTO MonHoc (MaMonHoc, TenMonHoc) VALUES ('VAN', 'Văn')
      `);
      console.log("✅ Đã tạo môn học: VAN");
    }

    // Tạo học sinh test
    for (const student of testStudents) {
      const [existing] = await sequelize.query(`
        SELECT MaHocSinh FROM HoSoHocSinh WHERE MaHocSinh = ?
      `, { replacements: [student.MaHocSinh] });

      if (existing.length === 0) {
        await sequelize.query(`
          INSERT INTO HoSoHocSinh (MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, TrangThai)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            student.MaHocSinh,
            student.HoTen,
            student.GioiTinh,
            student.NgaySinh,
            student.DiaChi,
            student.Email,
            student.TrangThai
          ]
        });
        console.log(`✅ Đã tạo học sinh: ${student.MaHocSinh} - ${student.HoTen}`);
      } else {
        console.log(`⚠️  Học sinh đã tồn tại: ${student.MaHocSinh}`);
      }
    }

    // Tạo giáo viên test
    for (const teacher of testTeachers) {
      const [existing] = await sequelize.query(`
        SELECT MaGiaoVien FROM GiaoVien WHERE Email = ?
      `, { replacements: [teacher.Email] });

      if (existing.length === 0) {
        const [result] = await sequelize.query(`
          INSERT INTO GiaoVien (HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay)
          VALUES (?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            teacher.HoTen,
            teacher.GioiTinh,
            teacher.NgaySinh,
            teacher.DiaChi,
            teacher.Email,
            teacher.MaMonGiangDay
          ]
        });

        const [newTeacher] = await sequelize.query(`
          SELECT MaGiaoVien FROM GiaoVien WHERE Email = ?
        `, { replacements: [teacher.Email] });

        const maGiaoVien = newTeacher[0].MaGiaoVien;
        console.log(`✅ Đã tạo giáo viên: GV${String(maGiaoVien).padStart(3, '0')} - ${teacher.HoTen} (MaGiaoVien: ${maGiaoVien})`);
      } else {
        const [existingTeacher] = await sequelize.query(`
          SELECT MaGiaoVien FROM GiaoVien WHERE Email = ?
        `, { replacements: [teacher.Email] });
        console.log(`⚠️  Giáo viên đã tồn tại: GV${String(existingTeacher[0].MaGiaoVien).padStart(3, '0')} - ${teacher.HoTen}`);
      }
    }

    // Lấy mã giáo viên đã tạo để hiển thị
    const [createdTeachers] = await sequelize.query(`
      SELECT MaGiaoVien, HoTen FROM GiaoVien WHERE Email IN ('test.giaovien1@example.com', 'test.giaovien2@example.com')
      ORDER BY MaGiaoVien ASC
    `);

    console.log("\n📊 Tóm tắt dữ liệu test đã tạo:");
    console.log("\n📚 Học sinh:");
    testStudents.forEach(s => {
      console.log(`   - ${s.MaHocSinh}: ${s.HoTen}`);
    });
    console.log("\n👨‍🏫 Giáo viên:");
    createdTeachers.forEach(t => {
      console.log(`   - MaGiaoVien: ${t.MaGiaoVien} (GV${String(t.MaGiaoVien).padStart(3, '0')}): ${t.HoTen}`);
    });

    console.log("\n✅ Hoàn thành! Dữ liệu test đã sẵn sàng cho import CSV.");
    console.log("\n💡 Lưu ý: Sử dụng các mã sau trong file CSV:");
    console.log(`   - MaHocSinh: ${testStudents[0].MaHocSinh}, ${testStudents[1].MaHocSinh}`);
    console.log(`   - MaGiaoVien: ${createdTeachers[0]?.MaGiaoVien}, ${createdTeachers[1]?.MaGiaoVien}`);

    await sequelize.close();
  } catch (error) {
    console.error("\n❌ Lỗi:", error);
    await sequelize.close();
    process.exit(1);
  }
}

createTestData();

