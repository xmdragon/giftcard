const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 数据库配置
const getDbConfig = () => {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'giftcard_user',
    password: process.env.DB_PASSWORD || 'GiftCard_User_2024!',
    database: process.env.DB_NAME || 'gift_card_system'
  };
};

// 初始化数据库连接
async function initDatabase() {
  const dbConfig = getDbConfig();
  let retries = 15; // 增加重试次数
  let connected = false;
  let db;

  while (retries > 0 && !connected) {
    try {
      // 添加连接超时设置和字符集设置
      db = await mysql.createConnection({
        ...dbConfig,
        connectTimeout: 10000, // 10秒连接超时
        debug: process.env.NODE_ENV === 'development',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci'
      });

      connected = true;

      // 测试数据库连接
      const [testResult] = await db.execute('SELECT 1 as test');

      // 创建数据库表
      await createTables(db);
      await createDefaultAdmin(db);

      return db; // 返回数据库连接对象
    } catch (error) {
      retries--;
      if (retries > 0) {
        const waitTime = 5000; // 5秒
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw new Error('无法连接到数据库，请检查配置和网络连接');
      }
    }
  }
}

// 创建数据库表
async function createTables(db) {
  // 会员表
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

  // 登录记录表
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

  // 二次验证表
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

  // 礼品卡分类表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gift_card_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  // 礼品卡表
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

  // 签到记录表
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

  // 管理员表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('super','admin') NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  // IP黑名单表
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
}

// 创建默认管理员账号
async function createDefaultAdmin(db) {
  try {
    const [existing] = await db.execute('SELECT id FROM admins WHERE username = ?', ['admin']);
    if (existing.length === 0) {
      // 使用MD5加密密码（在实际生产环境中应使用更安全的方法）
      const hashedPassword = crypto.createHash('md5').update('admin123').digest('hex');
      await db.execute('INSERT INTO admins (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'super']);
    }
  } catch (error) {
    console.error('创建默认管理员失败:', error);
  }
}

// 获取数据库连接池
function getDbPool() {
  const dbConfig = getDbConfig();
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
  });
}

module.exports = {
  initDatabase,
  getDbPool,
  getDbConfig
};