const giaoVienRepository = require("../repository/giaovien.repository");
const phanCongRepository = require("../repository/phancong.repository");
const quyDinhService = require("./quydinh.service");
const lookupService = require("./lookup.service");
const { sequelize } = require("../models");

function tinhTuoi(ngaySinhStr) {
  if (!ngaySinhStr) return null;
  const ngaySinh = new Date(ngaySinhStr);
  const now = new Date();
  let age = now.getFullYear() - ngaySinh.getFullYear();
  const m = now.getMonth() - ngaySinh.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < ngaySinh.getDate())) {
    age--;
  }
  return age;
}

class GiaoVienService {
  async getAllGiaoVien() {
    const [teachers] = await giaoVienRepository.findAll();
    return teachers;
  }

  async getGiaoVienById(maGiaoVien) {
    const giaoVien = await giaoVienRepository.findById(maGiaoVien);
    if (!giaoVien) throw new Error("Không tìm thấy giáo viên");
    return giaoVien;
  }

  async searchGiaoVien(query) {
    const allTeachers = await this.getAllGiaoVien();
    const lowerQuery = query.toLowerCase();
    return allTeachers.filter(t => 
      String(t.MaGiaoVien).toLowerCase() === lowerQuery ||
      (t.HoTen || '').toLowerCase().includes(lowerQuery) ||
      (t.Email || '').toLowerCase().includes(lowerQuery)
    );
  }

  async createGiaoVien(data) {
    const { MaGiaoVien, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay, MonHocs } = data;

    if (!HoTen || !Email) {
      throw new Error("Vui lòng nhập đầy đủ thông tin bắt buộc");
    }

    const monHocsToAssign = MonHocs && Array.isArray(MonHocs) && MonHocs.length > 0 
      ? MonHocs 
      : (MaMonGiangDay ? [MaMonGiangDay] : []);

    if (monHocsToAssign.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một môn học");
    }

    if (MaGiaoVien) {
      const existing = await giaoVienRepository.findById(MaGiaoVien);
      if (existing) {
        throw new Error(`Mã giáo viên "${MaGiaoVien}" đã tồn tại`);
      }
    }

    const existingByEmail = await giaoVienRepository.findByEmail(Email);
    if (existingByEmail) {
      throw new Error(`Email "${Email}" đã được sử dụng bởi giáo viên khác`);
    }

    if (NgaySinh) {
      const tuoiToiThieu = await quyDinhService.getGiaTriQuyDinh("TUOI_TOI_THIEU_GIAO_VIEN", 20);
      const age = tinhTuoi(NgaySinh);
      if (age !== null && age <= tuoiToiThieu) {
        throw new Error(`Tuổi giáo viên phải trên ${tuoiToiThieu} tuổi. Hiện tại: ${age} tuổi`);
      }
    }

    const giaoVienData = {
      HoTen,
      GioiTinh: GioiTinh || null,
      NgaySinh: NgaySinh || null,
      DiaChi: DiaChi || null,
      Email,
      MaMonGiangDay: monHocsToAssign[0],
    };

    if (MaGiaoVien) {
      giaoVienData.MaGiaoVien = MaGiaoVien;
    }

    const giaoVien = await giaoVienRepository.create(giaoVienData);

    const createdMaGiaoVien = giaoVien.MaGiaoVien || giaoVien.dataValues?.MaGiaoVien;

    // Lấy năm học và học kỳ hiện tại
    const currentYear = await lookupService.getCurrentSchoolYear(true);
    const currentSemester = await lookupService.getCurrentSemester(true);
    
    if (!currentYear) {
      console.warn("⚠️ Không tìm thấy năm học hiện tại, tạo PhanCongGiangDay không có NamHoc");
    }
    if (!currentSemester) {
      console.warn("⚠️ Không tìm thấy học kỳ hiện tại, tạo PhanCongGiangDay không có HocKy");
    }

    for (const maMonHoc of monHocsToAssign) {
      await phanCongRepository.create({
        MaGiaoVien: createdMaGiaoVien,
        MaMonHoc: maMonHoc,
        NamHoc: currentYear || null,
        HocKy: currentSemester?.HocKy || null,
      });
    }

    return giaoVien;
  }

  async updateGiaoVien(maGiaoVien, data) {
    const { HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay, MonHocs } = data;

    if (!HoTen || !Email) {
      throw new Error("Vui lòng nhập đầy đủ thông tin bắt buộc");
    }

    const monHocsToAssign = MonHocs && Array.isArray(MonHocs) && MonHocs.length > 0 
      ? MonHocs 
      : (MaMonGiangDay ? [MaMonGiangDay] : []);

    if (monHocsToAssign.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một môn học");
    }

    if (NgaySinh) {
      const tuoiToiThieu = await quyDinhService.getGiaTriQuyDinh("TUOI_TOI_THIEU_GIAO_VIEN", 20);
      const age = tinhTuoi(NgaySinh);
      if (age !== null && age <= tuoiToiThieu) {
        throw new Error(`Tuổi giáo viên phải trên ${tuoiToiThieu} tuổi. Hiện tại: ${age} tuổi`);
      }
    }

    const giaoVien = await giaoVienRepository.update(maGiaoVien, {
      HoTen,
      GioiTinh: GioiTinh || null,
      NgaySinh: NgaySinh || null,
      DiaChi: DiaChi || null,
      Email,
      MaMonGiangDay: monHocsToAssign[0],
    });

    if (!giaoVien) throw new Error("Không tìm thấy giáo viên");

    // Lấy năm học và học kỳ hiện tại
    const currentYear = await lookupService.getCurrentSchoolYear(true);
    const currentSemester = await lookupService.getCurrentSemester(true);
    
    if (!currentYear) {
      console.warn("⚠️ Không tìm thấy năm học hiện tại, tạo PhanCongGiangDay không có NamHoc");
    }
    if (!currentSemester) {
      console.warn("⚠️ Không tìm thấy học kỳ hiện tại, tạo PhanCongGiangDay không có HocKy");
    }

    await phanCongRepository.deleteByGiaoVien(maGiaoVien);
    
    for (const maMonHoc of monHocsToAssign) {
      await phanCongRepository.create({
        MaGiaoVien: maGiaoVien,
        MaMonHoc: maMonHoc,
        NamHoc: currentYear || null,
        HocKy: currentSemester?.HocKy || null,
      });
    }

    return giaoVien;
  }

  async deleteGiaoVien(maGiaoVien) {
    const usageInfo = await giaoVienRepository.getUsageInfo(maGiaoVien);
    
    const warnings = [];
    if (usageInfo.isChuNhiem) {
      const classes = usageInfo.chuNhiemClasses ? usageInfo.chuNhiemClasses.split(',').join(', ') : '';
      warnings.push(`đang chủ nhiệm lớp ${classes} (sẽ được gỡ bỏ)`);
    }
    if (usageInfo.isTeaching) {
      const classes = usageInfo.teachingClasses ? usageInfo.teachingClasses.split(',').join(', ') : '';
      warnings.push(`đang giảng dạy ở các lớp ${classes} (sẽ bị xóa khỏi thời khóa biểu)`);
    }

    try {
      const ok = await giaoVienRepository.delete(maGiaoVien);
      if (!ok) throw new Error("Không tìm thấy giáo viên");
      
      return {
        success: true,
        warnings: warnings.length > 0 ? `Đã xóa giáo viên. ${warnings.join(' và ')}.` : 'Đã xóa giáo viên thành công.'
      };
    } catch (err) {
      const isForeignKeyError = 
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.message && (err.message.includes('FOREIGN KEY constraint') || err.message.includes('SQLITE_CONSTRAINT'))) ||
        (err.original && err.original.message && (err.original.message.includes('FOREIGN KEY constraint') || err.original.message.includes('SQLITE_CONSTRAINT'))) ||
        (err.original && err.original.code === 'SQLITE_CONSTRAINT');
      
      if (isForeignKeyError) {
        throw new Error("Không thể xóa giáo viên vì đang được sử dụng trong hệ thống. Vui lòng kiểm tra lại các lớp học và thời khóa biểu.");
      }
      throw err;
    }
  }

  async getGiaoVienDetail(maGiaoVien) {
    const giaoVien = await giaoVienRepository.findById(maGiaoVien);
    if (!giaoVien) throw new Error("Không tìm thấy giáo viên");

    const teachingClasses = await giaoVienRepository.getTeachingClasses(maGiaoVien);
    const homeroomClass = await giaoVienRepository.getHomeroomClass(maGiaoVien);

    return {
      ...giaoVien.toJSON(),
      teachingClasses,
      homeroomClass,
    };
  }
}

module.exports = new GiaoVienService();

