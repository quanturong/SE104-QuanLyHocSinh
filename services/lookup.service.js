// services/lookup.service.js

const { NamHoc, LopHoc, MonHoc } = require('../models'); 

const lookupService = {
    /**
     * Lấy danh sách tất cả các Năm học từ DB
     * Trả về mảng các chuỗi ['2024-2025', '2023-2024', ...]
     */
    async getAllSchoolYears() {
        try {
            // Truy vấn bảng NamHoc, chỉ lấy MaNamHoc
            const years = await NamHoc.findAll({
                attributes: ['MaNamHoc'],
                // Sắp xếp theo ngày kết thúc giảm dần để lấy năm mới nhất lên đầu
                order: [['NgayKetThuc', 'DESC']],
                raw: true, // Lấy kết quả dưới dạng JSON thuần
            });
            
            // Chuyển đổi thành mảng chuỗi đơn giản để khớp với logic Controller/View
            return years.map(y => y.MaNamHoc);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách Năm học:", error);
            return []; 
        }
    },

    /**
     * Lấy danh sách tất cả các Lớp học từ DB
     * Trả về mảng các đối tượng { MaLop, TenLop }
     */
    async getAllClasses() {
        try {
            // Truy vấn bảng LopHoc, lấy MaLop và TenLop
            const classes = await LopHoc.findAll({
                attributes: ['MaLop', 'KhoiLop'],
                order: [['MaLop', 'ASC']],
                raw: true,
            });
            
            // Lưu ý: View EJS của bạn sử dụng 'MaLop' và 'TenLop'
            return classes; 
        } catch (error) {
            console.error("Lỗi khi lấy danh sách Lớp học:", error);
            return [];
        }
    },

    /**
     * Lấy danh sách tất cả các Môn học từ DB
     */
    async getAllSubjects() {
        try {
            // Truy vấn bảng MonHoc, lấy MaMon và TenMon
            const subjects = await MonHoc.findAll({
                attributes: ['MaMonHoc', 'TenMonHoc'],
                order: [['TenMonHoc', 'ASC']],
                raw: true,
            });
            
            // Lưu ý: View EJS của bạn sử dụng 'MaMon' và 'TenMon'
            return subjects;
        } catch (error) {
            console.error("Lỗi khi lấy danh sách Môn học:", error);
            return [];
        }
    }
};

module.exports = lookupService;