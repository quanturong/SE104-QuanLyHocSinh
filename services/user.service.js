const bcrypt = require("bcrypt");
const nguoiDungRepository = require("../repository/nguoidung.repository");

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
}

module.exports = new UserService();

