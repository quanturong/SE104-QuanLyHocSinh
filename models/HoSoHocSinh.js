const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const LopHoc = require("./LopHoc");
const BangDiemMonHoc = require('./BangDiemMonHoc');

const HoSoHocSinh = sequelize.define("HoSoHocSinh", {
  MaHocSinh: { type: DataTypes.STRING, primaryKey: true },
  HoTen: { type: DataTypes.STRING, allowNull: false },
  GioiTinh: { type: DataTypes.STRING },
  NgaySinh: { type: DataTypes.STRING },
  DiaChi: { type: DataTypes.STRING },
  Email: { type: DataTypes.STRING },
  TrangThai: { type: DataTypes.STRING, defaultValue: 'DangHoc' }, // DangHoc, ChuyenLop, ThoiHoc, TotNghiep
  // MaLop đã được chuyển sang HocSinh_LopNamHoc để quản lý theo năm học
}, {
  tableName: 'HoSoHocSinh', 
  freezeTableName: true, 
  timestamps: false
});

// Relationships đã được chuyển sang HocSinh_LopNamHoc
BangDiemMonHoc.belongsTo(HoSoHocSinh, { foreignKey: 'MaHocSinh' });

module.exports = HoSoHocSinh;
