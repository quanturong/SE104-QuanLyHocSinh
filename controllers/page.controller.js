const { sequelize } = require("../models");

class PageController {
  async showTableControl(req, res) {
    try {
      console.log("DEBUG /tablecontrol - session.user =", req.session.user);
      const role = (req.session?.user?.role || "").trim();
      console.log("DEBUG /tablecontrol - role =", role);

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

      const [topClassRows] = await sequelize.query(`
        SELECT MaLop, SiSoLop
        FROM LopHoc
        ORDER BY SiSoLop DESC, MaLop
        LIMIT 6;
      `);

      const topClassLabels = topClassRows.map((r) => r.MaLop);
      const topClassCounts = topClassRows.map((r) => r.SiSoLop);

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

  async showFindPage(req, res) {
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

  async showRulesPage(req, res) {
    try {
      const [rules] = await sequelize.query(`
        SELECT TenQuyDinh, GiaTri
        FROM ThongSoQuyDinh
        ORDER BY TenQuyDinh ASC;
      `);

      const role = (req.session?.user?.role || "").trim();
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
  async viewClassStudents(req, res) {
    try {
      const { lop } = req.query;

      if (!lop) {
        return res.redirect("/class");
      }
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

      const [studentsInClass] = await sequelize.query(
        `
        SELECT MaHocSinh, HoTen, GioiTinh, NgaySinh, DiaChi, Email
        FROM HoSoHocSinh
        WHERE MaLop = ?
        ORDER BY HoTen ASC;
        `,
        { replacements: [lop] }
      );

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
      });
    } catch (err) {
      console.error("Lỗi viewClassStudents:", err);
      res.status(500).send("Không tải được danh sách học sinh của lớp: " + err.message);
    }
  }
}

module.exports = new PageController();
