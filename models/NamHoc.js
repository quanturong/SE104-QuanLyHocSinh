// models/NamHoc.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const NamHoc = sequelize.define("NamHoc", {
    MaNamHoc: { 
        type: DataTypes.STRING, 
        primaryKey: true 
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
    tableName: 'NamHoc', 
    freezeTableName: true, 
    timestamps: false
});

module.exports = NamHoc;