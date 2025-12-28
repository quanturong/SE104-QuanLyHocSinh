const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BaoCaoTongKetMon = sequelize.define("BaoCaoTongKetMon", {
  MaBCM: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MaMonHoc: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'MonHoc',
      key: 'MaMonHoc'
    }
  },
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
  tableName: 'BaoCaoTongKetMon', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = BaoCaoTongKetMon;
