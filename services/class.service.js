const { LopHoc } = require('../models'); // Giả sử LopHoc là Model của bạn

exports.getAllClasses = async () => {
    try {
        // Truy vấn tất cả lớp học, chỉ lấy Mã Lớp và Tên Lớp
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