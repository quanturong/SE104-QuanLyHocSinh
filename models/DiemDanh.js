const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const HoSoHocSinh = require("./HoSoHocSinh");

const DiemDanh = sequelize.define("DiemDanh", {
  MaDiemDanh: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MaHocSinh: { type: DataTypes.INTEGER, allowNull: false },
  MaLop: { type: DataTypes.STRING, allowNull: false },
  NgayDiemDanh: { type: DataTypes.STRING, allowNull: false },
  TrangThai: { type: DataTypes.STRING, allowNull: false }
});

HoSoHocSinh.hasMany(DiemDanh, { foreignKey: "MaHocSinh" });
DiemDanh.belongsTo(HoSoHocSinh, { foreignKey: "MaHocSinh" });

module.exports = DiemDanh;
