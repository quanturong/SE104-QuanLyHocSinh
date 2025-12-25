const { sequelize } = require('../models');
(async ()=>{
  try{
    const sql = `SELECT t.MaLop, t.Thu, t.TietHoc, t.MaMonHoc, m.TenMonHoc, t.MaGiaoVien, gv.HoTen AS TenGiaoVien FROM ThoiKhoaBieu t LEFT JOIN MonHoc m ON t.MaMonHoc = m.MaMonHoc LEFT JOIN GiaoVien gv ON t.MaGiaoVien = gv.MaGiaoVien WHERE t.NamHoc = ? ORDER BY t.MaLop, t.Thu, t.TietHoc`;
    const [rows] = await sequelize.query(sql, { replacements: ['NH2025-2026'] });
    console.log('Rows:', rows.length);
    console.log(rows.slice(0,10));
  }catch(e){ console.error('Error running query:', e); }
  finally{ process.exit(); }
})();