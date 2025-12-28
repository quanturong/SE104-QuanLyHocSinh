const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const HocSinh_LopNamHoc = sequelize.define("HocSinh_LopNamHoc", {
  MaHocSinh: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'HoSoHocSinh',
      key: 'MaHocSinh'
    }
  },
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
  TrangThai: { type: DataTypes.STRING, defaultValue: 'DangHoc' }, // DangHoc, ChuyenLop, ThoiHoc, TotNghiep
}, {
  tableName: 'HocSinh_LopNamHoc', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = HocSinh_LopNamHoc;

