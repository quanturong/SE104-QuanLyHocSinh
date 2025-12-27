const namHocRepository = require("../repository/namhoc.repository");

class NamHocService {
  async getAllNamHoc() {
    return await namHocRepository.findAll();
  }

  async getNamHocById(maNamHoc) {
    const namHoc = await namHocRepository.findById(maNamHoc);
    if (!namHoc) throw new Error("Không tìm thấy năm học");
    return namHoc;
  }

  validateMaNamHoc(maNamHoc) {
    if (!maNamHoc || typeof maNamHoc !== 'string') {
      return { valid: false, message: "Mã năm học không được để trống" };
    }

    const trimmed = maNamHoc.trim();
    
    // Kiểm tra cấu trúc: NH + 4 chữ số + "-" + 4 chữ số
    const pattern = /^NH\d{4}-\d{4}$/;
    if (!pattern.test(trimmed)) {
      return { 
        valid: false, 
        message: "Mã năm học phải có cấu trúc: NHYYYY-YYYY (VD: NH2025-2026)" 
      };
    }

    // Lấy năm bắt đầu và năm kết thúc
    const match = trimmed.match(/^NH(\d{4})-(\d{4})$/);
    if (!match) {
      return { valid: false, message: "Mã năm học không hợp lệ" };
    }

    const namBatDau = parseInt(match[1], 10);
    const namKetThuc = parseInt(match[2], 10);

    // Kiểm tra năm kết thúc = năm bắt đầu + 1
    if (namKetThuc !== namBatDau + 1) {
      return { 
        valid: false, 
        message: `Năm kết thúc phải bằng năm bắt đầu + 1. Hiện tại: ${namBatDau}-${namKetThuc}` 
      };
    }

    // Kiểm tra năm hợp lý (ví dụ: từ 2000 đến 2100)
    if (namBatDau < 2000 || namBatDau > 2100) {
      return { 
        valid: false, 
        message: "Năm học phải trong khoảng 2000-2100" 
      };
    }

    return { valid: true, namBatDau, namKetThuc };
  }

  async createNamHoc(data) {
    const { MaNamHoc, NgayBatDau, NgayKetThuc } = data;

    if (!MaNamHoc || !NgayBatDau || !NgayKetThuc) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    // Validate cấu trúc mã năm học
    const validation = this.validateMaNamHoc(MaNamHoc);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Kiểm tra mã năm học có khớp với ngày bắt đầu/kết thúc không
    const ngayBatDau = new Date(NgayBatDau);
    const ngayKetThuc = new Date(NgayKetThuc);
    const namBatDauFromDate = ngayBatDau.getFullYear();
    const namKetThucFromDate = ngayKetThuc.getFullYear();

    if (namBatDauFromDate !== validation.namBatDau) {
      throw new Error(`Năm bắt đầu trong mã năm học (${validation.namBatDau}) không khớp với ngày bắt đầu (${namBatDauFromDate})`);
    }

    if (namKetThucFromDate !== validation.namKetThuc) {
      throw new Error(`Năm kết thúc trong mã năm học (${validation.namKetThuc}) không khớp với ngày kết thúc (${namKetThucFromDate})`);
    }

    if (ngayKetThuc <= ngayBatDau) {
      throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
    }

    const existing = await namHocRepository.findById(MaNamHoc);
    if (existing) {
      throw new Error(`Năm học "${MaNamHoc}" đã tồn tại`);
    }

    return await namHocRepository.create({
      MaNamHoc,
      NgayBatDau,
      NgayKetThuc,
    });
  }

  async updateNamHoc(oldMaNamHoc, data) {
    const { MaNamHoc, NgayBatDau, NgayKetThuc } = data;

    if (!MaNamHoc || !NgayBatDau || !NgayKetThuc) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    // Validate cấu trúc mã năm học
    const validation = this.validateMaNamHoc(MaNamHoc);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Kiểm tra mã năm học có khớp với ngày bắt đầu/kết thúc không
    const ngayBatDau = new Date(NgayBatDau);
    const ngayKetThuc = new Date(NgayKetThuc);
    const namBatDauFromDate = ngayBatDau.getFullYear();
    const namKetThucFromDate = ngayKetThuc.getFullYear();

    if (namBatDauFromDate !== validation.namBatDau) {
      throw new Error(`Năm bắt đầu trong mã năm học (${validation.namBatDau}) không khớp với ngày bắt đầu (${namBatDauFromDate})`);
    }

    if (namKetThucFromDate !== validation.namKetThuc) {
      throw new Error(`Năm kết thúc trong mã năm học (${validation.namKetThuc}) không khớp với ngày kết thúc (${namKetThucFromDate})`);
    }

    if (ngayKetThuc <= ngayBatDau) {
      throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
    }

    if (oldMaNamHoc !== MaNamHoc) {
      const existing = await namHocRepository.findById(MaNamHoc);
      if (existing) {
        throw new Error(`Năm học "${MaNamHoc}" đã tồn tại`);
      }
    }

    const namHoc = await namHocRepository.update(oldMaNamHoc, {
      MaNamHoc,
      NgayBatDau,
      NgayKetThuc,
    });

    if (!namHoc) throw new Error("Không tìm thấy năm học");
    return namHoc;
  }

  async deleteNamHoc(maNamHoc) {
    const ok = await namHocRepository.delete(maNamHoc);
    if (!ok) throw new Error("Không tìm thấy năm học");
    return ok;
  }
}

module.exports = new NamHocService();

