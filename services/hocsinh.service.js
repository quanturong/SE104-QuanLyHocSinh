
const hocSinhRepo = require("../repository/hocsinh.repository");
const quyDinhService = require("./quydinh.service");

function tinhTuoi(ngaySinhStr) {
  const today = new Date();
  const dob = new Date(ngaySinhStr); 
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

class HocSinhService {
  async getAllStudents() {
    return await hocSinhRepo.findAll();
  }

  async getStudentById(id) {
    const hs = await hocSinhRepo.findById(id);
    if (!hs) throw new Error("Không tìm thấy học sinh");
    return hs;
  }

  async createStudent(data) {
    const required = ["HoTen", "GioiTinh", "NgaySinh", "DiaChi"];
    for (const field of required) {
      if (!data[field] || String(data[field]).trim() === "") {
        throw new Error(`Thiếu trường bắt buộc: ${field}`);
      }
    }

    // Lấy quy định tuổi từ database
    const tuoiToiThieu = await quyDinhService.getGiaTriQuyDinh("TUOI_TOI_THIEU", 15);
    const tuoiToiDa = await quyDinhService.getGiaTriQuyDinh("TUOI_TOI_DA", 20);

    const age = tinhTuoi(data.NgaySinh);
    if (age < tuoiToiThieu || age > tuoiToiDa) {
      throw new Error(`Tuổi học sinh phải từ ${tuoiToiThieu} đến ${tuoiToiDa} (QĐ1)`);
    }

    return await hocSinhRepo.create(data);
  }

  async updateStudent(id, data) {
    if (data.NgaySinh) {
      // Lấy quy định tuổi từ database
      const tuoiToiThieu = await quyDinhService.getGiaTriQuyDinh("TUOI_TOI_THIEU", 15);
      const tuoiToiDa = await quyDinhService.getGiaTriQuyDinh("TUOI_TOI_DA", 20);

      const age = tinhTuoi(data.NgaySinh);
      if (age < tuoiToiThieu || age > tuoiToiDa) {
        throw new Error(`Tuổi học sinh phải từ ${tuoiToiThieu} đến ${tuoiToiDa} (QĐ1)`);
      }
    }

    const hs = await hocSinhRepo.update(id, data);
    if (!hs) throw new Error("Không tìm thấy học sinh");
    return hs;
  }

  async deleteStudent(id) {
    const ok = await hocSinhRepo.delete(id);
    if (!ok) throw new Error("Không tìm thấy học sinh");
    return ok;
  }
}

module.exports = new HocSinhService();
