const giaoVienService = require("../services/giaovien.service");
const { sequelize } = require("../models");

class GiaoVienController {
  async showTeacherPage(req, res) {
    try {
      const teachers = await giaoVienService.getAllGiaoVien();
      const [subjects] = await sequelize.query(`
        SELECT MaMonHoc, TenMonHoc
        FROM MonHoc
        ORDER BY TenMonHoc ASC;
      `);

      const role = (req.session?.user?.role || "").trim();
      const canManageTeachers = role === "Admin" || role === "BGH";

      const error = req.query.error || null;
      const success = req.query.success || null;

      res.render("pages/teacher", {
        title: "Danh sách giáo viên",
        user: req.session.user,
        teachers,
        subjects,
        permissions: {
          canManageTeachers,
        },
        error: error,
        success: success,
      });
    } catch (err) {
      console.error("Lỗi showTeacherPage:", err);
      res.status(500).send("Không tải được danh sách giáo viên.");
    }
  }

  async createTeacher(req, res) {
    try {
      const { MaGiaoVien, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay } = req.body;
      await giaoVienService.createGiaoVien({
        MaGiaoVien,
        HoTen,
        GioiTinh,
        NgaySinh,
        DiaChi,
        Email,
        MaMonGiangDay,
      });
      return res.redirect("/teacher");
    } catch (err) {
      console.error("Lỗi createTeacher:", err);
      return res.status(400).send(err.message || "Không thêm được giáo viên");
    }
  }

  async updateTeacher(req, res) {
    try {
      const { MaGiaoVien, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaMonGiangDay } = req.body;
      await giaoVienService.updateGiaoVien(MaGiaoVien, {
        HoTen,
        GioiTinh,
        NgaySinh,
        DiaChi,
        Email,
        MaMonGiangDay,
      });
      return res.redirect("/teacher");
    } catch (err) {
      console.error("Lỗi updateTeacher:", err);
      return res.status(400).send(err.message || "Không sửa được giáo viên");
    }
  }

  async deleteTeacher(req, res) {
    try {
      const { MaGiaoVien } = req.body;
      const result = await giaoVienService.deleteGiaoVien(MaGiaoVien);
      const successMsg = result.warnings || "Xóa giáo viên thành công";
      return res.redirect(`/teacher?success=${encodeURIComponent(successMsg)}`);
    } catch (err) {
      console.error("Lỗi deleteTeacher:", err);
      const errorMessage = err.message || "Không xóa được giáo viên";
      return res.redirect(`/teacher?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  async searchTeacher(req, res) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json([]);
      }
      const results = await giaoVienService.searchGiaoVien(q);
      return res.json(results);
    } catch (err) {
      console.error("Lỗi searchTeacher:", err);
      return res.status(500).json({ error: "Lỗi khi tìm kiếm giáo viên" });
    }
  }
}

module.exports = new GiaoVienController();

