const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const NguoiDung = sequelize.define(
  "NguoiDung",
  {
    MaNguoiDung: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    TenDangNhap: { type: DataTypes.STRING, allowNull: false },
    MatKhau: { type: DataTypes.STRING, allowNull: false },
    VaiTro: {
      type: DataTypes.ENUM("Admin", "GiaoVien", "HocSinh", "BGH", "GiaoVu"),
      allowNull: false,
    },
    MaHocSinh: { type: DataTypes.STRING, allowNull: true },
    MaGiaoVien: { type: DataTypes.STRING, allowNull: true },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = NguoiDung;
