const express = require("express");
const router = express.Router();
const { sequelize } = require("../models");

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

    // Giáo vụ
    "giaovu": "GiaoVu",
    "giáo vụ": "GiaoVu",
    "giao vu": "GiaoVu",

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


const staffRoles = ["Admin", "BGH", "GiaoVu", "GiaoVien"]; 
const allRoles   = ["Admin", "BGH", "GiaoVu", "GiaoVien", "HocSinh"];

const getRole = (req) => (req.session?.user?.role || "").trim();

router.get(
  "/tablecontrol",
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

      res.render("pages/student", {
        title: "Danh sách học sinh",
        user: req.session.user,
        students,
        classes,
        permissions: {
          canManageStudents,
        },
      });
    } catch (err) {
      console.error("Lỗi /student:", err);
      res.status(500).send("Không tải được danh sách học sinh.");
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
          MaLop,
          KhoiLop,
          SiSoLop,
          MaGVChuNhiem AS MaGVCN
        FROM LopHoc
        ORDER BY KhoiLop ASC, MaLop ASC;
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
      });
    } catch (err) {
      console.error("Lỗi /class:", err);
      res.status(500).send("Không tải được danh sách lớp.");
    }
  }
);

router.get(
  "/teacher",
  requireLogin,
   allowRoles(allRoles),
  async (req, res) => {
    try {
      const [teachers] = await sequelize.query(`
        SELECT gv.MaGiaoVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh,
               gv.DiaChi, gv.Email, gv.MaMonGiangDay,
               mh.TenMonHoc
        FROM GiaoVien gv
        LEFT JOIN MonHoc mh ON gv.MaMonGiangDay = mh.MaMonHoc
        ORDER BY gv.MaGiaoVien ASC;
      `);

      const [subjects] = await sequelize.query(`
        SELECT MaMonHoc, TenMonHoc
        FROM MonHoc
        ORDER BY TenMonHoc ASC;
      `);

      const role = getRole(req);
      const canManageTeachers = role === "Admin" || role === "BGH";

      res.render("pages/teacher", {
        title: "Danh sách giáo viên",
        user: req.session.user,
        teachers,
        subjects,
        permissions: {
          canManageTeachers,
        },
      });
    } catch (err) {
      console.error("Lỗi /teacher:", err);
      res.status(500).send("Không tải được danh sách giáo viên.");
    }
  }
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

router.get(
  "/scoretable",
  requireLogin,
  allowRoles(allRoles),  
  async (req, res) => {
    try {
      const role = getRole(req);
      const username = req.session.user.username;

      const canEditScore = role === "GiaoVu" || role === "GiaoVien";
      const canEditAll   = role === "GiaoVu"; 

      let teacherSubject = null;
      let teacherClasses = [];

      if (role === "GiaoVien") {
        const [gvRows] = await sequelize.query(
          `
          SELECT MaGiaoVien, MaMonGiangDay
          FROM GiaoVien
          WHERE MaGiaoVien = ? OR Email = ?
          LIMIT 1;
          `,
          { replacements: [username, username] }
        );

        const gvInfo = gvRows[0] || {};
        const teacherId = gvInfo.MaGiaoVien || username;  
        teacherSubject = gvInfo.MaMonGiangDay || null;

        const [classRows] = await sequelize.query(
          `
          SELECT DISTINCT MaLop
          FROM ThoiKhoaBieu
          WHERE MaGiaoVien = ?;
          `,
          { replacements: [teacherId] }
        );
        teacherClasses = classRows.map(r => r.MaLop);
      }

      const [namHocs] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC;"
      );

      const [subjects] = await sequelize.query(
        "SELECT MaMonHoc, TenMonHoc FROM MonHoc ORDER BY TenMonHoc ASC;"
      );

      let scoresRaw = [];

      if (role === "HocSinh") {
        const [rows] = await sequelize.query(
          `
          SELECT
            b.MaDiem,
            hs.MaHocSinh,
            hs.HoTen,
            hs.MaLop,
            tkb.MaMonHoc,
            m.TenMonHoc,
            b.HocKy,
            b.NamHoc,
            b.Diem15Phut AS Diem15Phut,
            b.Diem1Tiet,
            b.DiemTBMon  AS DiemTBMon,
            b.DanhGia
          FROM ThoiKhoaBieu tkb
          JOIN HoSoHocSinh hs ON hs.MaLop = tkb.MaLop
          JOIN MonHoc m       ON m.MaMonHoc = tkb.MaMonHoc
          LEFT JOIN BangDiemMonHoc b
                ON b.MaHocSinh = hs.MaHocSinh
                AND b.MaMonHoc  = tkb.MaMonHoc
          WHERE hs.MaHocSinh = ?
          GROUP BY hs.MaHocSinh, hs.HoTen, hs.MaLop, tkb.MaMonHoc, m.TenMonHoc,
                  b.MaDiem, b.HocKy, b.NamHoc, b.Diem15Phut, b.Diem1Tiet, b.DiemTBMon, b.DanhGia
          ORDER BY hs.MaLop, hs.HoTen, tkb.MaMonHoc;
          `,
          { replacements: [username] }
        );
        scoresRaw = rows;
      } else {
        const [rows] = await sequelize.query(`
          SELECT
            b.MaDiem,
            hs.MaHocSinh,
            hs.HoTen,
            hs.MaLop,
            tkb.MaMonHoc,
            m.TenMonHoc,
            b.HocKy,
            b.NamHoc,
            b.Diem15Phut AS Diem15Phut,
            b.Diem1Tiet,
            b.DiemTBMon  AS DiemTBMon,
            b.DanhGia
          FROM ThoiKhoaBieu tkb
          JOIN HoSoHocSinh hs ON hs.MaLop = tkb.MaLop
          JOIN MonHoc m       ON m.MaMonHoc = tkb.MaMonHoc
          LEFT JOIN BangDiemMonHoc b
                ON b.MaHocSinh = hs.MaHocSinh
                AND b.MaMonHoc  = tkb.MaMonHoc
          GROUP BY hs.MaHocSinh, hs.HoTen, hs.MaLop, tkb.MaMonHoc, m.TenMonHoc,
                  b.MaDiem, b.HocKy, b.NamHoc, b.Diem15Phut, b.Diem1Tiet, b.DiemTBMon, b.DanhGia
          ORDER BY hs.MaLop, hs.HoTen, tkb.MaMonHoc;
        `);
        scoresRaw = rows;
      }


      let scores = scoresRaw;
      if (role === "HocSinh") {
        scores = scoresRaw.filter(r => r.MaHocSinh === username);
      }


      const summaryMap = new Map();

      for (const row of scoresRaw) {
        if (!row.MaHocSinh) continue;

        const namHocKey = row.NamHoc || ""; 
        const key = `${row.MaHocSinh}__${namHocKey}`;

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            MaHocSinh: row.MaHocSinh,
            HoTen    : row.HoTen,
            MaLop    : row.MaLop,
            NamHoc   : row.NamHoc || "", 
            _hk1: { sum: 0, count: 0 },
            _hk2: { sum: 0, count: 0 },
          });
        }
        const rec = summaryMap.get(key);

        if (row.DiemTBMon != null) {
          if (row.HocKy === 1 || row.HocKy === "1") {
            rec._hk1.sum   += row.DiemTBMon;
            rec._hk1.count += 1;
          } else if (row.HocKy === 2 || row.HocKy === "2") {
            rec._hk2.sum   += row.DiemTBMon;
            rec._hk2.count += 1;
          }
        }
      }

      let studentAveragesAll = [];
      for (const rec of summaryMap.values()) {
        const tb1 = rec._hk1.count ? rec._hk1.sum / rec._hk1.count : null;
        const tb2 = rec._hk2.count ? rec._hk2.sum / rec._hk2.count : null;

        let caNam = null;
        if (tb1 != null && tb2 != null) {
          caNam = (tb1 + tb2 * 2) / 3;
        } else if (tb1 != null) {
          caNam = tb1;
        } else if (tb2 != null) {
          caNam = tb2;
        }

        let xepLoai = null;
        if (caNam != null) {
          if (caNam >= 8) xepLoai = "Giỏi";
          else if (caNam >= 6.5) xepLoai = "Khá";
          else if (caNam >= 5) xepLoai = "Trung bình";
          else xepLoai = "Yếu";
        }

        studentAveragesAll.push({
          MaHocSinh: rec.MaHocSinh,
          HoTen    : rec.HoTen,
          MaLop    : rec.MaLop,
          NamHoc   : rec.NamHoc,
          TBHK1    : tb1,
          TBHK2    : tb2,
          CaNam    : caNam,
          XepLoai  : xepLoai,
          HanhKiem : null, 
        });
      }
      let studentAverages = studentAveragesAll;
      if (role === "HocSinh") {
        studentAverages = studentAveragesAll.filter(
          s => s.MaHocSinh === username
        );
      }

      console.log("DEBUG /scoretable -> role =", role, "username =", username);
      console.log("DEBUG /scoretable -> scores length =", scores.length);
      console.log("DEBUG /scoretable -> studentAverages length =", studentAverages.length);

      res.render("pages/scoretable", {
        title: "Bảng điểm",
        user: req.session.user,
        scores,
        namHocs,
        subjects,
        studentAverages,
        permissions: {
          canEditScore,
          canEditAll,
          teacherSubject,
          teacherClasses,
        },
      });
    } catch (err) {
      console.error("Lỗi /scoretable:", err);
      res.status(500).send("Không tải được bảng điểm.");
    }
  }
);

router.get(
  "/report",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const [reportMon] = await sequelize.query(`
        SELECT *
        FROM BaoCaoTongKetMon
        ORDER BY NamHoc DESC, HocKy, MaMonHoc, MaLop;
      `);

      const [reportHK] = await sequelize.query(`
        SELECT *
        FROM BaoCaoTongKetHK
        ORDER BY NamHoc DESC, HocKy, MaLop;
      `);

      const [namHocs] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC;"
      );

      const role = getRole(req);
      const canExportReport =
        role === "Admin" || role === "BGH" || role === "GiaoVu";

      res.render("pages/report", {
        title: "Báo cáo",
        user: req.session.user,
        reportMon,
        reportHK,
        namHocs,
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
  async (req, res) => {
    try {
      const [rules] = await sequelize.query(`
        SELECT TenQuyDinh, GiaTri
        FROM ThongSoQuyDinh
        ORDER BY TenQuyDinh ASC;
      `);

      const role = getRole(req);
      const canEditRules = role === "Admin" || role === "BGH";

      res.render("pages/rules", {
        title: "Quy định",
        user: req.session.user,
        rules,
        permissions: {
          canEditRules,
        },
      });
    } catch (err) {
      console.error("Lỗi /rules:", err);
      res.status(500).send("Không tải được thông số quy định.");
    }
  }
);


router.get(
  "/find",
  requireLogin,
  allowRoles(staffRoles),
  async (req, res) => {
    try {
      const [students] = await sequelize.query(`
        SELECT MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email, MaLop
        FROM HoSoHocSinh
        ORDER BY HoTen;
      `);

      const [scores] = await sequelize.query(`
        SELECT b.MaDiem,
               b.MaHocSinh,
               hs.HoTen,
               hs.MaLop,
               b.MaMonHoc,
               m.TenMonHoc,
               b.HocKy,
               b.NamHoc,
               b.Diem15Phut,
               b.Diem1Tiet,
               b.DiemTBMon,
               b.DanhGia
        FROM BangDiemMonHoc b
        LEFT JOIN HoSoHocSinh hs ON b.MaHocSinh = hs.MaHocSinh
        LEFT JOIN MonHoc m ON b.MaMonHoc = m.MaMonHoc;
      `);

      const [attendances] = await sequelize.query(`
        SELECT d.MaDiemDanh,
               d.MaHocSinh,
               hs.MaLop,
               d.NgayDiemDanh,
               d.TrangThai
        FROM DiemDanh d
        LEFT JOIN HoSoHocSinh hs ON d.MaHocSinh = hs.MaHocSinh;
      `);

      res.render("pages/find", {
        title: "Tra cứu hồ sơ học sinh",
        user: req.session.user,
        students,
        scores,
        attendances,
      });
    } catch (err) {
      console.error("Lỗi /find:", err);
      res.status(500).send("Không tải được dữ liệu tra cứu.");
    }
  }
);

module.exports = router;
