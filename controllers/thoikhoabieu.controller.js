const thoikhoabieuService = require("../services/thoikhoabieu.service");
const { sequelize } = require("../models");

class ThoiKhoaBieuController {
  async saveTimetable(req, res) {
    try {
      const { MaLop, Thu, TietHoc, MaMonHoc, MaGiaoVien, NamHoc, HocKy, Tuan } = req.body;

      // Validate quyền
      const role = (req.session?.user?.role || "").trim();
      const canEdit = role === "Admin" || role === "BGH" || role === "GiaoVu";
      if (!canEdit) {
        return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa thời khóa biểu" });
      }

      // Nếu không có MaMonHoc hoặc MaGiaoVien, xóa slot
      if (!MaMonHoc || !MaGiaoVien) {
        if (!MaLop || !NamHoc || !Thu || !TietHoc) {
          return res.redirect(`/timetable?year=${encodeURIComponent(NamHoc || '')}&semester=${encodeURIComponent(HocKy || '1')}&class=${encodeURIComponent(MaLop || '')}&error=${encodeURIComponent('Thiếu thông tin bắt buộc để xóa')}`);
        }
        const hocKyValue = HocKy !== undefined && HocKy !== null ? parseInt(HocKy, 10) : 1;
        await thoikhoabieuService.deleteTimetable(MaLop, NamHoc, hocKyValue, Thu, TietHoc);
        return res.redirect(`/timetable?year=${encodeURIComponent(NamHoc || '')}&semester=${encodeURIComponent(HocKy || '1')}&class=${encodeURIComponent(MaLop || '')}&success=${encodeURIComponent('Đã xóa tiết học khỏi thời khóa biểu')}`);
      }

      await thoikhoabieuService.saveTimetable({
        MaLop,
        Thu,
        TietHoc,
        MaMonHoc,
        MaGiaoVien,
        NamHoc,
        HocKy: parseInt(HocKy, 10),
        Tuan,
      });

      return res.redirect(`/timetable?year=${encodeURIComponent(NamHoc || '')}&semester=${encodeURIComponent(HocKy || '1')}&class=${encodeURIComponent(MaLop || '')}&success=${encodeURIComponent('Lưu thời khóa biểu thành công')}`);
    } catch (err) {
      console.error("Lỗi saveTimetable:", err);
      const { MaLop, NamHoc, HocKy } = req.body;
      return res.redirect(`/timetable?year=${encodeURIComponent(NamHoc || '')}&semester=${encodeURIComponent(HocKy || '1')}&class=${encodeURIComponent(MaLop || '')}&error=${encodeURIComponent(err.message || 'Không lưu được thời khóa biểu')}`);
    }
  }

  async deleteTimetable(req, res) {
    try {
      const role = (req.session?.user?.role || "").trim();
      const canEdit = role === "Admin" || role === "BGH" || role === "GiaoVu";
      if (!canEdit) {
        return res.status(403).json({ error: "Bạn không có quyền xóa thời khóa biểu" });
      }

      const { MaLop, NamHoc, HocKy, Thu, TietHoc } = req.body;
      
      if (!MaLop || !NamHoc || !Thu || !TietHoc) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc: MaLop, NamHoc, Thu, TietHoc" });
      }

      const hocKyValue = HocKy !== undefined && HocKy !== null ? parseInt(HocKy, 10) : 1;
      await thoikhoabieuService.deleteTimetable(MaLop, NamHoc, hocKyValue, Thu, TietHoc);

      return res.json({ success: true, message: "Đã xóa thời khóa biểu thành công" });
    } catch (err) {
      console.error("Lỗi deleteTimetable:", err);
      return res.status(500).json({ error: err.message || "Không xóa được thời khóa biểu" });
    }
  }

  async resetTimetable(req, res) {
    try {
      const role = (req.session?.user?.role || "").trim();
      const canEdit = role === "Admin" || role === "BGH" || role === "GiaoVu";
      if (!canEdit) {
        return res.status(403).json({ error: "Bạn không có quyền đặt lại thời khóa biểu" });
      }

      const { MaLop, NamHoc, HocKy } = req.body;
      
      if (!MaLop || !NamHoc) {
        return res.status(400).json({ error: "Thiếu thông tin lớp học hoặc năm học" });
      }

      const hocKyValue = HocKy !== undefined && HocKy !== null ? parseInt(HocKy, 10) : null;
      await thoikhoabieuService.resetTimetableForClass(MaLop, NamHoc, hocKyValue);

      return res.redirect(`/timetable?year=${encodeURIComponent(NamHoc || '')}&semester=${encodeURIComponent(HocKy || '1')}&class=${encodeURIComponent(MaLop || '')}&success=${encodeURIComponent('Đã đặt lại thời khóa biểu thành công')}`);
    } catch (err) {
      console.error("Lỗi resetTimetable:", err);
      const { MaLop, NamHoc, HocKy } = req.body;
      return res.redirect(`/timetable?year=${encodeURIComponent(NamHoc || '')}&semester=${encodeURIComponent(HocKy || '1')}&class=${encodeURIComponent(MaLop || '')}&error=${encodeURIComponent(err.message || 'Không đặt lại được thời khóa biểu')}`);
    }
  }
}

module.exports = new ThoiKhoaBieuController();

