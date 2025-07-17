const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 初始化i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'zh',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json'
    },
    detection: {
      order: ['header', 'querystring', 'cookie'],
      caches: [] // 禁用缓存
    }
  });

app.use(middleware.handle(i18next));

// 数据库连接
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'gift_card_system'
};

// 打印数据库连接信息（不包含密码）
console.log(`尝试连接到数据库: ${dbConfig.host}, 用户: ${dbConfig.user}, 数据库: ${dbConfig.database}`);

let db;

async function initDatabase() {
  let retries = 10;
  let connected = false;
  
  while (retries > 0 && !connected) {
    try {
      console.log(`尝试连接到数据库: ${dbConfig.host}, 用户: ${dbConfig.user}, 数据库: ${dbConfig.database}, 剩余尝试次数: ${retries}`);
      db = await mysql.createConnection(dbConfig);
      connected = true;
      console.log('数据库连接成功');
      
      // 测试数据库连接
      await db.execute('SELECT 1');
      console.log('数据库连接测试成功');
      
      // 创建数据库表
      await createTables();
      await createDefaultAdmin();
      
      return db; // 返回数据库连接对象
    } catch (error) {
      console.error('数据库连接失败:', error);
      retries--;
      if (retries > 0) {
        console.log(`将在 5 秒后重试连接...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('达到最大重试次数，无法连接到数据库');
        process.exit(1);
      }
    }
  }
}

async function createTables() {
  // 会员表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      status ENUM('active', 'inactive') DEFAULT 'active'
    )
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
    )
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
    )
  `);

  // 礼品卡分类表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gift_card_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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
    )
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
    )
  `);

  // 管理员表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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
    )
  `);

  console.log('数据库表创建完成');
}

async function createDefaultAdmin() {
  const [existing] = await db.execute('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (existing.length === 0) {
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('md5').update('admin123').digest('hex');
    await db.execute('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
    console.log('默认管理员账号创建完成');
  }
}

// JWT验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  socket.on('join-member', (memberId) => {
    socket.join(`member-${memberId}`);
  });
  
  socket.on('join-admin', () => {
    socket.join('admin');
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

// 导入路由函数
const createAuthRoutes = require('./routes/auth');
const createAdminRoutes = require('./routes/admin');
const createMemberRoutes = require('./routes/member');

// 启动服务器
async function startServer() {
  try {
    // 先初始化数据库，并确保获取到数据库连接对象
    db = await initDatabase();
    
    if (!db) {
      throw new Error('数据库连接对象为空');
    }
    
    console.log('数据库连接对象已准备就绪，创建路由...');
    console.log(`数据库对象类型: ${typeof db}`);
    console.log(`数据库对象方法: ${Object.keys(db).join(', ')}`);
    
    // 测试数据库连接
    try {
      const [testResult] = await db.execute('SELECT 1 as test');
      console.log(`数据库测试查询结果: ${JSON.stringify(testResult)}`);
    } catch (dbError) {
      console.error('数据库测试查询失败:', dbError);
      throw dbError;
    }
    
    // 创建路由（不再传递数据库连接对象）
    console.log('创建认证路由...');
    const authRoutes = createAuthRoutes(io);
    console.log('创建管理员路由...');
    const adminRoutes = createAdminRoutes(io);
    console.log('创建会员路由...');
    const memberRoutes = createMemberRoutes(io);
    
    // 使用路由
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/member', memberRoutes);
    
    // 健康检查路由
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dbConnected: !!db
      });
    });

    // 管理员页面路由
    app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    });

    // 默认路由
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // 启动HTTP服务器
    server.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;

// 启动服务器
startServer();

module.exports = { app, db, io };