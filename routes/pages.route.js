const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { sequelize } = require("../models");
const pageController = require("../controllers/page.controller");
const userController = require("../controllers/user.controller");
const userService = require("../services/user.service");
const scoreController = require('../controllers/score.controller');
const scoreService = require('../services/score.service');
const lookupService = require('../services/lookup.service');

router.get("/change-password", (req, res) => {
  res.render("pages/change-password", {
    error: null,
    success: null
  });
});

router.post("/change-password", async (req, res) => {
  const { username, newPassword, confirmPassword } = req.body;

  if (!username || !newPassword || !confirmPassword) {
    return res.render("pages/change-password", {
      error: "Vui lòng nhập đầy đủ thông tin!",
      success: null
    });
  }

  if (newPassword !== confirmPassword) {
    return res.render("pages/change-password", {
      error: "Mật khẩu xác nhận không khớp!",
      success: null
    });
  }

  const bcrypt = require("bcrypt");
  const newHash = await bcrypt.hash(newPassword, 10);

  const ok = await userService.updatePasswordByUsername(username, newHash);

  if (!ok) {
    return res.render("pages/change-password", {
      error: "Tên đăng nhập không tồn tại!",
      success: null
    });
  }

  return res.render("pages/change-password", {
    error: null,
    success: "Đặt lại mật khẩu thành công!"
  });
});

// Multer setup: use memory storage so we can parse file buffer directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }
  next();
};

const normalizeRole = (rawRole) => {
  if (!rawRole) return "";

  const r = rawRole.toString().trim().toLowerCase();

  const mapping = {
    // Quản trị
    "admin": "Admin",
    "administrator": "Admin",
    "quản trị hệ thống": "Admin",
    "quan tri he thong": "Admin",

    // Ban giám hiệu
    "bgh": "BGH",
    "ban giám hiệu": "BGH",
    "ban giam hieu": "BGH",

    // Giáo viên
    "giaovien": "GiaoVien",
    "giáo viên": "GiaoVien",
    "giao vien": "GiaoVien",
    "teacher": "GiaoVien",

    

    // Học sinh
    "hocsinh": "HocSinh",
    "học sinh": "HocSinh",
    "hoc sinh": "HocSinh",
    "student": "HocSinh",
  };

  return mapping[r] || rawRole.toString().trim();
};

// Score routes (must be registered after helpers are defined)
router.get("/scoretable", requireLogin, scoreController.showScoreTable);
router.post('/scoretable/import', requireLogin, upload.single('scoreFile'), scoreController.importScores);
// Endpoint to update a single student's scores for a subject
router.post('/scoretable/update', requireLogin, scoreController.updateScore);

const allowRoles = (roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect("/login");
    }
    let userRole = normalizeRole(req.session.user.role || "");
    req.session.user.role = userRole;

    console.log("User role (raw):", req.session.user.role);
    console.log("User role (normalized):", userRole);

    if (!roles.includes(userRole)) {
      return res.status(403).send("Bạn không có quyền truy cập trang này.");
    }
    next();
  };
};

const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role !== "Admin") {
    return res.redirect("/tablecontrol");
  }
  next();
};


const staffRoles = ["Admin", "BGH", "GiaoVu", "GiaoVien"]; 
const allRoles   = ["Admin", "BGH", "GiaoVu", "GiaoVien", "HocSinh"];

const getRole = (req) => (req.session?.user?.role || "").trim();

router.get(
  "/tablecontrol",
  requireLogin,
  (req, res) => pageController.showTableControl(req, res)
);

router.get(
  "/tablecontrol-old",
  requireLogin,          
  async (req, res) => {
    try {
      console.log("DEBUG /tablecontrol - session.user =", req.session.user);
      console.log("DEBUG /tablecontrol - role =", getRole(req))
      const [studentRows] = await sequelize.query(
        "SELECT COUNT(*) AS SoHocSinh FROM HoSoHocSinh;"
      );
      const [classRows] = await sequelize.query(
        "SELECT COUNT(*) AS SoLop FROM LopHoc;"
      );
      const [teacherRows] = await sequelize.query(
        "SELECT COUNT(*) AS SoGiaoVien FROM GiaoVien;"
      );

      const SoHocSinh  = studentRows[0]?.SoHocSinh  || 0;
      const SoLop      = classRows[0]?.SoLop       || 0;
      const SoGiaoVien = teacherRows[0]?.SoGiaoVien || 0;

      const [attTodayRows] = await sequelize.query(`
        SELECT
          SUM(CASE WHEN TrangThai = 'P' THEN 1 ELSE 0 END) AS SoCoMat,
          COUNT(*) AS TongBuoi
        FROM DiemDanh
        WHERE date(NgayDiemDanh) = date('now');
      `);

      const SoCoMat  = attTodayRows[0]?.SoCoMat  || 0;
      const TongBuoi = attTodayRows[0]?.TongBuoi || 0;
      const DiemDanhHomNay = TongBuoi
        ? Math.round((SoCoMat * 100) / TongBuoi)
        : 0;
      const [att7Rows] = await sequelize.query(`
        SELECT 
          date(NgayDiemDanh) AS Ngay,
          SUM(CASE WHEN TrangThai = 'P' THEN 1 ELSE 0 END) AS SoCoMat,
          COUNT(*) AS TongBuoi
        FROM DiemDanh
        WHERE date(NgayDiemDanh) >= date('now','-6 day')
        GROUP BY date(NgayDiemDanh)
        ORDER BY Ngay;
      `);

      const attLabels   = att7Rows.map(r => r.Ngay);
      const attPercents = att7Rows.map(r => {
        const tong = r.TongBuoi || 0;
        return tong ? Math.round((r.SoCoMat * 100) / tong) : 0;
      });

      const [topClassRows] = await sequelize.query(`
        SELECT MaLop, SiSoLop
        FROM LopHoc
        ORDER BY SiSoLop DESC, MaLop
        LIMIT 6;
      `);

      const topClassLabels = topClassRows.map(r => r.MaLop);
      const topClassCounts = topClassRows.map(r => r.SiSoLop);

      const role = getRole(req);
      const username = req.session.user.username;

      let profile = {
        type: "Other",
        HoTen: req.session.user.fullName || req.session.user.username,
        VaiTro: role,
        MaSo: username,
        LopHienTai: null,
        NgaySinh: null,
        GioiTinh: null,
        Email: null,
        DiaChi: null,
        LopChuNhiem: null,
      };

      if (role === "HocSinh") {
        const [hsRows] = await sequelize.query(
          `
          SELECT MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop
          FROM HoSoHocSinh
          WHERE MaHocSinh = ?;
          `,
          { replacements: [username] }
        );
        if (hsRows[0]) {
          const hs = hsRows[0];
          profile = {
            type: "HocSinh",
            HoTen: hs.HoTen,
            VaiTro: "Học sinh",
            MaSo: hs.MaHocSinh,
            LopHienTai: hs.MaLop,
            NgaySinh: hs.NgaySinh,
            GioiTinh: hs.GioiTinh,
            Email: hs.Email,
            DiaChi: hs.DiaChi,
            LopChuNhiem: null,
          };
        }
      } else if (["GiaoVien", "BGH", "GiaoVu"].includes(role)) {
        const [gvRows] = await sequelize.query(
          `
          SELECT gv.MaGiaoVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh,
                gv.DiaChi, gv.Email,
                l.MaLop AS LopChuNhiem
          FROM GiaoVien gv
          LEFT JOIN LopHoc l ON l.MaGVChuNhiem = gv.MaGiaoVien
          WHERE gv.MaGiaoVien = ? OR gv.Email = ?
          LIMIT 1;
          `,
          { replacements: [username, username] }
        );

        if (gvRows[0]) {
          const gv = gvRows[0];
          profile = {
            type: "GiaoVien",
            HoTen: gv.HoTen,         
            VaiTro: role,
            MaSo: gv.MaGiaoVien,      
            LopHienTai: gv.LopChuNhiem || null,
            NgaySinh: gv.NgaySinh,
            GioiTinh: gv.GioiTinh,
            Email: gv.Email,
            DiaChi: gv.DiaChi,
            LopChuNhiem: gv.LopChuNhiem || null,
          };
        }
      }
      res.render("pages/tablecontrol", {
        title: "Bảng điều khiển",
        user: req.session.user,
        stats: {
          SoHocSinh,
          SoLop,
          SoGiaoVien,
          DiemDanhHomNay,
        },
        chartData: {
          attendance7Days: {
            labels: attLabels,
            percents: attPercents,
          },
          topClasses: {
            labels: topClassLabels,
            counts: topClassCounts,
          },
        },
        profile,
      });
    } catch (err) {
      console.error("Lỗi /tablecontrol:", err);
      res.status(500).send("Không tải được dữ liệu bảng điều khiển.");
    }
  }
);

router.get(
  "/student",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const [students] = await sequelize.query(`
        SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh,
               hs.DiaChi, hs.Email, hs.MaLop, l.KhoiLop
        FROM HoSoHocSinh hs
        LEFT JOIN LopHoc l ON hs.MaLop = l.MaLop
        ORDER BY hs.MaHocSinh ASC;
      `);

      const [classes] = await sequelize.query(
        "SELECT MaLop, KhoiLop FROM LopHoc ORDER BY KhoiLop, MaLop;"
      );

      const role = getRole(req);
      const canManageStudents = role === "Admin" || role === "GiaoVu";

      // New: allow filtering by school year and compute overview from scores
      const years = await lookupService.getAllSchoolYears();
      const selectedYear = req.query.year || (years && years.length ? years[0] : null);

      let studentsEnriched = students;
      if (selectedYear) {
        const overview = await scoreService.getStudentsOverview(selectedYear);
        const map = {};
        overview.forEach(o => { if (o.MaHocSinh) map[o.MaHocSinh] = o; });

        studentsEnriched = students.map(s => {
          const o = map[s.MaHocSinh] || {};
          return {
            ...s,
            TB_HK1: o.TB_HK1 !== undefined ? o.TB_HK1 : 0,
            TB_HK2: o.TB_HK2 !== undefined ? o.TB_HK2 : 0,
            TB_CN:  o.TB_CN  !== undefined ? o.TB_CN  : 0,
            HanhKiem: o.HanhKiem || 'Chưa xếp loại',
            XepLoai:  o.XepLoai  || 'Chưa xếp loại',
            TB_HK1_Style: o.TB_HK1_Style || 'none',
            TB_HK2_Style: o.TB_HK2_Style || 'none',
            TB_CN_Style:  o.TB_CN_Style  || 'none',
            HanhKiem_Style: o.HanhKiem_Style || 'none',
            XepLoai_Style:  o.XepLoai_Style  || 'none',
          };
        });
      }

      const error = req.query.error || null;
      const success = req.query.success || null;

      res.render("pages/student", {
        title: "Danh sách học sinh",
        user: req.session.user,
        students: studentsEnriched,
        classes,
        years,
        selectedYear,
        permissions: {
          canManageStudents,
        },
        error: error,
        success: success,
      });
    } catch (err) {
      console.error("Lỗi /student:", err);
      res.status(500).send("Không tải được danh sách học sinh.");
    }
  }
);

// Thêm học sinh - CẬP NHẬT SiSoLop
router.post(
  "/student",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const { HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop } = req.body;
      const birth = new Date(NgaySinh);
      const now   = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 15 || age > 20) {
        return res.redirect("/student?error=" + encodeURIComponent("Tuổi học sinh phải từ 15 đến 20."));
      }

      const [[{ SoHS }]] = await sequelize.query(
        "SELECT COUNT(*) AS SoHS FROM HoSoHocSinh WHERE MaLop = ?",
        { replacements: [MaLop] }
      );
      if (SoHS >= 40) {
        return res.redirect("/student?error=" + encodeURIComponent("Lớp này đã đủ sĩ số tối đa 40 học sinh. Vui lòng chọn lớp khác."));
      }

      // INSERT học sinh (MaHocSinh sẽ được tự động tạo bởi database)
      await sequelize.query(
        `
        INSERT INTO HoSoHocSinh
          (HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop)
        VALUES (?, ?, ?, ?, ?, ?);
        `,
        {
          replacements: [
            HoTen,
            GioiTinh,
            NgaySinh,
            DiaChi,
            Email,
            MaLop,
          ],
        }
      );

      // CẬP NHẬT SiSoLop
      await sequelize.query(
        `
        UPDATE LopHoc 
        SET SiSoLop = (SELECT COUNT(*) FROM HoSoHocSinh WHERE MaLop = ?)
        WHERE MaLop = ?;
        `,
        { replacements: [MaLop, MaLop] }
      );

      return res.redirect("/student?success=" + encodeURIComponent("Thêm học sinh thành công."));
    } catch (err) {
      console.error("Lỗi POST /student:", err);
      return res.redirect("/student?error=" + encodeURIComponent("Không thêm được học sinh mới: " + (err.message || "Lỗi không xác định")));
    }
  }
);

router.post(
  "/student/delete",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const { MaHocSinh } = req.body;
    
      const [[student]] = await sequelize.query(
        "SELECT MaLop FROM HoSoHocSinh WHERE MaHocSinh = ?;",
        { replacements: [MaHocSinh] }
      );
      
      const maLop = student?.MaLop;
      await sequelize.query(
        "DELETE FROM DiemDanh WHERE MaHocSinh = ?;",
        { replacements: [MaHocSinh] }
      );

      await sequelize.query(
        "DELETE FROM BangDiemMonHoc WHERE MaHocSinh = ?;",
        { replacements: [MaHocSinh] }
      );
      await sequelize.query(
        "DELETE FROM HoSoHocSinh WHERE MaHocSinh = ?;",
        { replacements: [MaHocSinh] }
      );
      if (maLop) {
        await sequelize.query(
          `
          UPDATE LopHoc 
          SET SiSoLop = (SELECT COUNT(*) FROM HoSoHocSinh WHERE MaLop = ?)
          WHERE MaLop = ?;
          `,
          { replacements: [maLop, maLop] }
        );
      }

      return res.redirect("/student");
    } catch (err) {
      console.error("Lỗi POST /student/delete:", err);
      return res.status(500).send("Không xoá được học sinh: " + err.message);
    }
  }
);
router.post(
  "/student/edit",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const { OldMaHocSinh, MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop } = req.body;
      const [[oldStudent]] = await sequelize.query(
        "SELECT MaLop FROM HoSoHocSinh WHERE MaHocSinh = ?;",
        { replacements: [OldMaHocSinh] }
      );
      const oldMaLop = oldStudent?.MaLop;

      const birth = new Date(NgaySinh);
      const now   = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 15 || age > 20) {
        return res.redirect("/student?error=" + encodeURIComponent("Tuổi học sinh phải từ 15 đến 20."));
      }
      if (OldMaHocSinh !== MaHocSinh) {
        const [[existing]] = await sequelize.query(
          "SELECT COUNT(*) AS cnt FROM HoSoHocSinh WHERE MaHocSinh = ?",
          { replacements: [MaHocSinh] }
        );
        
        if (existing.cnt > 0) {
          return res.redirect("/student?error=" + encodeURIComponent(`Mã học sinh "${MaHocSinh}" đã tồn tại. Vui lòng chọn mã khác.`));
        }
      }

      await sequelize.query('BEGIN TRANSACTION;');

      try {
        await sequelize.query(
          "UPDATE DiemDanh SET MaHocSinh = ? WHERE MaHocSinh = ?;",
          { replacements: [MaHocSinh, OldMaHocSinh] }
        );
        await sequelize.query(
          "UPDATE BangDiemMonHoc SET MaHocSinh = ? WHERE MaHocSinh = ?;",
          { replacements: [MaHocSinh, OldMaHocSinh] }
        );
        await sequelize.query(
          `
          UPDATE HoSoHocSinh
          SET MaHocSinh = ?,
              HoTen     = ?,
              GioiTinh  = ?,
              NgaySinh  = ?,
              DiaChi    = ?,
              Email     = ?,
              MaLop     = ?
          WHERE MaHocSinh = ?;
          `,
          {
            replacements: [MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop, OldMaHocSinh],
          }
        );
        if (oldMaLop) {
          await sequelize.query(
            `
            UPDATE LopHoc 
            SET SiSoLop = (SELECT COUNT(*) FROM HoSoHocSinh WHERE MaLop = ?)
            WHERE MaLop = ?;
            `,
            { replacements: [oldMaLop, oldMaLop] }
          );
        }
        if (MaLop !== oldMaLop) {
          await sequelize.query(
            `
            UPDATE LopHoc 
            SET SiSoLop = (SELECT COUNT(*) FROM HoSoHocSinh WHERE MaLop = ?)
            WHERE MaLop = ?;
            `,
            { replacements: [MaLop, MaLop] }
          );
        }

        await sequelize.query('COMMIT;');
        
        console.log('Sửa học sinh và cập nhật sĩ số thành công!');
        return res.redirect("/student?success=" + encodeURIComponent("Sửa thông tin học sinh thành công."));
        
      } catch (err) {
        await sequelize.query('ROLLBACK;');
        throw err;
      }

    } catch (err) {
      console.error("Lỗi POST /student/edit:", err);
      const errorMsg = err.message || "Không sửa được học sinh";
      // Bỏ phần (QĐ1), (QĐ2) nếu có
      const cleanErrorMsg = errorMsg.replace(/\s*\(QĐ\d+\)\.?/g, '');
      return res.redirect("/student?error=" + encodeURIComponent(cleanErrorMsg));
    }
  }
);

router.get(
  "/class",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const [classes] = await sequelize.query(`
        SELECT 
          l.MaLop,
          l.KhoiLop,
          l.MaGVChuNhiem AS MaGVCN,
          COUNT(hs.MaHocSinh) AS SiSoLop
        FROM LopHoc l
        LEFT JOIN HoSoHocSinh hs ON l.MaLop = hs.MaLop
        GROUP BY l.MaLop, l.KhoiLop, l.MaGVChuNhiem
        ORDER BY l.KhoiLop ASC, l.MaLop ASC;
      `);

      const [namHocs] = await sequelize.query(`
        SELECT MaNamHoc
        FROM NamHoc
        ORDER BY MaNamHoc DESC;
      `);

      const role = getRole(req);
      const canManageClasses = role === "Admin" || role === "GiaoVu";

      res.render("pages/class", {
        title: "Danh sách lớp",
        user: req.session.user,
        classes,
        namHocs,
        permissions: {
          canManageClasses,
        },
        selectedClass: null,   
        studentsInClass: [],
      });
    } catch (err) {
      console.error("Lỗi /class:", err);
      res.status(500).send("Không tải được danh sách lớp.");
    }
  }
);
router.get(
  "/class/view",
  requireLogin,
  allowRoles(staffRoles),
  pageController.viewClassStudents
);
const giaoVienController = require("../controllers/giaovien.controller");

router.get(
  "/teacher",
  requireLogin,
  allowRoles(allRoles),
  (req, res) => giaoVienController.showTeacherPage(req, res)
);

router.post(
  "/teacher",
  requireLogin,
  allowRoles(["Admin", "BGH"]),
  (req, res) => giaoVienController.createTeacher(req, res)
);

router.post(
  "/teacher/edit",
  requireLogin,
  allowRoles(["Admin", "BGH"]),
  (req, res) => giaoVienController.updateTeacher(req, res)
);

router.post(
  "/teacher/delete",
  requireLogin,
  allowRoles(["Admin", "BGH"]),
  (req, res) => giaoVienController.deleteTeacher(req, res)
);


router.get(
  "/timetable",
  requireLogin,
  allowRoles(allRoles),
  async (req, res) => {
    try {
      const [tkbRows] = await sequelize.query(`
        SELECT t.MaLop,
               t.Thu,
               t.TietHoc,
               t.MaMonHoc,
               m.TenMonHoc,
               t.MaGiaoVien,
               gv.HoTen AS TenGiaoVien
        FROM ThoiKhoaBieu t
        LEFT JOIN MonHoc   m  ON t.MaMonHoc   = m.MaMonHoc
        LEFT JOIN GiaoVien gv ON t.MaGiaoVien = gv.MaGiaoVien
        ORDER BY t.MaLop, t.Thu, t.TietHoc;
      `);

      const [classes] = await sequelize.query(`
        SELECT MaLop, KhoiLop
        FROM LopHoc
        ORDER BY KhoiLop, MaLop;
      `);

      const [namHocs] = await sequelize.query(`
        SELECT MaNamHoc
        FROM NamHoc
        ORDER BY MaNamHoc DESC;
      `);

      const role = getRole(req);
      const canEditTimetable =
        role === "Admin" || role === "BGH" || role === "GiaoVu";

      res.render("pages/timetable", {
        title: "Thời khóa biểu",
        user: req.session.user,
        timetables: tkbRows,
        classes,
        namHocs,
        permissions: {
          canEditTimetable,
        },
      });
    } catch (err) {
      console.error("Lỗi /timetable:", err);
      res.status(500).send("Không tải được thời khóa biểu.");
    }
  }
);


router.get(
  "/attendance",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const [students] = await sequelize.query(`
        SELECT MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, MaLop
        FROM HoSoHocSinh
        ORDER BY MaLop, HoTen;
      `);

      const [attendances] = await sequelize.query(`
        SELECT d.MaDiemDanh,
               d.NgayDiemDanh,
               d.TrangThai,
               d.MaHocSinh,
               hs.MaLop,
               hs.HoTen,
               hs.GioiTinh
        FROM DiemDanh d
        LEFT JOIN HoSoHocSinh hs ON d.MaHocSinh = hs.MaHocSinh
        ORDER BY d.NgayDiemDanh DESC, hs.MaLop, hs.HoTen;
      `);

      const role = getRole(req);
      const username = req.session.user.username;

      const canEditAttendance =
        role === "Admin" || role === "BGH" || role === "GiaoVu" || role === "GiaoVien";

      let teacherClasses = [];

      if (role === "GiaoVien") {
        const [gvRows] = await sequelize.query(
          `
          SELECT MaGiaoVien
          FROM GiaoVien
          WHERE MaGiaoVien = ? OR Email = ?
          LIMIT 1;
          `,
          { replacements: [username, username] }
        );

        const teacherId = (gvRows[0] && gvRows[0].MaGiaoVien) || username;

        const [rowsTeach] = await sequelize.query(
          `
          SELECT DISTINCT MaLop
          FROM ThoiKhoaBieu
          WHERE MaGiaoVien = ?;
          `,
          { replacements: [teacherId] }
        );

        const [rowsCN] = await sequelize.query(
          `
          SELECT MaLop
          FROM LopHoc
          WHERE MaGVChuNhiem = ?;
          `,
          { replacements: [teacherId] }
        );

        teacherClasses = [
          ...new Set([
            ...rowsTeach.map(r => r.MaLop),
            ...rowsCN.map(r => r.MaLop),
          ]),
        ];
      }

      res.render("pages/attendance", {
        title: "Điểm danh",
        user: req.session.user,
        students,
        attendances,
        role,               
        teacherClasses,    
        permissions: {
          canEditAttendance,
        },
      });
    } catch (err) {
      console.error("Lỗi /attendance:", err);
      res.status(500).send("Không tải được dữ liệu điểm danh.");
    }

  }
);
router.post(
  "/attendance/save",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const { data } = req.body; 

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Dữ liệu không hợp lệ" 
        });
      }

      let updated = 0;
      let inserted = 0;

      for (const item of data) {
        const { MaHocSinh, NgayDiemDanh, TrangThai } = item;

        if (!MaHocSinh || !NgayDiemDanh || !TrangThai) continue;

        const [[existing]] = await sequelize.query(
          `SELECT MaDiemDanh FROM DiemDanh WHERE MaHocSinh = ? AND date(NgayDiemDanh) = date(?)`,
          { replacements: [MaHocSinh, NgayDiemDanh] }
        );

        if (existing) {
          await sequelize.query(
            `UPDATE DiemDanh SET TrangThai = ? WHERE MaDiemDanh = ?`,
            { replacements: [TrangThai, existing.MaDiemDanh] }
          );
          updated++;
        } else {
          await sequelize.query(
            `INSERT INTO DiemDanh (MaHocSinh, NgayDiemDanh, TrangThai) VALUES (?, ?, ?)`,
            { replacements: [MaHocSinh, NgayDiemDanh, TrangThai] }
          );
          inserted++;
        }
      }

      return res.json({
        success: true,
        message: `Đã lưu điểm danh: ${inserted} mới, ${updated} cập nhật`,
        stats: { inserted, updated }
      });

    } catch (err) {
      console.error("Lỗi POST /attendance/save:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lưu điểm danh: " + err.message
      });
    }
  }
);


router.get(
  "/report",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      // Read filters from query params
      const selectedYear = req.query.year || null;
      const selectedSemester = req.query.semester || null; // '1','2' or 'full'
      const selectedSubject = req.query.subject || null;

      // Load available subjects and years
      const [subjects] = await sequelize.query(
        "SELECT MaMonHoc, TenMonHoc FROM MonHoc ORDER BY TenMonHoc;"
      );

      const [namHocs] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC;"
      );

      // Use service to compute subject report and aggregates
      const reportService = require('../services/report.service');
      const reportResult = await reportService.getSubjectReport(selectedYear, selectedSemester, selectedSubject);
      const reportMon = reportResult.rows || [];
      const reportMonTotals = reportResult.totals || { classes: 0, students: 0, passed: 0, passRate: 0 };

      const [reportHK] = await sequelize.query(`
        SELECT *
        FROM BaoCaoTongKetHK
        ORDER BY NamHoc DESC, HocKy, MaLop;
      `);

      const role = getRole(req);
      const canExportReport =
        role === "Admin" || role === "BGH" || role === "GiaoVu";

      res.render("pages/report", {
        title: "Báo cáo",
        user: req.session.user,
        reportMon,
        reportMonTotals,
        reportHK,
        namHocs,
        subjects,
        selectedYear,
        selectedSemester,
        selectedSubject,
        permissions: {
          canExportReport,
        },
      });
    } catch (err) {
      console.error("Lỗi /report:", err);
      res.status(500).send("Không tải được báo cáo.");
    }
  }
);

router.get(
  "/rules",
  requireLogin,
  allowRoles(allRoles),
  (req, res) => pageController.showRulesPage(req, res)
);

router.post(
  "/rules/update",
  requireLogin,
  allowRoles(["Admin", "BGH"]),
  (req, res) => pageController.updateRule(req, res)
);


router.get(
  "/find",
  requireLogin,
  allowRoles(staffRoles),
  (req, res) => pageController.showFindPage(req, res)
);

router.get("/create-user", requireLogin, requireAdmin, (req, res) => userController.showCreateUserForm(req, res));
router.post("/create-user", requireLogin, requireAdmin, (req, res) => userController.createUser(req, res));
router.post("/import-users-csv", requireLogin, requireAdmin, upload.single("csvFile"), (req, res) => userController.importUsersFromCSV(req, res));
router.get("/api/users", requireLogin, requireAdmin, (req, res) => userController.getAllUsers(req, res));

router.post(
  "/user/permission",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      const userService = require("../services/user.service");
      const { TenDangNhap, VaiTro } = req.body;
      await userService.updateUserRole(TenDangNhap, VaiTro);
      return res.redirect("/create-user");
    } catch (err) {
      console.error("Lỗi POST /user/permission:", err);
      return res.status(400).send(err.message || "Không cập nhật được phân quyền");
    }
  }
);

const namHocController = require("../controllers/namhoc.controller");

router.get(
  "/school-year",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => namHocController.showSchoolYearPage(req, res)
);

router.post(
  "/school-year",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => namHocController.createSchoolYear(req, res)
);

router.post(
  "/school-year/edit",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => namHocController.updateSchoolYear(req, res)
);

router.post(
  "/school-year/delete",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => namHocController.deleteSchoolYear(req, res)
);

const monHocController = require("../controllers/monhoc.controller");

router.get(
  "/subject",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => monHocController.showSubjectPage(req, res)
);

router.post(
  "/subject",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => monHocController.createSubject(req, res)
);

router.post(
  "/subject/edit",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => monHocController.updateSubject(req, res)
);

router.post(
  "/subject/delete",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => monHocController.deleteSubject(req, res)
);

module.exports = router;
