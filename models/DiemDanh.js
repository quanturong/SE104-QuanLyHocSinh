const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const HoSoHocSinh = require("./HoSoHocSinh");

const DiemDanh = sequelize.define("DiemDanh", {
  MaDiemDanh: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MaHocSinh: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'HoSoHocSinh',
      key: 'MaHocSinh'
    }
  },
  MaLop: { type: DataTypes.STRING, allowNull: true }, // Cho phép NULL cho dữ liệu cũ
  NgayDiemDanh: { type: DataTypes.STRING, allowNull: false },
  TrangThai: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'DiemDanh', 
  freezeTableName: true, 
  timestamps: false
});

HoSoHocSinh.hasMany(DiemDanh, { foreignKey: "MaHocSinh" });
DiemDanh.belongsTo(HoSoHocSinh, { foreignKey: "MaHocSinh" });

module.exports = DiemDanh;
