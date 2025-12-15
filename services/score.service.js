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
    // Nếu thiếu tham số thì trả về mảng rỗng
    if (!year || !semester || !subjectId) return [];

    try {
        // 1. Lấy danh sách MaHocSinh xuất hiện trong năm & kỳ (những học sinh có ít nhất 1 bản ghi trong năm/kỳ)
        const studentsInTerm = await BangDiemMonHoc.findAll({
            attributes: ['MaHocSinh'],
            where: { NamHoc: year, HocKy: semester },
            group: ['MaHocSinh'],
            raw: true,
        });

        const studentIds = studentsInTerm.map(r => r.MaHocSinh);

        // Nếu không có học sinh cho năm/kỳ này thì trả về mảng rỗng
        if (studentIds.length === 0) return [];

        // 2. Lấy thông tin học sinh (tên, id) và sắp xếp theo họ tên
        const students = await HoSoHocSinh.findAll({
            where: { MaHocSinh: studentIds },
            attributes: ['MaHocSinh', 'HoTen', 'MaLop'],
            raw: true,
            order: [['HoTen', 'ASC']],
        });

        // 3. Lấy các bản ghi điểm thực tế cho môn được chọn (nếu có)
        const records = await BangDiemMonHoc.findAll({
            where: { NamHoc: year, HocKy: semester, MaMonHoc: subjectId },
            attributes: ['MaHocSinh', 'Diem15Phut', 'Diem1Tiet', 'DiemCK', 'DiemTBMon'],
            raw: true,
        });

        const recMap = {};
        records.forEach(r => { recMap[r.MaHocSinh] = r; });

        // 4. Tạo bảng kết quả đảm bảo mỗi học sinh đều có một dòng (nếu thiếu điểm -> 0)
        const finalScores = students.map(s => {
            const rec = recMap[s.MaHocSinh];

            const Diem15p = rec && rec.Diem15Phut !== null ? rec.Diem15Phut : 0;
            const Diem1Tiet = rec && rec.Diem1Tiet !== null ? rec.Diem1Tiet : 0;
            const DiemTB = rec && rec.DiemTBMon !== null ? rec.DiemTBMon : 0;
            const DiemCK = rec && rec.DiemCK !== null ? rec.DiemCK : 0; 

            return {
                MaHocSinh: s.MaHocSinh,
                HoTen: s.HoTen,

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