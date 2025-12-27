const { MonHoc } = require("../models");

class MonHocRepository {
  async findAll() {
    return await MonHoc.findAll({
      order: [["TenMonHoc", "ASC"]],
    });
  }

  async findById(maMonHoc) {
    return await MonHoc.findByPk(maMonHoc);
  }

  async create(monHocData) {
    return await MonHoc.create(monHocData);
  }

  async update(maMonHoc, monHocData) {
    const monHoc = await MonHoc.findByPk(maMonHoc);
    if (!monHoc) {
      return null;
    }
    return await monHoc.update(monHocData);
  }

  async delete(maMonHoc) {
    const monHoc = await MonHoc.findByPk(maMonHoc);
    if (!monHoc) {
      return null;
    }
    return await monHoc.destroy();
  }

  async isUsedInScores(maMonHoc) {
    const { sequelize } = require("../models");
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM BangDiemMonHoc WHERE MaMonHoc = ?",
      { replacements: [maMonHoc] }
    );
    return result[0].cnt > 0;
  }

  async isUsedInTimetable(maMonHoc) {
    const { sequelize } = require("../models");
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM ThoiKhoaBieu WHERE MaMonHoc = ?",
      { replacements: [maMonHoc] }
    );
    return result[0].cnt > 0;
  }

  async isUsedInTeachers(maMonHoc) {
    const { sequelize } = require("../models");
    // Kiểm tra cả trong GiaoVien (tương thích ngược) và PhanCongGiangDay
    const [result1] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM GiaoVien WHERE MaMonGiangDay = ?",
      { replacements: [maMonHoc] }
    );
    const [result2] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM PhanCongGiangDay WHERE MaMonHoc = ?",
      { replacements: [maMonHoc] }
    );
    return (result1[0].cnt > 0) || (result2[0].cnt > 0);
  }
}

module.exports = new MonHocRepository();

