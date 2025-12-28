const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ThoiKhoaBieu = sequelize.define("ThoiKhoaBieu", {
  MaLop: {
    type: DataTypes.STRING,
    primaryKey: true,
    references: {
      model: 'LopHoc',
      key: 'MaLop'
    }
  },
  NamHoc: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  HocKy: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, defaultValue: 1 },
  Thu: { type: DataTypes.INTEGER, primaryKey: true },
  TietHoc: { type: DataTypes.INTEGER, primaryKey: true },
  MaMonHoc: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'MonHoc',
      key: 'MaMonHoc'
    }
  },
  MaGiaoVien: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'GiaoVien',
      key: 'MaGiaoVien'
    }
  }
}, {
  tableName: 'ThoiKhoaBieu', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = ThoiKhoaBieu;
