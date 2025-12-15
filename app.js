//Import các module cần thiết
const flash = require('connect-flash');
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");

const { sequelize, NguoiDung } = require("./models");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Middleware để đọc dữ liệu từ form 
// Session middleware (single instance)
app.use(
  session({
    secret: "secret-qlhs",
    resave: false,
    saveUninitialized: false,
  })
);

// Flash middleware (requires sessions)
app.use(flash());

sequelize
  .authenticate()
  .then(() => console.log("✅ Kết nối thành công tới database có sẵn!"))
  .catch((err) => console.error("❌ Lỗi kết nối database:", err));

app.get("/login", (req, res) => {
  res.render("login", {
    title: "Student Management – Đăng nhập",
    error: null,
    username: "",
  });
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.post("/login", async (req, res) => {
  let { username, password } = req.body;

  username = (username || "").trim();
  password = (password || "").trim();

  console.log("User gửi lên:", username, password);

  try {
    const user = await NguoiDung.findOne({
      where: {
        TenDangNhap: username,
      },
    });

    if (!user) {
      console.log("❌ Sai tài khoản hoặc mật khẩu");
      return res.render("login", {
        title: "Student Management – Đăng nhập",
        error: "Sai tên đăng nhập hoặc mật khẩu!",
        username,
      });
    }

    let passwordMatch = false;
    if (user.MatKhau.startsWith("$2b$") || user.MatKhau.startsWith("$2a$")) {
      // Mật khẩu đã được hash
      passwordMatch = await bcrypt.compare(password, user.MatKhau);
    } else {
      // Mật khẩu plain text (dữ liệu cũ)
      passwordMatch = user.MatKhau === password;
    }

    if (!passwordMatch) {
      console.log("❌ Sai tài khoản hoặc mật khẩu");
      return res.render("login", {
        title: "Student Management – Đăng nhập",
        error: "Sai tên đăng nhập hoặc mật khẩu!",
        username,
      });
    }

    console.log("✅ Đăng nhập thành công:", user.TenDangNhap, user.VaiTro);

    let finalUsername = user.TenDangNhap;

    if (user.VaiTro && user.VaiTro.toLowerCase() === "hocsinh") {
      const [hsRows] = await sequelize.query(
        `
        SELECT MaHocSinh
        FROM HoSoHocSinh
        WHERE Email = ? OR MaHocSinh = ?;
        `,
        { replacements: [user.TenDangNhap, user.TenDangNhap] }
      );

      if (hsRows[0]) {
        finalUsername = hsRows[0].MaHocSinh;
      } else {
        console.warn("⚠ Không tìm được MaHocSinh cho TenDangNhap =", user.TenDangNhap);
      }
    }

    req.session.user = {
      id: user.MaNguoiDung,
      username: finalUsername,
      role: user.VaiTro,
    };

    return res.redirect("/tablecontrol");

  } catch (err) {
    console.error("❌ Lỗi khi đăng nhập:", err);
    return res.render("login", {
      title: "Student Management – Đăng nhập",
      error: "Có lỗi hệ thống, vui lòng thử lại sau.",
      username,
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

//Định tuyến đến trang quản lý học sinh 
const pageRoutes = require("./routes/pages.route");
app.use("/", pageRoutes);

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server chạy tại: http://localhost:${PORT}`)
);
