// controllers/score.controller.js

const scoreService = require('../services/score.service');
const lookupService = require('../services/lookup.service');
const classService = require('../services/class.service');

class ScoreController {
    async showScoreTable(req, res) {
        // Lấy filters từ query params
        const { tab = 'students', year, semester, subject } = req.query; 

        // 1. Dữ liệu mặc định (đảm bảo không bị ReferenceError trong EJS)
        const defaultRenderData = {
            title: "Student Management - Bảng điểm",
            error: null, 
            success: null, 
            years: [],
            classes: [],
            subjects: [],
            studentsOverview: [],
            subjectScores: [],
            selectedYear: year || null, // Sử dụng giá trị từ query
            selectedSemester: semester || null,
            selectedSubject: subject || null,
            // Lấy thông báo lỗi/thành công từ Flash (dùng cho các POST/redirect)
            flashError: req.flash('error'),
            flashSuccess: req.flash('success'),
        };
        
        // Tạo đối tượng dữ liệu cuối cùng để truyền vào EJS
        let dataToRender = { ...defaultRenderData };

        try {
            // 2. Lấy dữ liệu tĩnh cần thiết cho các SELECT BOX
            dataToRender.years = await lookupService.getAllSchoolYears();
            dataToRender.classes = await lookupService.getAllClasses();
            dataToRender.subjects = await lookupService.getAllSubjects();

            // 3. Lấy Dữ liệu chính cho từng tab
            if (tab === 'students') {
                dataToRender.studentsOverview = await scoreService.getStudentsOverview(year);
            } else if (tab === 'subject') {
                dataToRender.subjectScores = await scoreService.getSubjectScores(year, semester, subject);
            }
            
            // 4. Nếu có Flash Error/Success, ưu tiên hiển thị
            dataToRender.error = dataToRender.flashError.length > 0 ? dataToRender.flashError[0] : null;
            dataToRender.success = dataToRender.flashSuccess.length > 0 ? dataToRender.flashSuccess[0] : null;


            // 5. Render View
            res.render('pages/scoretable', dataToRender);

        } catch (err) {
            console.error("Lỗi khi tải bảng điểm:", err);
            
            // Xử lý lỗi tải dữ liệu (ví dụ: database down)
            dataToRender.error = "Lỗi tải dữ liệu bảng điểm: " + err.message;
            dataToRender.studentsOverview = [];
            dataToRender.subjectScores = [];
            
            // Vẫn phải đảm bảo truyền các trường cần thiết (đã có trong dataToRender)
            res.render('pages/scoretable', dataToRender);
        }
    }

    // Phần updateScore
    async updateScore(req, res) {
        try {
            req.flash('success', 'Cập nhật điểm thành công!');
            // Sau khi thành công, chuyển hướng về trang trước (B13)
            res.redirect(`/scoretable?tab=subject&year=${req.body.year}&semester=${req.body.HocKy}&subject=${req.body.MaMon}`);
        } catch (error) {
            // Nếu B9 xảy ra (Validation thất bại), hiển thị lỗi
            req.flash('error', error.message);
            res.redirect('back');
        }
    }
}

module.exports = new ScoreController();