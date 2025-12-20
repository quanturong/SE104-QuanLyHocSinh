const giaoVienRepository = require("../repository/giaovien.repository");

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
    const { MaGiaoVien, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay } = data;

    if (!HoTen || !MaMonGiangDay || !Email) {
      throw new Error("Vui lòng nhập đầy đủ thông tin bắt buộc");
    }

    const existing = await giaoVienRepository.findById(MaGiaoVien);
    if (existing) {
      throw new Error(`Mã giáo viên "${MaGiaoVien}" đã tồn tại`);
    }

    return await giaoVienRepository.create({
      MaGiaoVien,
      HoTen,
      GioiTinh: GioiTinh || null,
      NgaySinh: NgaySinh || null,
      DiaChi: DiaChi || null,
      Email,
      MaMonGiangDay,
    });
  }

  async updateGiaoVien(maGiaoVien, data) {
    const { HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay } = data;

    if (!HoTen || !MaMonGiangDay || !Email) {
      throw new Error("Vui lòng nhập đầy đủ thông tin bắt buộc");
    }

    const giaoVien = await giaoVienRepository.update(maGiaoVien, {
      HoTen,
      GioiTinh: GioiTinh || null,
      NgaySinh: NgaySinh || null,
      DiaChi: DiaChi || null,
      Email,
      MaMonGiangDay,
    });

    if (!giaoVien) throw new Error("Không tìm thấy giáo viên");
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

