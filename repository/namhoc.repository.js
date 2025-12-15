const { NamHoc } = require("../models");

class NamHocRepository {
  async findAll() {
    return await NamHoc.findAll({
      order: [["MaNamHoc", "DESC"]],
    });
  }

  async findById(maNamHoc) {
    return await NamHoc.findByPk(maNamHoc);
  }

  async create(namHocData) {
    return await NamHoc.create(namHocData);
  }

  async update(maNamHoc, namHocData) {
    const namHoc = await NamHoc.findByPk(maNamHoc);
    if (!namHoc) {
      return null;
    }
    return await namHoc.update(namHocData);
  }

  async delete(maNamHoc) {
    const namHoc = await NamHoc.findByPk(maNamHoc);
    if (!namHoc) {
      return null;
    }
    return await namHoc.destroy();
  }
}

module.exports = new NamHocRepository();

