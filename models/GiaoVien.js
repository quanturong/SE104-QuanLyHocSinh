const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GiaoVien = sequelize.define("GiaoVien", {
  MaGiaoVien: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  HoTen: { type: DataTypes.STRING, allowNull: false },
  GioiTinh: { type: DataTypes.STRING },
  NgaySinh: { type: DataTypes.STRING },
  DiaChi: { type: DataTypes.STRING },
  Email: { type: DataTypes.STRING },
  MaMonGiangDay: { type: DataTypes.STRING, allowNull: false }
});

module.exports = GiaoVien;
