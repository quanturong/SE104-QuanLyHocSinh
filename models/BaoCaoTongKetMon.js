const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BaoCaoTongKetMon = sequelize.define("BaoCaoTongKetMon", {
  MaBCM: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MaMonHoc: { type: DataTypes.STRING, allowNull: false },
  HocKy: { type: DataTypes.INTEGER, allowNull: false },
  MaLop: { type: DataTypes.STRING, allowNull: false },
  SiSo: { type: DataTypes.INTEGER, allowNull: false },
  SoLuongDat: { type: DataTypes.INTEGER, allowNull: false },
  TiLe: { type: DataTypes.REAL, allowNull: false },
  NamHoc: { type: DataTypes.STRING, allowNull: false }
});

module.exports = BaoCaoTongKetMon;
