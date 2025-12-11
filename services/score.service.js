// services/score.service.js

const { HoSoHocSinh, LopHoc, MonHoc, BangDiemMonHoc, sequelize } = require('../models'); 

// Không cần SCORE_WEIGHTS hay DB_SCORE_TYPE_MAP nữa vì dữ liệu đã nằm trong cột riêng

// Hàm xác định style cho điểm (để khớp với EJS view)
const getScoreStyle = (score) => {
    // Sửa lỗi: Nếu DiemTBMon là null/undefined, nó sẽ trả về 'none'
    if (score === null || score === undefined || isNaN(score)) return 'none'; 
    if (score >= 8.0) return 'excellent';
    if (score >= 6.5) return 'good';
    if (score >= 5.0) return 'average';
    return 'fail'; // Dưới 5.0
};

// Hàm xếp loại học lực (Dựa trên TB Cả năm)
const getXepLoai = (TB_CN) => {
    if (TB_CN >= 9.0) return 'Xuất sắc';
    if (TB_CN >= 8.0) return 'Giỏi';
    if (TB_CN >= 6.5) return 'Khá';
    if (TB_CN >= 5.0) return 'Trung bình';
    return 'Yếu';
};

// Hàm xếp loại Hạnh kiểm (Giả định dựa trên điểm TB)
const getHanhKiem = (TB_CN) => {
    if (TB_CN >= 8.0) return 'Tốt';
    if (TB_CN >= 6.5) return 'Khá';
    if (TB_CN >= 5.0) return 'Trung bình';
    return 'Yếu';
};

// Hàm gán style cho Xếp loại/Hạnh kiểm (để khớp với EJS view)
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
        // 1. Lấy tất cả học sinh và lớp của họ
        const students = await HoSoHocSinh.findAll({
            // Giả định HocSinh có MaLop và LopHoc có MaLop
            attributes: [
                'MaHocSinh', 
                'HoTen',
                'MaLop',
            ],
            raw: true,
            nest: true,
            order: [['HoTen', 'ASC']],
        });

        // 2. Lấy tất cả Điểm TB Môn của năm học đó từ bảng BangDiemMonHoc
        const allSubjectAverages = await BangDiemMonHoc.findAll({
            attributes: ['MaHocSinh', 'HocKy', 'DiemTBMon'], 
            where: { NamHoc: year },
            raw: true,
        });

        // 3. Xử lý và tính toán điểm cho từng học sinh
        const studentsOverview = students.map(student => {
            const studentId = student.MaHocSinh;
            const studentSubjectAverages = allSubjectAverages.filter(s => s.MaHocSinh === studentId);
            
            // Xử lý trường hợp không có điểm
            if (studentSubjectAverages.length === 0) {
                 return {
                    HoTen: student.HoTen,
                    MaLop: student.MaLop || 'N/A', 
                    TB_HK1: 0.0, TB_HK2: 0.0, TB_CN: 0.0,
                    HanhKiem: 'Chưa xếp loại', XepLoai: 'Chưa xếp loại',
                    TB_HK1_Style: 'none', TB_HK2_Style: 'none', TB_CN_Style: 'none',
                    HanhKiem_Style: 'none', XepLoai_Style: 'none'
                };
            }

            // ⭐ LOGIC TÍNH TOÁN ĐIỂM TRUNG BÌNH
            // TB Học kỳ = Trung bình cộng các DiemTBMon trong học kỳ đó.
            
            const term1Scores = studentSubjectAverages.filter(s => s.HocKy === 1 && s.DiemTBMon !== null);
            const term2Scores = studentSubjectAverages.filter(s => s.HocKy === 2 && s.DiemTBMon !== null);

            // Tính TB HK1 (Trung bình cộng các DiemTBMon)
            const sumTB1 = term1Scores.reduce((sum, s) => sum + s.DiemTBMon, 0);
            const countTB1 = term1Scores.length;
            const TB_HK1_raw = countTB1 > 0 ? sumTB1 / countTB1 : 0;
            
            // Tính TB HK2
            const sumTB2 = term2Scores.reduce((sum, s) => sum + s.DiemTBMon, 0);
            const countTB2 = term2Scores.length;
            const TB_HK2_raw = countTB2 > 0 ? sumTB2 / countTB2 : 0;
            
            // TB Cả năm (Giả định: TB CN = (TB HK1 + TB HK2 * 2) / 3, hoặc (TB HK1 + TB HK2) / 2)
            // Ta dùng công thức đơn giản (TB HK1 + TB HK2) / 2 vì không có hệ số môn rõ ràng
            const TB_CN_raw = (TB_HK1_raw + TB_HK2_raw) / 2;

            const TB_HK1 = parseFloat(TB_HK1_raw.toFixed(1));
            const TB_HK2 = parseFloat(TB_HK2_raw.toFixed(1));
            const TB_CN = parseFloat(TB_CN_raw.toFixed(1));
            
            const hanhKiem = getHanhKiem(TB_CN);
            const xepLoai = getXepLoai(TB_CN);

            return {
                MaHocSinh: student.MaHocSinh,
                HoTen: student.HoTen,
                MaLop: student['LopHoc.MaLop'] || 'N/A',
                
                TB_HK1: TB_HK1,
                TB_HK2: TB_HK2,
                TB_CN: TB_CN,
                
                HanhKiem: hanhKiem,
                XepLoai: xepLoai,
                
                // Styles cho EJS
                TB_HK1_Style: getScoreStyle(TB_HK1),
                TB_HK2_Style: getScoreStyle(TB_HK2),
                TB_CN_Style: getScoreStyle(TB_CN),
                HanhKiem_Style: getBadgeStyle(hanhKiem),
                XepLoai_Style: getBadgeStyle(xepLoai),
            };
        });

        return studentsOverview;
    } catch (error) {
        console.error("Lỗi khi truy vấn tổng quan học sinh:", error);
        throw new Error("Không thể truy xuất dữ liệu tổng quan học sinh: " + error.message);
    }
};

/**
 * Lấy danh sách điểm chi tiết theo môn học, năm học và kỳ học từ bảng BangDiemMonHoc
 */
exports.getSubjectScores = async (year, semester, subjectId) => {
    if (!year || !semester || !subjectId) return []; 

    try {
        // 1. Truy vấn trực tiếp bảng BangDiemMonHoc
        const rawScores = await BangDiemMonHoc.findAll({ 
            attributes: ['MaHocSinh', 'Diem15Phut', 'Diem1Tiet', 'DiemTBMon'],
            where: {
                NamHoc: year,       
                HocKy: semester,    
                MaMonHoc: subjectId, // Sử dụng MaMonHoc
            },
            include: [
                { 
                    model: HoSoHocSinh, 
                    attributes: ['MaHocSinh', 'HoTen'] 
                }
            ],
            raw: true,
            nest: true, 
            order: [[HoSoHocSinh, 'HoTen', 'ASC']],
        });

        // 2. Định dạng lại dữ liệu
        const finalScores = rawScores.map(record => {
            
            // Xử lý Diem15Phut và Diem1Tiet (nếu null thì coi là 0)
            const Diem15p = record.Diem15Phut !== null ? record.Diem15Phut : 0;
            const Diem1Tiet = record.Diem1Tiet !== null ? record.Diem1Tiet : 0;
            const DiemTB = record.DiemTBMon !== null ? record.DiemTBMon : 0;
            
            return {
                MaHocSinh: record.HocSinh.MaHocSinh,
                HoTen: record.HoSoHocSinh.HoTen,
                
                Diem15p: parseFloat(Diem15p.toFixed(1)),
                Diem1Tiet: parseFloat(Diem1Tiet.toFixed(1)),
                DiemCK: null, // Không có DiemCK trong Model mới
                DiemTB: parseFloat(DiemTB.toFixed(1)),
                
                // Styles
                Diem15p_Style: getScoreStyle(Diem15p),
                Diem1Tiet_Style: getScoreStyle(Diem1Tiet),
                DiemCK_Style: getScoreStyle(null), // Mặc định không có style
                DiemTB_Style: getScoreStyle(DiemTB),
            };
        });

        return finalScores;
    } catch (error) {
        console.error("Lỗi khi truy vấn bảng điểm môn học:", error);
        throw new Error("Không thể truy xuất dữ liệu điểm môn học: " + error.message);
    }
};