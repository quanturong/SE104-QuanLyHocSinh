const express = require("express");
const router = express.Router();

// Middleware kiểm tra login tạm thời (sau này bạn có thể thay bằng session)
const requireLogin = (req, res, next) => {
  // Nếu bạn có session thì kiểm tra ở đây
  next();
};

router.get("/tablecontrol", requireLogin, (req, res) => {
    res.render("pages/tablecontrol", { 
        title: "Quản lý bảng",
        assetsPath: "/css", 
    })
});

router.get("/student", requireLogin, (req, res) => {
    res.render("pages/student", { title: "Học sinh" });
});

router.get("/class", requireLogin, (req, res) => {
    res.render("pages/class", { title: "Lớp học" });
});

router.get("/attendance", requireLogin, (req, res) => {
    res.render("pages/attendance", { title: "Điểm danh" });
});

router.get("/report", requireLogin, (req, res) => {
    res.render("pages/report", { title: "Báo cáo" });
});

router.get("/scoretable", requireLogin, (req, res) => {
    res.render("pages/scoretable", { title: "Điểm số" });
});

router.get("/timetable", requireLogin, (req, res) => {
     res.render("pages/timetable", { title: "Thời khóa biểu" });
});

router.get("/find", requireLogin, (req, res) => {
    res.render("pages/find", { title: "Tra cứu" });
});

router.get("/teacher", requireLogin, (req, res) => {
    res.render("pages/teacher", { title: "Giáo viên" });
});

router.get("/rules", requireLogin, (req, res) => {
    res.render("pages/rules", { title: "Quy định" });
});

module.exports = router;
