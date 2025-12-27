const namHocService = require("../services/namhoc.service");

class NamHocController {
  async showSchoolYearPage(req, res) {
    try {
      const schoolYears = await namHocService.getAllNamHoc();
      const role = (req.session?.user?.role || "").trim();
      const canManageSchoolYear = role === "Admin" || role === "BGH" || role === "GiaoVu";

      const error = req.query.error || null;
      const success = req.query.success || null;

      res.render("pages/school-year", {
        title: "Quản lý năm học",
        user: req.session.user,
        schoolYears,
        error,
        success,
        permissions: {
          canManageSchoolYear,
        },
      });
    } catch (err) {
      console.error("Lỗi showSchoolYearPage:", err);
      res.status(500).send("Không tải được danh sách năm học.");
    }
  }

  async createSchoolYear(req, res) {
    try {
      const { MaNamHoc, NgayBatDau, NgayKetThuc } = req.body;
      await namHocService.createNamHoc({ MaNamHoc, NgayBatDau, NgayKetThuc });
      return res.redirect("/school-year?success=" + encodeURIComponent("Thêm năm học thành công"));
    } catch (err) {
      console.error("Lỗi createSchoolYear:", err);
      return res.redirect("/school-year?error=" + encodeURIComponent(err.message || "Không thêm được năm học"));
    }
  }

  async updateSchoolYear(req, res) {
    try {
      const { OldMaNamHoc, MaNamHoc, NgayBatDau, NgayKetThuc } = req.body;
      await namHocService.updateNamHoc(OldMaNamHoc, {
        MaNamHoc,
        NgayBatDau,
        NgayKetThuc,
      });
      return res.redirect("/school-year?success=" + encodeURIComponent("Sửa năm học thành công"));
    } catch (err) {
      console.error("Lỗi updateSchoolYear:", err);
      return res.redirect("/school-year?error=" + encodeURIComponent(err.message || "Không sửa được năm học"));
    }
  }

  async deleteSchoolYear(req, res) {
    try {
      const { MaNamHoc } = req.body;
      await namHocService.deleteNamHoc(MaNamHoc);
      return res.redirect("/school-year");
    } catch (err) {
      console.error("Lỗi deleteSchoolYear:", err);
      return res.status(400).send(err.message || "Không xóa được năm học");
    }
  }
}

module.exports = new NamHocController();

