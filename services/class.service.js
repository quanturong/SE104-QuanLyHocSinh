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
    const { MaLop, KhoiLop } = data;

    if (!MaLop || !KhoiLop) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    // Validate khối lớp
    const khoi = parseInt(KhoiLop);
    if (isNaN(khoi) || khoi < 10 || khoi > 12) {
      throw new Error("Khối lớp phải là 10, 11 hoặc 12");
    }

    // Validate mã lớp (ví dụ: 10A1, 11A2, 12A3, 12A5)
    const maLopPattern = /^1[0-2][A-Z][0-9]+$/;
    if (!maLopPattern.test(MaLop)) {
      throw new Error("Mã lớp không đúng định dạng (ví dụ: 10A1, 11A2, 12A3, 12A5)");
    }

    // Kiểm tra khối lớp có khớp với mã lớp không
    const khoiFromMaLop = parseInt(MaLop.substring(0, 2));
    if (khoiFromMaLop !== khoi) {
      throw new Error("Khối lớp không khớp với mã lớp");
    }

    const existing = await lopHocRepository.findById(MaLop);
    if (existing) {
      throw new Error(`Mã lớp "${MaLop}" đã tồn tại`);
    }

    return await lopHocRepository.create({
      MaLop,
      KhoiLop: khoi,
    });
  }

  async updateClass(oldMaLop, data) {
    // Debug log
    console.log("updateClass service - oldMaLop:", oldMaLop);
    console.log("updateClass service - data:", JSON.stringify(data));
    
    const { MaLop } = data || {};

    console.log("updateClass service - MaLop extracted:", MaLop);

    if (!MaLop || String(MaLop).trim() === '') {
      throw new Error("Vui lòng nhập mã lớp");
    }
    
    // Đảm bảo MaLop là string
    const maLopStr = String(MaLop).trim();

    // Validate mã lớp
    const maLopPattern = /^1[0-2][A-Z][0-9]+$/;
    if (!maLopPattern.test(maLopStr)) {
      throw new Error("Mã lớp không đúng định dạng (ví dụ: 10A1, 11A2, 12A3, 12A5)");
    }

    // Tự động tính khối lớp từ mã lớp
    const khoi = parseInt(maLopStr.substring(0, 2));
    if (isNaN(khoi) || khoi < 10 || khoi > 12) {
      throw new Error("Mã lớp không hợp lệ (khối lớp phải là 10, 11 hoặc 12)");
    }

    // Kiểm tra lớp cũ có tồn tại không
    const oldLopHoc = await lopHocRepository.findById(oldMaLop);
    if (!oldLopHoc) {
      throw new Error("Không tìm thấy lớp học");
    }

    // Nếu đổi mã lớp (primary key), cần xử lý đặc biệt
    if (oldMaLop !== maLopStr) {
      const existing = await lopHocRepository.findById(maLopStr);
      if (existing) {
        throw new Error(`Mã lớp "${maLopStr}" đã tồn tại`);
      }

      // Sử dụng transaction để đảm bảo tính nhất quán
      const { sequelize } = require("../models");
      const transaction = await sequelize.transaction();

      try {
        // Tạm thời disable foreign key checks để tránh constraint khi cập nhật
        await sequelize.query("PRAGMA foreign_keys = OFF", { transaction });
        
        // 1. Tạo lớp mới trước (để foreign key constraint được thỏa mãn)
        await sequelize.query(
          "INSERT INTO LopHoc (MaLop, KhoiLop) VALUES (?, ?)",
          { replacements: [maLopStr, khoi], transaction }
        );

        // 2. Cập nhật tất cả các bảng liên quan
        // Cập nhật HocSinh_LopNamHoc
        await sequelize.query(
          "UPDATE HocSinh_LopNamHoc SET MaLop = ? WHERE MaLop = ?",
          { replacements: [maLopStr, oldMaLop], transaction }
        );

        // Cập nhật ThoiKhoaBieu
        await sequelize.query(
          "UPDATE ThoiKhoaBieu SET MaLop = ? WHERE MaLop = ?",
          { replacements: [maLopStr, oldMaLop], transaction }
        );

        // Cập nhật Lop_NamHoc
        await sequelize.query(
          "UPDATE Lop_NamHoc SET MaLop = ? WHERE MaLop = ?",
          { replacements: [maLopStr, oldMaLop], transaction }
        );

        // 3. Xóa lớp cũ bằng raw SQL trong transaction
        await sequelize.query(
          "DELETE FROM LopHoc WHERE MaLop = ?",
          { replacements: [oldMaLop], transaction }
        );

        // Bật lại foreign key checks
        await sequelize.query("PRAGMA foreign_keys = ON", { transaction });

        await transaction.commit();
        return await lopHocRepository.findById(maLopStr);
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } else {
      // Chỉ cập nhật khối lớp nếu không đổi mã
      const lopHoc = await lopHocRepository.update(oldMaLop, {
        KhoiLop: khoi,
      });

      if (!lopHoc) throw new Error("Không tìm thấy lớp học");
      return lopHoc;
    }
  }

  async deleteClass(maLop) {
    // Không cho phép xóa lớp CHUA_CO_LOP
    if (maLop === 'CHUA_CO_LOP') {
      throw new Error("Không thể xóa lớp đặc biệt 'Chưa có lớp'");
    }

    const isUsedInTimetable = await lopHocRepository.isUsedInTimetable(maLop);
    if (isUsedInTimetable) {
      throw new Error("Không thể xóa lớp học đang có thời khóa biểu");
    }

    const { sequelize } = require("../models");
    const transaction = await sequelize.transaction();

    try {
      // Đảm bảo lớp CHUA_CO_LOP tồn tại
      await this.ensureChuaCoLopExists(transaction);

      // Lấy năm học hiện tại
      const [currentYearRow] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1",
        { transaction }
      );
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      if (!currentYear) {
        throw new Error("Không tìm thấy năm học hiện tại");
      }

      // Chuyển tất cả học sinh đang học sang lớp CHUA_CO_LOP
      const [studentsInClass] = await sequelize.query(
        "SELECT MaHocSinh FROM HocSinh_LopNamHoc WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
        { replacements: [maLop, currentYear], transaction }
      );

      console.log(`[deleteClass] Tìm thấy ${studentsInClass.length} học sinh đang học trong lớp ${maLop}`);

      if (studentsInClass.length > 0) {
        // Cập nhật lớp cũ: set TrangThai = 'ChuyenLop'
        await sequelize.query(
          "UPDATE HocSinh_LopNamHoc SET TrangThai = 'ChuyenLop', NgayChuyenLop = date('now') WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
          { replacements: [maLop, currentYear], transaction }
        );

        console.log(`[deleteClass] Đã cập nhật TrangThai = 'ChuyenLop' cho ${studentsInClass.length} học sinh`);

        // Tạo record mới cho lớp CHUA_CO_LOP
        let transferredCount = 0;
        for (const student of studentsInClass) {
          // Kiểm tra xem học sinh đã có trong CHUA_CO_LOP chưa
          const [existing] = await sequelize.query(
            "SELECT COUNT(*) AS cnt FROM HocSinh_LopNamHoc WHERE MaHocSinh = ? AND MaLop = 'CHUA_CO_LOP' AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
            { replacements: [student.MaHocSinh, currentYear], transaction }
          );

          if (existing[0].cnt === 0) {
            await sequelize.query(
              "INSERT INTO HocSinh_LopNamHoc (MaHocSinh, MaLop, MaNamHoc, TrangThai, NgayGhiDanh) VALUES (?, 'CHUA_CO_LOP', ?, 'DangHoc', date('now'))",
              { replacements: [student.MaHocSinh, currentYear], transaction }
            );
            transferredCount++;
          }
        }
        console.log(`[deleteClass] Đã chuyển ${transferredCount} học sinh sang lớp CHUA_CO_LOP`);
      }

      // Xóa thời khóa biểu của lớp (chỉ xóa nếu không có học sinh đang học)
      // Nếu có học sinh đang học, thời khóa biểu đã được xử lý ở trên
      await sequelize.query(
        "DELETE FROM ThoiKhoaBieu WHERE MaLop = ?",
        { replacements: [maLop], transaction }
      );

      // Xóa record trong Lop_NamHoc (nếu có)
      await sequelize.query(
        "DELETE FROM Lop_NamHoc WHERE MaLop = ?",
        { replacements: [maLop], transaction }
      );

      // Xóa lớp học bằng raw SQL trong transaction
      await sequelize.query(
        "DELETE FROM LopHoc WHERE MaLop = ?",
        { replacements: [maLop], transaction }
      );

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Hàm đảm bảo lớp CHUA_CO_LOP tồn tại
  async ensureChuaCoLopExists(transaction = null) {
    const { sequelize } = require("../models");
    const existing = await lopHocRepository.findById('CHUA_CO_LOP');
    
    if (!existing) {
      // Tạo lớp CHUA_CO_LOP với KhoiLop = 0 (không thuộc khối nào)
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