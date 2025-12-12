const hocSinhService = require("../services/hocsinh.service");

class HocSinhController {
  async list(req, res) {
    try {
      const students = await hocSinhService.getAllStudents();
      res.render("students/index", { students, error: null, success: null });
    } catch (err) {
      res.render("students/index", {
        students: [],
        error: err.message,
        success: null,
      });
    }
  }
  async showCreateForm(req, res) {
    res.render("students/form", { student: {}, error: null, action: "create" });
  }
  async create(req, res) {
    try {
      const { HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop } = req.body;

      await hocSinhService.createStudent({
        HoTen,
        GioiTinh,
        NgaySinh,
        DiaChi,
        Email,
        MaLop,
      });

      res.redirect("/students");
    } catch (err) {
      res.render("students/form", {
        student: req.body,
        error: err.message,
        action: "create",
      });
    }
  }
  async showEditForm(req, res) {
    try {
      const id = req.params.id;
      const student = await hocSinhService.getStudentById(id);
      res.render("students/form", { student, error: null, action: "edit" });
    } catch (err) {
      res.redirect("/students");
    }
  }
  async update(req, res) {
    try {
      const id = req.params.id;
      const { HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop } = req.body;

      await hocSinhService.updateStudent(id, {
        HoTen,
        GioiTinh,
        NgaySinh,
        DiaChi,
        Email,
        MaLop,
      });

      res.redirect("/students");
    } catch (err) {
      res.render("students/form", {
        student: { ...req.body, MaHocSinh: req.params.id },
        error: err.message,
        action: "edit",
      });
    }
  }
  async delete(req, res) {
    try {
      const id = req.params.id;
      await hocSinhService.deleteStudent(id);
      res.redirect("/students");
    } catch (err) {
      const students = await hocSinhService.getAllStudents();
      res.render("students/index", {
        students,
        error: err.message,
        success: null,
      });
    }
  }
}

module.exports = new HocSinhController();
