const sequelize = require("../config/db");

const LopHoc = require("./LopHoc");
const HoSoHocSinh = require("./HoSoHocSinh");
const MonHoc = require("./MonHoc");
const GiaoVien = require("./GiaoVien");
const NguoiDung = require("./NguoiDung");
const NamHoc = require("./NamHoc");
const DiemDanh = require("./DiemDanh");
const ThoiKhoaBieu = require("./ThoiKhoaBieu");
const BangDiemMonHoc = require("./BangDiemMonHoc");
const BaoCaoTongKetMon = require("./BaoCaoTongKetMon");
const BaoCaoTongKetHK = require("./BaoCaoTongKetHK");
const ThongSoQuyDinh = require("./ThongSoQuyDinh");

module.exports = {
  sequelize,
  LopHoc,
  HoSoHocSinh,
  MonHoc,
  GiaoVien,
  NguoiDung,
  NamHoc,
  DiemDanh,
  ThoiKhoaBieu,
  BangDiemMonHoc,
  BaoCaoTongKetMon,
  BaoCaoTongKetHK,
  ThongSoQuyDinh
};
