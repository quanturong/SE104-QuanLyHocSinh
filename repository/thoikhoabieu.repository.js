const { ThoiKhoaBieu } = require("../models");

class ThoiKhoaBieuRepository {
  async findAll(filters = {}) {
    const where = {};
    if (filters.MaLop) where.MaLop = filters.MaLop;
    if (filters.Thu) where.Thu = filters.Thu;
    if (filters.TietHoc) where.TietHoc = filters.TietHoc;
    if (filters.NamHoc) where.NamHoc = filters.NamHoc;
    if (filters.HocKy !== undefined) where.HocKy = filters.HocKy;

    return await ThoiKhoaBieu.findAll({
      where,
      order: [["MaLop", "ASC"], ["Thu", "ASC"], ["TietHoc", "ASC"]],
    });
  }

  async findByPk(maLop, namHoc, hocKy, thu, tietHoc) {
    if (!namHoc) {
      throw new Error("NamHoc is required for findByPk");
    }
    if (hocKy === undefined || hocKy === null) {
      hocKy = 1; // Default to semester 1
    }
    return await ThoiKhoaBieu.findOne({
      where: {
        MaLop: maLop,
        NamHoc: namHoc,
        HocKy: hocKy,
        Thu: thu,
        TietHoc: tietHoc,
      },
    });
  }

  async create(data) {
    return await ThoiKhoaBieu.create(data);
  }

  async update(maLop, namHoc, hocKy, thu, tietHoc, data) {
    const tkb = await this.findByPk(maLop, namHoc, hocKy, thu, tietHoc);
    if (!tkb) {
      return null;
    }
    return await tkb.update(data);
  }

  async upsert(data) {
    // Upsert: nếu tồn tại thì update, không thì create
    const { MaLop, NamHoc, HocKy, Thu, TietHoc } = data;
    const hocKyValue = HocKy !== undefined && HocKy !== null ? HocKy : 1;
    const existing = await this.findByPk(MaLop, NamHoc, hocKyValue, Thu, TietHoc);
    
    if (existing) {
      return await existing.update(data);
    } else {
      return await this.create({ ...data, HocKy: hocKyValue });
    }
  }

  async delete(maLop, namHoc, hocKy, thu, tietHoc) {
    if (!namHoc) {
      throw new Error("NamHoc is required for delete");
    }
    const hocKyValue = hocKy !== undefined && hocKy !== null ? hocKy : 1;
    return await ThoiKhoaBieu.destroy({
      where: {
        MaLop: maLop,
        NamHoc: namHoc,
        HocKy: hocKyValue,
        Thu: thu,
        TietHoc: tietHoc,
      },
    });
  }

  async deleteByClass(maLop, namHoc = null, hocKy = null) {
    const where = { MaLop: maLop };
    if (namHoc !== null) {
      where.NamHoc = namHoc;
    }
    if (hocKy !== null) {
      where.HocKy = hocKy;
    }
    return await ThoiKhoaBieu.destroy({ where });
  }

  async deleteAllByClass(maLop) {
    return await ThoiKhoaBieu.destroy({
      where: { MaLop: maLop },
    });
  }
}

module.exports = new ThoiKhoaBieuRepository();

