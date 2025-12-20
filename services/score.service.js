const { HoSoHocSinh, LopHoc, MonHoc, BangDiemMonHoc, sequelize } = require('../models'); 

const getScoreStyle = (score) => {
    if (score === null || score === undefined || isNaN(score)) return 'none'; 
    if (score >= 8.0) return 'excellent';
    if (score >= 6.5) return 'good';
    if (score >= 5.0) return 'average';
    return 'fail';
};

const getXepLoai = (TB_CN) => {
    if (TB_CN >= 9.0) return 'Xuất sắc';
    if (TB_CN >= 8.0) return 'Giỏi';
    if (TB_CN >= 6.5) return 'Khá';
    if (TB_CN >= 5.0) return 'Trung bình';
    return 'Yếu';
};

const getHanhKiem = (TB_CN) => {
    if (TB_CN >= 8.0) return 'Tốt';
    if (TB_CN >= 6.5) return 'Khá';
    if (TB_CN >= 5.0) return 'Trung bình';
    return 'Yếu';
};

const getBadgeStyle = (ranking) => {
    if (ranking === 'Tốt' || ranking === 'Giỏi' || ranking === 'Xuất sắc') return 'good';
    if (ranking === 'Khá') return 'average';
    if (ranking === 'Trung bình') return 'average-low';
    return 'fail';
};

/**
 * Lấy danh sách tổng quan học sinh (TB HKI, HKII, CN, Xếp loại) theo Năm học
 * @param {string} year - Năm học cần lọc
 */
exports.getStudentsOverview = async (year) => {
    if (!year) return []; 

    try {
        const students = await HoSoHocSinh.findAll({
            attributes: [
                'MaHocSinh', 
                'HoTen',
                'MaLop',
            ],
            raw: true,
            nest: true,
            order: [['HoTen', 'ASC']],
        });

        if (!students || students.length === 0) return [];

        const validStudentIds = students.map(s => s.MaHocSinh);

        const allSubjectAverages = await BangDiemMonHoc.findAll({
            attributes: ['MaHocSinh', 'HocKy', 'DiemTBMon'], 
            where: { 
                NamHoc: year,
                MaHocSinh: validStudentIds
            },
            raw: true,
        });

        const studentsOverview = students
            .map(student => {
                const studentId = String(student.MaHocSinh);
                const studentSubjectAverages = allSubjectAverages.filter(s => String(s.MaHocSinh) === studentId);
                
                if (studentSubjectAverages.length === 0) {
                    return null;
                }

            const term1Scores = studentSubjectAverages.filter(s => s.HocKy === 1 && s.DiemTBMon !== null);
            const term2Scores = studentSubjectAverages.filter(s => s.HocKy === 2 && s.DiemTBMon !== null);

            const sumTB1 = term1Scores.reduce((sum, s) => sum + s.DiemTBMon, 0);
            const countTB1 = term1Scores.length;
            const TB_HK1_raw = countTB1 > 0 ? sumTB1 / countTB1 : 0;
            
            const sumTB2 = term2Scores.reduce((sum, s) => sum + s.DiemTBMon, 0);
            const countTB2 = term2Scores.length;
            const TB_HK2_raw = countTB2 > 0 ? sumTB2 / countTB2 : 0;
            
            const TB_CN_raw = (TB_HK1_raw + TB_HK2_raw) / 2;

            const TB_HK1 = parseFloat(TB_HK1_raw.toFixed(1));
            const TB_HK2 = parseFloat(TB_HK2_raw.toFixed(1));
            const TB_CN = parseFloat(TB_CN_raw.toFixed(1));
            
            const hanhKiem = getHanhKiem(TB_CN);
            const xepLoai = getXepLoai(TB_CN);

            return {
                MaHocSinh: String(student.MaHocSinh), // Đảm bảo là string để map đúng
                HoTen: student.HoTen,
                MaLop: student.MaLop || 'N/A',
                
                TB_HK1: TB_HK1,
                TB_HK2: TB_HK2,
                TB_CN: TB_CN,
                
                HanhKiem: hanhKiem,
                XepLoai: xepLoai,
                
                TB_HK1_Style: getScoreStyle(TB_HK1),
                TB_HK2_Style: getScoreStyle(TB_HK2),
                TB_CN_Style: getScoreStyle(TB_CN),
                HanhKiem_Style: getBadgeStyle(hanhKiem),
                XepLoai_Style: getBadgeStyle(xepLoai),
            };
        })
        .filter(student => student !== null);

        return studentsOverview;
    } catch (error) {
        console.error("Lỗi khi truy vấn tổng quan học sinh:", error);
        throw new Error("Không thể truy xuất dữ liệu tổng quan học sinh: " + error.message);
    }
};

/**
 * Lấy danh sách điểm chi tiết theo môn học, năm học và kỳ học từ bảng BangDiemMonHoc
 */
exports.getSubjectScores = async (year, semester, subjectId, classId = '') => {
    if (!year || !semester || !subjectId) return [];

    try {
        let students = [];
        let studentIdsFilter = null;

        if (classId) {
            students = await HoSoHocSinh.findAll({
                where: { MaLop: classId },
                attributes: ['MaHocSinh', 'HoTen', 'MaLop'],
                raw: true,
                order: [['HoTen', 'ASC']],
            });

            if (!students || students.length === 0) return [];
            studentIdsFilter = students.map(s => s.MaHocSinh);
        } else {
            const studentsInTerm = await BangDiemMonHoc.findAll({
                attributes: ['MaHocSinh'],
                where: { NamHoc: year, HocKy: semester },
                group: ['MaHocSinh'],
                raw: true,
            });

            const studentIds = studentsInTerm.map(r => r.MaHocSinh);

            if (studentIds.length === 0) return [];

            students = await HoSoHocSinh.findAll({
                where: { MaHocSinh: studentIds },
                attributes: ['MaHocSinh', 'HoTen', 'MaLop'],
                raw: true,
                order: [['HoTen', 'ASC']],
            });

            studentIdsFilter = studentIds;
        }

        const recordsWhere = { NamHoc: year, HocKy: semester, MaMonHoc: subjectId };
        if (studentIdsFilter && studentIdsFilter.length > 0) recordsWhere.MaHocSinh = studentIdsFilter;

        const records = await BangDiemMonHoc.findAll({
            where: recordsWhere,
            attributes: ['MaHocSinh', 'Diem15Phut', 'Diem1Tiet', 'DiemCK', 'DiemTBMon'],
            raw: true,
        });

        const recMap = {};
        records.forEach(r => { recMap[r.MaHocSinh] = r; });

        const finalScores = students.map(s => {
            const rec = recMap[s.MaHocSinh];

            const Diem15p = rec && rec.Diem15Phut !== null ? rec.Diem15Phut : 0;
            const Diem1Tiet = rec && rec.Diem1Tiet !== null ? rec.Diem1Tiet : 0;
            const DiemTB = rec && rec.DiemTBMon !== null ? rec.DiemTBMon : 0;
            const DiemCK = rec && rec.DiemCK !== null ? rec.DiemCK : 0; 

            return {
                MaHocSinh: s.MaHocSinh,
                HoTen: s.HoTen,
                MaLop: s.MaLop,

                Diem15p: parseFloat(Diem15p.toFixed(1)),
                Diem1Tiet: parseFloat(Diem1Tiet.toFixed(1)),
                DiemCK: parseFloat(DiemCK.toFixed(1)),
                DiemTB: parseFloat(DiemTB.toFixed(1)),

                Diem15p_Style: getScoreStyle(Diem15p),
                Diem1Tiet_Style: getScoreStyle(Diem1Tiet),
                DiemCK_Style: getScoreStyle(DiemCK),
                DiemTB_Style: getScoreStyle(DiemTB),
            };
        });

        return finalScores;
    } catch (error) {
        console.error("Lỗi khi truy vấn bảng điểm môn học:", error);
        throw new Error("Không thể truy xuất dữ liệu điểm môn học: " + error.message);
    }
};

/**
 * Lấy tổng quan điểm cá nhân của một học sinh
 * @param {string|number} studentId - MaHocSinh
 * @param {string} year - Năm học
 */
exports.getStudentPersonalOverview = async (studentId, year) => {
    if (!year || !studentId) return [];
    
    try {
        // Lấy thông tin học sinh
        const student = await HoSoHocSinh.findOne({
            where: { MaHocSinh: studentId },
            attributes: ['MaHocSinh', 'HoTen', 'MaLop'],
            raw: true,
        });

        if (!student) return [];

        const allSubjectAverages = await BangDiemMonHoc.findAll({
            attributes: ['MaHocSinh', 'HocKy', 'DiemTBMon'], 
            where: { NamHoc: year, MaHocSinh: studentId },
            raw: true,
        });

        const studentIdStr = String(student.MaHocSinh);
        const studentSubjectAverages = allSubjectAverages.filter(s => String(s.MaHocSinh) === studentIdStr);
        
        if (studentSubjectAverages.length === 0) {
            return [{
                MaHocSinh: String(student.MaHocSinh),
                HoTen: student.HoTen,
                MaLop: student.MaLop || 'N/A',
                TB_HK1: 0.0,
                TB_HK2: 0.0,
                TB_CN: 0.0,
                HanhKiem: 'Chưa xếp loại',
                XepLoai: 'Chưa xếp loại',
                TB_HK1_Style: 'none',
                TB_HK2_Style: 'none',
                TB_CN_Style: 'none',
                HanhKiem_Style: 'none',
                XepLoai_Style: 'none'
            }];
        }

        const term1Scores = studentSubjectAverages.filter(s => s.HocKy === 1 && s.DiemTBMon !== null);
        const term2Scores = studentSubjectAverages.filter(s => s.HocKy === 2 && s.DiemTBMon !== null);

        const sumTB1 = term1Scores.reduce((sum, s) => sum + s.DiemTBMon, 0);
        const countTB1 = term1Scores.length;
        const TB_HK1_raw = countTB1 > 0 ? sumTB1 / countTB1 : 0;
        
        const sumTB2 = term2Scores.reduce((sum, s) => sum + s.DiemTBMon, 0);
        const countTB2 = term2Scores.length;
        const TB_HK2_raw = countTB2 > 0 ? sumTB2 / countTB2 : 0;
        
        const TB_CN_raw = (TB_HK1_raw + TB_HK2_raw) / 2;

        const TB_HK1 = parseFloat(TB_HK1_raw.toFixed(1));
        const TB_HK2 = parseFloat(TB_HK2_raw.toFixed(1));
        const TB_CN = parseFloat(TB_CN_raw.toFixed(1));
        
        const hanhKiem = getHanhKiem(TB_CN);
        const xepLoai = getXepLoai(TB_CN);

        return [{
            MaHocSinh: String(student.MaHocSinh),
            HoTen: student.HoTen,
            MaLop: student.MaLop || 'N/A',
            TB_HK1: TB_HK1,
            TB_HK2: TB_HK2,
            TB_CN: TB_CN,
            HanhKiem: hanhKiem,
            XepLoai: xepLoai,
            TB_HK1_Style: getScoreStyle(TB_HK1),
            TB_HK2_Style: getScoreStyle(TB_HK2),
            TB_CN_Style: getScoreStyle(TB_CN),
            HanhKiem_Style: getBadgeStyle(hanhKiem),
            XepLoai_Style: getBadgeStyle(xepLoai),
        }];
    } catch (error) {
        console.error("Lỗi khi truy vấn tổng quan điểm cá nhân:", error);
        throw new Error("Không thể truy xuất dữ liệu tổng quan điểm cá nhân: " + error.message);
    }
};

/**
 * Lấy điểm chi tiết môn học của một học sinh cụ thể
 * @param {string|number} studentId - MaHocSinh
 * @param {string} year - Năm học
 * @param {number} semester - Học kì
 * @param {string} subjectId - MaMonHoc
 */
exports.getStudentPersonalScores = async (studentId, year, semester, subjectId) => {
    if (!year || !semester || !subjectId || !studentId) return [];
    
    try {
        const student = await HoSoHocSinh.findOne({
            where: { MaHocSinh: studentId },
            attributes: ['MaHocSinh', 'HoTen', 'MaLop'],
            raw: true,
        });

        if (!student) return [];

        const record = await BangDiemMonHoc.findOne({
            where: {
                MaHocSinh: studentId,
                NamHoc: year,
                HocKy: semester,
                MaMonHoc: subjectId
            },
            attributes: ['MaHocSinh', 'Diem15Phut', 'Diem1Tiet', 'DiemCK', 'DiemTBMon'],
            raw: true,
        });

        const Diem15p = record && record.Diem15Phut !== null ? record.Diem15Phut : 0;
        const Diem1Tiet = record && record.Diem1Tiet !== null ? record.Diem1Tiet : 0;
        const DiemTB = record && record.DiemTBMon !== null ? record.DiemTBMon : 0;
        const DiemCK = record && record.DiemCK !== null ? record.DiemCK : 0;

        return [{
            MaHocSinh: student.MaHocSinh,
            HoTen: student.HoTen,
            MaLop: student.MaLop,
            Diem15p: parseFloat(Diem15p.toFixed(1)),
            Diem1Tiet: parseFloat(Diem1Tiet.toFixed(1)),
            DiemCK: parseFloat(DiemCK.toFixed(1)),
            DiemTB: parseFloat(DiemTB.toFixed(1)),
            Diem15p_Style: getScoreStyle(Diem15p),
            Diem1Tiet_Style: getScoreStyle(Diem1Tiet),
            DiemCK_Style: getScoreStyle(DiemCK),
            DiemTB_Style: getScoreStyle(DiemTB),
        }];
    } catch (error) {
        console.error("Lỗi khi truy vấn điểm cá nhân:", error);
        throw new Error("Không thể truy xuất dữ liệu điểm cá nhân: " + error.message);
    }
};