const sequelize = require('../config/db');

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

module.exports = { getSubjectReport };