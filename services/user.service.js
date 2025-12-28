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
    return await nguoiDungRepository.findByUsername(username);
  }
  async updatePasswordByUsername(username, newHash) {
    const user = await nguoiDungRepository.findByUsername(username);

    if (!user) {
      return false;
    }

    user.MatKhau = newHash;

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

  async deleteUser(username) {
    const user = await nguoiDungRepository.findByUsername(username);
    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }


    return await nguoiDungRepository.delete(user.MaNguoiDung);
  }

  async updatePassword(id, newHash) {
    return await nguoiDungRepository.update(id, { MatKhau: newHash });
  }
}

module.exports = new UserService();
