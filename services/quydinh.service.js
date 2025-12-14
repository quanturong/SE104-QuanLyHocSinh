const quyDinhRepository = require("../repository/quydinh.repository");

class QuyDinhService {
  async getAllQuyDinh() {
    return await quyDinhRepository.findAll();
  }

  async getQuyDinhByTen(tenQuyDinh) {
    const quyDinh = await quyDinhRepository.findByTen(tenQuyDinh);
    if (!quyDinh) throw new Error("Không tìm thấy quy định");
    return quyDinh;
  }

  async updateQuyDinh(data) {
    const { TenQuyDinh, GiaTri } = data;

    if (!TenQuyDinh || GiaTri === undefined || GiaTri === null) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    const numValue = parseFloat(GiaTri);
    if (isNaN(numValue)) {
      throw new Error("Giá trị quy định phải là số");
    }

    return await quyDinhRepository.upsert({
      TenQuyDinh,
      GiaTri: numValue,
    });
  }
}

module.exports = new QuyDinhService();

