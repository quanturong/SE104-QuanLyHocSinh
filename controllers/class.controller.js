const classService = require("../services/class.service");

class ClassController {
  async showClassPage(req, res) {
    try {
      const { sequelize } = require("../models");
      
      // Đảm bảo lớp CHUA_CO_LOP tồn tại
      await classService.ensureChuaCoLopExists();
      
      // Lấy tất cả các lớp (bao gồm CHUA_CO_LOP)
      const classes = await classService.getAllClasses();
      
      // Debug: kiểm tra xem CHUA_CO_LOP có trong danh sách không
      console.log('[showClassPage] Tổng số lớp:', classes.length);
      const chuaCoLopInList = classes.find(c => c.MaLop === 'CHUA_CO_LOP');
      console.log('[showClassPage] CHUA_CO_LOP có trong danh sách:', !!chuaCoLopInList);
      
      // Lấy năm học hiện tại để tính sĩ số
      const [currentYearRow] = await sequelize.query(
        "SELECT MaNamHoc FROM NamHoc ORDER BY MaNamHoc DESC LIMIT 1"
      );
      const currentYear = currentYearRow[0]?.MaNamHoc || null;
      
      // Tính sĩ số cho từng lớp (bao gồm CHUA_CO_LOP)
      const classesWithSiSo = await Promise.all(classes.map(async (cls) => {
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

      // Đảm bảo CHUA_CO_LOP có trong danh sách và ở cuối
      const chuaCoLopIndex = classesWithSiSo.findIndex(c => c.MaLop === 'CHUA_CO_LOP');
      if (chuaCoLopIndex === -1) {
        // Thêm CHUA_CO_LOP vào danh sách nếu chưa có
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
        // Nếu đã có, di chuyển nó xuống cuối danh sách
        const chuaCoLop = classesWithSiSo.splice(chuaCoLopIndex, 1)[0];
        classesWithSiSo.push(chuaCoLop);
      }
      
      console.log('[showClassPage] Tổng số lớp sau khi xử lý:', classesWithSiSo.length);
      console.log('[showClassPage] CHUA_CO_LOP có trong danh sách:', classesWithSiSo.some(c => c.MaLop === 'CHUA_CO_LOP'));

      res.render("pages/class", {
        title: "Danh sách lớp",
        user: req.session.user,
        classes: classesWithSiSo,
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
      const { MaLop, KhoiLop } = req.body;
      await classService.createClass({ MaLop, KhoiLop });
      return res.redirect("/class?success=" + encodeURIComponent("Đã thêm lớp học thành công"));
    } catch (err) {
      console.error("Lỗi createClass:", err);
      return res.redirect("/class?error=" + encodeURIComponent(err.message || "Không thêm được lớp học"));
    }
  }

  async updateClass(req, res) {
    try {
      const { OldMaLop, MaLop } = req.body;
      
      // Debug log
      console.log("updateClass - OldMaLop:", OldMaLop);
      console.log("updateClass - MaLop:", MaLop);
      console.log("updateClass - req.body:", JSON.stringify(req.body));
      
      if (!OldMaLop || !MaLop) {
        return res.redirect("/class?error=" + encodeURIComponent("Thiếu thông tin: OldMaLop=" + OldMaLop + ", MaLop=" + MaLop));
      }
      
      // Khối lớp sẽ được tự động tính từ mã lớp trong service
      await classService.updateClass(OldMaLop, { MaLop });
      return res.redirect("/class?success=" + encodeURIComponent("Đã sửa lớp học thành công"));
    } catch (err) {
      console.error("Lỗi updateClass:", err);
      return res.redirect("/class?error=" + encodeURIComponent(err.message || "Không sửa được lớp học"));
    }
  }

  async deleteClass(req, res) {
    try {
      const { MaLop } = req.body;
      await classService.deleteClass(MaLop);
      return res.redirect("/class?success=" + encodeURIComponent("Đã xóa lớp học thành công"));
    } catch (err) {
      console.error("Lỗi deleteClass:", err);
      return res.redirect("/class?error=" + encodeURIComponent(err.message || "Không xóa được lớp học"));
    }
  }
}

module.exports = new ClassController();

