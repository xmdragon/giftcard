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

// Language detection based on IP
app.use((req, res, next) => {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip && ip.startsWith('::ffff:')) ip = ip.substring(7);
  const geo = geoip.lookup(ip);
  let lang = 'en';
  if (geo && geo.country) {
    if (geo.country === 'CN') lang = 'zh';
    else if (geo.country === 'JP') lang = 'ja';
  }
  res.locals.recommendLang = lang;
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  socket.on('join-member', (memberId) => {
    socket.join(`member-${memberId}`);
  });
  
  socket.on('join-admin', () => {
    socket.join('admin');
  });
});

// Route modules
const createMemberAuthRoutes = require('./routes/member-auth');
const createAdminAuthRoutes = require('./routes/admin-auth');
const createAdminRoutes = require('./routes/admin');
const createMemberRoutes = require('./routes/member');

// Start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    
    // Create routes
    const memberAuthRoutes = createMemberAuthRoutes(io);
    const adminAuthRoutes = createAdminAuthRoutes(io);
    const adminRoutes = createAdminRoutes(io);
    const memberRoutes = createMemberRoutes(io);
    
    // Use routes
    app.use('/api/auth/member', memberAuthRoutes);
    app.use('/api/auth/admin', adminAuthRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/member', memberRoutes);
    
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
    
    // Default route
    app.get('/', (req, res) => {
      res.render('index', { title: '首页', user: req.user });
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