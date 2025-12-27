const { HocSinh_LopNamHoc, sequelize, HoSoHocSinh, LopHoc, NamHoc } = require("../models");

class HocSinhLopNamHocRepository {
  async findAll() {
    return await HocSinh_LopNamHoc.findAll();
  }

  async findByPk(maHocSinh, maLop, maNamHoc) {
    return await HocSinh_LopNamHoc.findOne({
      where: { MaHocSinh: maHocSinh, MaLop: maLop, MaNamHoc: maNamHoc },
    });
  }

  async findByHocSinh(maHocSinh, maNamHoc = null) {
    const where = { MaHocSinh: maHocSinh };
    if (maNamHoc) {
      where.MaNamHoc = maNamHoc;
    }
    return await HocSinh_LopNamHoc.findAll({ where, order: [['MaNamHoc', 'DESC']] });
  }

  async findByLop(maLop, maNamHoc = null) {
    const where = { MaLop: maLop };
    if (maNamHoc) {
      where.MaNamHoc = maNamHoc;
    }
    return await HocSinh_LopNamHoc.findAll({ where });
  }

  async findByNamHoc(maNamHoc) {
    return await HocSinh_LopNamHoc.findAll({
      where: { MaNamHoc: maNamHoc },
    });
  }

  // Lấy lớp hiện tại của học sinh (năm học mới nhất)
  async getCurrentClass(maHocSinh) {
    const [rows] = await sequelize.query(`
      SELECT hln.MaLop, hln.MaNamHoc, hln.TrangThai
      FROM HocSinh_LopNamHoc hln
      WHERE hln.MaHocSinh = ?
      ORDER BY hln.MaNamHoc DESC
      LIMIT 1
    `, { replacements: [maHocSinh] });
    return rows[0] || null;
  }

  // Lấy danh sách học sinh trong lớp theo năm học
  async getStudentsInClass(maLop, maNamHoc) {
    const [rows] = await sequelize.query(`
      SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh, hs.DiaChi, hs.Email,
             hln.MaLop, hln.TrangThai
      FROM HocSinh_LopNamHoc hln
      INNER JOIN HoSoHocSinh hs ON hln.MaHocSinh = hs.MaHocSinh
      WHERE hln.MaLop = ? AND hln.MaNamHoc = ? AND hln.TrangThai = 'DangHoc'
      ORDER BY hs.HoTen ASC
    `, { replacements: [maLop, maNamHoc] });
    return rows;
  }

  // Đếm số học sinh trong lớp theo năm học
  async countStudentsInClass(maLop, maNamHoc) {
    const [rows] = await sequelize.query(`
      SELECT COUNT(*) AS SoHS
      FROM HocSinh_LopNamHoc
      WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'
    `, { replacements: [maLop, maNamHoc] });
    return rows[0]?.SoHS || 0;
  }

  async create(data) {
    return await HocSinh_LopNamHoc.create(data);
  }

  async update(maHocSinh, maLop, maNamHoc, data) {
    const record = await this.findByPk(maHocSinh, maLop, maNamHoc);
    if (!record) {
      return null;
    }
    return await record.update(data);
  }

  async delete(maHocSinh, maLop, maNamHoc) {
    const record = await this.findByPk(maHocSinh, maLop, maNamHoc);
    if (!record) {
      return null;
    }
    return await record.destroy();
  }

  async deleteByHocSinh(maHocSinh) {
    return await HocSinh_LopNamHoc.destroy({
      where: { MaHocSinh: maHocSinh },
    });
  }

  async deleteByLop(maLop, maNamHoc) {
    return await HocSinh_LopNamHoc.destroy({
      where: { MaLop: maLop, MaNamHoc: maNamHoc },
    });
  }
}

module.exports = new HocSinhLopNamHocRepository();

