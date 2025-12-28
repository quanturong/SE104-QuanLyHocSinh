const monHocRepository = require("../repository/monhoc.repository");

class MonHocService {
  async getAllMonHoc() {
    return await monHocRepository.findAll();
  }

  async getMonHocById(maMonHoc) {
    const monHoc = await monHocRepository.findById(maMonHoc);
    if (!monHoc) throw new Error("Không tìm thấy môn học");
    return monHoc;
  }

  async createMonHoc(data) {
    const { MaMonHoc, TenMonHoc } = data;

    if (!MaMonHoc || !TenMonHoc) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    const existing = await monHocRepository.findById(MaMonHoc);
    if (existing) {
      throw new Error(`Mã môn học "${MaMonHoc}" đã tồn tại`);
    }

    return await monHocRepository.create({
      MaMonHoc,
      TenMonHoc,
    });
  }

  async updateMonHoc(oldMaMonHoc, data) {
    const { MaMonHoc, TenMonHoc } = data;

    if (!MaMonHoc || !TenMonHoc) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    if (oldMaMonHoc !== MaMonHoc) {
      const existing = await monHocRepository.findById(MaMonHoc);
      if (existing) {
        throw new Error(`Mã môn học "${MaMonHoc}" đã tồn tại`);
      }
    }

    const monHoc = await monHocRepository.update(oldMaMonHoc, {
      MaMonHoc,
      TenMonHoc,
    });

    if (!monHoc) throw new Error("Không tìm thấy môn học");
    return monHoc;
  }

  async deleteMonHoc(maMonHoc) {
    const { sequelize } = require("../models");
    const transaction = await sequelize.transaction();

    try {
      const monHoc = await monHocRepository.findById(maMonHoc);
      if (!monHoc) {
        await transaction.rollback();
        throw new Error("Không tìm thấy môn học");
      }

      // Xóa tất cả dữ liệu liên quan đến môn học này (theo thứ tự để tránh foreign key constraint)
      
      // 1. Xóa báo cáo tổng kết môn
      await sequelize.query(
        `DELETE FROM BaoCaoTongKetMon WHERE MaMonHoc = ?`,
        { replacements: [maMonHoc], transaction }
      );

      // 2. Xóa điểm môn học
      await sequelize.query(
        `DELETE FROM BangDiemMonHoc WHERE MaMonHoc = ?`,
        { replacements: [maMonHoc], transaction }
      );

      // 3. Xóa thời khóa biểu
      await sequelize.query(
        `DELETE FROM ThoiKhoaBieu WHERE MaMonHoc = ?`,
        { replacements: [maMonHoc], transaction }
      );

      // 4. Xóa phân công giảng dạy
      await sequelize.query(
        `DELETE FROM PhanCongGiangDay WHERE MaMonHoc = ?`,
        { replacements: [maMonHoc], transaction }
      );

      // 5. Set MaMonGiangDay trong GiaoVien về môn học khác (vì allowNull: false)
      // Lấy môn học đầu tiên khác môn đang xóa
      const [otherMonHoc] = await sequelize.query(
        `SELECT MaMonHoc FROM MonHoc WHERE MaMonHoc != ? LIMIT 1`,
        { replacements: [maMonHoc], transaction }
      );

      if (otherMonHoc && otherMonHoc.length > 0) {
        const replacementMonHoc = otherMonHoc[0].MaMonHoc;
        await sequelize.query(
          `UPDATE GiaoVien SET MaMonGiangDay = ? WHERE MaMonGiangDay = ?`,
          { replacements: [replacementMonHoc, maMonHoc], transaction }
        );
        console.log(`[deleteMonHoc] Đã cập nhật MaMonGiangDay của giáo viên từ ${maMonHoc} sang ${replacementMonHoc}`);
      } else {
        // Nếu không còn môn học nào khác, không thể xóa môn học này
        await transaction.rollback();
        throw new Error("Không thể xóa môn học này vì đây là môn học duy nhất trong hệ thống và đang được giáo viên sử dụng");
      }

      // 6. Cuối cùng mới xóa môn học
      const [deleteResult] = await sequelize.query(
        `DELETE FROM MonHoc WHERE MaMonHoc = ?`,
        { replacements: [maMonHoc], transaction }
      );

      if (deleteResult.changes === 0) {
        await transaction.rollback();
        throw new Error("Không tìm thấy môn học");
      }

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new MonHocService();

