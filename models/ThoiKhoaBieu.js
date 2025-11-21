const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ThoiKhoaBieu = sequelize.define("ThoiKhoaBieu", {
  MaLop: { type: DataTypes.STRING, primaryKey: true },
  Tuan: { type: DataTypes.INTEGER, primaryKey: true },
  Thu: { type: DataTypes.INTEGER, primaryKey: true },
  TietHoc: { type: DataTypes.INTEGER, primaryKey: true },
  MaMonHoc: { type: DataTypes.STRING, allowNull: false },
  MaGiaoVien: { type: DataTypes.INTEGER, allowNull: false }
});

module.exports = ThoiKhoaBieu;
