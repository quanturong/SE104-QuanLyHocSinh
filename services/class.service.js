const lopHocRepository = require("../repository/lophoc.repository");

class ClassService {
  async getAllClasses() {
    try {
      return await lopHocRepository.findAll();
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lớp:", error);
      throw new Error("Không thể truy xuất danh sách lớp.");
    }
  }

  async getClassById(maLop) {
    const lopHoc = await lopHocRepository.findById(maLop);
    if (!lopHoc) throw new Error("Không tìm thấy lớp học");
    return lopHoc;
  }

  async createClass(data) {
    const { MaLop, KhoiLop, MaNamHoc } = data;

    if (!MaLop || !KhoiLop) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    const khoi = parseInt(KhoiLop);
    if (isNaN(khoi) || khoi < 10 || khoi > 12) {
      throw new Error("Khối lớp phải là 10, 11 hoặc 12");
    }

    const maLopPattern = /^1[0-2][A-Z][0-9]+$/;
    if (!maLopPattern.test(MaLop)) {
      throw new Error("Mã lớp không đúng định dạng (ví dụ: 10A1, 11A2, 12A3, 12A5)");
    }

    const khoiFromMaLop = parseInt(MaLop.substring(0, 2));
    if (khoiFromMaLop !== khoi) {
      throw new Error("Khối lớp không khớp với mã lớp");
    }

    const { sequelize } = require("../models");
    
    let currentYear = MaNamHoc;
    if (!currentYear) {
      const [currentYearRow] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1"
      );
      currentYear = currentYearRow[0]?.MaNamHoc || null;
    }

    const existing = await lopHocRepository.findById(MaLop);
    
    if (existing) {
      if (!currentYear) {
        throw new Error("Chưa có năm học nào được khai báo. Vui lòng tạo năm học trước.");
      }

      const [existingInYear] = await sequelize.query(
        "SELECT COUNT(*) AS count FROM Lop_NamHoc WHERE MaLop = ? AND MaNamHoc = ?",
        { replacements: [MaLop, currentYear] }
      );

      if (existingInYear[0].count > 0) {
        throw new Error(`Lớp "${MaLop}" đã tồn tại trong năm học ${currentYear}`);
      }

      await sequelize.query(
        "INSERT INTO Lop_NamHoc (MaLop, MaNamHoc, SiSo, MaGVChuNhiem) VALUES (?, ?, 0, NULL)",
        { replacements: [MaLop, currentYear] }
      );
      console.log(`✅ Đã thêm lớp ${MaLop} (đã tồn tại) vào năm học ${currentYear}`);
      
      return existing;
    }

    const lopHoc = await lopHocRepository.create({
      MaLop,
      KhoiLop: khoi,
    });

    if (currentYear) {
      const [existingInYear] = await sequelize.query(
        "SELECT COUNT(*) AS count FROM Lop_NamHoc WHERE MaLop = ? AND MaNamHoc = ?",
        { replacements: [MaLop, currentYear] }
      );

      if (existingInYear[0].count === 0) {
        await sequelize.query(
          "INSERT INTO Lop_NamHoc (MaLop, MaNamHoc, SiSo, MaGVChuNhiem) VALUES (?, ?, 0, NULL)",
          { replacements: [MaLop, currentYear] }
        );
        console.log(`✅ Đã tự động thêm lớp ${MaLop} vào năm học ${currentYear}`);
      }
    }

    return lopHoc;
  }

  async updateClass(oldMaLop, data) {
    console.log("updateClass service - oldMaLop:", oldMaLop);
    console.log("updateClass service - data:", JSON.stringify(data));
    
    const { MaLop, MaGVChuNhiem } = data || {};

    console.log("updateClass service - MaLop extracted:", MaLop);

    if (!MaLop || String(MaLop).trim() === '') {
      throw new Error("Vui lòng nhập mã lớp");
    }
    
    const maLopStr = String(MaLop).trim();

    const maLopPattern = /^1[0-2][A-Z][0-9]+$/;
    if (!maLopPattern.test(maLopStr)) {
      throw new Error("Mã lớp không đúng định dạng (ví dụ: 10A1, 11A2, 12A3, 12A5)");
    }

    const khoi = parseInt(maLopStr.substring(0, 2));
    if (isNaN(khoi) || khoi < 10 || khoi > 12) {
      throw new Error("Mã lớp không hợp lệ (khối lớp phải là 10, 11 hoặc 12)");
    }

    const oldLopHoc = await lopHocRepository.findById(oldMaLop);
    if (!oldLopHoc) {
      throw new Error("Không tìm thấy lớp học");
    }

    if (oldMaLop !== maLopStr) {
      const existing = await lopHocRepository.findById(maLopStr);
      if (existing) {
        throw new Error(`Mã lớp "${maLopStr}" đã tồn tại`);
      }

      const { sequelize } = require("../models");
      const transaction = await sequelize.transaction();

      try {
        await sequelize.query("PRAGMA foreign_keys = OFF", { transaction });
        
        await sequelize.query(
          "INSERT INTO LopHoc (MaLop, KhoiLop) VALUES (?, ?)",
          { replacements: [maLopStr, khoi], transaction }
        );

        await sequelize.query(
          "UPDATE HocSinh_LopNamHoc SET MaLop = ? WHERE MaLop = ?",
          { replacements: [maLopStr, oldMaLop], transaction }
        );

        await sequelize.query(
          "UPDATE ThoiKhoaBieu SET MaLop = ? WHERE MaLop = ?",
          { replacements: [maLopStr, oldMaLop], transaction }
        );

        await sequelize.query(
          "UPDATE Lop_NamHoc SET MaLop = ? WHERE MaLop = ?",
          { replacements: [maLopStr, oldMaLop], transaction }
        );

        await sequelize.query(
          "DELETE FROM LopHoc WHERE MaLop = ?",
          { replacements: [oldMaLop], transaction }
        );

        await sequelize.query("PRAGMA foreign_keys = ON", { transaction });

        await transaction.commit();
        return await lopHocRepository.findById(maLopStr);
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } else {
      const lopHoc = await lopHocRepository.update(oldMaLop, {
        KhoiLop: khoi,
      });

      if (!lopHoc) throw new Error("Không tìm thấy lớp học");
      
      const { sequelize } = require("../models");
      const [currentYearRow] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1"
      );
      const currentYear = currentYearRow[0]?.MaNamHoc || null;
      
      if (currentYear) {
        const [existingLopNamHoc] = await sequelize.query(
          "SELECT * FROM Lop_NamHoc WHERE MaLop = ? AND MaNamHoc = ?",
          { replacements: [oldMaLop, currentYear] }
        );
        
        if (existingLopNamHoc.length > 0) {
          await sequelize.query(
            "UPDATE Lop_NamHoc SET MaGVChuNhiem = ? WHERE MaLop = ? AND MaNamHoc = ?",
            { replacements: [MaGVChuNhiem || null, oldMaLop, currentYear] }
          );
        } else {
          await sequelize.query(
            "INSERT INTO Lop_NamHoc (MaLop, MaNamHoc, MaGVChuNhiem) VALUES (?, ?, ?)",
            { replacements: [oldMaLop, currentYear, MaGVChuNhiem || null] }
          );
        }
      }
      
      return lopHoc;
    }
  }

  async deleteClass(maLop, maNamHoc = null) {
    if (maLop === 'CHUA_CO_LOP') {
      throw new Error("Không thể xóa lớp đặc biệt 'Chưa có lớp'");
    }

    const { sequelize } = require("../models");
    const transaction = await sequelize.transaction();

    try {
      await this.ensureChuaCoLopExists(transaction);

      let targetYear = maNamHoc;
      if (!targetYear) {
        const [currentYearRow] = await sequelize.query(
          "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1",
          { transaction }
        );
        targetYear = currentYearRow[0]?.MaNamHoc || null;
      }

      if (!targetYear) {
        throw new Error("Không tìm thấy năm học");
      }

      const [studentsInClass] = await sequelize.query(
        "SELECT MaHocSinh FROM HocSinh_LopNamHoc WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
        { replacements: [maLop, targetYear], transaction }
      );

      console.log(`[deleteClass] Tìm thấy ${studentsInClass.length} học sinh đang học trong lớp ${maLop} năm học ${targetYear}`);

      if (studentsInClass.length > 0) {
        await sequelize.query(
          "UPDATE HocSinh_LopNamHoc SET TrangThai = 'ChuyenLop' WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
          { replacements: [maLop, targetYear], transaction }
        );

        console.log(`[deleteClass] Đã cập nhật TrangThai = 'ChuyenLop' cho ${studentsInClass.length} học sinh`);

        let transferredCount = 0;
        for (const student of studentsInClass) {
          const [existing] = await sequelize.query(
            "SELECT COUNT(*) AS cnt FROM HocSinh_LopNamHoc WHERE MaHocSinh = ? AND MaLop = 'CHUA_CO_LOP' AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
            { replacements: [student.MaHocSinh, targetYear], transaction }
          );

          if (existing[0].cnt === 0) {
            await sequelize.query(
              "INSERT INTO HocSinh_LopNamHoc (MaHocSinh, MaLop, MaNamHoc, TrangThai) VALUES (?, 'CHUA_CO_LOP', ?, 'DangHoc')",
              { replacements: [student.MaHocSinh, targetYear], transaction }
            );
            transferredCount++;
          }
        }
        console.log(`[deleteClass] Đã chuyển ${transferredCount} học sinh sang lớp CHUA_CO_LOP`);
      }

      await sequelize.query(
        "DELETE FROM ThoiKhoaBieu WHERE MaLop = ? AND NamHoc = ?",
        { replacements: [maLop, targetYear], transaction }
      );

      await sequelize.query(
        "DELETE FROM Lop_NamHoc WHERE MaLop = ? AND MaNamHoc = ?",
        { replacements: [maLop, targetYear], transaction }
      );

      console.log(`[deleteClass] Đã xóa lớp ${maLop} khỏi năm học ${targetYear}`);

      const [remainingRecords] = await sequelize.query(
        "SELECT COUNT(*) AS count FROM Lop_NamHoc WHERE MaLop = ?",
        { replacements: [maLop], transaction }
      );

      const remainingCount = remainingRecords[0]?.count || 0;

      if (remainingCount === 0) {
        // Xóa tất cả dữ liệu liên quan đến lớp này ở TẤT CẢ các năm học trước khi xóa LopHoc
        // (để tránh foreign key constraint error)
        
        // 1. Xóa tất cả HocSinh_LopNamHoc
        await sequelize.query(
          "DELETE FROM HocSinh_LopNamHoc WHERE MaLop = ?",
          { replacements: [maLop], transaction }
        );
        console.log(`[deleteClass] Đã xóa tất cả HocSinh_LopNamHoc của lớp ${maLop}`);

        // 2. Xóa tất cả ThoiKhoaBieu (tất cả năm học)
        await sequelize.query(
          "DELETE FROM ThoiKhoaBieu WHERE MaLop = ?",
          { replacements: [maLop], transaction }
        );
        console.log(`[deleteClass] Đã xóa tất cả ThoiKhoaBieu của lớp ${maLop}`);

        // 3. Xóa tất cả PhanCongGiangDay (không còn cột MaLop, bỏ qua)
        // PhanCongGiangDay không còn liên kết trực tiếp với lớp qua MaLop

        // 4. Xóa tất cả BaoCaoTongKetMon
        await sequelize.query(
          "DELETE FROM BaoCaoTongKetMon WHERE MaLop = ?",
          { replacements: [maLop], transaction }
        );
        console.log(`[deleteClass] Đã xóa tất cả BaoCaoTongKetMon của lớp ${maLop}`);

        // 5. Xóa tất cả BaoCaoTongKetHK
        await sequelize.query(
          "DELETE FROM BaoCaoTongKetHK WHERE MaLop = ?",
          { replacements: [maLop], transaction }
        );
        console.log(`[deleteClass] Đã xóa tất cả BaoCaoTongKetHK của lớp ${maLop}`);

        // 6. Xóa tất cả Lop_NamHoc (đã xóa ở trên nhưng để chắc chắn)
        await sequelize.query(
          "DELETE FROM Lop_NamHoc WHERE MaLop = ?",
          { replacements: [maLop], transaction }
        );
        console.log(`[deleteClass] Đã xóa tất cả Lop_NamHoc của lớp ${maLop}`);

        // 7. Cuối cùng mới xóa LopHoc
        await sequelize.query(
          "DELETE FROM LopHoc WHERE MaLop = ?",
          { replacements: [maLop], transaction }
        );
        console.log(`[deleteClass] Đã xóa lớp ${maLop} khỏi bảng LopHoc`);
      } else {
        console.log(`[deleteClass] Lớp ${maLop} vẫn còn ${remainingCount} bản ghi trong Lop_NamHoc, không xóa khỏi LopHoc`);
      }

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async ensureChuaCoLopExists(transaction = null) {
    const { sequelize } = require("../models");
    const existing = await lopHocRepository.findById('CHUA_CO_LOP');
    
    if (!existing) {
      if (transaction) {
        await sequelize.query(
          "INSERT INTO LopHoc (MaLop, KhoiLop) VALUES ('CHUA_CO_LOP', 0)",
          { transaction }
        );
      } else {
        await lopHocRepository.create({
          MaLop: 'CHUA_CO_LOP',
          KhoiLop: 0
        });
      }
    }
  }
}

module.exports = new ClassService();