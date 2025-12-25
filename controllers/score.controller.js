const scoreService = require('../services/score.service');
const lookupService = require('../services/lookup.service');
const classService = require('../services/class.service');
const reportService = require('../services/report.service');
const XLSX = require('xlsx');
const { HoSoHocSinh, MonHoc, BangDiemMonHoc, sequelize } = require('../models');

class ScoreController {
    async showScoreTable(req, res) {
        const { tab = 'students', year, semester, subject, class: selectedClass } = req.query; 

        const userRole = (req.session?.user?.role || "").trim();
        const isStudent = userRole === "HocSinh";
        const studentId = (isStudent && req.session?.user?.username) ? req.session.user.username : null;

        const defaultRenderData = {
            title: "Bảng điểm",
            user: req.session.user,
            isStudent: isStudent,
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
            flashError: req.flash('error'),
            flashSuccess: req.flash('success'),
        };
        
        let dataToRender = { ...defaultRenderData };

        try {
            dataToRender.years = await lookupService.getAllSchoolYears();
            if (!isStudent) {
                dataToRender.classes = await lookupService.getAllClasses();
            }
            dataToRender.subjects = await lookupService.getAllSubjects();

            if (!dataToRender.selectedYear) {
                dataToRender.selectedYear = (dataToRender.years && dataToRender.years.length) ? dataToRender.years[0] : null;
            }
            if (!dataToRender.selectedSemester) {
                dataToRender.selectedSemester = dataToRender.selectedSemester || '1';
            }
            if (!dataToRender.selectedSubject) {
                dataToRender.selectedSubject = (dataToRender.subjects && dataToRender.subjects.length) ? dataToRender.subjects[0].MaMonHoc : null;
            }

            if (typeof dataToRender.selectedClass === 'undefined' || dataToRender.selectedClass === null) {
                dataToRender.selectedClass = '';
            }

            if (isStudent && studentId) {
                dataToRender.studentsOverview = await scoreService.getStudentPersonalOverview(studentId, dataToRender.selectedYear);
                dataToRender.subjectScores = [];
                if (dataToRender.selectedYear && dataToRender.selectedSemester && dataToRender.selectedSubject) {
                    dataToRender.subjectScores = await scoreService.getStudentPersonalScores(
                        studentId,
                        dataToRender.selectedYear,
                        dataToRender.selectedSemester,
                        dataToRender.selectedSubject
                    );
                }
            } else {
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
            }
            
            dataToRender.error = dataToRender.flashError.length > 0 ? dataToRender.flashError[0] : null;
            dataToRender.success = dataToRender.flashSuccess.length > 0 ? dataToRender.flashSuccess[0] : null;

            res.render('pages/scoretable', dataToRender);

        } catch (err) {
            console.error("Lỗi khi tải bảng điểm:", err);
            
            dataToRender.error = "Lỗi tải dữ liệu bảng điểm: " + err.message;
            dataToRender.studentsOverview = [];
            dataToRender.subjectScores = [];
            if (typeof dataToRender.isStudent === 'undefined') {
                dataToRender.isStudent = false;
            }
            
            res.render('pages/scoretable', dataToRender);
        }
    }

    async importScores(req, res) {
        try {
            if (!req.file) {
                req.flash('error', 'Vui lòng chọn tệp Excel để nhập.');
                const referer = req.get('Referer') || '/scoretable';
                return res.redirect(referer);
            }

            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

            if (!rows || rows.length === 0) {
                req.flash('error', 'Tệp Excel rỗng hoặc không đọc được.');
                const referer = req.get('Referer') || '/scoretable';
                return res.redirect(referer);
            }

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

                if (!HoTen) { errors.push(`Dòng ${i+2}: HoTen trống`); continue; }
                if (![1,2].includes(HocKy)) { errors.push(`Dòng ${i+2}: HocKy phải là 1 hoặc 2`); continue; }
                if (!NamHoc) { errors.push(`Dòng ${i+2}: Namhoc trống`); continue; }
                if (!TenMonHoc) { errors.push(`Dòng ${i+2}: MonHoc trống`); continue; }

                const student = await HoSoHocSinh.findOne({ where: { HoTen: HoTen }, raw: true });
                if (!student) { errors.push(`Dòng ${i+2}: Không tìm thấy học sinh với tên '${HoTen}'`); continue; }

                const mon = await MonHoc.findOne({ where: { TenMonHoc: TenMonHoc }, raw: true });
                if (!mon) { errors.push(`Dòng ${i+2}: Không tìm thấy môn '${TenMonHoc}'`); continue; }

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

            if (imported > 0) {
                const [yearsAndSemesters] = await sequelize.query(`
                    SELECT DISTINCT NamHoc, HocKy 
                    FROM BangDiemMonHoc 
                    ORDER BY NamHoc DESC, HocKy
                `);
                
                for (const item of yearsAndSemesters) {
                    reportService.autoRecalculateReports(item.NamHoc, item.HocKy);
                }
            }

            const messages = [];
            if (imported > 0) messages.push(`${imported} bản ghi đã được nhập/cập nhật thành công. Báo cáo sẽ được tự động cập nhật.`);
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

    async updateScore(req, res) {
        try {
            const userRole = (req.session?.user?.role || "").trim();
            if (userRole === "HocSinh") {
                req.flash('error', 'Bạn không có quyền sửa điểm.');
                return res.redirect('/scoretable');
            }

            const { MaHocSinh, NamHoc, HocKy, MaMon, Diem15p, Diem1Tiet, DiemCK } = req.body;

            if (!MaHocSinh || !NamHoc || !HocKy || !MaMon) {
                req.flash('error', 'Thiếu thông tin bắt buộc để cập nhật điểm.');
                return res.redirect(req.get('Referer') || '/scoretable');
            }

            const d15 = (Diem15p === '' || Diem15p === undefined) ? null : parseFloat(Diem15p);
            const d1t = (Diem1Tiet === '' || Diem1Tiet === undefined) ? null : parseFloat(Diem1Tiet);
            const dck = (DiemCK === '' || DiemCK === undefined) ? null : parseFloat(DiemCK);

            const parts = [d15, d1t, dck].filter(v => typeof v === 'number' && !isNaN(v));
            const DiemTBMon = parts.length ? parseFloat((parts.reduce((s,a)=>s+a,0)/parts.length).toFixed(1)) : 0;

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

            reportService.autoRecalculateReports(NamHoc, parseInt(HocKy, 10));

            req.flash('success', 'Cập nhật điểm thành công! Báo cáo sẽ được tự động cập nhật.');
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

    async deleteScore(req, res) {
        try {
            const userRole = (req.session?.user?.role || "").trim();
            if (userRole === "HocSinh") {
                req.flash('error', 'Bạn không có quyền xóa điểm.');
                return res.redirect('/scoretable');
            }

            const { MaHocSinh, NamHoc, HocKy, MaMon } = req.body;
            if (!MaHocSinh || !NamHoc || !HocKy || !MaMon) {
                req.flash('error', 'Thiếu thông tin để xóa điểm.');
                return res.redirect(req.get('Referer') || '/scoretable');
            }

            const where = { MaHocSinh: MaHocSinh, MaMonHoc: MaMon, HocKy: parseInt(HocKy,10), NamHoc: NamHoc };
            const existing = await BangDiemMonHoc.findOne({ where });
            if (!existing) {
                req.flash('error', 'Không tìm thấy bản ghi điểm để xóa.');
                return res.redirect(req.get('Referer') || '/scoretable');
            }

            await existing.destroy();

            reportService.autoRecalculateReports(NamHoc, parseInt(HocKy, 10));

            req.flash('success', 'Xóa điểm thành công! Báo cáo sẽ được tự động cập nhật.');
            const year = NamHoc;
            const semester = HocKy;
            const subject = MaMon;
            res.redirect(`/scoretable?tab=subject&year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}`);
        } catch (error) {
            console.error('Lỗi khi xóa điểm:', error);
            req.flash('error', 'Có lỗi khi xóa điểm: ' + (error.message || error));
            const referer = req.get('Referer') || '/scoretable';
            res.redirect(referer);
        }
    }
}

module.exports = new ScoreController();