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
const classController = require("../controllers/class.controller");

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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
    "admin": "Admin",
    "administrator": "Admin",
    "quản trị hệ thống": "Admin",
    "quan tri he thong": "Admin",
    "bgh": "BGH",
    "ban giám hiệu": "BGH",
    "ban giam hieu": "BGH",
    "giaovien": "GiaoVien",
    "giáo viên": "GiaoVien",
    "giao vien": "GiaoVien",
    "teacher": "GiaoVien",
    "hocsinh": "HocSinh",
    "học sinh": "HocSinh",
    "hoc sinh": "HocSinh",
    "student": "HocSinh",
  };

  return mapping[r] || rawRole.toString().trim();
};

router.get("/scoretable", requireLogin, scoreController.showScoreTable);
router.post('/scoretable/import', requireLogin, upload.single('scoreFile'), scoreController.importScores);
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

      // Tính sĩ số từ HoSoHocSinh (sĩ số thực tế)
      const [topClassRows] = await sequelize.query(`
        SELECT l.MaLop, COUNT(hs.MaHocSinh) AS SiSo
        FROM LopHoc l
        LEFT JOIN HoSoHocSinh hs ON l.MaLop = hs.MaLop
        GROUP BY l.MaLop
        ORDER BY SiSo DESC, l.MaLop
        LIMIT 6;
      `);

      const topClassLabels = topClassRows.map(r => r.MaLop);
      const topClassCounts = topClassRows.map(r => r.SiSo || 0);

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
          SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh, hs.DiaChi, hs.Email,
                 hln.MaLop
          FROM HoSoHocSinh hs
          LEFT JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh
            AND hln.MaNamHoc = (SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1)
            AND hln.TrangThai = 'DangHoc'
          WHERE hs.MaHocSinh = ?;
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
                ln.MaLop AS LopChuNhiem
          FROM GiaoVien gv
          LEFT JOIN Lop_NamHoc ln ON ln.MaGVChuNhiem = gv.MaGiaoVien
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
      // Lấy năm học hiện tại hoặc năm được chọn
      let years = [];
      try {
        years = await lookupService.getAllSchoolYears() || [];
      } catch (err) {
        console.error("Lỗi khi lấy danh sách năm học:", err);
        years = [];
      }
      // getAllSchoolYears() trả về mảng các chuỗi MaNamHoc, không phải đối tượng
      const selectedYear = req.query.year || (years && years.length > 0 ? years[0] : null);

      let students;
      if (selectedYear) {
        [students] = await sequelize.query(`
          SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh,
                 hs.DiaChi, hs.Email, hln.MaLop, l.KhoiLop
          FROM HoSoHocSinh hs
          LEFT JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh 
            AND hln.MaNamHoc = ? AND hln.TrangThai = 'DangHoc'
          LEFT JOIN LopHoc l ON hln.MaLop = l.MaLop
          ORDER BY hs.MaHocSinh ASC;
        `, { replacements: [selectedYear] });
      } else {
        [students] = await sequelize.query(`
          SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh,
                 hs.DiaChi, hs.Email, NULL AS MaLop, NULL AS KhoiLop
          FROM HoSoHocSinh hs
          ORDER BY hs.MaHocSinh ASC;
        `);
      }

      const [classes] = await sequelize.query(
        "SELECT MaLop, KhoiLop FROM LopHoc ORDER BY KhoiLop, MaLop;"
      );

      const role = getRole(req);
      const canManageStudents = role === "Admin" || role === "GiaoVu";

      // selectedYear đã được lấy ở trên

      let studentsEnriched = students;
      if (selectedYear) {
        const overview = await scoreService.getStudentsOverview(selectedYear);
        const map = {};
        overview.forEach(o => { if (o.MaHocSinh) map[o.MaHocSinh] = o; });

        studentsEnriched = students.map(s => {
          const studentId = String(s.MaHocSinh);
          const o = map[studentId] || {};
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

      // Lấy năm học hiện tại
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc;
      
      if (!currentYear) {
        return res.redirect("/student?error=" + encodeURIComponent("Chưa có năm học nào được khai báo. Vui lòng tạo năm học trước."));
      }

      // Kiểm tra sĩ số tối đa từ quy định
      const quyDinhService = require("../services/quydinh.service");
      const siSoToiDa = await quyDinhService.getGiaTriQuyDinh("SI_SO_TOI_DA", 40);
      
      const [[{ SoHS }]] = await sequelize.query(
        "SELECT COUNT(*) AS SoHS FROM HocSinh_LopNamHoc WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
        { replacements: [MaLop, currentYear] }
      );
      if (SoHS >= siSoToiDa) {
        return res.redirect("/student?error=" + encodeURIComponent(`Lớp này đã đủ sĩ số tối đa ${siSoToiDa} học sinh. Vui lòng chọn lớp khác.`));
      }

      // Tạo mã học sinh tự động
      const [lastStudent] = await sequelize.query(`
        SELECT MaHocSinh FROM HoSoHocSinh 
        ORDER BY CAST(SUBSTR(MaHocSinh, 3) AS INTEGER) DESC 
        LIMIT 1
      `);
      let newMaHocSinh = "HS70001";
      if (lastStudent[0]) {
        const lastNum = parseInt(lastStudent[0].MaHocSinh.replace("HS", "")) || 0;
        newMaHocSinh = "HS" + String(lastNum + 1).padStart(5, "0");
      }

      await sequelize.query('BEGIN TRANSACTION');
      try {
        // Thêm học sinh vào HoSoHocSinh (không có MaLop)
        await sequelize.query(
          `
          INSERT INTO HoSoHocSinh (MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email)
          VALUES (?, ?, ?, ?, ?, ?);
          `,
          {
            replacements: [
              newMaHocSinh,
              HoTen,
              GioiTinh,
              NgaySinh,
              DiaChi,
              Email,
            ],
          }
        );

        // Thêm vào HocSinh_LopNamHoc
        await sequelize.query(
          `
          INSERT INTO HocSinh_LopNamHoc (MaHocSinh, MaLop, MaNamHoc, TrangThai)
          VALUES (?, ?, ?, 'DangHoc');
          `,
          {
            replacements: [newMaHocSinh, MaLop, currentYear],
          }
        );

        await sequelize.query('COMMIT');
        return res.redirect("/student?success=" + encodeURIComponent("Thêm học sinh thành công."));
      } catch (err) {
        await sequelize.query('ROLLBACK');
        throw err;
      }
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
    
      await sequelize.query('BEGIN TRANSACTION');
      try {
        // Xóa từ các bảng liên quan
        await sequelize.query(
          "DELETE FROM DiemDanh WHERE MaHocSinh = ?;",
          { replacements: [MaHocSinh] }
        );

        await sequelize.query(
          "DELETE FROM BangDiemMonHoc WHERE MaHocSinh = ?;",
          { replacements: [MaHocSinh] }
        );

        // Xóa từ HocSinh_LopNamHoc (cascade sẽ xử lý)
        await sequelize.query(
          "DELETE FROM HocSinh_LopNamHoc WHERE MaHocSinh = ?;",
          { replacements: [MaHocSinh] }
        );

        // Xóa học sinh
        await sequelize.query(
          "DELETE FROM HoSoHocSinh WHERE MaHocSinh = ?;",
          { replacements: [MaHocSinh] }
        );

        await sequelize.query('COMMIT');
      } catch (err) {
        await sequelize.query('ROLLBACK');
        throw err;
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
      
      // Lấy năm học hiện tại
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc;
      
      if (!currentYear) {
        return res.redirect("/student?error=" + encodeURIComponent("Chưa có năm học nào được khai báo."));
      }

      // Lấy lớp hiện tại của học sinh
      const [[oldStudent]] = await sequelize.query(
        "SELECT MaLop FROM HocSinh_LopNamHoc WHERE MaHocSinh = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc';",
        { replacements: [OldMaHocSinh, currentYear] }
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
      
      // Kiểm tra sĩ số tối đa khi chuyển lớp
      if (MaLop !== oldMaLop) {
        const quyDinhService = require("../services/quydinh.service");
        const siSoToiDa = await quyDinhService.getGiaTriQuyDinh("SI_SO_TOI_DA", 40);
        const [[{ SoHS }]] = await sequelize.query(
          "SELECT COUNT(*) AS SoHS FROM HocSinh_LopNamHoc WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
          { replacements: [MaLop, currentYear] }
        );
        if (SoHS >= siSoToiDa) {
          return res.redirect("/student?error=" + encodeURIComponent(`Lớp "${MaLop}" đã đủ sĩ số tối đa ${siSoToiDa} học sinh. Vui lòng chọn lớp khác.`));
        }
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
        // Cập nhật MaHocSinh trong các bảng liên quan nếu thay đổi
        if (OldMaHocSinh !== MaHocSinh) {
          await sequelize.query(
            "UPDATE DiemDanh SET MaHocSinh = ? WHERE MaHocSinh = ?;",
            { replacements: [MaHocSinh, OldMaHocSinh] }
          );
          await sequelize.query(
            "UPDATE BangDiemMonHoc SET MaHocSinh = ? WHERE MaHocSinh = ?;",
            { replacements: [MaHocSinh, OldMaHocSinh] }
          );
          await sequelize.query(
            "UPDATE HocSinh_LopNamHoc SET MaHocSinh = ? WHERE MaHocSinh = ?;",
            { replacements: [MaHocSinh, OldMaHocSinh] }
          );
        }

        // Cập nhật thông tin học sinh (không có MaLop)
        await sequelize.query(
          `
          UPDATE HoSoHocSinh
          SET MaHocSinh = ?,
              HoTen     = ?,
              GioiTinh  = ?,
              NgaySinh  = ?,
              DiaChi    = ?,
              Email     = ?
          WHERE MaHocSinh = ?;
          `,
          {
            replacements: [MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, OldMaHocSinh],
          }
        );

        // Cập nhật lớp trong HocSinh_LopNamHoc
        if (MaLop !== oldMaLop) {
          // Cập nhật lớp hiện tại (năm học hiện tại)
          const [existing] = await sequelize.query(
            "SELECT COUNT(*) AS cnt FROM HocSinh_LopNamHoc WHERE MaHocSinh = ? AND MaNamHoc = ?",
            { replacements: [MaHocSinh, currentYear] }
          );
          
          if (existing[0].cnt > 0) {
            // Cập nhật lớp
            await sequelize.query(
              "UPDATE HocSinh_LopNamHoc SET MaLop = ? WHERE MaHocSinh = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
              { replacements: [MaLop, MaHocSinh, currentYear] }
            );
          } else {
            // Tạo mới nếu chưa có
            await sequelize.query(
              "INSERT INTO HocSinh_LopNamHoc (MaHocSinh, MaLop, MaNamHoc, TrangThai) VALUES (?, ?, ?, 'DangHoc')",
              { replacements: [MaHocSinh, MaLop, currentYear] }
            );
          }
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
      // Lấy lớp với sĩ số thực tế và GVCN từ Lop_NamHoc (năm học hiện tại hoặc mới nhất)
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc || null;
      
      // Đảm bảo lớp CHUA_CO_LOP tồn tại
      const classService = require("../services/class.service");
      await classService.ensureChuaCoLopExists();

      let classes;
      if (currentYear) {
        // Tính sĩ số động từ HocSinh_LopNamHoc (loại trừ CHUA_CO_LOP khỏi danh sách lớp thông thường)
        const [classesWithYear] = await sequelize.query(`
          SELECT 
            l.MaLop,
            l.KhoiLop,
            COALESCE(COUNT(hln.MaHocSinh), 0) AS SiSoLop,
            gv.HoTen AS TenGVChuNhiem
          FROM LopHoc l
          LEFT JOIN HocSinh_LopNamHoc hln ON l.MaLop = hln.MaLop 
            AND hln.MaNamHoc = ?
            AND hln.TrangThai = 'DangHoc'
          LEFT JOIN Lop_NamHoc ln ON l.MaLop = ln.MaLop AND ln.MaNamHoc = ?
          LEFT JOIN GiaoVien gv ON ln.MaGVChuNhiem = gv.MaGiaoVien
          WHERE l.MaLop != 'CHUA_CO_LOP'
          GROUP BY l.MaLop, l.KhoiLop, gv.HoTen
          ORDER BY l.KhoiLop ASC, l.MaLop ASC;
        `, { replacements: [currentYear, currentYear] });
        
        classes = classesWithYear;
      } else {
        // Fallback: tính sĩ số từ HocSinh_LopNamHoc
        const [classesFallback] = await sequelize.query(`
          SELECT 
            l.MaLop,
            l.KhoiLop,
            COALESCE(COUNT(hln.MaHocSinh), 0) AS SiSoLop,
            NULL AS TenGVChuNhiem
          FROM LopHoc l
          LEFT JOIN HocSinh_LopNamHoc hln ON l.MaLop = hln.MaLop 
            AND hln.MaNamHoc = (SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1)
            AND hln.TrangThai = 'DangHoc'
          WHERE l.MaLop != 'CHUA_CO_LOP'
          GROUP BY l.MaLop, l.KhoiLop
          ORDER BY l.KhoiLop ASC, l.MaLop ASC;
        `);
        classes = classesFallback;
      }
      

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
        success: req.query.success,
        error: req.query.error,
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

router.post(
  "/class",
  requireLogin,
  allowRoles(["Admin", "GiaoVu"]),
  async (req, res) => {
    try {
      await classController.createClass(req, res);
    } catch (err) {
      console.error("Lỗi route POST /class:", err);
      return res.status(500).send("Lỗi server: " + err.message);
    }
  }
);

router.post(
  "/class/edit",
  requireLogin,
  allowRoles(["Admin", "GiaoVu"]),
  (req, res) => classController.updateClass(req, res)
);

router.post(
  "/class/delete",
  requireLogin,
  allowRoles(["Admin", "GiaoVu"]),
  (req, res) => classController.deleteClass(req, res)
);

router.post(
  "/class/transfer-student",
  requireLogin,
  allowRoles(["Admin", "GiaoVu"]),
  async (req, res) => {
    try {
      const { MaHocSinh, OldMaLop, NewMaLop } = req.body;

      if (!MaHocSinh || !OldMaLop || !NewMaLop) {
        return res.redirect("/class/view?lop=" + encodeURIComponent(OldMaLop || '') + "&error=" + encodeURIComponent("Vui lòng nhập đầy đủ thông tin."));
      }

      if (OldMaLop === NewMaLop) {
        return res.redirect("/class/view?lop=" + encodeURIComponent(OldMaLop) + "&error=" + encodeURIComponent("Học sinh đã ở lớp này rồi."));
      }

      // Lấy năm học hiện tại
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      if (!currentYear) {
        return res.redirect("/class/view?lop=" + encodeURIComponent(OldMaLop) + "&error=" + encodeURIComponent("Không tìm thấy năm học hiện tại."));
      }

      // Kiểm tra học sinh có tồn tại không
      const [studentCheck] = await sequelize.query(
        "SELECT COUNT(*) AS cnt FROM HoSoHocSinh WHERE MaHocSinh = ?",
        { replacements: [MaHocSinh] }
      );
      if (studentCheck[0].cnt === 0) {
        return res.redirect("/class/view?lop=" + encodeURIComponent(OldMaLop) + "&error=" + encodeURIComponent("Không tìm thấy học sinh."));
      }

      // Kiểm tra lớp mới có tồn tại không
      const [classCheck] = await sequelize.query(
        "SELECT COUNT(*) AS cnt FROM LopHoc WHERE MaLop = ?",
        { replacements: [NewMaLop] }
      );
      if (classCheck[0].cnt === 0) {
        return res.redirect("/class/view?lop=" + encodeURIComponent(OldMaLop) + "&error=" + encodeURIComponent("Không tìm thấy lớp học."));
      }

      // Kiểm tra học sinh có trong lớp cũ không
      const [oldClassCheck] = await sequelize.query(
        "SELECT COUNT(*) AS cnt FROM HocSinh_LopNamHoc WHERE MaHocSinh = ? AND MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
        { replacements: [MaHocSinh, OldMaLop, currentYear] }
      );
      if (oldClassCheck[0].cnt === 0) {
        return res.redirect("/class/view?lop=" + encodeURIComponent(OldMaLop) + "&error=" + encodeURIComponent("Học sinh không có trong lớp này."));
      }

      // Kiểm tra học sinh đã có trong lớp mới chưa
      const [newClassCheck] = await sequelize.query(
        "SELECT COUNT(*) AS cnt FROM HocSinh_LopNamHoc WHERE MaHocSinh = ? AND MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
        { replacements: [MaHocSinh, NewMaLop, currentYear] }
      );
      if (newClassCheck[0].cnt > 0) {
        return res.redirect("/class/view?lop=" + encodeURIComponent(OldMaLop) + "&error=" + encodeURIComponent("Học sinh đã có trong lớp mới rồi."));
      }

      // Bắt đầu transaction
      await sequelize.query('BEGIN TRANSACTION;');

      try {
        // Cập nhật lớp cũ: set TrangThai = 'ChuyenLop'
        await sequelize.query(
          "UPDATE HocSinh_LopNamHoc SET TrangThai = 'ChuyenLop', NgayChuyenLop = date('now') WHERE MaHocSinh = ? AND MaLop = ? AND MaNamHoc = ?",
          { replacements: [MaHocSinh, OldMaLop, currentYear] }
        );

        // Tạo record mới cho lớp mới
        await sequelize.query(
          "INSERT INTO HocSinh_LopNamHoc (MaHocSinh, MaLop, MaNamHoc, TrangThai, NgayGhiDanh) VALUES (?, ?, ?, 'DangHoc', date('now'))",
          { replacements: [MaHocSinh, NewMaLop, currentYear] }
        );

        await sequelize.query('COMMIT;');
        
        return res.redirect("/class/view?lop=" + encodeURIComponent(NewMaLop) + "&success=" + encodeURIComponent("Chuyển lớp học sinh thành công."));
      } catch (err) {
        await sequelize.query('ROLLBACK;');
        throw err;
      }
    } catch (err) {
      console.error("Lỗi POST /class/transfer-student:", err);
      const errorMsg = err.message || "Không thể chuyển lớp học sinh";
      const oldMaLop = req.body.OldMaLop || '';
      return res.redirect("/class/view?lop=" + encodeURIComponent(oldMaLop) + "&error=" + encodeURIComponent(errorMsg));
    }
  }
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


const thoikhoabieuController = require("../controllers/thoikhoabieu.controller");

router.get(
  "/timetable",
  requireLogin,
  allowRoles(allRoles),
  async (req, res) => {
    try {
      const role = getRole(req);
      const isStudent = role === "HocSinh";
      
      // Nếu là học sinh, lấy các lớp mà học sinh đã học từ HocSinh_LopNamHoc
      let studentClasses = []; // Danh sách các lớp học sinh đã học (theo năm học)
      let studentClass = null; // Lớp hiện tại (năm học mới nhất)
      if (isStudent) {
        const username = req.session.user.username;
        // Lấy tất cả các lớp mà học sinh đã học
        const [hsRows] = await sequelize.query(
          `SELECT hln.MaLop, hln.MaNamHoc, hln.TrangThai
           FROM HocSinh_LopNamHoc hln
           WHERE hln.MaHocSinh = ?
           ORDER BY hln.MaNamHoc DESC, hln.MaLop`,
          { replacements: [username] }
        );
        studentClasses = hsRows;
        // Lớp hiện tại là lớp của năm học mới nhất
        if (hsRows.length > 0) {
          studentClass = hsRows[0].MaLop;
        }
      }
      
      const selectedYear = req.query.year || null;
      const selectedSemester = req.query.semester || null;
      
      // Học sinh chỉ xem được lớp của mình, không thể chọn lớp khác
      // Nếu có chọn năm học, lấy lớp tương ứng với năm học đó (chỉ nếu có TKB)
      let selectedClass = null;
      if (isStudent) {
        if (selectedYear) {
          // Tìm lớp của học sinh trong năm học được chọn
          const classInYear = studentClasses.find(c => c.MaNamHoc === selectedYear);
          if (classInYear) {
            // Kiểm tra xem lớp này có thời khóa biểu trong năm học này không
            const [hasTKB] = await sequelize.query(`
              SELECT COUNT(*) AS cnt
              FROM ThoiKhoaBieu
              WHERE MaLop = ? AND NamHoc = ?
              LIMIT 1
            `, { replacements: [classInYear.MaLop, selectedYear] });
            
            if (hasTKB[0] && hasTKB[0].cnt > 0) {
              selectedClass = classInYear.MaLop;
            }
          }
          // Nếu không tìm thấy hoặc không có TKB, thử lớp hiện tại (nếu có TKB)
          if (!selectedClass && studentClass) {
            const [hasTKB] = await sequelize.query(`
              SELECT COUNT(*) AS cnt
              FROM ThoiKhoaBieu
              WHERE MaLop = ? AND NamHoc = ?
              LIMIT 1
            `, { replacements: [studentClass, selectedYear] });
            
            if (hasTKB[0] && hasTKB[0].cnt > 0) {
              selectedClass = studentClass;
            }
          }
        } else {
          // Mặc định: tìm năm học mới nhất có TKB cho lớp hiện tại
          if (studentClass) {
            // Lấy năm học mới nhất có TKB cho lớp này
            const [yearWithTKB] = await sequelize.query(`
              SELECT NamHoc
              FROM ThoiKhoaBieu
              WHERE MaLop = ?
              ORDER BY NamHoc DESC
              LIMIT 1
            `, { replacements: [studentClass] });
            
            if (yearWithTKB.length > 0) {
              selectedClass = studentClass;
            }
          }
        }
      } else {
        selectedClass = req.query.class || null;
      }

      // Lọc thời khóa biểu theo năm học, học kỳ và lớp nếu có
      let tkbWhere = [];
      let tkbReplacements = [];
      
      if (selectedYear) {
        tkbWhere.push('t.NamHoc = ?');
        tkbReplacements.push(selectedYear);
      }
      if (selectedClass) {
        tkbWhere.push('t.MaLop = ?');
        tkbReplacements.push(selectedClass);
      }
      if (selectedSemester) {
        tkbWhere.push('t.HocKy = ?');
        tkbReplacements.push(parseInt(selectedSemester, 10));
      } else {
        // Nếu không chọn học kỳ, mặc định là học kỳ 1
        tkbWhere.push('t.HocKy = ?');
        tkbReplacements.push(1);
      }
      
      const tkbWhereSQL = tkbWhere.length ? 'WHERE ' + tkbWhere.join(' AND ') : '';
      
      const [tkbRows] = await sequelize.query(`
        SELECT t.MaLop,
               t.NamHoc,
               t.HocKy,
               t.Thu,
               t.TietHoc,
               t.MaMonHoc,
               m.TenMonHoc,
               t.MaGiaoVien,
               gv.HoTen AS TenGiaoVien
        FROM ThoiKhoaBieu t
        LEFT JOIN MonHoc   m  ON t.MaMonHoc   = m.MaMonHoc
        LEFT JOIN GiaoVien gv ON t.MaGiaoVien = gv.MaGiaoVien
        ${tkbWhereSQL}
        ORDER BY t.MaLop, t.Thu, t.TietHoc;
      `, { replacements: tkbReplacements });

      // Lấy các lớp có thời khóa biểu
      // Nếu là học sinh, chỉ lấy các lớp mà học sinh đã học
      let classes = [];
      if (isStudent && studentClasses.length > 0) {
        // Học sinh chỉ thấy các lớp mà họ đã học (theo năm học)
        const classIds = [...new Set(studentClasses.map(c => c.MaLop))]; // Lấy danh sách lớp duy nhất
        if (classIds.length > 0) {
          const placeholders = classIds.map(() => '?').join(',');
          const [studentClassesInfo] = await sequelize.query(`
            SELECT DISTINCT l.MaLop, l.KhoiLop
            FROM LopHoc l
            WHERE l.MaLop IN (${placeholders})
            ORDER BY l.KhoiLop, l.MaLop
          `, { replacements: classIds });
          classes = studentClassesInfo || [];
        }
      } else {
        // Admin/GV có thể xem tất cả lớp
        let classWhere = [];
        let classReplacements = [];
        
        if (selectedYear) {
          classWhere.push('t.NamHoc = ?');
          classReplacements.push(selectedYear);
        }
        
        const classWhereSQL = classWhere.length ? 'WHERE ' + classWhere.join(' AND ') : '';
        
        const [classesWithTKB] = await sequelize.query(`
          SELECT DISTINCT t.MaLop, l.KhoiLop
          FROM ThoiKhoaBieu t
          INNER JOIN LopHoc l ON t.MaLop = l.MaLop
          ${classWhereSQL}
          ORDER BY l.KhoiLop, t.MaLop;
        `, { replacements: classReplacements });
        
        // Nếu không có lớp nào có thời khóa biểu, lấy tất cả lớp để người dùng có thể chọn
        classes = classesWithTKB;
        if (!classes || classes.length === 0) {
          const [allClasses] = await sequelize.query(`
            SELECT MaLop, KhoiLop
            FROM LopHoc
            ORDER BY KhoiLop, MaLop;
          `);
          classes = allClasses;
        }
      }

      // Lấy tất cả năm học (không lọc)
      const [namHocs] = await sequelize.query(`
        SELECT MaNamHoc
        FROM NamHoc
        ORDER BY MaNamHoc DESC;
      `);

      const [subjects] = await sequelize.query(`
        SELECT MaMonHoc, TenMonHoc
        FROM MonHoc
        ORDER BY TenMonHoc ASC;
      `);

      const [teachers] = await sequelize.query(`
        SELECT MaGiaoVien, HoTen
        FROM GiaoVien
        ORDER BY HoTen ASC;
      `);

      const canEditTimetable =
        role === "Admin" || role === "BGH" || role === "GiaoVu";

      const error = req.query.error || null;
      const success = req.query.success || null;

      // Nếu là học sinh, chỉ lấy các năm học mà học sinh đã học VÀ có dữ liệu thời khóa biểu
      let availableYears = namHocs;
      if (isStudent && studentClasses.length > 0) {
        const studentYearIds = [...new Set(studentClasses.map(c => c.MaNamHoc))];
        const studentClassIds = [...new Set(studentClasses.map(c => c.MaLop))];
        
        // Lấy các năm học có thời khóa biểu cho các lớp mà học sinh đã học
        if (studentClassIds.length > 0) {
          const classPlaceholders = studentClassIds.map(() => '?').join(',');
          const yearPlaceholders = studentYearIds.map(() => '?').join(',');
          
          const [yearsWithTKB] = await sequelize.query(`
            SELECT DISTINCT t.NamHoc
            FROM ThoiKhoaBieu t
            WHERE t.MaLop IN (${classPlaceholders})
              AND t.NamHoc IN (${yearPlaceholders})
            ORDER BY t.NamHoc DESC
          `, { replacements: [...studentClassIds, ...studentYearIds] });
          
          const yearsWithTKBIds = yearsWithTKB.map(y => y.NamHoc);
          availableYears = namHocs.filter(y => yearsWithTKBIds.includes(y.MaNamHoc));
        } else {
          availableYears = [];
        }
      }

      res.render("pages/timetable", {
        title: "Thời khóa biểu",
        user: req.session.user,
        timetables: tkbRows,
        classes,
        namHocs: availableYears, // Chỉ hiển thị các năm học mà học sinh đã học
        subjects,
        teachers,
        selectedYear,
        selectedSemester,
        selectedClass,
        error,
        success,
        permissions: {
          canEditTimetable,
          isStudent, // Thêm flag để view biết là học sinh
        },
      });
    } catch (err) {
      console.error("Lỗi /timetable:", err);
      res.status(500).send("Không tải được thời khóa biểu.");
    }
  }
);

router.post(
  "/timetable/save",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => thoikhoabieuController.saveTimetable(req, res)
);

router.post(
  "/timetable/delete",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => thoikhoabieuController.deleteTimetable(req, res)
);

router.post(
  "/timetable/reset",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  (req, res) => thoikhoabieuController.resetTimetable(req, res)
);


router.get(
  "/attendance",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      // Lấy năm học hiện tại
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      const [students] = await sequelize.query(`
        SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh, hs.DiaChi, hln.MaLop
        FROM HoSoHocSinh hs
        LEFT JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh
          ${currentYear ? `AND hln.MaNamHoc = '${currentYear}' AND hln.TrangThai = 'DangHoc'` : ''}
        ORDER BY hln.MaLop, hs.HoTen;
      `);

      const [attendances] = await sequelize.query(`
        SELECT d.MaDiemDanh,
               d.NgayDiemDanh,
               d.TrangThai,
               d.MaHocSinh,
               hln.MaLop,
               hs.HoTen,
               hs.GioiTinh
        FROM DiemDanh d
        LEFT JOIN HoSoHocSinh hs ON d.MaHocSinh = hs.MaHocSinh
        LEFT JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh
          ${currentYear ? `AND hln.MaNamHoc = '${currentYear}' AND hln.TrangThai = 'DangHoc'` : ''}
        ORDER BY d.NgayDiemDanh DESC, hln.MaLop, hs.HoTen;
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

        teacherClasses = [
          ...new Set([
            ...rowsTeach.map(r => r.MaLop),
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
      const selectedSemester = req.query.semester || null;
      const selectedSubject = req.query.subject || null;

      const [subjects] = await sequelize.query(
        "SELECT MaMonHoc, TenMonHoc FROM MonHoc ORDER BY TenMonHoc;"
      );

      const [namHocs] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC;"
      );

      const reportService = require('../services/report.service');
      const reportResult = await reportService.getSubjectReport(selectedYear, selectedSemester, selectedSubject);
      const reportMon = reportResult.rows || [];
      const reportMonTotals = reportResult.totals || { classes: 0, students: 0, passed: 0, passRate: 0 };

      const hkWhere = [];
      const hkReplacements = [];
      if (selectedYear) {
        hkWhere.push('NamHoc = ?');
        hkReplacements.push(selectedYear);
      }
      if (selectedSemester && selectedSemester !== 'full') {
        hkWhere.push('HocKy = ?');
        hkReplacements.push(parseInt(selectedSemester, 10));
      }
      const hkWhereSQL = hkWhere.length ? ('WHERE ' + hkWhere.join(' AND ')) : '';
      
      const [reportHK] = await sequelize.query(`
        SELECT *
        FROM BaoCaoTongKetHK
        ${hkWhereSQL}
        ORDER BY NamHoc DESC, HocKy, MaLop;
      `, { replacements: hkReplacements });

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

router.post(
  "/report/recalculate",
  requireLogin,
  allowRoles(["Admin", "BGH", "GiaoVu"]),
  async (req, res) => {
    try {
      const { year, semester } = req.body;
      const reportService = require('../services/report.service');
      
      const yearParam = year && year !== '' ? year : null;
      const semesterParam = semester && semester !== '' ? parseInt(semester, 10) : null;

      const result = await reportService.recalculateAllReports(yearParam, semesterParam);

      req.flash('success', 
        `Tính toán lại báo cáo thành công! ` +
        `Báo cáo môn học: ${result.subjectReport.created} mới, ${result.subjectReport.updated} cập nhật. ` +
        `Báo cáo học kì: ${result.semesterReport.created} mới, ${result.semesterReport.updated} cập nhật.`
      );
      
      const params = new URLSearchParams();
      if (yearParam) params.set('year', yearParam);
      if (semesterParam) params.set('semester', semesterParam);
      
      res.redirect('/report?' + params.toString());
    } catch (err) {
      console.error("Lỗi khi tính toán lại báo cáo:", err);
      req.flash('error', 'Lỗi khi tính toán lại báo cáo: ' + err.message);
      res.redirect('/report');
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

router.post(
  "/user/delete",
  requireLogin,
  requireAdmin,
  (req, res) => userController.deleteUser(req, res)
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
