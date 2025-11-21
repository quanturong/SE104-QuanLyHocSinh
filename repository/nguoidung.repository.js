const { NguoiDung } = require("../models");

class NguoiDungRepository {
  async findByUsername(username) {
    return await NguoiDung.findOne({
      where: { TenDangNhap: username },
    });
  }

  async findById(id) {
    return await NguoiDung.findByPk(id);
  }

  async create(userData) {
    return await NguoiDung.create(userData);
  }

  async findAll() {
    return await NguoiDung.findAll({
      order: [["MaNguoiDung", "ASC"]],
    });
  }

  async update(id, userData) {
    const user = await NguoiDung.findByPk(id);
    if (!user) {
      return null;
    }
    return await user.update(userData);
  }

  async delete(id) {
    const user = await NguoiDung.findByPk(id);
    if (!user) {
      return null;
    }
    return await user.destroy();
  }
}

module.exports = new NguoiDungRepository();

