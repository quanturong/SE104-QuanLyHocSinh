const quyDinhRepository = require("../repository/quydinh.repository");
const lookupService = require("./lookup.service");

class QuyDinhService {
  async getAllQuyDinh() {
    return await quyDinhRepository.findAll();
  }

  async getQuyDinhByTen(tenQuyDinh) {
    const quyDinh = await quyDinhRepository.findByTen(tenQuyDinh);
    if (!quyDinh) throw new Error("Không tìm thấy quy định");
    return quyDinh;
  }

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

    if (TenQuyDinh === "CHI_SUA_HOC_KY_HIEN_TAI") {
      if (numValue !== 0 && numValue !== 1) {
        throw new Error("Quy định 'CHI_SUA_HOC_KY_HIEN_TAI' chỉ cho phép giá trị 0 (Tắt) hoặc 1 (Bật)");
      }
    }

    return await quyDinhRepository.upsert({
      TenQuyDinh,
      GiaTri: numValue,
    });
  }

  async checkCanEditSemester(namHoc, hocKy) {
    try {
      const restrictFlag = await this.getGiaTriQuyDinh("CHI_SUA_HOC_KY_HIEN_TAI", 0);
      
      if (restrictFlag === 0) {
        return { allowed: true };
      }
      
      const currentSemester = await lookupService.getCurrentSemester(true);
      
      if (!currentSemester) {
        return {
          allowed: false,
          message: "Hiện tại không có học kỳ nào đang diễn ra. Không thể chỉnh sửa dữ liệu."
        };
      }
      
      if (currentSemester.MaNamHoc === namHoc && currentSemester.HocKy === parseInt(hocKy, 10)) {
        return { allowed: true };
      }
      
      return {
        allowed: false,
        message: `Quy định đang bật: Chỉ cho phép chỉnh sửa dữ liệu của học kỳ hiện tại (${currentSemester.MaNamHoc} - Học kỳ ${currentSemester.HocKy}).`
      };
    } catch (error) {
      console.error("Lỗi khi kiểm tra quy định:", error);
      return { allowed: true };
    }
  }
}

module.exports = new QuyDinhService();

