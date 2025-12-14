const { GiaoVien } = require("../models");
const { sequelize } = require("../models");

class GiaoVienRepository {
  async findAll() {
    return await sequelize.query(`
      SELECT gv.MaGiaoVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh,
             gv.DiaChi, gv.Email, gv.MaMonGiangDay,
             mh.TenMonHoc
      FROM GiaoVien gv
      LEFT JOIN MonHoc mh ON gv.MaMonGiangDay = mh.MaMonHoc
      ORDER BY gv.MaGiaoVien ASC;
    `);
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

      // 2. Set NULL cho MaGVChuNhiem trong LopHoc
      await sequelize.query(
        "UPDATE LopHoc SET MaGVChuNhiem = NULL WHERE MaGVChuNhiem = ?",
        { 
          replacements: [maGiaoVien],
          transaction 
        }
      );

      // 3. Xóa giáo viên bằng raw SQL để tránh foreign key constraint
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
      "SELECT COUNT(*) AS cnt FROM LopHoc WHERE MaGVChuNhiem = ?",
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
        "SELECT COUNT(*) AS cnt, GROUP_CONCAT(MaLop) AS classes FROM LopHoc WHERE MaGVChuNhiem = ?",
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
    const [result] = await sequelize.query(`
      SELECT l.MaLop, COUNT(hs.MaHocSinh) AS SiSo
      FROM LopHoc l
      LEFT JOIN HoSoHocSinh hs ON l.MaLop = hs.MaLop
      WHERE l.MaGVChuNhiem = ?
      GROUP BY l.MaLop;
    `, { replacements: [maGiaoVien] });
    return result[0] || null;
  }
}

module.exports = new GiaoVienRepository();

