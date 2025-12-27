const { sequelize } = require('../models');

async function createChuaCoLop() {
  try {
    // Kiểm tra xem lớp CHUA_CO_LOP đã tồn tại chưa
    const [existing] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM LopHoc WHERE MaLop = 'CHUA_CO_LOP'"
    );

    if (existing[0].cnt > 0) {
      console.log('✅ Lớp CHUA_CO_LOP đã tồn tại');
      process.exit(0);
    }

    // Tạo lớp CHUA_CO_LOP với KhoiLop = 0
    await sequelize.query(
      "INSERT INTO LopHoc (MaLop, KhoiLop) VALUES ('CHUA_CO_LOP', 0)"
    );

    console.log('✅ Đã tạo lớp CHUA_CO_LOP thành công');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi tạo lớp CHUA_CO_LOP:', err.message);
    process.exit(1);
  }
}

createChuaCoLop();

