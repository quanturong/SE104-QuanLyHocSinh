const bcrypt = require("bcrypt");
const nguoiDungRepository = require("../repository/nguoidung.repository");
  const { sequelize } = require("../models");

class UserService {
  async createUser(userData) {
    const { TenDangNhap, MatKhau, VaiTro, MaHocSinh, MaGiaoVien } = userData;

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

    let finalMaHocSinh = null;
    let finalMaGiaoVien = null;

    if (VaiTro === "HocSinh") {
      if (!MaHocSinh) {
        throw new Error("Vui lòng chọn học sinh để gán tài khoản");
      }
      const [student] = await sequelize.query(`
        SELECT MaHocSinh FROM HoSoHocSinh WHERE MaHocSinh = ?
      `, { replacements: [MaHocSinh] });
      if (!student || student.length === 0) {
        throw new Error("Học sinh không tồn tại");
      }
      const [existingAccount] = await sequelize.query(`
        SELECT MaNguoiDung FROM NguoiDung WHERE MaHocSinh = ?
      `, { replacements: [MaHocSinh] });
      if (existingAccount && existingAccount.length > 0) {
        throw new Error("Học sinh này đã có tài khoản");
      }
      finalMaHocSinh = MaHocSinh;
    } else if (VaiTro === "GiaoVien") {
      if (!MaGiaoVien) {
        throw new Error("Vui lòng chọn giáo viên để gán tài khoản");
      }
      const maGiaoVienInt = parseInt(MaGiaoVien, 10);
      if (isNaN(maGiaoVienInt)) {
        throw new Error("Mã giáo viên không hợp lệ");
      }
      const [teacher] = await sequelize.query(`
        SELECT MaGiaoVien FROM GiaoVien WHERE MaGiaoVien = ?
      `, { replacements: [maGiaoVienInt] });
      if (!teacher || teacher.length === 0) {
        throw new Error("Giáo viên không tồn tại");
      }
      const [existingAccount] = await sequelize.query(`
        SELECT MaNguoiDung FROM NguoiDung WHERE MaGiaoVien = ?
      `, { replacements: [String(maGiaoVienInt)] });
      if (existingAccount && existingAccount.length > 0) {
        throw new Error("Giáo viên này đã có tài khoản");
      }
      finalMaGiaoVien = String(maGiaoVienInt);
    } else {
      if (MaHocSinh || MaGiaoVien) {
        throw new Error(`Vai trò "${VaiTro}" không được gán cho học sinh hoặc giáo viên`);
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(MatKhau, saltRounds);

    const newUser = await nguoiDungRepository.create({
      TenDangNhap,
      MatKhau: hashedPassword,
      VaiTro,
      MaHocSinh: finalMaHocSinh,
      MaGiaoVien: finalMaGiaoVien,
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
