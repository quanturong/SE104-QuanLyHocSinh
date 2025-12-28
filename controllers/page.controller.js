const { sequelize } = require("../models");

class PageController {
  async showTableControl(req, res) {
    try {
      const role = (req.session?.user?.role || "").trim();
      const isStudent = role === "HocSinh";

      const [currentYearRow] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1"
      );
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      let studentRows;
      if (currentYear) {
        [studentRows] = await sequelize.query(
          "SELECT COUNT(DISTINCT MaHocSinh) AS SoHocSinh FROM HocSinh_LopNamHoc WHERE MaNamHoc = ? AND TrangThai = 'DangHoc'",
          { replacements: [currentYear] }
        );
      } else {
        [studentRows] = await sequelize.query(
          "SELECT COUNT(*) AS SoHocSinh FROM HoSoHocSinh"
        );
      }
      
      let classRows;
      if (currentYear) {
        [classRows] = await sequelize.query(
          "SELECT COUNT(DISTINCT MaLop) AS SoLop FROM Lop_NamHoc WHERE MaNamHoc = ? AND MaLop != 'CHUA_CO_LOP'",
          { replacements: [currentYear] }
        );
      } else {
        [classRows] = await sequelize.query(
          "SELECT COUNT(*) AS SoLop FROM LopHoc WHERE MaLop != 'CHUA_CO_LOP'"
        );
      }
      const [teacherRows] = await sequelize.query(
        "SELECT COUNT(*) AS SoGiaoVien FROM GiaoVien;"
      );

      const SoHocSinh = studentRows[0]?.SoHocSinh || 0;
      const SoLop = classRows[0]?.SoLop || 0;
      const SoGiaoVien = teacherRows[0]?.SoGiaoVien || 0;

      let DiemDanhHomNay = 0;
      let attLabels = [];
      let attPercents = [];
      let topClassLabels = [];
      let topClassCounts = [];

      if (!isStudent) {
        // Điểm danh hôm nay - tính theo tổng số học sinh đang học trong năm học hiện tại
        let SoCoMat = 0;
        let TongBuoi = 0;

        if (currentYear) {
          const [coMatRows] = await sequelize.query(`
            SELECT COUNT(DISTINCT d.MaHocSinh) AS SoCoMat
            FROM DiemDanh d
            WHERE date(d.NgayDiemDanh) = date('now', '+7 hours')
              AND d.TrangThai = 'P'
              AND EXISTS (
                SELECT 1 FROM HocSinh_LopNamHoc hln
                WHERE hln.MaHocSinh = d.MaHocSinh
                  AND hln.MaNamHoc = ?
                  AND hln.TrangThai = 'DangHoc'
              )
          `, { replacements: [currentYear] });

          const [tongHSRows] = await sequelize.query(`
            SELECT COUNT(DISTINCT MaHocSinh) AS TongHS
            FROM HocSinh_LopNamHoc
            WHERE MaNamHoc = ? AND TrangThai = 'DangHoc'
          `, { replacements: [currentYear] });

          SoCoMat = coMatRows[0]?.SoCoMat || 0;
          TongBuoi = tongHSRows[0]?.TongHS || 0;
        } else {
          const [attTodayRows] = await sequelize.query(`
            SELECT
              SUM(CASE WHEN TrangThai = 'P' THEN 1 ELSE 0 END) AS SoCoMat,
              COUNT(*) AS TongBuoi
            FROM DiemDanh
            WHERE date(NgayDiemDanh) = date('now', '+7 hours')
          `);
          SoCoMat = attTodayRows[0]?.SoCoMat || 0;
          TongBuoi = attTodayRows[0]?.TongBuoi || 0;
        }

        DiemDanhHomNay = TongBuoi
          ? Math.round((SoCoMat * 100) / TongBuoi)
          : 0;

        let att7Rows = [];
        
        if (currentYear) {
          const [tongHSRows] = await sequelize.query(`
            SELECT COUNT(DISTINCT MaHocSinh) AS TongHS
            FROM HocSinh_LopNamHoc
            WHERE MaNamHoc = ? AND TrangThai = 'DangHoc'
          `, { replacements: [currentYear] });
          const tongHS = tongHSRows[0]?.TongHS || 0;

          const [att7Data] = await sequelize.query(`
            SELECT 
              date(d.NgayDiemDanh) AS Ngay,
              COUNT(DISTINCT CASE WHEN d.TrangThai = 'P' THEN d.MaHocSinh END) AS SoCoMat
            FROM DiemDanh d
            WHERE date(d.NgayDiemDanh) >= date('now', '+7 hours', '-6 day')
              AND date(d.NgayDiemDanh) <= date('now', '+7 hours')
              AND EXISTS (
                SELECT 1 FROM HocSinh_LopNamHoc hln
                WHERE hln.MaHocSinh = d.MaHocSinh
                  AND hln.MaNamHoc = ?
                  AND hln.TrangThai = 'DangHoc'
              )
            GROUP BY date(d.NgayDiemDanh)
            ORDER BY Ngay
            LIMIT 7
          `, { replacements: [currentYear] });

          att7Rows = att7Data.map(r => ({
            Ngay: r.Ngay,
            SoCoMat: r.SoCoMat || 0,
            TongBuoi: tongHS
          }));
        } else {
          const [att7Data] = await sequelize.query(`
            SELECT 
              date(NgayDiemDanh) AS Ngay,
              SUM(CASE WHEN TrangThai = 'P' THEN 1 ELSE 0 END) AS SoCoMat,
              COUNT(*) AS TongBuoi
            FROM DiemDanh
            WHERE date(NgayDiemDanh) >= date('now', '+7 hours', '-6 day')
              AND date(NgayDiemDanh) <= date('now', '+7 hours')
            GROUP BY date(NgayDiemDanh)
            ORDER BY Ngay
            LIMIT 7
          `);
          att7Rows = att7Data;
        }

        attLabels = att7Rows.map((r) => r.Ngay);
        attPercents = att7Rows.map((r) => {
          const tong = r.TongBuoi || 0;
          return tong ? Math.round((r.SoCoMat * 100) / tong) : 0;
        });

        let topClassRows;
        if (currentYear) {
          [topClassRows] = await sequelize.query(`
            SELECT l.MaLop, COUNT(hln.MaHocSinh) AS SiSo
            FROM LopHoc l
            LEFT JOIN HocSinh_LopNamHoc hln ON l.MaLop = hln.MaLop 
              AND hln.MaNamHoc = ? AND hln.TrangThai = 'DangHoc'
            GROUP BY l.MaLop
            ORDER BY SiSo DESC, l.MaLop
            LIMIT 6;
          `, { replacements: [currentYear] });
        } else {
          [topClassRows] = await sequelize.query(`
            SELECT l.MaLop, 0 AS SiSo
            FROM LopHoc l
            ORDER BY l.MaLop
            LIMIT 6;
          `);
        }

        topClassLabels = topClassRows.map((r) => r.MaLop);
        topClassCounts = topClassRows.map((r) => r.SiSo || 0);
      }

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
                gv.DiaChi, gv.Email
          FROM GiaoVien gv
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
            LopHienTai: null,
            NgaySinh: gv.NgaySinh,
            GioiTinh: gv.GioiTinh,
            Email: gv.Email,
            DiaChi: gv.DiaChi,
            LopChuNhiem: null,
          };
        }
      }

      res.render("pages/tablecontrol", {
        title: "Bảng điều khiển",
        user: req.session.user,
        isStudent: isStudent,
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

  async showFindPage(req, res) {
    try {
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      const [students] = await sequelize.query(`
        SELECT DISTINCT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh, hs.DiaChi, hs.Email,
               (SELECT hln2.MaLop 
                FROM HocSinh_LopNamHoc hln2 
                WHERE hln2.MaHocSinh = hs.MaHocSinh 
                  ${currentYear ? `AND hln2.MaNamHoc = ? AND hln2.TrangThai = 'DangHoc'` : 'AND hln2.TrangThai = \'DangHoc\''}
                ORDER BY hln2.MaNamHoc DESC 
                LIMIT 1) AS MaLop
        FROM HoSoHocSinh hs
        ORDER BY hs.HoTen;
      `, { replacements: currentYear ? [currentYear] : [] });

      const [scores] = await sequelize.query(`
        SELECT b.MaDiem,
               b.MaHocSinh,
               hs.HoTen,
               b.MaMonHoc,
               m.TenMonHoc,
               b.HocKy,
               b.NamHoc,
               b.Diem15Phut,
               b.Diem1Tiet,
               b.DiemTBMon
        FROM BangDiemMonHoc b
        LEFT JOIN HoSoHocSinh hs ON b.MaHocSinh = hs.MaHocSinh
        LEFT JOIN MonHoc m ON b.MaMonHoc = m.MaMonHoc
        ORDER BY b.NamHoc DESC, b.HocKy, m.TenMonHoc; 
      `);

      const [attendances] = await sequelize.query(`
        SELECT d.MaDiemDanh,
               d.MaHocSinh,
               d.NgayDiemDanh,
               d.TrangThai,
               (SELECT hln2.MaLop 
                FROM HocSinh_LopNamHoc hln2 
                INNER JOIN NamHoc nh ON hln2.MaNamHoc = nh.MaNamHoc
                WHERE hln2.MaHocSinh = d.MaHocSinh 
                  AND DATE(d.NgayDiemDanh) BETWEEN DATE(nh.NgayBatDau) AND DATE(nh.NgayKetThuc)
                LIMIT 1) AS MaLop
        FROM DiemDanh d
        ORDER BY d.NgayDiemDanh DESC;
      `);

      const [teachers] = await sequelize.query(`
        SELECT DISTINCT gv.MaGiaoVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh,
               gv.DiaChi, gv.Email, gv.MaMonGiangDay,
               GROUP_CONCAT(DISTINCT mh.TenMonHoc) AS TenMonHoc
        FROM GiaoVien gv
        LEFT JOIN PhanCongGiangDay pc ON gv.MaGiaoVien = pc.MaGiaoVien
        LEFT JOIN MonHoc mh ON pc.MaMonHoc = mh.MaMonHoc
        GROUP BY gv.MaGiaoVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh, gv.DiaChi, gv.Email, gv.MaMonGiangDay
        ORDER BY gv.HoTen;
      `);

      const [timetables] = await sequelize.query(`
        SELECT t.MaLop, t.Thu, t.TietHoc, t.MaMonHoc, t.MaGiaoVien,
               m.TenMonHoc
        FROM ThoiKhoaBieu t
        LEFT JOIN MonHoc m ON t.MaMonHoc = m.MaMonHoc
        ORDER BY t.MaLop, t.Thu, t.TietHoc;
      `);

      const [namHocs] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC;
      `);

      res.render("pages/find", {
        title: "Tra cứu",
        user: req.session.user,
        students,
        scores,
        attendances,
        teachers,
        timetables,
        namHocs,
      });
    } catch (err) {
      console.error("Lỗi /find:", err);
      res.status(500).send("Không tải được dữ liệu tra cứu.");
    }
  }

  async showRulesPage(req, res) {
    try {
      const role = (req.session?.user?.role || "").trim();
      const isStudent = role === "HocSinh";

      if (isStudent) {
        res.render("pages/rules-student", {
          title: "Quy định",
          user: req.session.user,
        });
        return;
      }

      const quyDinhService = require("../services/quydinh.service");
      const rules = await quyDinhService.getAllQuyDinh();

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

  async updateRule(req, res) {
    try {
      const quyDinhService = require("../services/quydinh.service");
      const { TenQuyDinh, GiaTri } = req.body;
      
      if (TenQuyDinh === "CHI_SUA_HOC_KY_HIEN_TAI") {
        const numValue = parseFloat(GiaTri);
        if (numValue !== 0 && numValue !== 1) {
          req.flash('error', 'Quy định "CHI_SUA_HOC_KY_HIEN_TAI" chỉ cho phép giá trị 0 (Tắt) hoặc 1 (Bật)');
          return res.redirect("/rules");
        }
      }
      
      await quyDinhService.updateQuyDinh({ TenQuyDinh, GiaTri });
      req.flash('success', 'Đã cập nhật quy định thành công');
      return res.redirect("/rules");
    } catch (err) {
      console.error("Lỗi updateRule:", err);
      req.flash('error', err.message || "Không cập nhật được quy định");
      return res.redirect("/rules");
    }
  }
  async viewClassStudents(req, res) {
    try {
      const { lop } = req.query;

      if (!lop) {
        return res.redirect("/class");
      }
      const selectedYearFromQuery = req.query.namHoc ? String(req.query.namHoc).trim() : null;
      console.log('[viewClassStudents] Query parameter namHoc:', req.query.namHoc);
      console.log('[viewClassStudents] selectedYearFromQuery:', selectedYearFromQuery);
      
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const defaultYear = currentYearRow[0]?.MaNamHoc || null;
      
      const selectedYear = selectedYearFromQuery || defaultYear;
      console.log('[viewClassStudents] defaultYear:', defaultYear);
      console.log('[viewClassStudents] selectedYear (sẽ dùng):', selectedYear);
      
      const classService = require("../services/class.service");
      await classService.ensureChuaCoLopExists();

      let classes = [];
      if (selectedYear) {
        const [classesWithYear] = await sequelize.query(`
          SELECT 
            ln.MaLop,
            l.KhoiLop,
            COALESCE(COUNT(hln.MaHocSinh), 0) AS SiSoLop,
            gv.HoTen AS TenGVChuNhiem,
            ln.MaGVChuNhiem
          FROM Lop_NamHoc ln
          INNER JOIN LopHoc l ON ln.MaLop = l.MaLop
          LEFT JOIN HocSinh_LopNamHoc hln ON ln.MaLop = hln.MaLop 
            AND hln.MaNamHoc = ?
            AND hln.TrangThai = 'DangHoc'
          LEFT JOIN GiaoVien gv ON ln.MaGVChuNhiem = gv.MaGiaoVien
          WHERE ln.MaNamHoc = ? AND ln.MaLop != 'CHUA_CO_LOP'
          GROUP BY ln.MaLop, l.KhoiLop, gv.HoTen, ln.MaGVChuNhiem
          ORDER BY l.KhoiLop ASC, ln.MaLop ASC;
        `, { replacements: [selectedYear, selectedYear] });
        classes = classesWithYear;
      }

      let studentsInClass = [];
      if (selectedYear) {
        const [studentsRows] = await sequelize.query(
          `
          SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh, hs.DiaChi, hs.Email
          FROM HocSinh_LopNamHoc hln
          INNER JOIN HoSoHocSinh hs ON hln.MaHocSinh = hs.MaHocSinh
          WHERE hln.MaLop = ? AND hln.MaNamHoc = ? AND hln.TrangThai = 'DangHoc'
          ORDER BY hs.HoTen ASC;
          `,
          { replacements: [lop, selectedYear] }
        );
        studentsInClass = studentsRows;
      }

      const [chuaCoLopInfo] = await sequelize.query(`
        SELECT 
          l.MaLop,
          l.KhoiLop,
          COALESCE(COUNT(hln.MaHocSinh), 0) AS SiSoLop,
          NULL AS TenGVChuNhiem
        FROM LopHoc l
        LEFT JOIN HocSinh_LopNamHoc hln ON l.MaLop = hln.MaLop 
          AND hln.MaNamHoc = ?
          AND hln.TrangThai = 'DangHoc'
        WHERE l.MaLop = 'CHUA_CO_LOP'
        GROUP BY l.MaLop, l.KhoiLop;
      `, { replacements: [selectedYear || defaultYear] });
      
      if (chuaCoLopInfo.length > 0) {
        const exists = classes.find(c => c.MaLop === 'CHUA_CO_LOP');
        if (!exists) {
          classes.push(chuaCoLopInfo[0]);
        }
      }

      const [namHocs] = await sequelize.query(`
        SELECT MaNamHoc
        FROM NamHoc
        ORDER BY MaNamHoc DESC;
      `);

      const [teachers] = await sequelize.query(`
        SELECT MaGiaoVien, HoTen
        FROM GiaoVien
        ORDER BY HoTen ASC;
      `);

      const role = (req.session?.user?.role || "").trim();
      const canManageClasses = role === "Admin" || role === "GiaoVu";

      res.render("pages/class", {
        title: "Danh sách lớp",
        user: req.session.user,
        classes,
        teachers: teachers || [],
        namHocs,
        selectedYear: selectedYear,
        permissions: {
          canManageClasses,
        },
        selectedClass: lop,
        studentsInClass,
        success: req.query.success,
        error: req.query.error,
      });
    } catch (err) {
      console.error("Lỗi viewClassStudents:", err);
      res.status(500).send("Không tải được danh sách học sinh của lớp: " + err.message);
    }
  }
}

module.exports = new PageController();
