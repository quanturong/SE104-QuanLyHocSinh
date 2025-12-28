const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PhanCongGiangDay = sequelize.define("PhanCongGiangDay", {
  MaPhanCong: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MaGiaoVien: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'GiaoVien',
      key: 'MaGiaoVien'
    }
  },
  MaMonHoc: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'MonHoc',
      key: 'MaMonHoc'
    }
  },
  MaLop: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'LopHoc',
      key: 'MaLop'
    }
  },
  NamHoc: { type: DataTypes.STRING, allowNull: true },
  HocKy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'PhanCongGiangDay', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = PhanCongGiangDay;

