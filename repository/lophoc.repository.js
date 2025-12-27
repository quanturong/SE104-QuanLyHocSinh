const { LopHoc } = require("../models");
const { sequelize } = require("../models");

class LopHocRepository {
  async findAll() {
    return await LopHoc.findAll({
      order: [["KhoiLop", "ASC"], ["MaLop", "ASC"]],
    });
  }

  async findById(maLop) {
    return await LopHoc.findByPk(maLop);
  }

  async create(lopHocData) {
    return await LopHoc.create(lopHocData);
  }

  async update(maLop, lopHocData) {
    const lopHoc = await LopHoc.findByPk(maLop);
    if (!lopHoc) {
      return null;
    }
    return await lopHoc.update(lopHocData);
  }

  async delete(maLop) {
    const lopHoc = await LopHoc.findByPk(maLop);
    if (!lopHoc) {
      return null;
    }
    return await lopHoc.destroy();
  }

  async isUsedInStudents(maLop) {
    // Chỉ kiểm tra học sinh đang học (TrangThai = 'DangHoc')
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM HocSinh_LopNamHoc WHERE MaLop = ? AND TrangThai = 'DangHoc'",
      { replacements: [maLop] }
    );
    return result[0].cnt > 0;
  }

  async isUsedInTimetable(maLop) {
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM ThoiKhoaBieu WHERE MaLop = ?",
      { replacements: [maLop] }
    );
    return result[0].cnt > 0;
  }

  async isUsedInLopNamHoc(maLop) {
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM Lop_NamHoc WHERE MaLop = ?",
      { replacements: [maLop] }
    );
    return result[0].cnt > 0;
  }
}

module.exports = new LopHocRepository();

