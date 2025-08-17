const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const getDbConfig = () => {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'giftcard_user',
    password: process.env.DB_PASSWORD || 'GiftCard_User_2024!',
    database: process.env.DB_NAME || 'gift_card_system'
  };
};

async function initDatabase() {
  const dbConfig = getDbConfig();
  let retries = 15; // Increase retry count
  let connected = false;
  let db;

  while (retries > 0 && !connected) {
    try {
      db = await mysql.createConnection({
        ...dbConfig,
        connectTimeout: 10000, // 10 second connection timeout
        debug: process.env.NODE_ENV === 'development',
        charset: 'utf8mb4'
      });

      connected = true;

      const [testResult] = await db.execute('SELECT 1 as test');

      await createTables(db);
      await createDefaultAdmin(db);

      return db; // Return database connection object
    } catch (error) {
      retries--;
      if (retries > 0) {
        const waitTime = 5000; // 5 seconds
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw new Error('无法连接到数据库，请检查配置和网络连接');
      }
    }
  }
}

async function createTables(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      status ENUM('active', 'inactive') DEFAULT 'active'
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  try {
    await db.execute(`
      INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
      ('block_cn_ip', 'true', '是否阻止中国IP访问（显示礼品卡已发放完毕）'),
      ('default_language', 'auto', '默认语言设置（auto=自动检测，zh=中文，en=英文，ja=日文，ko=韩文）'),
      ('whatsapp_link', '', 'WhatsApp联系链接（如：https://wa.me/1234567890）'),
      ('telegram_link', '', 'Telegram联系链接（如：https://t.me/username）')
    `);
  } catch (error) {
    console.error('插入默认系统设置失败:', error);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_id INT,
      ip_address VARCHAR(45),
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      admin_confirmed_by INT NULL,
      admin_confirmed_at TIMESTAMP NULL,
      FOREIGN KEY (member_id) REFERENCES members(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS second_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_id INT,
      login_log_id INT,
      verification_code VARCHAR(10),
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      admin_confirmed_by INT NULL,
      admin_confirmed_at TIMESTAMP NULL,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (login_log_id) REFERENCES login_logs(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS gift_card_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS gift_cards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT,
      code VARCHAR(255) UNIQUE NOT NULL,
      status ENUM('available', 'distributed', 'used') DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      distributed_to INT NULL,
      distributed_at TIMESTAMP NULL,
      card_type ENUM('login', 'checkin') DEFAULT 'login',
      FOREIGN KEY (category_id) REFERENCES gift_card_categories(id),
      FOREIGN KEY (distributed_to) REFERENCES members(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS checkin_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_id INT,
      checkin_date DATE,
      gift_card_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id),
      UNIQUE KEY unique_member_date (member_id, checkin_date)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('super','admin') NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ip_blacklist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ip_address VARCHAR(45) NOT NULL,
      reason TEXT,
      banned_by INT,
      banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('active', 'inactive') DEFAULT 'active',
      FOREIGN KEY (banned_by) REFERENCES admins(id),
      UNIQUE KEY unique_ip (ip_address)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_page_tracking (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      user_type ENUM('guest', 'member') DEFAULT 'guest',
      page_name VARCHAR(100) NOT NULL,
      stay_duration INT DEFAULT 0,
      ip_address VARCHAR(45),
      enter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      leave_time TIMESTAMP NULL,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

async function createDefaultAdmin(db) {
  try {
    const [existing] = await db.execute('SELECT id FROM admins WHERE username = ?', ['admin']);
    if (existing.length === 0) {
      const hashedPassword = crypto.createHash('md5').update('admin123').digest('hex');
      await db.execute('INSERT INTO admins (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'super']);
    }
  } catch (error) {
    console.error('创建默认管理员失败:', error);
  }
}

function getDbPool() {
  const dbConfig = getDbConfig();
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });
}

module.exports = {
  initDatabase,
  getDbPool,
  getDbConfig
};