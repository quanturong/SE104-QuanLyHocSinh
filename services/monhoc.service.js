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
    const isUsedInScores = await monHocRepository.isUsedInScores(maMonHoc);
    const isUsedInTimetable = await monHocRepository.isUsedInTimetable(maMonHoc);
    const isUsedInTeachers = await monHocRepository.isUsedInTeachers(maMonHoc);

    if (isUsedInScores || isUsedInTimetable || isUsedInTeachers) {
      throw new Error("Không thể xóa môn học đang được sử dụng trong hệ thống");
    }

    const ok = await monHocRepository.delete(maMonHoc);
    if (!ok) throw new Error("Không tìm thấy môn học");
    return ok;
  }
}

module.exports = new MonHocService();

