const fs = require("fs");
const path = require("path");
const userService = require("../services/user.service");

class UserController {
  async showCreateUserForm(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.role !== "Admin") {
        return res.redirect("/tablecontrol");
      }

      const { sequelize } = require("../models");

      const [students] = await sequelize.query(`
        SELECT hs.MaHocSinh, hs.HoTen
        FROM HoSoHocSinh hs
        WHERE NOT EXISTS (
          SELECT 1 FROM NguoiDung nd 
          WHERE nd.MaHocSinh = hs.MaHocSinh
        )
        ORDER BY hs.MaHocSinh ASC;
      `);

      const [teachers] = await sequelize.query(`
        SELECT gv.MaGiaoVien, gv.HoTen
        FROM GiaoVien gv
        WHERE NOT EXISTS (
          SELECT 1 FROM NguoiDung nd 
          WHERE nd.MaGiaoVien = CAST(gv.MaGiaoVien AS TEXT)
        )
        ORDER BY gv.MaGiaoVien ASC;
      `);

      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: user,
        error: null,
        success: null,
        formData: {},
        students: students || [],
        teachers: teachers || [],
      });
    } catch (error) {
      console.error("Lỗi khi hiển thị form tạo tài khoản:", error);
      res.redirect("/tablecontrol");
    }
  }

  async createUser(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.role !== "Admin") {
        return res.redirect("/tablecontrol");
      }

      const { TenDangNhap, MatKhau, VaiTro, MaHocSinh, MaGiaoVien } = req.body;

      if (!TenDangNhap || !MatKhau || !VaiTro) {
        const { sequelize } = require("../models");
        const [students] = await sequelize.query(`
          SELECT hs.MaHocSinh, hs.HoTen
          FROM HoSoHocSinh hs
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaHocSinh = hs.MaHocSinh
          )
          ORDER BY hs.MaHocSinh ASC;
        `);
        const [teachers] = await sequelize.query(`
          SELECT gv.MaGiaoVien, gv.HoTen
          FROM GiaoVien gv
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaGiaoVien = CAST(gv.MaGiaoVien AS TEXT)
          )
          ORDER BY gv.MaGiaoVien ASC;
        `);
        return res.render("pages/create-user", {
          title: "Tạo tài khoản",
          user: user,
          error: "Vui lòng điền đầy đủ thông tin",
          success: null,
          formData: req.body,
          students: students || [],
          teachers: teachers || [],
        });
      }

      if (MatKhau.length < 6) {
        const { sequelize } = require("../models");
        const [students] = await sequelize.query(`
          SELECT hs.MaHocSinh, hs.HoTen
          FROM HoSoHocSinh hs
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaHocSinh = hs.MaHocSinh
          )
          ORDER BY hs.MaHocSinh ASC;
        `);
        const [teachers] = await sequelize.query(`
          SELECT gv.MaGiaoVien, gv.HoTen
          FROM GiaoVien gv
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaGiaoVien = CAST(gv.MaGiaoVien AS TEXT)
          )
          ORDER BY gv.MaGiaoVien ASC;
        `);
        return res.render("pages/create-user", {
          title: "Tạo tài khoản",
          user: user,
          error: "Mật khẩu phải có ít nhất 6 ký tự",
          success: null,
          formData: req.body,
          students: students || [],
          teachers: teachers || [],
        });
      }

      const newUser = await userService.createUser({
        TenDangNhap: TenDangNhap.trim(),
        MatKhau,
        VaiTro,
        MaHocSinh: MaHocSinh || null,
        MaGiaoVien: MaGiaoVien || null,
      });

      const { sequelize } = require("../models");
      const [students] = await sequelize.query(`
        SELECT hs.MaHocSinh, hs.HoTen
        FROM HoSoHocSinh hs
        WHERE NOT EXISTS (
          SELECT 1 FROM NguoiDung nd 
          WHERE nd.MaHocSinh = hs.MaHocSinh
        )
        ORDER BY hs.MaHocSinh ASC;
      `);
      const [teachers] = await sequelize.query(`
        SELECT gv.MaGiaoVien, gv.HoTen
        FROM GiaoVien gv
        WHERE NOT EXISTS (
          SELECT 1 FROM NguoiDung nd 
          WHERE nd.MaGiaoVien = CAST(gv.MaGiaoVien AS TEXT)
        )
        ORDER BY gv.MaGiaoVien ASC;
      `);

      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: user,
        error: null,
        success: `Tạo tài khoản "${newUser.TenDangNhap}" thành công!`,
        formData: {},
        students: students || [],
        teachers: teachers || [],
      });
    } catch (error) {
      console.error("Lỗi khi tạo tài khoản:", error);
      const { sequelize } = require("../models");
      let students = [];
      let teachers = [];
      try {
        const [studentsRows] = await sequelize.query(`
          SELECT hs.MaHocSinh, hs.HoTen
          FROM HoSoHocSinh hs
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaHocSinh = hs.MaHocSinh
          )
          ORDER BY hs.MaHocSinh ASC;
        `);
        const [teachersRows] = await sequelize.query(`
          SELECT gv.MaGiaoVien, gv.HoTen
          FROM GiaoVien gv
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaGiaoVien = CAST(gv.MaGiaoVien AS TEXT)
          )
          ORDER BY gv.MaGiaoVien ASC;
        `);
        students = studentsRows || [];
        teachers = teachersRows || [];
      } catch (err) {
        console.error("Lỗi khi lấy danh sách học sinh/giáo viên:", err);
      }
      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: req.session.user,
        error: error.message || "Có lỗi xảy ra khi tạo tài khoản",
        success: null,
        formData: req.body,
        students: students,
        teachers: teachers,
      });
    }
  }

  async importUsersFromCSV(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.role !== "Admin") {
        return res.redirect("/tablecontrol");
      }

      const { sequelize } = require("../models");
      const [students] = await sequelize.query(`
        SELECT hs.MaHocSinh, hs.HoTen
        FROM HoSoHocSinh hs
        WHERE NOT EXISTS (
          SELECT 1 FROM NguoiDung nd 
          WHERE nd.MaHocSinh = hs.MaHocSinh
        )
        ORDER BY hs.MaHocSinh ASC;
      `);
      const [teachers] = await sequelize.query(`
        SELECT gv.MaGiaoVien, gv.HoTen
        FROM GiaoVien gv
        WHERE NOT EXISTS (
          SELECT 1 FROM NguoiDung nd 
          WHERE nd.MaGiaoVien = CAST(gv.MaGiaoVien AS TEXT)
        )
        ORDER BY gv.MaGiaoVien ASC;
      `);

      if (!req.file) {
        return res.render("pages/create-user", {
          title: "Tạo tài khoản",
          user: user,
          error: "Vui lòng chọn file CSV",
          success: null,
          formData: {},
          students: students || [],
          teachers: teachers || [],
        });
      }

      let csvContent;
      if (req.file.buffer) {
        csvContent = req.file.buffer.toString('utf-8');
      } else if (req.file.path) {
        csvContent = fs.readFileSync(req.file.path, 'utf-8');
        fs.unlinkSync(req.file.path);
      } else {
        throw new Error("Không thể đọc file CSV");
      }

      const users = this.parseCSVFromContent(csvContent);

      let successCount = 0;
      let errorCount = 0;
      let skipCount = 0;
      const errors = [];

      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        
        try {
          if (!userData.TenDangNhap || !userData.MatKhau || !userData.VaiTro) {
            errors.push(`Dòng ${i + 2}: Thiếu dữ liệu bắt buộc`);
            skipCount++;
            continue;
          }

          try {
            await userService.createUser({
              TenDangNhap: userData.TenDangNhap.trim(),
              MatKhau: userData.MatKhau,
              VaiTro: userData.VaiTro,
              MaHocSinh: userData.MaHocSinh || null,
              MaGiaoVien: userData.MaGiaoVien || null,
            });
            successCount++;
          } catch (error) {
            if (error.message.includes("đã tồn tại")) {
              skipCount++;
            } else {
              errorCount++;
              errors.push(`Dòng ${i + 2}: ${error.message}`);
            }
          }
        } catch (error) {
          errorCount++;
          errors.push(`Dòng ${i + 2}: ${error.message}`);
        }
      }

      const successMessage = `Import thành công ${successCount} tài khoản. Bỏ qua: ${skipCount}. Lỗi: ${errorCount}`;
      const errorMessage = errors.length > 0 ? errors.slice(0, 10).join("<br>") : null;

      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: user,
        error: errorMessage,
        success: successMessage,
        formData: {},
        students: students || [],
        teachers: teachers || [],
      });
    } catch (error) {
      console.error("Lỗi khi import CSV:", error);
      const { sequelize } = require("../models");
      let students = [];
      let teachers = [];
      try {
        const [studentsRows] = await sequelize.query(`
          SELECT hs.MaHocSinh, hs.HoTen
          FROM HoSoHocSinh hs
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaHocSinh = hs.MaHocSinh
          )
          ORDER BY hs.MaHocSinh ASC;
        `);
        const [teachersRows] = await sequelize.query(`
          SELECT gv.MaGiaoVien, gv.HoTen
          FROM GiaoVien gv
          WHERE NOT EXISTS (
            SELECT 1 FROM NguoiDung nd 
            WHERE nd.MaGiaoVien = CAST(gv.MaGiaoVien AS TEXT)
          )
          ORDER BY gv.MaGiaoVien ASC;
        `);
        students = studentsRows || [];
        teachers = teachersRows || [];
      } catch (err) {
        console.error("Lỗi khi lấy danh sách học sinh/giáo viên:", err);
      }
      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: req.session.user,
        error: error.message || "Có lỗi xảy ra khi import CSV",
        success: null,
        formData: {},
        students: students,
        teachers: teachers,
      });
    }
  }

  parseCSVFromContent(content) {
    try {
      const lines = content.split("\n").filter((line) => line.trim() !== "");
      
      if (lines.length === 0) {
        throw new Error("File CSV trống");
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      
      const requiredHeaders = ["TenDangNhap", "MatKhau", "VaiTro"];
      const optionalHeaders = ["MaHocSinh", "MaGiaoVien"];
      const hasAllRequiredHeaders = requiredHeaders.every(h => headers.includes(h));
      
      if (!hasAllRequiredHeaders) {
        throw new Error(`File CSV phải có header bắt buộc: ${requiredHeaders.join(", ")}. Tìm thấy: ${headers.join(", ")}`);
      }
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          if (requiredHeaders.includes(header) || optionalHeaders.includes(header)) {
            const value = values[index] || "";
            row[header] = value === "" ? null : value;
          }
        });
        data.push(row);
      }

      return data;
    } catch (error) {
      console.error("Lỗi khi đọc file CSV:", error.message);
      throw error;
    }
  }

  parseCSV(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return this.parseCSVFromContent(content);
    } catch (error) {
      console.error("Lỗi khi đọc file CSV:", error.message);
      throw error;
    }
  }

  async getAllUsers(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.role !== "Admin") {
        return res.redirect("/tablecontrol");
      }

      const users = await userService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      res.status(500).json({ error: "Lỗi khi lấy danh sách người dùng" });
    }
  }

  async deleteUser(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.role !== "Admin") {
        return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });
      }

      const TenDangNhap = req.body?.TenDangNhap || req.body?.username;

      if (!TenDangNhap) {
        return res.status(400).json({ error: "Thiếu tên đăng nhập" });
      }

      const currentUser = await userService.getUserByUsername(user.username);
      if (currentUser && currentUser.TenDangNhap === TenDangNhap) {
        return res.status(400).json({ error: "Bạn không thể xóa chính tài khoản của mình" });
      }
      
      if (!currentUser) {
        const directUser = await userService.getUserByUsername(TenDangNhap);
        // Bằng cách kiểm tra xem có user nào có TenDangNhap trùng với user.username không
        const allUsers = await userService.getAllUsers();
        const myAccount = allUsers.find(u => u.TenDangNhap === user.username);
        if (myAccount && myAccount.TenDangNhap === TenDangNhap) {
          return res.status(400).json({ error: "Bạn không thể xóa chính tài khoản của mình" });
        }
      }

      await userService.deleteUser(TenDangNhap);

      return res.json({ 
        success: true, 
        message: `Đã xóa tài khoản "${TenDangNhap}" thành công` 
      });
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      return res.status(500).json({ 
        error: error.message || "Lỗi khi xóa người dùng" 
      });
    }
  }

  async changePassword(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.redirect("/login");
      }

      const { oldPassword, newPassword, confirmPassword } = req.body;

      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.render("pages/change-password", {
          title: "Đổi mật khẩu",
          user: user,
          error: "Vui lòng nhập đầy đủ thông tin!",
          success: null
        });
      }

      if (newPassword.length < 6) {
        return res.render("pages/change-password", {
          title: "Đổi mật khẩu",
          user: user,
          error: "Mật khẩu mới phải có ít nhất 6 ký tự!",
          success: null
        });
      }

      if (newPassword !== confirmPassword) {
        return res.render("pages/change-password", {
          title: "Đổi mật khẩu",
          user: user,
          error: "Mật khẩu mới và xác nhận mật khẩu không trùng khớp!",
          success: null
        });
      }

      const dbUser = await userService.getUserByUsername(user.TenDangNhap);

      if (!dbUser) {
        return res.render("pages/change-password", {
          title: "Đổi mật khẩu",
          user: user,
          error: "Không tìm thấy tài khoản!",
          success: null
        });
      }

      const bcrypt = require("bcrypt");

      const match = await bcrypt.compare(oldPassword, dbUser.MatKhau);

      if (!match) {
        return res.render("pages/change-password", {
          title: "Đổi mật khẩu",
          user: user,
          error: "Mật khẩu hiện tại không đúng!",
          success: null
        });
      }

      const hashed = await bcrypt.hash(newPassword, 10);

      await userService.updatePassword(dbUser.id, hashed);

      return res.render("pages/change-password", {
        title: "Đổi mật khẩu",
        user: user,
        error: null,
        success: "Đổi mật khẩu thành công!"
      });

    } catch (error) {
      console.error("Lỗi đổi mật khẩu:", error);

      return res.render("pages/change-password", {
        title: "Đổi mật khẩu",
        user: req.session.user,
        error: "Có lỗi xảy ra! Vui lòng thử lại.",
        success: null
      });
    }
  }
}

module.exports = new UserController();

