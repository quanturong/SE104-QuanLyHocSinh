//Import các module cần thiết
const session = require('express-session');
const flash = require('connect-flash');
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

//Khởi tạo app
const app = express();

//Cấu hình EJS view engine 
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//Cho phép truy cập file tĩnh (CSS, ảnh, JS)
app.use(express.static(path.join(__dirname, "public")));

//Middleware để đọc dữ liệu từ form 
app.use(session({
    secret: 'SECRET_KEY_FOR_SESSION_MANAGEMENT',
    resave: false,
    saveUninitialized: true 
}));

//Flash middleware
app.use(flash());

//Kết nối database
const { sequelize } = require("./models");

sequelize.authenticate()
  .then(() => console.log("✅ Kết nối thành công tới database có sẵn!"))
  .catch(err => console.error("❌ Lỗi kết nối database:", err));

//Định nghĩa route đăng nhập
app.get("/login", (req, res) => {
  res.render("login", {
    title: "Student Management – Đăng nhập",
    error: null,
    username: ""
  });
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

//Xử lý POST /login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "123") {
    res.redirect("/tablecontrol");
  } else {
    res.render("login", {
      title: "Student Management – Đăng nhập",
      error: "Sai tên đăng nhập hoặc mật khẩu!",
      username
    });
  }
});


//Định tuyến đến trang quản lý học sinh 
const pageRoutes = require("./routes/pages.route");
app.use("/", pageRoutes);

//Khởi động server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại: http://localhost:${PORT}`));
