const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { sequelize, NguoiDung } = require("../models");

const CSV_FILE_PATH = process.argv[2] || path.join(__dirname, "nguoidung.csv");

function parseCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim() !== "");
    
    if (lines.length === 0) {
      throw new Error("File CSV trống");
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }

    return data;
  } catch (error) {
    console.error("Lỗi khi đọc file CSV:", error.message);
    throw error;
  }
}

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function importUsers() {
  try {
    console.log("Bắt đầu import người dùng từ CSV...");
    console.log(`Đường dẫn file: ${CSV_FILE_PATH}`);

    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`File không tồn tại: ${CSV_FILE_PATH}`);
    }

    console.log("Đang đọc file CSV...");
    const users = parseCSV(CSV_FILE_PATH);
    console.log(`Đã đọc ${users.length} người dùng từ CSV`);

    await sequelize.authenticate();
    console.log("Đã kết nối database");

    await sequelize.sync();
    console.log("Đã đồng bộ model");

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    console.log("\n📥 Bắt đầu import...");
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        if (!user.MaNguoiDung || !user.TenDangNhap || !user.MatKhau || !user.VaiTro) {
          console.log(`⚠️  Dòng ${i + 2}: Thiếu dữ liệu bắt buộc, bỏ qua`);
          skipCount++;
          continue;
        }

        const existingUser = await NguoiDung.findOne({
          where: { TenDangNhap: user.TenDangNhap },
        });

        if (existingUser) {
          console.log(`⏭️  Dòng ${i + 2}: ${user.TenDangNhap} đã tồn tại, bỏ qua`);
          skipCount++;
          continue;
        }

        const hashedPassword = await hashPassword(user.MatKhau);

        await NguoiDung.create({
          TenDangNhap: user.TenDangNhap,
          MatKhau: hashedPassword,
          VaiTro: user.VaiTro,
        });

        successCount++;
        if ((i + 1) % 50 === 0) {
          console.log(`   Đã import ${i + 1}/${users.length} người dùng...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Dòng ${i + 2}: Lỗi khi import ${user.TenDangNhap} -`, error.message);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("TỔNG KẾT:");
    console.log(`Thành công: ${successCount}`);
    console.log(`⏭Bỏ qua: ${skipCount}`);
    console.log(`Lỗi: ${errorCount}`);
    console.log(`Tổng cộng: ${users.length}`);
    console.log("=".repeat(50));

    console.log("\n Hoàn thành import!");

  } catch (error) {
    console.error("\n Lỗi nghiêm trọng:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  importUsers();
}

module.exports = { importUsers };
