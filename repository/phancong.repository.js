const { PhanCongGiangDay } = require("../models");
const { sequelize } = require("../models");

class PhanCongRepository {
  async findAll(filters = {}) {
    const where = {};
    if (filters.MaGiaoVien) where.MaGiaoVien = filters.MaGiaoVien;
    if (filters.MaMonHoc) where.MaMonHoc = filters.MaMonHoc;
    if (filters.MaLop) where.MaLop = filters.MaLop;
    if (filters.NamHoc) where.NamHoc = filters.NamHoc;
    if (filters.HocKy !== undefined) where.HocKy = filters.HocKy;

    return await PhanCongGiangDay.findAll({
      where,
      order: [["MaGiaoVien", "ASC"], ["MaMonHoc", "ASC"]],
    });
  }

  async findByPk(maPhanCong) {
    return await PhanCongGiangDay.findByPk(maPhanCong);
  }

  async findByGiaoVien(maGiaoVien) {
    return await PhanCongGiangDay.findAll({
      where: { MaGiaoVien: maGiaoVien },
      order: [["MaMonHoc", "ASC"]],
    });
  }

  async findByGiaoVienAndMonHoc(maGiaoVien, maMonHoc) {
    return await PhanCongGiangDay.findOne({
      where: {
        MaGiaoVien: maGiaoVien,
        MaMonHoc: maMonHoc,
      },
    });
  }

  async create(data) {
    return await PhanCongGiangDay.create(data);
  }

  async update(maPhanCong, data) {
    const phanCong = await PhanCongGiangDay.findByPk(maPhanCong);
    if (!phanCong) {
      return null;
    }
    return await phanCong.update(data);
  }

  async delete(maPhanCong) {
    const phanCong = await PhanCongGiangDay.findByPk(maPhanCong);
    if (!phanCong) {
      return null;
    }
    return await phanCong.destroy();
  }

  async deleteByGiaoVien(maGiaoVien) {
    return await PhanCongGiangDay.destroy({
      where: { MaGiaoVien: maGiaoVien },
    });
  }

  async deleteByGiaoVienAndMonHoc(maGiaoVien, maMonHoc) {
    return await PhanCongGiangDay.destroy({
      where: {
        MaGiaoVien: maGiaoVien,
        MaMonHoc: maMonHoc,
      },
    });
  }

  // Lấy danh sách môn học của giáo viên (dùng JOIN để lấy tên môn, loại bỏ trùng lặp)
  async getMonHocByGiaoVien(maGiaoVien) {
    const [rows] = await sequelize.query(`
      SELECT DISTINCT pc.MaMonHoc, m.TenMonHoc
      FROM PhanCongGiangDay pc
      LEFT JOIN MonHoc m ON pc.MaMonHoc = m.MaMonHoc
      WHERE pc.MaGiaoVien = ?
      ORDER BY m.TenMonHoc
    `, { replacements: [maGiaoVien] });
    return rows;
  }
}

module.exports = new PhanCongRepository();

