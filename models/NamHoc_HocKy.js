const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const NamHoc_HocKy = sequelize.define("NamHoc_HocKy", {
  MaNamHoc: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'NamHoc',
      key: 'MaNamHoc'
    }
  },
  HocKy: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    allowNull: false 
  },
  NgayBatDau: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  NgayKetThuc: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }
}, {
  tableName: 'NamHoc_HocKy', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = NamHoc_HocKy;

