const { LopHoc } = require('../models');

exports.getAllClasses = async () => {
    try {
        const classes = await LopHoc.findAll({
            attributes: ['MaLop', 'SiSoLop'], 
            order: [['MaLop', 'ASC']],
            raw: true
        });
        return classes;
    } catch (error) {
        console.error("Lỗi khi lấy danh sách lớp:", error);
        throw new Error("Không thể truy xuất danh sách lớp.");
    }
};