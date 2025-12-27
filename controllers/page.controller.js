const { sequelize } = require("../models");

class PageController {
  async showTableControl(req, res) {
    try {
      const role = (req.session?.user?.role || "").trim();

      const [studentRows] = await sequelize.query(
        "SELECT COUNT(*) AS SoHocSinh FROM HoSoHocSinh;"
      );
      const [classRows] = await sequelize.query(
        "SELECT COUNT(*) AS SoLop FROM LopHoc;"
      );
      const [teacherRows] = await sequelize.query(
        "SELECT COUNT(*) AS SoGiaoVien FROM GiaoVien;"
      );

      const SoHocSinh = studentRows[0]?.SoHocSinh || 0;
      const SoLop = classRows[0]?.SoLop || 0;
      const SoGiaoVien = teacherRows[0]?.SoGiaoVien || 0;

      const [attTodayRows] = await sequelize.query(`
        SELECT
          SUM(CASE WHEN TrangThai = 'P' THEN 1 ELSE 0 END) AS SoCoMat,
          COUNT(*) AS TongBuoi
        FROM DiemDanh
        WHERE date(NgayDiemDanh) = date('now');
      `);

      const SoCoMat = attTodayRows[0]?.SoCoMat || 0;
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

      const attLabels = att7Rows.map((r) => r.Ngay);
      const attPercents = att7Rows.map((r) => {
        const tong = r.TongBuoi || 0;
        return tong ? Math.round((r.SoCoMat * 100) / tong) : 0;
      });

      // Lấy năm học hiện tại để tính sĩ số
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc || null;
      
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

      const topClassLabels = topClassRows.map((r) => r.MaLop);
      const topClassCounts = topClassRows.map((r) => r.SiSo || 0);

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
            LopHienTai: null, // Bảng LopHoc không có cột MaGVChuNhiem
            NgaySinh: gv.NgaySinh,
            GioiTinh: gv.GioiTinh,
            Email: gv.Email,
            DiaChi: gv.DiaChi,
            LopChuNhiem: null, // Bảng LopHoc không có cột MaGVChuNhiem
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

  async showFindPage(req, res) {
    try {
      // Lấy năm học hiện tại
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      const [students] = await sequelize.query(`
        SELECT hs.MaHocSinh, hs.HoTen, hs.GioiTinh, hs.NgaySinh, hs.DiaChi, hs.Email,
               hln.MaLop
        FROM HoSoHocSinh hs
        LEFT JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh
          ${currentYear ? `AND hln.MaNamHoc = '${currentYear}' AND hln.TrangThai = 'DangHoc'` : ''}
        ORDER BY hs.HoTen;
      `);

      const [scores] = await sequelize.query(`
        SELECT b.MaDiem,
               b.MaHocSinh,
               hs.HoTen,
               hln.MaLop,
               b.MaMonHoc,
               m.TenMonHoc,
               b.HocKy,
               b.NamHoc,
               b.Diem15Phut,
               b.Diem1Tiet,
               b.DiemTBMon
        FROM BangDiemMonHoc b
        LEFT JOIN HoSoHocSinh hs ON b.MaHocSinh = hs.MaHocSinh
        LEFT JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh 
          AND hln.MaNamHoc = b.NamHoc AND hln.TrangThai = 'DangHoc'
        LEFT JOIN MonHoc m ON b.MaMonHoc = m.MaMonHoc; 
      `);

      const [attendances] = await sequelize.query(`
        SELECT d.MaDiemDanh,
               d.MaHocSinh,
               hln.MaLop,
               d.NgayDiemDanh,
               d.TrangThai
        FROM DiemDanh d
        LEFT JOIN HoSoHocSinh hs ON d.MaHocSinh = hs.MaHocSinh
        LEFT JOIN HocSinh_LopNamHoc hln ON hs.MaHocSinh = hln.MaHocSinh
          ${currentYear ? `AND hln.MaNamHoc = '${currentYear}' AND hln.TrangThai = 'DangHoc'` : ''};
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

      res.render("pages/find", {
        title: "Tra cứu",
        user: req.session.user,
        students,
        scores,
        attendances,
        teachers,
        timetables,
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
      await quyDinhService.updateQuyDinh({ TenQuyDinh, GiaTri });
      return res.redirect("/rules");
    } catch (err) {
      console.error("Lỗi updateRule:", err);
      return res.status(400).send(err.message || "Không cập nhật được quy định");
    }
  }
  async viewClassStudents(req, res) {
    try {
      const { lop } = req.query;

      if (!lop) {
        return res.redirect("/class");
      }
      // Lấy lớp với sĩ số và GVCN từ Lop_NamHoc (năm học hiện tại)
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
          WHERE 1=1
          GROUP BY l.MaLop, l.KhoiLop, gv.HoTen
          ORDER BY 
            CASE WHEN l.MaLop = 'CHUA_CO_LOP' THEN 1 ELSE 0 END,
            l.KhoiLop ASC, 
            l.MaLop ASC;
        `, { replacements: [currentYear, currentYear] });
        classes = classesWithYear;
      } else {
        // Fallback: tính sĩ số từ HocSinh_LopNamHoc (năm học mới nhất)
        const [classesFallback] = await sequelize.query(`
          SELECT 
            l.MaLop,
            l.KhoiLop,
            COALESCE(COUNT(hln.MaHocSinh), 0) AS SiSoLop,
            NULL AS TenGVChuNhiem
          FROM LopHoc l
          LEFT JOIN HocSinh_LopNamHoc hln ON l.MaLop = hln.MaLop 
            AND hln.TrangThai = 'DangHoc'
            AND hln.MaNamHoc = (SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1)
          WHERE 1=1
          GROUP BY l.MaLop, l.KhoiLop
          ORDER BY l.KhoiLop ASC, l.MaLop ASC;
        `);
        classes = classesFallback;
      }

      // Lấy danh sách học sinh trong lớp theo năm học (bao gồm cả CHUA_CO_LOP nếu được chọn)
      const selectedYear = req.query.year || currentYear;
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

      // Luôn thêm lớp CHUA_CO_LOP vào danh sách classes để hiển thị trong dropdown
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
      `, { replacements: [currentYear || selectedYear] });
      
      if (chuaCoLopInfo.length > 0) {
        // Kiểm tra xem CHUA_CO_LOP đã có trong danh sách chưa
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

      const role = (req.session?.user?.role || "").trim();
      const canManageClasses = role === "Admin" || role === "GiaoVu";

      res.render("pages/class", {
        title: "Danh sách lớp",
        user: req.session.user,
        classes,
        namHocs,
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
