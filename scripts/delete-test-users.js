const sequelize = require("../config/db");

async function deleteTestUsers() {
  try {
    console.log("📋 Đang xóa các tài khoản test...\n");

    // Danh sách tài khoản test cần xóa
    const testUsernames = [
      "test_admin",
      "test_giaovien1",
      "test_giaovien2",
      "test_bgh",
      "test_giaovu",
      "test_hocsinh1",
      "test_hocsinh2"
    ];

    let deletedCount = 0;
    let notFoundCount = 0;

    for (const username of testUsernames) {
      try {
        // Kiểm tra xem tài khoản có tồn tại không
        const [existing] = await sequelize.query(
          "SELECT MaNguoiDung FROM NguoiDung WHERE TenDangNhap = ?",
          { replacements: [username] }
        );

        if (existing.length > 0) {
          // Xóa tài khoản
          await sequelize.query(
            "DELETE FROM NguoiDung WHERE TenDangNhap = ?",
            { replacements: [username] }
          );
          console.log(`✅ Đã xóa: ${username}`);
          deletedCount++;
        } else {
          console.log(`⚠️  Không tìm thấy: ${username}`);
          notFoundCount++;
        }
      } catch (err) {
        console.error(`❌ Lỗi khi xóa ${username}:`, err.message);
      }
    }

    console.log(`\n📊 Kết quả:`);
    console.log(`   - Đã xóa: ${deletedCount} tài khoản`);
    console.log(`   - Không tìm thấy: ${notFoundCount} tài khoản`);
    console.log(`   - Tổng: ${testUsernames.length} tài khoản`);

    await sequelize.close();
    console.log("\n✅ Hoàn thành!");
  } catch (error) {
    console.error("\n❌ Lỗi:", error);
    await sequelize.close();
    process.exit(1);
  }
}

deleteTestUsers();

