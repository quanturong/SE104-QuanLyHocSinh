const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Lop_NamHoc = sequelize.define("Lop_NamHoc", {
  MaLop: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  MaNamHoc: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  SiSo: { type: DataTypes.INTEGER, defaultValue: 0 },
  MaGVChuNhiem: { type: DataTypes.INTEGER, allowNull: true },
  GhiChu: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'Lop_NamHoc', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = Lop_NamHoc;

