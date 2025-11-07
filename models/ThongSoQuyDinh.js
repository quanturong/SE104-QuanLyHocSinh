const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ThongSoQuyDinh = sequelize.define("ThongSoQuyDinh", {
  TenQuyDinh: { type: DataTypes.STRING, primaryKey: true },
  GiaTri: { type: DataTypes.REAL, allowNull: false }
});

module.exports = ThongSoQuyDinh;
