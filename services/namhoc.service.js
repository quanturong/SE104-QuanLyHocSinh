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

    // Tạo năm học
    const namHoc = await namHocRepository.create({
      MaNamHoc,
      NgayBatDau,
      NgayKetThuc,
    });

    // Tự động tạo 2 học kỳ cho năm học mới
    const { sequelize } = require("../models");
    const NamHoc_HocKy = require("../models/NamHoc_HocKy");

    // Tính toán ngày cho học kỳ 1 và học kỳ 2
    // Học kỳ 1: từ ngày bắt đầu năm học đến 31/12
    // Học kỳ 2: từ 1/1 năm sau đến ngày kết thúc năm học
    const ngayBatDauDate = new Date(NgayBatDau);
    const ngayKetThucDate = new Date(NgayKetThuc);
    const namBatDau = ngayBatDauDate.getFullYear();
    const namKetThuc = ngayKetThucDate.getFullYear();

    // Học kỳ 1: từ ngày bắt đầu đến 31/12
    const hocKy1NgayBatDau = NgayBatDau;
    const hocKy1NgayKetThuc = `${namBatDau}-12-31`;

    // Học kỳ 2: từ 1/1 năm sau đến ngày kết thúc
    const hocKy2NgayBatDau = `${namKetThuc}-01-01`;
    const hocKy2NgayKetThuc = NgayKetThuc;

    // Tạo học kỳ 1
    await NamHoc_HocKy.create({
      MaNamHoc,
      HocKy: 1,
      NgayBatDau: hocKy1NgayBatDau,
      NgayKetThuc: hocKy1NgayKetThuc,
    });

    // Tạo học kỳ 2
    await NamHoc_HocKy.create({
      MaNamHoc,
      HocKy: 2,
      NgayBatDau: hocKy2NgayBatDau,
      NgayKetThuc: hocKy2NgayKetThuc,
    });

    return namHoc;
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
    const { sequelize } = require("../models");
    const transaction = await sequelize.transaction();

    try {
      // Kiểm tra năm học có tồn tại không
      const namHoc = await namHocRepository.findById(maNamHoc);
      if (!namHoc) {
        await transaction.rollback();
        throw new Error("Không tìm thấy năm học");
      }

      // Xóa tất cả dữ liệu liên quan đến năm học này (theo thứ tự để tránh foreign key constraint)
      
      // 1. Xóa học kỳ
      await sequelize.query(
        `DELETE FROM NamHoc_HocKy WHERE MaNamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      // 2. Xóa báo cáo tổng kết học kỳ
      await sequelize.query(
        `DELETE FROM BaoCaoTongKetHK WHERE NamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      // 3. Xóa báo cáo tổng kết môn
      await sequelize.query(
        `DELETE FROM BaoCaoTongKetMon WHERE NamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      // 4. Xóa phân công giảng dạy (nếu có)
      await sequelize.query(
        `DELETE FROM PhanCongGiangDay WHERE NamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      ).catch(() => {}); // Bỏ qua nếu bảng không tồn tại

      // 5. Xóa thời khóa biểu
      await sequelize.query(
        `DELETE FROM ThoiKhoaBieu WHERE NamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      // 6. Xóa điểm số
      await sequelize.query(
        `DELETE FROM BangDiemMonHoc WHERE NamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      // 7. Xóa học sinh - lớp - năm học
      await sequelize.query(
        `DELETE FROM HocSinh_LopNamHoc WHERE MaNamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      // 8. Xóa lớp - năm học
      await sequelize.query(
        `DELETE FROM Lop_NamHoc WHERE MaNamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      // 9. Cuối cùng, xóa năm học (sử dụng raw query với transaction)
      const [deleteResult] = await sequelize.query(
        `DELETE FROM NamHoc WHERE MaNamHoc = ?`,
        { replacements: [maNamHoc], transaction }
      );

      if (deleteResult.changes === 0) {
        await transaction.rollback();
        throw new Error("Không tìm thấy năm học để xóa");
      }

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new NamHocService();

