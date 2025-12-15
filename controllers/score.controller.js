// controllers/score.controller.js

const scoreService = require('../services/score.service');
const lookupService = require('../services/lookup.service');
const classService = require('../services/class.service');
const XLSX = require('xlsx');
const { HoSoHocSinh, MonHoc, BangDiemMonHoc } = require('../models');

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

    // Import scores from uploaded Excel file
    async importScores(req, res) {
        try {
            if (!req.file) {
                req.flash('error', 'Vui lòng chọn tệp Excel để nhập.');
                const referer = req.get('Referer') || '/scoretable';
                return res.redirect(referer);
            }

            // Parse buffer using xlsx
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: null }); // array of objects keyed by header

            if (!rows || rows.length === 0) {
                req.flash('error', 'Tệp Excel rỗng hoặc không đọc được.');
                const referer = req.get('Referer') || '/scoretable';
                return res.redirect(referer);
            }

            // Expected headers (case-insensitive): HoTen, HocKy, Namhoc, MonHoc, Diem15p, Diem1Tiet, DiemCK, DiemTBM, DanhGia
            const requiredFields = ['hoten','hocky','namhoc','monhoc','diem15p','diem1tiet','diemck','diemtbm','danhgia'];
            const headers = Object.keys(rows[0]).map(h => (h || '').toString().trim().toLowerCase());
            const missing = requiredFields.filter(f => !headers.includes(f));
            if (missing.length > 0) {
                req.flash('error', `Tệp Excel thiếu cột bắt buộc: ${missing.join(', ')}`);
                const referer = req.get('Referer') || '/scoretable';
                return res.redirect(referer);
            }

            const errors = [];
            let imported = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                // Normalize keys to lowercase to support different header casing
                const r = {};
                Object.keys(row).forEach(k => { r[k.toString().trim().toLowerCase()] = row[k]; });

                const HoTen = (r['hoten'] || '').toString().trim();
                const HocKy = parseInt(r['hocky'], 10);
                const NamHoc = (r['namhoc'] || '').toString().trim();
                const TenMonHoc = (r['monhoc'] || '').toString().trim();
                const Diem15p = r['diem15p'] === null || r['diem15p'] === '' ? null : parseFloat(r['diem15p']);
                const Diem1Tiet = r['diem1tiet'] === null || r['diem1tiet'] === '' ? null : parseFloat(r['diem1tiet']);
                const DiemCK = r['diemck'] === null || r['diemck'] === '' ? null : parseFloat(r['diemck']);
                const DiemTBM = r['diemtbm'] === null || r['diemtbm'] === '' ? null : parseFloat(r['diemtbm']);
                const DanhGia = r['danhgia'] === null ? null : r['danhgia'].toString().trim();

                // Basic validations
                if (!HoTen) { errors.push(`Dòng ${i+2}: HoTen trống`); continue; }
                if (![1,2].includes(HocKy)) { errors.push(`Dòng ${i+2}: HocKy phải là 1 hoặc 2`); continue; }
                if (!NamHoc) { errors.push(`Dòng ${i+2}: Namhoc trống`); continue; }
                if (!TenMonHoc) { errors.push(`Dòng ${i+2}: MonHoc trống`); continue; }

                // Find student by name
                const student = await HoSoHocSinh.findOne({ where: { HoTen: HoTen }, raw: true });
                if (!student) { errors.push(`Dòng ${i+2}: Không tìm thấy học sinh với tên '${HoTen}'`); continue; }

                // Find subject by name (TenMonHoc)
                const mon = await MonHoc.findOne({ where: { TenMonHoc: TenMonHoc }, raw: true });
                if (!mon) { errors.push(`Dòng ${i+2}: Không tìm thấy môn '${TenMonHoc}'`); continue; }

                // Upsert into BangDiemMonHoc
                const whereClause = { MaHocSinh: student.MaHocSinh, MaMonHoc: mon.MaMonHoc, HocKy: HocKy, NamHoc: NamHoc };
                const existing = await BangDiemMonHoc.findOne({ where: whereClause });

                const payload = {
                    MaHocSinh: student.MaHocSinh,
                    MaMonHoc: mon.MaMonHoc,
                    HocKy: HocKy,
                    NamHoc: NamHoc,
                    Diem15Phut: Diem15p,
                    Diem1Tiet: Diem1Tiet,
                    DiemCK: DiemCK,
                    DiemTBMon: DiemTBM,
                    DanhGia: DanhGia,
                };

                if (existing) {
                    await existing.update(payload);
                } else {
                    await BangDiemMonHoc.create(payload);
                }

                imported++;
            }

            const messages = [];
            if (imported > 0) messages.push(`${imported} bản ghi đã được nhập/cập nhật thành công.`);
            if (errors.length > 0) messages.push(`Một số dòng không thể xử lý:${errors.join('\n')}`);

            req.flash('success', messages.join(' '));
            const referer = req.get('Referer') || '/scoretable';
            return res.redirect(referer);
        } catch (error) {
            console.error('Lỗi import Excel:', error);
            req.flash('error', 'Có lỗi khi import: ' + error.message);
            const referer = req.get('Referer') || '/scoretable';
            return res.redirect(referer);
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
            const referer = req.get('Referer') || '/scoretable';
            res.redirect(referer);
        }
    }
}

module.exports = new ScoreController();