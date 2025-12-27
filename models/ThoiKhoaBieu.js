const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ThoiKhoaBieu = sequelize.define("ThoiKhoaBieu", {
  MaLop: { type: DataTypes.STRING, primaryKey: true },
  NamHoc: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  HocKy: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, defaultValue: 1 },
  Thu: { type: DataTypes.INTEGER, primaryKey: true },
  TietHoc: { type: DataTypes.INTEGER, primaryKey: true },
  MaMonHoc: { type: DataTypes.STRING, allowNull: false },
  MaGiaoVien: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'ThoiKhoaBieu', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = ThoiKhoaBieu;
