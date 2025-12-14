const monHocService = require("../services/monhoc.service");

class MonHocController {
  async showSubjectPage(req, res) {
    try {
      const subjects = await monHocService.getAllMonHoc();
      const role = (req.session?.user?.role || "").trim();
      const canManageSubjects = role === "Admin" || role === "BGH" || role === "GiaoVu";

      res.render("pages/subject", {
        title: "Quản lý môn học",
        user: req.session.user,
        subjects,
        permissions: {
          canManageSubjects,
        },
      });
    } catch (err) {
      console.error("Lỗi showSubjectPage:", err);
      res.status(500).send("Không tải được danh sách môn học.");
    }
  }

  async createSubject(req, res) {
    try {
      const { MaMonHoc, TenMonHoc } = req.body;
      await monHocService.createMonHoc({ MaMonHoc, TenMonHoc });
      return res.redirect("/subject");
    } catch (err) {
      console.error("Lỗi createSubject:", err);
      return res.status(400).send(err.message || "Không thêm được môn học");
    }
  }

  async updateSubject(req, res) {
    try {
      const { OldMaMonHoc, MaMonHoc, TenMonHoc } = req.body;
      await monHocService.updateMonHoc(OldMaMonHoc, { MaMonHoc, TenMonHoc });
      return res.redirect("/subject");
    } catch (err) {
      console.error("Lỗi updateSubject:", err);
      return res.status(400).send(err.message || "Không sửa được môn học");
    }
  }

  async deleteSubject(req, res) {
    try {
      const { MaMonHoc } = req.body;
      await monHocService.deleteMonHoc(MaMonHoc);
      return res.redirect("/subject");
    } catch (err) {
      console.error("Lỗi deleteSubject:", err);
      return res.status(400).send(err.message || "Không xóa được môn học");
    }
  }
}

module.exports = new MonHocController();

