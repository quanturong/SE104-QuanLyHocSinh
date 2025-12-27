const namHocService = require("../services/namhoc.service");

class NamHocController {
  async showSchoolYearPage(req, res) {
    try {
      const schoolYears = await namHocService.getAllNamHoc();
      const role = (req.session?.user?.role || "").trim();
      const canManageSchoolYear = role === "Admin" || role === "BGH" || role === "GiaoVu";

      // Lấy thông tin học kỳ cho mỗi năm học
      const { sequelize } = require("../models");
      const semestersMap = {};
      
      for (const year of schoolYears) {
        const [semesters] = await sequelize.query(`
          SELECT HocKy, NgayBatDau, NgayKetThuc
          FROM NamHoc_HocKy
          WHERE MaNamHoc = ?
          ORDER BY HocKy ASC
        `, { replacements: [year.MaNamHoc] });
        semestersMap[year.MaNamHoc] = semesters || [];
      }

      const error = req.query.error || null;
      const success = req.query.success || null;

      res.render("pages/school-year", {
        title: "Quản lý năm học",
        user: req.session.user,
        schoolYears,
        semestersMap,
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

  async updateSemester(req, res) {
    try {
      const { MaNamHoc, HocKy, NgayBatDau, NgayKetThuc } = req.body;

      if (!MaNamHoc || !HocKy || !NgayBatDau || !NgayKetThuc) {
        return res.redirect("/school-year?error=" + encodeURIComponent("Vui lòng nhập đầy đủ thông tin"));
      }

      // Validate ngày
      const ngayBatDau = new Date(NgayBatDau);
      const ngayKetThuc = new Date(NgayKetThuc);

      if (ngayKetThuc <= ngayBatDau) {
        return res.redirect("/school-year?error=" + encodeURIComponent("Ngày kết thúc phải sau ngày bắt đầu"));
      }

      const { sequelize } = require("../models");
      const NamHoc_HocKy = require("../models/NamHoc_HocKy");

      // Kiểm tra học kỳ có tồn tại không
      const existing = await NamHoc_HocKy.findOne({
        where: { MaNamHoc, HocKy: parseInt(HocKy, 10) }
      });

      if (existing) {
        await existing.update({
          NgayBatDau,
          NgayKetThuc
        });
      } else {
        await NamHoc_HocKy.create({
          MaNamHoc,
          HocKy: parseInt(HocKy, 10),
          NgayBatDau,
          NgayKetThuc
        });
      }

      return res.redirect("/school-year?success=" + encodeURIComponent("Sửa học kỳ thành công"));
    } catch (err) {
      console.error("Lỗi updateSemester:", err);
      return res.redirect("/school-year?error=" + encodeURIComponent(err.message || "Không sửa được học kỳ"));
    }
  }
}

module.exports = new NamHocController();

