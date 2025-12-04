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

      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: user,
        error: null,
        success: null,
        formData: {},
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

      const { TenDangNhap, MatKhau, VaiTro } = req.body;

      if (!TenDangNhap || !MatKhau || !VaiTro) {
        return res.render("pages/create-user", {
          title: "Tạo tài khoản",
          user: user,
          error: "Vui lòng điền đầy đủ thông tin",
          success: null,
          formData: req.body,
        });
      }

      if (MatKhau.length < 6) {
        return res.render("pages/create-user", {
          title: "Tạo tài khoản",
          user: user,
          error: "Mật khẩu phải có ít nhất 6 ký tự",
          success: null,
          formData: req.body,
        });
      }

      const newUser = await userService.createUser({
        TenDangNhap: TenDangNhap.trim(),
        MatKhau,
        VaiTro,
      });

      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: user,
        error: null,
        success: `Tạo tài khoản "${newUser.TenDangNhap}" thành công!`,
        formData: {},
      });
    } catch (error) {
      console.error("Lỗi khi tạo tài khoản:", error);
      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: req.session.user,
        error: error.message || "Có lỗi xảy ra khi tạo tài khoản",
        success: null,
        formData: req.body,
      });
    }
  }

  async importUsersFromCSV(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.role !== "Admin") {
        return res.redirect("/tablecontrol");
      }

      if (!req.file) {
        return res.render("pages/create-user", {
          title: "Tạo tài khoản",
          user: user,
          error: "Vui lòng chọn file CSV",
          success: null,
          formData: {},
        });
      }

      const filePath = req.file.path;
      const users = this.parseCSV(filePath);

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

      fs.unlinkSync(filePath);

      const successMessage = `Import thành công ${successCount} tài khoản. Bỏ qua: ${skipCount}. Lỗi: ${errorCount}`;
      const errorMessage = errors.length > 0 ? errors.slice(0, 10).join("<br>") : null;

      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: user,
        error: errorMessage,
        success: successMessage,
        formData: {},
      });
    } catch (error) {
      console.error("Lỗi khi import CSV:", error);
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
      }
      res.render("pages/create-user", {
        title: "Tạo tài khoản",
        user: req.session.user,
        error: error.message || "Có lỗi xảy ra khi import CSV",
        success: null,
        formData: {},
      });
    }
  }

  parseCSV(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim() !== "");
      
      if (lines.length === 0) {
        throw new Error("File CSV trống");
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        data.push(row);
      }

      return data;
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

