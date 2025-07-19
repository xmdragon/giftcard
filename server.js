const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const geoip = require('geoip-lite');
require('dotenv').config();

// 导入数据库模块
const { initDatabase } = require('./utils/db-init');
const db = require('./utils/db');

// 集成EJS模板引擎
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// 根据IP判断推荐语言
app.use((req, res, next) => {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip && ip.startsWith('::ffff:')) ip = ip.substring(7);
  const geo = geoip.lookup(ip);
  let lang = 'en'; // 默认英文
  if (geo && geo.country) {
    if (geo.country === 'CN') lang = 'zh';
    else if (geo.country === 'JP') lang = 'ja';
  }
  res.locals.recommendLang = lang;
  next();
});

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
const createMemberAuthRoutes = require('./routes/member-auth');
const createAdminAuthRoutes = require('./routes/admin-auth');
const createAdminRoutes = require('./routes/admin');
const createMemberRoutes = require('./routes/member');

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    
    // 创建路由
    const memberAuthRoutes = createMemberAuthRoutes(io);
    const adminAuthRoutes = createAdminAuthRoutes(io);
    const adminRoutes = createAdminRoutes(io);
    const memberRoutes = createMemberRoutes(io);
    
    // 使用路由
    app.use('/api/auth/member', memberAuthRoutes);
    app.use('/api/auth/admin', adminAuthRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/member', memberRoutes);
    
    // 健康检查路由
    app.get('/health', async (req, res) => {
      try {
        // 测试数据库连接
        await db.query('SELECT 1');
        
        res.status(200).json({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          dbConnected: true
        });
      } catch (error) {
        res.status(500).json({
          status: 'ERROR',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          dbConnected: false,
          error: error.message
        });
      }
    });

    // 管理员页面路由
    app.get(['/admin', '/admin.html'], (req, res) => {
      res.render('admin');
    });

    // favicon.ico路由
    app.get('/favicon.ico', (req, res) => {
      res.sendFile(path.join(__dirname, 'favicon.ico'));
    });
    
    // 默认路由
    app.get('/', (req, res) => {
      res.render('index', { title: '首页', user: req.user });
    });
    
    // 启动HTTP服务器
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

module.exports = { app, db, io };