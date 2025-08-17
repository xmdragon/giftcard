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

// Database modules
const { initDatabase } = require('./utils/db-init');
const db = require('./utils/db');

// EJS template engine setup
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize i18next
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
      caches: []
    }
  });

app.use(middleware.handle(i18next));

// Language detection based on IP and system settings
app.use(async (req, res, next) => {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip && ip.startsWith('::ffff:')) ip = ip.substring(7);
  const geo = geoip.lookup(ip);
  let lang = 'en';
  let isChineseIP = false;
  
  if (geo && geo.country) {
    if (geo.country === 'CN') {
      lang = 'zh';
      isChineseIP = true;
    }
    else if (geo.country === 'JP') lang = 'ja';
    else if (geo.country === 'KR') lang = 'ko';
  }
  
  try {
    // 获取系统语言设置
    const langSettings = await db.execute('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['default_language']);
    const defaultLanguage = langSettings && langSettings.length > 0 ? langSettings[0].setting_value : 'auto';
    
    // 如果设置为自动，则根据IP归属地确定语言
    if (defaultLanguage === 'auto') {
      res.locals.recommendLang = lang;
    } else {
      // 如果指定了特定语言，则使用指定的语言
      res.locals.recommendLang = defaultLanguage;
    }
    
    if (isChineseIP) {
      const [settings] = await db.execute('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['block_cn_ip']);
      if (settings && settings.length > 0) {
        const blockCnIP = settings[0].setting_value === 'true';
        res.locals.blockChineseIP = blockCnIP;
      } else {
        res.locals.blockChineseIP = false; // Default not blocked, fixed logic
      }
    } else {
      res.locals.blockChineseIP = false;
    }
  } catch (error) {
    console.error('Failed to get system settings:', error);
    res.locals.blockChineseIP = false; // Don't block on error
    res.locals.recommendLang = lang; // Fallback to IP-based detection
  }
  
  res.locals.isChineseIP = isChineseIP;
  next();
});

// JWT authentication middleware
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

const onlineAdmins = new Map(); // adminId -> {socket, username}
let adminAssignPointer = 0;
app.locals.onlineAdmins = onlineAdmins;
app.locals.adminAssignPointer = adminAssignPointer;
app.locals.assignAdminForLogin = assignAdminForLogin(db, app);

function assignAdminForLogin(db, app) {
  return async function() {
    const onlineAdmins = app.locals.onlineAdmins;
    const adminIds = Array.from(onlineAdmins ? onlineAdmins.keys() : []);
    if (adminIds.length === 0) return null;
    const counts = {};
    for (const id of adminIds) {
      const rows = await db.query('SELECT COUNT(*) as cnt FROM login_logs WHERE status = "pending" AND assigned_admin_id = ?', [id]);
      counts[id] = rows[0] ? rows[0].cnt : 0;
    }
    let min = Math.min(...Object.values(counts));
    let candidates = adminIds.filter(id => counts[id] === min);
    let pointer = app.locals.adminAssignPointer || 0;
    let pick = candidates[pointer % candidates.length];
    app.locals.adminAssignPointer = (pointer + 1) % candidates.length;
    return pick;
  };
}

io.on('connection', (socket) => {
  socket.on('join-admin', async (adminInfo) => {
    if (!adminInfo || !adminInfo.id || (adminInfo.role !== 'admin' && adminInfo.role !== 'super')) {
      return;
    }
    app.locals.onlineAdmins.set(adminInfo.id, { socket, username: adminInfo.username });
    socket.adminId = adminInfo.id;
    socket.join('admin'); // Let admin join admin room
    socket.on('disconnect', () => {
      app.locals.onlineAdmins.delete(adminInfo.id);
    });
  });
  socket.on('join-member', (memberId) => {
    if (memberId) {
      socket.join(`member-${memberId}`);
    }
  });
});

// Route modules
const createMemberAuthRoutes = require('./routes/member-auth');
const createAdminAuthRoutes = require('./routes/admin-auth');
const createAdminRoutes = require('./routes/admin');
const createAdminSecurityRoutes = require('./routes/admin-security');
const createMemberRoutes = require('./routes/member');
const createTrackingRoutes = require('./routes/tracking');

// Start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    
    // Create routes
    const memberAuthRoutes = createMemberAuthRoutes(io);
    const adminAuthRoutes = createAdminAuthRoutes(io);
    const adminRoutes = createAdminRoutes(io);
    const adminSecurityRoutes = createAdminSecurityRoutes();
    const memberRoutes = createMemberRoutes(io);
    const trackingRoutes = createTrackingRoutes(io);
    
    // Use routes
    app.use('/api/auth/member', memberAuthRoutes);
    app.use('/api/auth/admin', adminAuthRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/admin/security', adminSecurityRoutes);
    app.use('/api/member', memberRoutes);
    app.use('/api/tracking', trackingRoutes);
    
    // Health check route
    app.get('/health', async (req, res) => {
      try {
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

    // Admin page routes
    app.get(['/admin', '/admin.html'], (req, res) => {
      res.render('admin');
    });

    // Favicon route
    app.get('/favicon.ico', (req, res) => {
      res.sendFile(path.join(__dirname, 'favicon.ico'));
    });
    
    app.get('/', (req, res) => {
      res.render('index', { title: '礼品卡发放系统' });
    });

    app.get('/gc', async (req, res) => {
      try {
        // 获取WhatsApp和Telegram配置
        const settings = await db.query('SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?)', ['whatsapp_link', 'telegram_link']);
        
        let whatsappLink = '';
        let telegramLink = '';
        
        settings.forEach(setting => {
          if (setting.setting_key === 'whatsapp_link') {
            whatsappLink = setting.setting_value;
          } else if (setting.setting_key === 'telegram_link') {
            telegramLink = setting.setting_value;
          }
        });
        
        res.render('gc', { whatsappLink, telegramLink });
      } catch (error) {
        console.error('获取联系方式配置失败:', error);
        // 如果获取失败，使用默认空值
        res.render('gc', { whatsappLink: '', telegramLink: '' });
      }
    });

    app.get('/test-cn', async (req, res) => {
      res.locals.isChineseIP = true;
      res.locals.recommendLang = 'zh';  // 设置推荐语言为中文
      
          try {
        const [settings] = await db.execute('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['block_cn_ip']);
        if (settings && settings.length > 0) {
          const blockCnIP = settings[0].setting_value === 'true';
          res.locals.blockChineseIP = blockCnIP;
        } else {
          res.locals.blockChineseIP = false; // 默认不阻止，与主逻辑保持一致
        }
      } catch (error) {
        console.error('获取系统设置失败:', error);
        res.locals.blockChineseIP = false; // 出错时不阻止
      }
      
      res.render('index', { title: '礼品卡发放系统' });
    });

    
    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
startServer();

module.exports = { app, db, io };