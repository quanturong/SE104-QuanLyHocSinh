const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PhanCongGiangDay = sequelize.define("PhanCongGiangDay", {
  MaPhanCong: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MaGiaoVien: { type: DataTypes.INTEGER, allowNull: false },
  MaMonHoc: { type: DataTypes.STRING, allowNull: false },
  MaLop: { type: DataTypes.STRING, allowNull: true },
  NamHoc: { type: DataTypes.STRING, allowNull: true },
  HocKy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'PhanCongGiangDay', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = PhanCongGiangDay;

