const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Lop_NamHoc = sequelize.define("Lop_NamHoc", {
  MaLop: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'LopHoc',
      key: 'MaLop'
    }
  },
  MaNamHoc: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'NamHoc',
      key: 'MaNamHoc'
    }
  },
  SiSo: { type: DataTypes.INTEGER, defaultValue: 0 },
  MaGVChuNhiem: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'GiaoVien',
      key: 'MaGiaoVien'
    }
  },
  GhiChu: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'Lop_NamHoc', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = Lop_NamHoc;

