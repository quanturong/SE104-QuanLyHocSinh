const { sequelize } = require("../models");

async function removeMaLopFromPhanCongGiangDay() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log("🔄 Bắt đầu migration: Xóa cột MaLop khỏi bảng PhanCongGiangDay...\n");

    // Bước 1: Kiểm tra xem cột MaLop có tồn tại không
    const [tableInfo] = await sequelize.query(`
      PRAGMA table_info(PhanCongGiangDay);
    `);
    
    const hasMaLop = tableInfo.some(col => col.name === 'MaLop');
    
    if (!hasMaLop) {
      console.log("✅ Cột MaLop không tồn tại trong bảng PhanCongGiangDay. Không cần migration.");
      await transaction.commit();
      return;
    }

    console.log("📋 Cấu trúc bảng hiện tại:");
    tableInfo.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    console.log("");

    // Bước 2: Tắt foreign key constraints tạm thời
    await sequelize.query(`PRAGMA foreign_keys = OFF;`, { transaction });
    console.log("✅ Đã tắt foreign key constraints");

    // Bước 3: Tạo bảng backup
    await sequelize.query(`
      CREATE TABLE PhanCongGiangDay_backup AS 
      SELECT * FROM PhanCongGiangDay;
    `, { transaction });
    console.log("✅ Đã tạo bảng backup: PhanCongGiangDay_backup");

    // Bước 4: Xóa bảng cũ
    await sequelize.query(`DROP TABLE PhanCongGiangDay;`, { transaction });
    console.log("✅ Đã xóa bảng PhanCongGiangDay cũ");

    // Bước 5: Tạo lại bảng mới không có cột MaLop
    await sequelize.query(`
      CREATE TABLE PhanCongGiangDay (
        MaPhanCong INTEGER PRIMARY KEY AUTOINCREMENT,
        MaGiaoVien INTEGER NOT NULL,
        MaMonHoc TEXT NOT NULL,
        NamHoc TEXT,
        HocKy INTEGER,
        FOREIGN KEY (MaGiaoVien) REFERENCES GiaoVien(MaGiaoVien),
        FOREIGN KEY (MaMonHoc) REFERENCES MonHoc(MaMonHoc)
      );
    `, { transaction });
    console.log("✅ Đã tạo lại bảng PhanCongGiangDay (không có MaLop)");

    // Bước 6: Copy dữ liệu từ backup (bỏ qua cột MaLop)
    await sequelize.query(`
      INSERT INTO PhanCongGiangDay (MaPhanCong, MaGiaoVien, MaMonHoc, NamHoc, HocKy)
      SELECT MaPhanCong, MaGiaoVien, MaMonHoc, NamHoc, HocKy
      FROM PhanCongGiangDay_backup;
    `, { transaction });
    console.log("✅ Đã copy dữ liệu từ backup (bỏ qua cột MaLop)");

    // Bước 7: Xóa bảng backup
    await sequelize.query(`DROP TABLE PhanCongGiangDay_backup;`, { transaction });
    console.log("✅ Đã xóa bảng backup");

    // Bước 8: Bật lại foreign key constraints
    await sequelize.query(`PRAGMA foreign_keys = ON;`, { transaction });
    console.log("✅ Đã bật lại foreign key constraints");

    // Bước 9: Kiểm tra kết quả
    const [newTableInfo] = await sequelize.query(`
      PRAGMA table_info(PhanCongGiangDay);
    `);
    
    console.log("\n📋 Cấu trúc bảng sau migration:");
    newTableInfo.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });

    const [rowCount] = await sequelize.query(`
      SELECT COUNT(*) AS count FROM PhanCongGiangDay;
    `);
    console.log(`\n📊 Số bản ghi trong bảng: ${rowCount[0].count}`);

    await transaction.commit();
    console.log("\n✅ Migration hoàn thành thành công!");
    console.log("✅ Cột MaLop đã được xóa khỏi bảng PhanCongGiangDay");

  } catch (error) {
    await transaction.rollback();
    console.error("\n❌ Lỗi trong quá trình migration:", error);
    throw error;
  }
}

// Chạy migration
removeMaLopFromPhanCongGiangDay()
  .then(() => {
    console.log("\n✅ Hoàn thành!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration thất bại:", error);
    process.exit(1);
  });

