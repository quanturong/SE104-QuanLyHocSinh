const { sequelize } = require("../models");

class PageController {
  async showTableControl(req, res) {
    try {
      const role = (req.session?.user?.role || "").trim();
      const isStudent = role === "HocSinh";

      // Lấy năm học hiện tại để filter tất cả thông số
      const [currentYearRow] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1"
      );
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      // Đếm số học sinh đang học trong năm học hiện tại
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
        // Chỉ đếm lớp có trong năm học hiện tại
        [classRows] = await sequelize.query(
          "SELECT COUNT(DISTINCT MaLop) AS SoLop FROM Lop_NamHoc WHERE MaNamHoc = ? AND MaLop != 'CHUA_CO_LOP'",
          { replacements: [currentYear] }
        );
      } else {
        // Nếu không có năm học, đếm tất cả lớp
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

      // Chỉ tính điểm danh hôm nay nếu không phải học sinh
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
          // Đếm số học sinh có mặt (có điểm danh với TrangThai = 'P')
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

          // Đếm tổng số học sinh đang học trong năm học hiện tại
          const [tongHSRows] = await sequelize.query(`
            SELECT COUNT(DISTINCT MaHocSinh) AS TongHS
            FROM HocSinh_LopNamHoc
            WHERE MaNamHoc = ? AND TrangThai = 'DangHoc'
          `, { replacements: [currentYear] });

          SoCoMat = coMatRows[0]?.SoCoMat || 0;
          TongBuoi = tongHSRows[0]?.TongHS || 0;
        } else {
          // Nếu không có năm học, tính theo tất cả điểm danh
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

        // Điểm danh 7 ngày qua - tính theo tổng số học sinh đang học
        let att7Rows = [];
        
        if (currentYear) {
          // Lấy tổng số học sinh đang học
          const [tongHSRows] = await sequelize.query(`
            SELECT COUNT(DISTINCT MaHocSinh) AS TongHS
            FROM HocSinh_LopNamHoc
            WHERE MaNamHoc = ? AND TrangThai = 'DangHoc'
          `, { replacements: [currentYear] });
          const tongHS = tongHSRows[0]?.TongHS || 0;

          // Lấy điểm danh theo từng ngày
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

          // Tính phần trăm dựa trên tổng số học sinh
          att7Rows = att7Data.map(r => ({
            Ngay: r.Ngay,
            SoCoMat: r.SoCoMat || 0,
            TongBuoi: tongHS
          }));
        } else {
          // Nếu không có năm học, tính theo tất cả điểm danh
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

        // Top lớp có sĩ số cao - đã có currentYear từ trên
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
      // Lấy năm học hiện tại để hiển thị lớp hiện tại
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const currentYear = currentYearRow[0]?.MaNamHoc || null;

      // Lấy tất cả học sinh, với lớp hiện tại (nếu có)
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

      // Lấy tất cả điểm số của tất cả học sinh
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

      // Lấy tất cả điểm danh của tất cả học sinh
      // Lấy lớp của học sinh dựa trên năm học tương ứng với ngày điểm danh
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
      
      // Validation đặc biệt cho CHI_SUA_HOC_KY_HIEN_TAI
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
      // Lấy năm học được chọn từ query parameter, mặc định là năm học mới nhất
      const selectedYearFromQuery = req.query.namHoc ? String(req.query.namHoc).trim() : null;
      console.log('[viewClassStudents] Query parameter namHoc:', req.query.namHoc);
      console.log('[viewClassStudents] selectedYearFromQuery:', selectedYearFromQuery);
      
      // Lấy năm học mới nhất để làm mặc định
      const [currentYearRow] = await sequelize.query(`
        SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1
      `);
      const defaultYear = currentYearRow[0]?.MaNamHoc || null;
      
      // Sử dụng năm học từ query nếu có, nếu không thì dùng năm học mới nhất
      const selectedYear = selectedYearFromQuery || defaultYear;
      console.log('[viewClassStudents] defaultYear:', defaultYear);
      console.log('[viewClassStudents] selectedYear (sẽ dùng):', selectedYear);
      
      // Đảm bảo lớp CHUA_CO_LOP tồn tại
      const classService = require("../services/class.service");
      await classService.ensureChuaCoLopExists();

      let classes = [];
      if (selectedYear) {
        // Lấy danh sách lớp từ Lop_NamHoc của năm học được chọn (giống như route /class)
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

      // Lấy danh sách học sinh trong lớp theo năm học (bao gồm cả CHUA_CO_LOP nếu được chọn)
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
      `, { replacements: [selectedYear || defaultYear] });
      
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

      // Lấy danh sách giáo viên để hiển thị trong dropdown
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
