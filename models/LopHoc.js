const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LopHoc = sequelize.define("LopHoc", {
  MaLop: { type: DataTypes.STRING, primaryKey: true },
  KhoiLop: { type: DataTypes.INTEGER, allowNull: false },
  // SiSoLop và MaGVChuNhiem đã được chuyển sang Lop_NamHoc
  // SiSoLop: sĩ số thực tế tính từ HoSoHocSinh
  // MaGVChuNhiem: lưu ở Lop_NamHoc vì có thể đổi theo năm
}, {
  tableName: 'LopHoc',
  freezeTableName: true,
  timestamps: false
});

module.exports = LopHoc;
