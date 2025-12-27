const { NamHoc, LopHoc, MonHoc, sequelize } = require('../models'); 

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
     * Lấy học kỳ hiện tại dựa vào ngày bắt đầu/kết thúc trong NamHoc_HocKy
     * @param {boolean} useVietnamTime - Sử dụng giờ Việt Nam (+7 hours) thay vì UTC
     * @returns {Promise<{MaNamHoc: string, HocKy: number} | null>}
     */
    async getCurrentSemester(useVietnamTime = true) {
        try {
            const timeOffset = useVietnamTime ? "+7 hours" : "";
            const [rows] = await sequelize.query(`
                SELECT MaNamHoc, HocKy
                FROM NamHoc_HocKy
                WHERE date('now'${timeOffset ? `, '${timeOffset}'` : ''}) BETWEEN date(NgayBatDau) AND date(NgayKetThuc)
                LIMIT 1
            `);
            
            if (rows.length > 0) {
                return {
                    MaNamHoc: rows[0].MaNamHoc,
                    HocKy: rows[0].HocKy
                };
            }
            
            return null;
        } catch (err) {
            console.error("Lỗi getCurrentSemester:", err);
            return null;
        }
    },

    /**
     * Lấy năm học hiện tại dựa vào ngày bắt đầu/kết thúc trong NamHoc
     * @param {boolean} useVietnamTime - Sử dụng giờ Việt Nam (+7 hours) thay vì UTC
     * @returns {Promise<string | null>}
     */
    async getCurrentSchoolYear(useVietnamTime = true) {
        try {
            const timeOffset = useVietnamTime ? "+7 hours" : "";
            const [rows] = await sequelize.query(`
                SELECT MaNamHoc
                FROM NamHoc
                WHERE date('now'${timeOffset ? `, '${timeOffset}'` : ''}) BETWEEN date(NgayBatDau) AND date(NgayKetThuc)
                LIMIT 1
            `);
            
            if (rows.length > 0) {
                return rows[0].MaNamHoc;
            }
            
            // Fallback: lấy năm học mới nhất nếu không có năm học nào đang diễn ra
            const [fallbackRows] = await sequelize.query(`
                SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
            `);
            
            return fallbackRows.length > 0 ? fallbackRows[0].MaNamHoc : null;
        } catch (err) {
            console.error("Lỗi getCurrentSchoolYear:", err);
            return null;
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