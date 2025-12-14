const { ThongSoQuyDinh } = require("../models");

class QuyDinhRepository {
  async findAll() {
    return await ThongSoQuyDinh.findAll({
      order: [["TenQuyDinh", "ASC"]],
    });
  }

  async findByTen(tenQuyDinh) {
    return await ThongSoQuyDinh.findByPk(tenQuyDinh);
  }

  async create(quyDinhData) {
    return await ThongSoQuyDinh.create(quyDinhData);
  }

  async update(tenQuyDinh, quyDinhData) {
    const quyDinh = await ThongSoQuyDinh.findByPk(tenQuyDinh);
    if (!quyDinh) {
      return null;
    }
    return await quyDinh.update(quyDinhData);
  }

  async upsert(quyDinhData) {
    const { TenQuyDinh, GiaTri } = quyDinhData;
    const existing = await this.findByTen(TenQuyDinh);
    
    if (existing) {
      return await this.update(TenQuyDinh, { GiaTri });
    } else {
      return await this.create(quyDinhData);
    }
  }
}

module.exports = new QuyDinhRepository();

