const { sequelize } = require('../models');
(async () => {
  try {
    const [rows] = await sequelize.query("PRAGMA table_info('ThoiKhoaBieu')");
    console.log('ThoiKhoaBieu columns:');
    console.log(rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
})();
