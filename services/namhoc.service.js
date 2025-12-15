const namHocRepository = require("../repository/namhoc.repository");

class NamHocService {
  async getAllNamHoc() {
    return await namHocRepository.findAll();
  }

  async getNamHocById(maNamHoc) {
    const namHoc = await namHocRepository.findById(maNamHoc);
    if (!namHoc) throw new Error("Không tìm thấy năm học");
    return namHoc;
  }

  async createNamHoc(data) {
    const { MaNamHoc, NgayBatDau, NgayKetThuc } = data;

    if (!MaNamHoc || !NgayBatDau || !NgayKetThuc) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    const existing = await namHocRepository.findById(MaNamHoc);
    if (existing) {
      throw new Error(`Năm học "${MaNamHoc}" đã tồn tại`);
    }

    const ngayBatDau = new Date(NgayBatDau);
    const ngayKetThuc = new Date(NgayKetThuc);

    if (ngayKetThuc <= ngayBatDau) {
      throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
    }

    return await namHocRepository.create({
      MaNamHoc,
      NgayBatDau,
      NgayKetThuc,
    });
  }

  async updateNamHoc(oldMaNamHoc, data) {
    const { MaNamHoc, NgayBatDau, NgayKetThuc } = data;

    if (!MaNamHoc || !NgayBatDau || !NgayKetThuc) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    const ngayBatDau = new Date(NgayBatDau);
    const ngayKetThuc = new Date(NgayKetThuc);

    if (ngayKetThuc <= ngayBatDau) {
      throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
    }

    if (oldMaNamHoc !== MaNamHoc) {
      const existing = await namHocRepository.findById(MaNamHoc);
      if (existing) {
        throw new Error(`Năm học "${MaNamHoc}" đã tồn tại`);
      }
    }

    const namHoc = await namHocRepository.update(oldMaNamHoc, {
      MaNamHoc,
      NgayBatDau,
      NgayKetThuc,
    });

    if (!namHoc) throw new Error("Không tìm thấy năm học");
    return namHoc;
  }

  async deleteNamHoc(maNamHoc) {
    const ok = await namHocRepository.delete(maNamHoc);
    if (!ok) throw new Error("Không tìm thấy năm học");
    return ok;
  }
}

module.exports = new NamHocService();

