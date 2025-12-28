const thoikhoabieuRepo = require("../repository/thoikhoabieu.repository");
const { sequelize } = require("../models");
const quyDinhService = require("./quydinh.service");

class ThoiKhoaBieuService {
  async getAllTimetable(filters = {}) {
    return await thoikhoabieuRepo.findAll(filters);
  }

  async getTimetableByClass(maLop, tuan = null) {
    const filters = { MaLop: maLop };
    if (tuan !== null) {
      filters.Tuan = tuan;
    }
    return await thoikhoabieuRepo.findAll(filters);
  }

  async saveTimetable(data) {
    const { MaLop, Thu, TietHoc, MaMonHoc, MaGiaoVien, NamHoc, HocKy } = data;

    if (!MaLop || !Thu || !TietHoc || !NamHoc) {
      throw new Error("Thiếu thông tin bắt buộc: MaLop, Thu, TietHoc, NamHoc");
    }

    const hocKyValue = HocKy !== undefined && HocKy !== null ? parseInt(HocKy, 10) : 1;

    if (!MaMonHoc || !MaGiaoVien) {
      return await thoikhoabieuRepo.delete(MaLop, NamHoc, hocKyValue, Thu, TietHoc);
    }

    const [monCheck] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM MonHoc WHERE MaMonHoc = ?",
      { replacements: [MaMonHoc] }
    );
    if (monCheck[0].cnt === 0) {
      throw new Error(`Môn học "${MaMonHoc}" không tồn tại`);
    }

    const [gvCheck] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM GiaoVien WHERE MaGiaoVien = ?",
      { replacements: [MaGiaoVien] }
    );
    if (gvCheck[0].cnt === 0) {
      throw new Error(`Giáo viên mã "${MaGiaoVien}" không tồn tại`);
    }

    const [lopCheck] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM LopHoc WHERE MaLop = ?",
      { replacements: [MaLop] }
    );
    if (lopCheck[0].cnt === 0) {
      throw new Error(`Lớp "${MaLop}" không tồn tại`);
    }

    const [existingTiet] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM ThoiKhoaBieu 
       WHERE MaLop = ? AND NamHoc = ? AND HocKy = ? AND Thu = ? AND TietHoc = ?`,
      { replacements: [MaLop, NamHoc, hocKyValue, parseInt(Thu, 10), parseInt(TietHoc, 10)] }
    );
    const isUpdate = existingTiet[0]?.cnt > 0;

    const soTietToiDaNgay = await quyDinhService.getGiaTriQuyDinh("SO_TIET_TOI_DA_NGAY", 5);
    const [tietTrongNgay] = await sequelize.query(
      `SELECT COUNT(*) AS SoTiet FROM ThoiKhoaBieu 
       WHERE MaLop = ? AND NamHoc = ? AND HocKy = ? AND Thu = ?`,
      { replacements: [MaLop, NamHoc, hocKyValue, parseInt(Thu, 10)] }
    );
    const soTietHienTai = tietTrongNgay[0]?.SoTiet || 0;
    // Nếu là thêm mới, cần +1; nếu là update thì giữ nguyên (vì tiết đó đã được đếm)
    const soTietSauKhiThem = isUpdate ? soTietHienTai : soTietHienTai + 1;
    if (soTietSauKhiThem > soTietToiDaNgay) {
      throw new Error(`Số tiết trong ngày không được vượt quá ${soTietToiDaNgay} tiết (QĐ)`);
    }

    const soTietToiDaTuan = await quyDinhService.getGiaTriQuyDinh("SO_TIET_TOI_DA_TUAN", 30);
    const [tietTrongTuan] = await sequelize.query(
      `SELECT COUNT(*) AS SoTiet FROM ThoiKhoaBieu 
       WHERE MaLop = ? AND NamHoc = ? AND HocKy = ?`,
      { replacements: [MaLop, NamHoc, hocKyValue] }
    );
    const soTietTuanHienTai = tietTrongTuan[0]?.SoTiet || 0;
    const soTietTuanSauKhiThem = isUpdate ? soTietTuanHienTai : soTietTuanHienTai + 1;
    if (soTietTuanSauKhiThem > soTietToiDaTuan) {
      throw new Error(`Số tiết trong tuần không được vượt quá ${soTietToiDaTuan} tiết (QĐ)`);
    }

    return await thoikhoabieuRepo.upsert({
      MaLop,
      NamHoc,
      HocKy: hocKyValue,
      Thu: parseInt(Thu, 10),
      TietHoc: parseInt(TietHoc, 10),
      MaMonHoc,
      MaGiaoVien: parseInt(MaGiaoVien, 10),
    });
  }

  async deleteTimetable(maLop, namHoc, hocKy, thu, tietHoc) {
    const hocKyValue = hocKy !== undefined && hocKy !== null ? parseInt(hocKy, 10) : 1;
    return await thoikhoabieuRepo.delete(maLop, namHoc, hocKyValue, thu, tietHoc);
  }

  async resetTimetableForClass(maLop, namHoc = null, hocKy = null) {
    const hocKyValue = hocKy !== undefined && hocKy !== null ? parseInt(hocKy, 10) : null;
    return await thoikhoabieuRepo.deleteByClass(maLop, namHoc, hocKyValue);
  }

  async deleteAllTimetableForClass(maLop) {
    return await thoikhoabieuRepo.deleteAllByClass(maLop);
  }
}

module.exports = new ThoiKhoaBieuService();

