const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const LopHoc = require("./LopHoc");

const HoSoHocSinh = sequelize.define("HoSoHocSinh", {
  MaHocSinh: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  HoTen: { type: DataTypes.STRING, allowNull: false },
  GioiTinh: { type: DataTypes.STRING },
  NgaySinh: { type: DataTypes.STRING },
  DiaChi: { type: DataTypes.STRING },
  Email: { type: DataTypes.STRING },
  MaLop: { type: DataTypes.STRING, allowNull: false }
});

LopHoc.hasMany(HoSoHocSinh, { foreignKey: "MaLop" });
HoSoHocSinh.belongsTo(LopHoc, { foreignKey: "MaLop" });

module.exports = HoSoHocSinh;
