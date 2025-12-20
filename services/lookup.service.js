const { NamHoc, LopHoc, MonHoc } = require('../models'); 

const lookupService = {
    /**
     * Lấy danh sách tất cả các Năm học từ DB
     * Trả về mảng các chuỗi ['2024-2025', '2023-2024', ...]
     */
    async getAllSchoolYears() {
        try {
            const years = await NamHoc.findAll({
                attributes: ['MaNamHoc'],
                order: [['NgayKetThuc', 'DESC']],
                raw: true,
            });
            
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
            const classes = await LopHoc.findAll({
                attributes: ['MaLop', 'KhoiLop'],
                order: [['MaLop', 'ASC']],
                raw: true,
            });
            
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
            const subjects = await MonHoc.findAll({
                attributes: ['MaMonHoc', 'TenMonHoc'],
                order: [['TenMonHoc', 'ASC']],
                raw: true,
            });
            
            return subjects;
        } catch (error) {
            console.error("Lỗi khi lấy danh sách Môn học:", error);
            return [];
        }
    }
};

module.exports = lookupService;