// controllers/score.controller.js

const scoreService = require('../services/score.service');
const lookupService = require('../services/lookup.service');
const classService = require('../services/class.service');
const XLSX = require('xlsx');
const { HoSoHocSinh, MonHoc, BangDiemMonHoc } = require('../models');

class ScoreController {
    async showScoreTable(req, res) {
        // Lấy filters từ query params
        const { tab = 'students', year, semester, subject, class: selectedClass } = req.query; 

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
            selectedClass: selectedClass || '',
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

            // 3. Thiết lập giá trị mặc định nếu người dùng không truyền query params
            if (!dataToRender.selectedYear) {
                dataToRender.selectedYear = (dataToRender.years && dataToRender.years.length) ? dataToRender.years[0] : null;
            }
            if (!dataToRender.selectedSemester) {
                dataToRender.selectedSemester = dataToRender.selectedSemester || '1';
            }
            if (!dataToRender.selectedSubject) {
                dataToRender.selectedSubject = (dataToRender.subjects && dataToRender.subjects.length) ? dataToRender.subjects[0].MaMonHoc : null;
            }

            // Ensure selectedClass is defined (empty means all)
            if (typeof dataToRender.selectedClass === 'undefined' || dataToRender.selectedClass === null) {
                dataToRender.selectedClass = '';
            }

            // 4. Tải dữ liệu cho các tab. Preload cả hai để khi người dùng chuyển tab dữ liệu đã có sẵn
            dataToRender.studentsOverview = await scoreService.getStudentsOverview(dataToRender.selectedYear);
            dataToRender.subjectScores = [];
            if (dataToRender.selectedYear && dataToRender.selectedSemester && dataToRender.selectedSubject) {
                dataToRender.subjectScores = await scoreService.getSubjectScores(
                    dataToRender.selectedYear,
                    dataToRender.selectedSemester,
                    dataToRender.selectedSubject,
                    dataToRender.selectedClass
                );
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

            // Expected headers (case-insensitive): HoTen, HocKy, Namhoc, MonHoc, Diem15p, Diem1Tiet, DiemCK, DiemTBM
            const requiredFields = ['hoten','hocky','namhoc','monhoc','diem15p','diem1tiet','diemck','diemtbm'];
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
            const { MaHocSinh, NamHoc, HocKy, MaMon, Diem15p, Diem1Tiet, DiemCK } = req.body;

            // Basic validation
            if (!MaHocSinh || !NamHoc || !HocKy || !MaMon) {
                req.flash('error', 'Thiếu thông tin bắt buộc để cập nhật điểm.');
                return res.redirect(req.get('Referer') || '/scoretable');
            }

            const d15 = (Diem15p === '' || Diem15p === undefined) ? null : parseFloat(Diem15p);
            const d1t = (Diem1Tiet === '' || Diem1Tiet === undefined) ? null : parseFloat(Diem1Tiet);
            const dck = (DiemCK === '' || DiemCK === undefined) ? null : parseFloat(DiemCK);

            // Compute DiemTBMon: average of available numeric components (fallback to 0 when all null)
            const parts = [d15, d1t, dck].filter(v => typeof v === 'number' && !isNaN(v));
            const DiemTBMon = parts.length ? parseFloat((parts.reduce((s,a)=>s+a,0)/parts.length).toFixed(1)) : 0;

            // Upsert into BangDiemMonHoc
            const where = { MaHocSinh: MaHocSinh, MaMonHoc: MaMon, HocKy: parseInt(HocKy,10), NamHoc: NamHoc };
            let existing = await BangDiemMonHoc.findOne({ where });
            const payload = {
                MaHocSinh: MaHocSinh,
                MaMonHoc: MaMon,
                HocKy: parseInt(HocKy,10),
                NamHoc: NamHoc,
                Diem15Phut: d15,
                Diem1Tiet: d1t,
                DiemCK: dck,
                DiemTBMon: DiemTBMon,
            };

            if (existing) {
                await existing.update(payload);
            } else {
                await BangDiemMonHoc.create(payload);
            }

            req.flash('success', 'Cập nhật điểm thành công!');
            // Preserve filters
            const year = NamHoc;
            const semester = HocKy;
            const subject = MaMon;
            res.redirect(`/scoretable?tab=subject&year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}`);
        } catch (error) {
            console.error('Lỗi khi cập nhật điểm:', error);
            req.flash('error', 'Có lỗi khi cập nhật điểm: ' + (error.message || error));
            const referer = req.get('Referer') || '/scoretable';
            res.redirect(referer);
        }
    }
}

module.exports = new ScoreController();