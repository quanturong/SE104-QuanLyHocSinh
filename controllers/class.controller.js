const classService = require("../services/class.service");

class ClassController {
  async showClassPage(req, res) {
    try {
      const { sequelize } = require("../models");
      
      await classService.ensureChuaCoLopExists();
      
      const classes = await classService.getAllClasses();
      
      console.log('[showClassPage] Tổng số lớp:', classes.length);
      const chuaCoLopInList = classes.find(c => c.MaLop === 'CHUA_CO_LOP');
      console.log('[showClassPage] CHUA_CO_LOP có trong danh sách:', !!chuaCoLopInList);
      
      const [currentYearRow] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1"
      );
      const currentYear = currentYearRow[0]?.MaNamHoc || null;
      
      const classesPlain = classes.map(cls => {
        const maLop = cls.MaLop || cls.dataValues?.MaLop || '';
        const khoiLop = cls.KhoiLop || cls.dataValues?.KhoiLop || 0;
        return { MaLop: maLop, KhoiLop: khoiLop };
      });
      
      const classesWithSiSo = await Promise.all(classesPlain.map(async (cls) => {
        if (currentYear) {
          const [siSoResult] = await sequelize.query(
            "SELECT COUNT(*) AS SiSo FROM HocSinh_LopNamHoc WHERE MaLop = ? AND MaNamHoc = ? AND TrangThai = 'DangHoc'",
            { replacements: [cls.MaLop, currentYear] }
          );
          cls.SiSoLop = siSoResult[0]?.SiSo || 0;
        } else {
          cls.SiSoLop = 0;
        }
        return cls;
      }));
      
      const role = (req.session?.user?.role || "").trim();
      const canManageClasses = role === "Admin" || role === "GiaoVu";

      const chuaCoLopIndex = classesWithSiSo.findIndex(c => c.MaLop === 'CHUA_CO_LOP');
      if (chuaCoLopIndex === -1) {
        const [chuaCoLopInfo] = await sequelize.query(`
          SELECT 
            l.MaLop,
            l.KhoiLop,
            COALESCE(COUNT(hln.MaHocSinh), 0) AS SiSo
          FROM LopHoc l
          LEFT JOIN HocSinh_LopNamHoc hln ON l.MaLop = hln.MaLop 
            AND hln.MaNamHoc = ?
            AND hln.TrangThai = 'DangHoc'
          WHERE l.MaLop = 'CHUA_CO_LOP'
          GROUP BY l.MaLop, l.KhoiLop;
        `, { replacements: [currentYear] });
        
        if (chuaCoLopInfo.length > 0) {
          chuaCoLopInfo[0].SiSoLop = chuaCoLopInfo[0].SiSo || 0;
          classesWithSiSo.push(chuaCoLopInfo[0]);
        }
      } else {
        const chuaCoLop = classesWithSiSo.splice(chuaCoLopIndex, 1)[0];
        classesWithSiSo.push(chuaCoLop);
      }
      
      console.log('[showClassPage] Tổng số lớp sau khi xử lý:', classesWithSiSo.length);
      console.log('[showClassPage] CHUA_CO_LOP có trong danh sách:', classesWithSiSo.some(c => c.MaLop === 'CHUA_CO_LOP'));

      const [teachers] = await sequelize.query(`
        SELECT MaGiaoVien, HoTen
        FROM GiaoVien
        ORDER BY HoTen ASC;
      `);

      res.render("pages/class", {
        title: "Danh sách lớp",
        user: req.session.user,
        classes: classesWithSiSo,
        teachers: teachers || [],
        permissions: {
          canManageClasses,
        },
      });
    } catch (err) {
      console.error("Lỗi showClassPage:", err);
      res.status(500).send("Không tải được danh sách lớp học.");
    }
  }

  async createClass(req, res) {
    try {
      const { MaLop, KhoiLop, MaNamHoc } = req.body;
      const { sequelize } = require("../models");
      let targetYear = MaNamHoc;
      
      if (!targetYear) {
        const [currentYearRow] = await sequelize.query(
          "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1"
        );
        targetYear = currentYearRow[0]?.MaNamHoc || null;
      }
      
      await classService.createClass({ MaLop, KhoiLop, MaNamHoc: targetYear });
      
      let redirectUrl = "/class?success=" + encodeURIComponent("Đã thêm lớp học thành công");
      if (targetYear) {
        redirectUrl += "&namHoc=" + encodeURIComponent(targetYear);
      }
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error("Lỗi createClass:", err);
      const { MaNamHoc } = req.body;
      let redirectUrl = "/class?error=" + encodeURIComponent(err.message || "Không thêm được lớp học");
      if (MaNamHoc) {
        redirectUrl += "&namHoc=" + encodeURIComponent(MaNamHoc);
      }
      return res.redirect(redirectUrl);
    }
  }

  async updateClass(req, res) {
    try {
      const { OldMaLop, MaLop, MaGVChuNhiem } = req.body;
      
      console.log("updateClass - OldMaLop:", OldMaLop);
      console.log("updateClass - MaLop:", MaLop);
      console.log("updateClass - MaGVChuNhiem:", MaGVChuNhiem);
      console.log("updateClass - req.body:", JSON.stringify(req.body));
      
      if (!OldMaLop || !MaLop) {
        return res.redirect("/class?error=" + encodeURIComponent("Thiếu thông tin: OldMaLop=" + OldMaLop + ", MaLop=" + MaLop));
      }
      
      await classService.updateClass(OldMaLop, { MaLop, MaGVChuNhiem: MaGVChuNhiem || null });
      return res.redirect("/class?success=" + encodeURIComponent("Đã sửa lớp học thành công"));
    } catch (err) {
      console.error("Lỗi updateClass:", err);
      return res.redirect("/class?error=" + encodeURIComponent(err.message || "Không sửa được lớp học"));
    }
  }

  async deleteClass(req, res) {
    try {
      const { MaLop, MaNamHoc } = req.body;
      await classService.deleteClass(MaLop, MaNamHoc);
      
      let redirectUrl = "/class?success=" + encodeURIComponent("Đã xóa lớp học thành công");
      if (MaNamHoc) {
        redirectUrl += "&namHoc=" + encodeURIComponent(MaNamHoc);
      }
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error("Lỗi deleteClass:", err);
      const { MaNamHoc } = req.body;
      let redirectUrl = "/class?error=" + encodeURIComponent(err.message || "Không xóa được lớp học");
      if (MaNamHoc) {
        redirectUrl += "&namHoc=" + encodeURIComponent(MaNamHoc);
      }
      return res.redirect(redirectUrl);
    }
  }
}

module.exports = new ClassController();

