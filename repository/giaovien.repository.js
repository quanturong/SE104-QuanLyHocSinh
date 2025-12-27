const { GiaoVien } = require("../models");
const { sequelize } = require("../models");
const phanCongRepository = require("./phancong.repository");

class GiaoVienRepository {
  async findAll() {
    const [teachers] = await sequelize.query(`
      SELECT DISTINCT gv.MaGiaoVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh,
             gv.DiaChi, gv.Email, gv.MaMonGiangDay
      FROM GiaoVien gv
      ORDER BY gv.MaGiaoVien ASC;
    `);
    
    // Lấy danh sách môn học cho mỗi giáo viên từ PhanCongGiangDay
    for (const teacher of teachers) {
      const monHocs = await phanCongRepository.getMonHocByGiaoVien(teacher.MaGiaoVien);
      teacher.MonHocs = monHocs;
      // Giữ lại MaMonGiangDay và TenMonHoc để tương thích ngược
      if (monHocs.length > 0) {
        teacher.MaMonGiangDay = monHocs[0].MaMonHoc; // Môn đầu tiên
        // Loại bỏ trùng lặp khi hiển thị (chỉ lấy tên môn duy nhất)
        const uniqueMonHocs = [...new Set(monHocs.map(m => m.TenMonHoc || m.MaMonHoc))];
        teacher.TenMonHoc = uniqueMonHocs.join(', '); // Tất cả môn (không trùng)
      } else if (teacher.MaMonGiangDay) {
        // Fallback về MaMonGiangDay cũ nếu chưa có trong PhanCongGiangDay
        const [monHoc] = await sequelize.query(
          'SELECT TenMonHoc FROM MonHoc WHERE MaMonHoc = ?',
          { replacements: [teacher.MaMonGiangDay] }
        );
        teacher.TenMonHoc = monHoc[0]?.TenMonHoc || teacher.MaMonGiangDay;
      }
    }
    
    return [teachers];
  }

  async findById(maGiaoVien) {
    return await GiaoVien.findByPk(maGiaoVien);
  }

  async findByEmail(email) {
    return await GiaoVien.findOne({
      where: { Email: email },
    });
  }

  async create(giaoVienData) {
    return await GiaoVien.create(giaoVienData);
  }

  async update(maGiaoVien, giaoVienData) {
    const giaoVien = await GiaoVien.findByPk(maGiaoVien);
    if (!giaoVien) {
      return null;
    }
    return await giaoVien.update(giaoVienData);
  }

  async delete(maGiaoVien) {
    const giaoVien = await GiaoVien.findByPk(maGiaoVien);
    if (!giaoVien) {
      return null;
    }

    // Sử dụng transaction để đảm bảo tính nhất quán
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Xóa các bản ghi trong ThoiKhoaBieu trước
      await sequelize.query(
        "DELETE FROM ThoiKhoaBieu WHERE MaGiaoVien = ?",
        { 
          replacements: [maGiaoVien],
          transaction 
        }
      );

      // 2. Set NULL cho MaGVChuNhiem trong Lop_NamHoc (đã chuyển từ LopHoc)
      await sequelize.query(
        "UPDATE Lop_NamHoc SET MaGVChuNhiem = NULL WHERE MaGVChuNhiem = ?",
        { 
          replacements: [maGiaoVien],
          transaction 
        }
      );

      // 3. Xóa phân công giảng dạy (CASCADE sẽ tự động xóa, nhưng để chắc chắn)
      await sequelize.query(
        "DELETE FROM PhanCongGiangDay WHERE MaGiaoVien = ?",
        { 
          replacements: [maGiaoVien],
          transaction 
        }
      );

      // 4. Xóa giáo viên bằng raw SQL để tránh foreign key constraint
      await sequelize.query(
        "DELETE FROM GiaoVien WHERE MaGiaoVien = ?",
        { 
          replacements: [maGiaoVien],
          transaction 
        }
      );

      // Commit transaction
      await transaction.commit();
      return giaoVien;
    } catch (err) {
      // Rollback nếu có lỗi
      await transaction.rollback();
      throw err;
    }
  }

  async isChuNhiemLop(maGiaoVien) {
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM Lop_NamHoc WHERE MaGVChuNhiem = ?",
      { replacements: [maGiaoVien] }
    );
    return result[0].cnt > 0;
  }

  async isUsedInTimetable(maGiaoVien) {
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM ThoiKhoaBieu WHERE MaGiaoVien = ?",
      { replacements: [maGiaoVien] }
    );
    return result[0].cnt > 0;
  }

  async getUsageInfo(maGiaoVien) {
    try {
      const [lopHoc] = await sequelize.query(
        "SELECT COUNT(*) AS cnt, GROUP_CONCAT(MaLop) AS classes FROM Lop_NamHoc WHERE MaGVChuNhiem = ?",
        { replacements: [maGiaoVien] }
      );
      const [timetable] = await sequelize.query(
        "SELECT COUNT(*) AS cnt, GROUP_CONCAT(DISTINCT MaLop) AS classes FROM ThoiKhoaBieu WHERE MaGiaoVien = ?",
        { replacements: [maGiaoVien] }
      );
      return {
        isChuNhiem: lopHoc[0] && lopHoc[0].cnt > 0,
        chuNhiemClasses: (lopHoc[0] && lopHoc[0].classes) || '',
        isTeaching: timetable[0] && timetable[0].cnt > 0,
        teachingClasses: (timetable[0] && timetable[0].classes) || '',
      };
    } catch (err) {
      console.error("Lỗi getUsageInfo:", err);
      // Nếu có lỗi, trả về thông tin an toàn
      return {
        isChuNhiem: false,
        chuNhiemClasses: '',
        isTeaching: false,
        teachingClasses: '',
      };
    }
  }

  async getTeachingClasses(maGiaoVien) {
    const [result] = await sequelize.query(`
      SELECT DISTINCT t.MaLop, t.MaMonHoc, m.TenMonHoc, t.Thu, t.TietHoc
      FROM ThoiKhoaBieu t
      LEFT JOIN MonHoc m ON t.MaMonHoc = m.MaMonHoc
      WHERE t.MaGiaoVien = ?
      ORDER BY t.MaLop, t.Thu, t.TietHoc;
    `, { replacements: [maGiaoVien] });
    return result;
  }

  async getHomeroomClass(maGiaoVien) {
    // Lấy lớp chủ nhiệm từ năm học hiện tại (mới nhất)
    const [result] = await sequelize.query(`
      SELECT ln.MaLop, ln.SiSo
      FROM Lop_NamHoc ln
      WHERE ln.MaGVChuNhiem = ?
      ORDER BY ln.MaNamHoc DESC
      LIMIT 1;
    `, { replacements: [maGiaoVien] });
    return result[0] || null;
  }
}

module.exports = new GiaoVienRepository();

