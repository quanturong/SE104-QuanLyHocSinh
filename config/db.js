const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./QLyHocSinh.db", 
  logging: false, 
});

module.exports = sequelize;
