const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MonHoc = sequelize.define("MonHoc", {
  MaMonHoc: { type: DataTypes.STRING, primaryKey: true },
  TenMonHoc: { type: DataTypes.STRING, allowNull: false }
}
, {
  tableName: 'MonHoc', 
  freezeTableName: true, 
  timestamps: false
});

module.exports = MonHoc;
