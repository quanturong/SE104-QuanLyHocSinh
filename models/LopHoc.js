const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LopHoc = sequelize.define("LopHoc", {
  MaLop: { type: DataTypes.STRING, primaryKey: true },
  KhoiLop: { type: DataTypes.INTEGER, allowNull: false },
  SiSoLop: { type: DataTypes.INTEGER, defaultValue: 40 }
});

module.exports = LopHoc;
