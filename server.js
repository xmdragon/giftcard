const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
require('dotenv').config();

// 导入数据库模块
const { initDatabase } = require('./utils/db-init');
const db = require('./utils/db');

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
    // 初始化数据库
    await initDatabase();
    
    console.log('数据库初始化完成，创建路由...');
    
    // 测试数据库连接
    try {
      const testResult = await db.query('SELECT 1 as test');
      console.log(`数据库测试查询结果: ${JSON.stringify(testResult)}`);
    } catch (dbError) {
      console.error('数据库测试查询失败:', dbError);
      throw dbError;
    }
    
    // 创建路由
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
    app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    });

    // 默认路由
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
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