const bcrypt = require("bcrypt");
const nguoiDungRepository = require("../repository/nguoidung.repository");
  const { sequelize } = require("../models");

class UserService {
  async createUser(userData) {
    const { TenDangNhap, MatKhau, VaiTro } = userData;

    if (!TenDangNhap || !MatKhau || !VaiTro) {
      throw new Error("Thiếu thông tin bắt buộc");
    }

    const existingUser = await nguoiDungRepository.findByUsername(TenDangNhap);
    if (existingUser) {
      throw new Error("Tên đăng nhập đã tồn tại");
    }

    const validRoles = ["Admin", "GiaoVien", "HocSinh", "BGH", "GiaoVu"];
    if (!validRoles.includes(VaiTro)) {
      throw new Error("Vai trò không hợp lệ");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(MatKhau, saltRounds);

    const newUser = await nguoiDungRepository.create({
      TenDangNhap,
      MatKhau: hashedPassword,
      VaiTro,
    });

    return {
      MaNguoiDung: newUser.MaNguoiDung,
      TenDangNhap: newUser.TenDangNhap,
      VaiTro: newUser.VaiTro,
    };
  }

  async getAllUsers() {
    return await nguoiDungRepository.findAll();
  }

  async getUserById(id) {
    return await nguoiDungRepository.findById(id);
  }
  async getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM taikhoan WHERE TenDangNhap = ?", [username], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0]);
    });
  });
}
  async updatePasswordByUsername(username, newHash) {
    // Tìm user theo TenDangNhap bằng repository có sẵn
    const user = await nguoiDungRepository.findByUsername(username);

    if (!user) {
      // Không tồn tại user -> trả false cho controller xử lý
      return false;
    }

    // Cập nhật mật khẩu mới (đã hash sẵn)
    user.MatKhau = newHash;

    // Lưu lại vào DB (Sequelize Model.save())
    await user.save();

    return true;
  }

  async updateUserRole(username, vaiTro) {
    const validRoles = ["Admin", "BGH", "GiaoVu", "GiaoVien", "HocSinh"];
    if (!validRoles.includes(vaiTro)) {
      throw new Error("Vai trò không hợp lệ");
    }

    const user = await nguoiDungRepository.findByUsername(username);
    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }

    return await nguoiDungRepository.update(user.MaNguoiDung, { VaiTro: vaiTro });
  }
}

module.exports = new UserService();
