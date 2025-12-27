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

  /**
   * Lấy giá trị quy định theo tên, trả về giá trị mặc định nếu không tìm thấy
   * @param {string} tenQuyDinh - Tên quy định
   * @param {number} defaultValue - Giá trị mặc định nếu không tìm thấy
   * @returns {Promise<number>} - Giá trị quy định
   */
  async getGiaTriQuyDinh(tenQuyDinh, defaultValue = null) {
    try {
      const quyDinh = await quyDinhRepository.findByTen(tenQuyDinh);
      if (quyDinh && quyDinh.GiaTri !== null && quyDinh.GiaTri !== undefined) {
        return parseFloat(quyDinh.GiaTri);
      }
      if (defaultValue !== null) {
        return defaultValue;
      }
      throw new Error(`Không tìm thấy quy định: ${tenQuyDinh}`);
    } catch (error) {
      if (defaultValue !== null) {
        console.warn(`Không tìm thấy quy định ${tenQuyDinh}, sử dụng giá trị mặc định: ${defaultValue}`);
        return defaultValue;
      }
      throw error;
    }
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

