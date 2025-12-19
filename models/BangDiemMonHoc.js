const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BangDiemMonHoc = sequelize.define("BangDiemMonHoc", {
  MaDiem: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MaHocSinh: { type: DataTypes.INTEGER, allowNull: false },
  MaMonHoc: { type: DataTypes.STRING, allowNull: false },
  HocKy: { type: DataTypes.INTEGER, allowNull: false },
  NamHoc: { type: DataTypes.STRING, allowNull: false },
  Diem15Phut: { type: DataTypes.REAL },
  Diem1Tiet: { type: DataTypes.REAL },
  DiemCK: { type: DataTypes.REAL },
  DiemTBMon: { type: DataTypes.REAL }
}
, {
  tableName: 'BangDiemMonHoc', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = BangDiemMonHoc;
