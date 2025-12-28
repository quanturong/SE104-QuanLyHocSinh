const { NamHoc, LopHoc, MonHoc, sequelize } = require('../models'); 

const lookupService = {
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
            
            const [fallbackRows] = await sequelize.query(`
                SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
            `);
            
            return fallbackRows.length > 0 ? fallbackRows[0].MaNamHoc : null;
        } catch (err) {
            console.error("Lỗi getCurrentSchoolYear:", err);
            return null;
        }
    },

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