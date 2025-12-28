const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BaoCaoTongKetHK = sequelize.define("BaoCaoTongKetHK", {
  MaBCHK: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  HocKy: { type: DataTypes.INTEGER, allowNull: false },
  MaLop: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'LopHoc',
      key: 'MaLop'
    }
  },
  SiSo: { type: DataTypes.INTEGER, allowNull: false },
  SoLuongDat: { type: DataTypes.INTEGER, allowNull: false },
  TiLe: { type: DataTypes.REAL, allowNull: false },
  NamHoc: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'BaoCaoTongKetHK', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = BaoCaoTongKetHK;
