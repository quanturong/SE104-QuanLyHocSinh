const sequelize = require('../config/db');
const { BaoCaoTongKetMon, BaoCaoTongKetHK } = require('../models');
const quyDinhService = require('./quydinh.service');

/**
 * Get subject report rows and aggregated totals
 * @param {string|null} year
 * @param {string|null} semester - '1'|'2'|'full' or null
 * @param {string|null} subject - MaMonHoc or null
 */
async function getSubjectReport(year, semester, subject) {
  const where = [];
  const replacements = {};
  if (year) {
    where.push('NamHoc = :year');
    replacements.year = year;
  }
  if (semester && semester !== 'full') {
    where.push('HocKy = :semester');
    replacements.semester = semester;
  }
  if (subject) {
    where.push('MaMonHoc = :subject');
    replacements.subject = subject;
  }

  const whereSQL = where.length ? ('WHERE ' + where.join(' AND ')) : '';

  const [rows] = await sequelize.query(`
    SELECT *
    FROM BaoCaoTongKetMon
    ${whereSQL}
    ORDER BY NamHoc DESC, HocKy, MaMonHoc, MaLop;
  `, { replacements });

  let classes = (rows && rows.length) ? rows.length : 0;
  let students = 0;
  let passed = 0;

  if (rows && rows.length) {
    for (const r of rows) {
      students += Number(r.SiSo || r.SiSoLop || 0);
      passed += Number(r.SoLuongDat || r.SoDat || 0);
    }
  }

  const passRate = students ? (passed / students * 100) : 0;

  return { rows, totals: { classes, students, passed, passRate } };
}

/**
 * Tính toán và cập nhật báo cáo tổng kết môn học từ BangDiemMonHoc
 * @param {string|null} year - Năm học cụ thể, null = tất cả
 * @param {number|null} semester - Học kì cụ thể (1 hoặc 2), null = tất cả
 */
async function calculateSubjectReports(year = null, semester = null) {
  try {
    // Lấy quy định điểm đạt môn từ database
    const diemDatMon = await quyDinhService.getGiaTriQuyDinh("DIEM_DAT_MON", 5.0);

    const where = [];
    const replacements = {};
    
    if (year) {
      where.push('bdm.NamHoc = :year');
      replacements.year = year;
    }
    if (semester) {
      where.push('bdm.HocKy = :semester');
      replacements.semester = semester;
    }

    const whereSQL = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const [reportData] = await sequelize.query(`
      SELECT 
        NamHoc,
        HocKy,
        MaMonHoc,
        MaLop,
        COUNT(DISTINCT MaHocSinh) AS SiSo,
        SUM(CASE WHEN DiemTBMon >= :diemDatMon THEN 1 ELSE 0 END) AS SoLuongDat
      FROM (
        SELECT 
          bdm.NamHoc,
          bdm.HocKy,
          bdm.MaMonHoc,
          hln.MaLop,
          bdm.MaHocSinh,
          MAX(bdm.DiemTBMon) AS DiemTBMon
        FROM BangDiemMonHoc bdm
        INNER JOIN HoSoHocSinh hs ON bdm.MaHocSinh = hs.MaHocSinh
        INNER JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh 
          AND hln.MaNamHoc = bdm.NamHoc AND hln.TrangThai = 'DangHoc'
        ${whereSQL}
        GROUP BY bdm.NamHoc, bdm.HocKy, bdm.MaMonHoc, hln.MaLop, bdm.MaHocSinh
      ) AS StudentScores
      GROUP BY NamHoc, HocKy, MaMonHoc, MaLop
      HAVING COUNT(DISTINCT MaHocSinh) > 0
    `, { replacements: { ...replacements, diemDatMon } });

    let updatedCount = 0;
    let createdCount = 0;

    for (const row of reportData) {
      const siSo = Number(row.SiSo || 0);
      const soLuongDat = Number(row.SoLuongDat || 0);
      const tiLe = siSo > 0 ? (soLuongDat / siSo * 100) : 0;

      const [existing] = await sequelize.query(`
        SELECT MaBCM FROM BaoCaoTongKetMon
        WHERE NamHoc = ? AND HocKy = ? AND MaMonHoc = ? AND MaLop = ?
        LIMIT 1
      `, {
        replacements: [row.NamHoc, row.HocKy, row.MaMonHoc, row.MaLop]
      });

      if (existing && existing.length > 0) {
        await sequelize.query(`
          UPDATE BaoCaoTongKetMon
          SET SiSo = ?, SoLuongDat = ?, TiLe = ?
          WHERE NamHoc = ? AND HocKy = ? AND MaMonHoc = ? AND MaLop = ?
        `, {
          replacements: [siSo, soLuongDat, tiLe, row.NamHoc, row.HocKy, row.MaMonHoc, row.MaLop]
        });
        updatedCount++;
      } else {
        await sequelize.query(`
          INSERT INTO BaoCaoTongKetMon (NamHoc, HocKy, MaMonHoc, MaLop, SiSo, SoLuongDat, TiLe)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [row.NamHoc, row.HocKy, row.MaMonHoc, row.MaLop, siSo, soLuongDat, tiLe]
        });
        createdCount++;
      }
    }

    return { 
      success: true, 
      created: createdCount, 
      updated: updatedCount,
      total: reportData.length 
    };
  } catch (error) {
    console.error('Lỗi khi tính toán báo cáo môn học:', error);
    throw error;
  }
}

/**
 * Tính toán và cập nhật báo cáo tổng kết học kì từ BangDiemMonHoc
 * @param {string|null} year - Năm học cụ thể, null = tất cả
 * @param {number|null} semester - Học kì cụ thể (1 hoặc 2), null = tất cả
 */
async function calculateSemesterReports(year = null, semester = null) {
  try {
    // Lấy quy định điểm đạt môn từ database
    const diemDatMon = await quyDinhService.getGiaTriQuyDinh("DIEM_DAT_MON", 5.0);

    const where = [];
    const replacements = {};
    
    if (year) {
      where.push('bdm.NamHoc = :year');
      replacements.year = year;
    }
    if (semester) {
      where.push('bdm.HocKy = :semester');
      replacements.semester = semester;
    }

    const whereSQL = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const [reportData] = await sequelize.query(`
      SELECT 
        NamHoc,
        HocKy,
        MaLop,
        COUNT(DISTINCT MaHocSinh) AS SiSo,
        SUM(CASE WHEN DiemTBHK >= :diemDatMon THEN 1 ELSE 0 END) AS SoLuongDat
      FROM (
        SELECT 
          bdm.MaHocSinh,
          bdm.NamHoc,
          bdm.HocKy,
          hln.MaLop,
          AVG(bdm.DiemTBMon) AS DiemTBHK
        FROM BangDiemMonHoc bdm
        INNER JOIN HoSoHocSinh hs ON bdm.MaHocSinh = hs.MaHocSinh
        INNER JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh 
          AND hln.MaNamHoc = bdm.NamHoc AND hln.TrangThai = 'DangHoc'
        ${whereSQL}
        GROUP BY bdm.MaHocSinh, bdm.NamHoc, bdm.HocKy, hln.MaLop
        HAVING COUNT(bdm.MaMonHoc) > 0
      ) AS StudentSemesterAvg
      GROUP BY NamHoc, HocKy, MaLop
    `, { replacements: { ...replacements, diemDatMon } });

    let updatedCount = 0;
    let createdCount = 0;

    for (const row of reportData) {
      const siSo = Number(row.SiSo || 0);
      const soLuongDat = Number(row.SoLuongDat || 0);
      const tiLe = siSo > 0 ? (soLuongDat / siSo * 100) : 0;

      const [existing] = await sequelize.query(`
        SELECT MaBCHK FROM BaoCaoTongKetHK
        WHERE NamHoc = ? AND HocKy = ? AND MaLop = ?
        LIMIT 1
      `, {
        replacements: [row.NamHoc, row.HocKy, row.MaLop]
      });

      if (existing && existing.length > 0) {
        await sequelize.query(`
          UPDATE BaoCaoTongKetHK
          SET SiSo = ?, SoLuongDat = ?, TiLe = ?
          WHERE NamHoc = ? AND HocKy = ? AND MaLop = ?
        `, {
          replacements: [siSo, soLuongDat, tiLe, row.NamHoc, row.HocKy, row.MaLop]
        });
        updatedCount++;
      } else {
        await sequelize.query(`
          INSERT INTO BaoCaoTongKetHK (NamHoc, HocKy, MaLop, SiSo, SoLuongDat, TiLe)
          VALUES (?, ?, ?, ?, ?, ?)
        `, {
          replacements: [row.NamHoc, row.HocKy, row.MaLop, siSo, soLuongDat, tiLe]
        });
        createdCount++;
      }
    }

    return { 
      success: true, 
      created: createdCount, 
      updated: updatedCount,
      total: reportData.length 
    };
  } catch (error) {
    console.error('Lỗi khi tính toán báo cáo học kì:', error);
    throw error;
  }
}

/**
 * Tính toán lại tất cả báo cáo
 * @param {string|null} year - Năm học cụ thể, null = tất cả
 * @param {number|null} semester - Học kì cụ thể, null = tất cả
 */
async function recalculateAllReports(year = null, semester = null) {
  try {
    const subjectResult = await calculateSubjectReports(year, semester);
    const semesterResult = await calculateSemesterReports(year, semester);
    
    return {
      success: true,
      subjectReport: subjectResult,
      semesterReport: semesterResult
    };
  } catch (error) {
    console.error('Lỗi khi tính toán lại báo cáo:', error);
    throw error;
  }
}

/**
 * Tự động tính toán lại báo cáo cho một năm học và học kì cụ thể
 * Chạy background, không block response
 * @param {string} year - Năm học
 * @param {number} semester - Học kì (1 hoặc 2)
 */
async function autoRecalculateReports(year, semester) {
  setImmediate(async () => {
    try {
      console.log(`[Auto] Bắt đầu tính toán lại báo cáo cho ${year} - HK${semester}...`);
      const result = await recalculateAllReports(year, semester);
      console.log(`[Auto] Hoàn thành tính toán báo cáo:`, {
        subject: `${result.subjectReport.created} mới, ${result.subjectReport.updated} cập nhật`,
        semester: `${result.semesterReport.created} mới, ${result.semesterReport.updated} cập nhật`
      });
    } catch (error) {
      console.error(`[Auto] Lỗi khi tự động tính toán báo cáo cho ${year} - HK${semester}:`, error);
    }
  });
}

module.exports = { 
  getSubjectReport,
  calculateSubjectReports,
  calculateSemesterReports,
  recalculateAllReports,
  autoRecalculateReports
};