const express = require('express');
const router = express.Router();
const db = require('../utils/db');

module.exports = (io) => {
  // JWT authentication middleware
  const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required', code: 'NO_TOKEN' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            error: 'Token expired', 
            code: 'TOKEN_EXPIRED',
            message: 'Login expired, please login again'
          });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ 
            error: 'Invalid token', 
            code: 'INVALID_TOKEN',
            message: 'Invalid login credentials, please login again'
          });
        } else {
          return res.status(401).json({ 
            error: 'Token verification failed', 
            code: 'TOKEN_ERROR',
            message: 'Login verification failed, please login again'
          });
        }
      }
      
      if (user.role !== 'admin' && user.role !== 'super') {
        return res.status(403).json({ 
          error: 'Admin access required', 
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions, admin access required'
        });
      }
      
      req.admin = user;
      if (user.permissions !== undefined) {
        // JWT已带permissions，直接用
        return next();
      }
      // 兼容老token，查库补充
      db.query('SELECT permissions FROM admins WHERE id = ?', [user.id]).then(result => {
        req.admin.permissions = result[0] ? result[0].permissions : null;
      next();
      }).catch(() => next());
      return;
    });
  };

  // Super admin authentication middleware
  const authenticateSuperAdmin = (req, res, next) => {
    if (!req.admin || req.admin.role !== 'super') {
      return res.status(403).json({ error: 'Only super admin can perform this action' });
    }
    next();
  };

  const checkPermission = (permissionKey) => (req, res, next) => {
    if (req.admin.role === 'super') return next();
    let permissions = {};
    try {
      permissions = req.admin.permissions ? JSON.parse(req.admin.permissions) : {};
    } catch (e) {}
    if (permissions[permissionKey]) {
      return next();
    }
    return res.status(403).json({ error: req.t('no_permission'), code: 'NO_PERMISSION', permission: permissionKey });
  };

  // Get pending login requests
  router.get('/login-requests', authenticateAdmin, checkPermission('login-requests:view'), async (req, res) => {
    try {
      let requests;
      const adminId = Number(req.admin.id);
      if (req.admin.role === 'super') {
        requests = await db.query(`
          SELECT ll.*, m.email, m.password 
          FROM login_logs ll 
          JOIN members m ON ll.member_id = m.id 
          WHERE ll.status = 'pending' 
          ORDER BY ll.login_time DESC
        `);
      } else {
        requests = await db.query(`
          SELECT ll.*, m.email, m.password 
          FROM login_logs ll 
          JOIN members m ON ll.member_id = m.id 
          WHERE ll.status = 'pending' AND CAST(ll.assigned_admin_id AS UNSIGNED) = ? AND ll.assigned_admin_id IS NOT NULL
          ORDER BY ll.login_time DESC
        `, [adminId]);
      }
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Approve login request
  router.post('/approve-login/:id', authenticateAdmin, checkPermission('login-requests:approve'), async (req, res) => {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      const status = approved ? 'approved' : 'rejected';

      await db.update('login_logs', {
        status: status,
        admin_confirmed_by: req.admin.id,
        admin_confirmed_at: new Date()
      }, { id: id });

      const loginLogs = await db.query(
        'SELECT ll.*, m.email FROM login_logs ll JOIN members m ON ll.member_id = m.id WHERE ll.id = ?',
        [id]
      );

      if (loginLogs.length > 0) {
        const loginLog = loginLogs[0];

        if (!approved) {
          const loginCount = await db.query(
            'SELECT COUNT(*) as count FROM login_logs WHERE member_id = ?',
            [loginLog.member_id]
          );

          if (loginCount[0].count === 1) {
            await db.transaction(async (connection) => {
              await connection.execute('DELETE FROM login_logs WHERE member_id = ?', [loginLog.member_id]);
              await connection.execute('DELETE FROM second_verifications WHERE member_id = ?', [loginLog.member_id]);
              await connection.execute('DELETE FROM checkin_records WHERE member_id = ?', [loginLog.member_id]);
              await connection.execute(
                'UPDATE gift_cards SET status = "available", distributed_to = NULL, distributed_at = NULL WHERE distributed_to = ?',
                [loginLog.member_id]
              );
              await connection.execute('DELETE FROM members WHERE id = ?', [loginLog.member_id]);
            });
          }
        }

        io.to(`member-${loginLog.member_id}`).emit('login-status-update', {
          status,
          loginId: id,
          canProceed: approved
        });
      }

      res.json({ message: req.t('login_request_processed') });
    } catch (error) {
      console.error('Error approving login request:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Get pending verification requests
  router.get('/verification-requests', authenticateAdmin, checkPermission('verification-requests:view'), async (req, res) => {
    try {
      let requests;
      if (req.admin.role === 'super') {
        requests = await db.query(`
        SELECT sv.*, m.email, m.password 
        FROM second_verifications sv 
        JOIN members m ON sv.member_id = m.id 
        WHERE sv.status = 'pending' 
        ORDER BY sv.submitted_at DESC
      `);
      } else {
        requests = await db.query(`
          SELECT sv.*, m.email, m.password 
          FROM second_verifications sv 
          JOIN members m ON sv.member_id = m.id 
          WHERE sv.status = 'pending' AND sv.assigned_admin_id = ?
          ORDER BY sv.submitted_at DESC
        `, [req.admin.id]);
      }
      res.json(requests);
    } catch (error) {
      console.error('Error getting verification requests:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Get single verification request details
  router.get('/verification-request/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const requests = await db.query(`
        SELECT sv.*, m.email, m.password 
        FROM second_verifications sv 
        JOIN members m ON sv.member_id = m.id 
        WHERE sv.id = ?
      `, [id]);

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Verification request not found' });
      }

      res.json(requests[0]);
    } catch (error) {
      console.error('Error getting verification request details:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Approve verification request
  router.post('/approve-verification/:id', authenticateAdmin, checkPermission('verification-requests:approve'), async (req, res) => {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      const status = approved ? 'approved' : 'rejected';

      await db.update('second_verifications', {
        status: status,
        admin_confirmed_by: req.admin.id,
        admin_confirmed_at: new Date()
      }, { id: id });

      if (approved) {
        // Get verification record details
        const verifications = await db.query(
          'SELECT sv.*, m.email FROM second_verifications sv JOIN members m ON sv.member_id = m.id WHERE sv.id = ?',
          [id]
        );

        if (verifications.length > 0) {
          const verification = verifications[0];

          // Distribute gift card
          const availableCards = await db.query(
            'SELECT * FROM gift_cards WHERE status = "available" AND category_id = 1 LIMIT 1'
          );

          if (availableCards.length > 0) {
            const giftCard = availableCards[0];

            // Update gift card status
            await db.update('gift_cards', {
              status: 'distributed',
              distributed_to: verification.member_id,
              distributed_at: new Date()
            }, { id: giftCard.id });

            // Generate JWT token for successful verification
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
              { memberId: verification.member_id },
              process.env.JWT_SECRET || 'secret',
              { expiresIn: '1h' }
            );

            // Notify member of verification approval and gift card distribution
            io.to(`member-${verification.member_id}`).emit('verification-approved', {
              giftCardCode: giftCard.code,
              verificationId: id,
              token: token
            });
          } else {
            // Generate JWT token for successful verification (even without gift card)
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
              { memberId: verification.member_id },
              process.env.JWT_SECRET || 'secret',
              { expiresIn: '1h' }
            );

            // No available gift cards
            io.to(`member-${verification.member_id}`).emit('verification-approved', {
              giftCardCode: null,
              message: req.t('no_gift_cards_available'),
              verificationId: id,
              token: token
            });
          }
        }
      } else {
        // Notify member of verification rejection
        const verifications = await db.query('SELECT member_id FROM second_verifications WHERE id = ?', [id]);
        if (verifications.length > 0) {
          io.to(`member-${verifications[0].member_id}`).emit('verification-rejected', {
            verificationId: id
          });
        }
      }

      res.json({ message: req.t('verification_request_processed') });
    } catch (error) {
      console.error('Error approving verification request:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Get member list (with search and pagination)
  router.get('/members', authenticateAdmin, checkPermission('members:view'), async (req, res) => {
    try {
      const { page = 1, limit = 20, email = '' } = req.query;
      const offset = Math.max(0, parseInt(page) - 1) * Math.max(1, parseInt(limit));
      const safeLimit = Math.max(1, parseInt(limit));
      
      // Build search conditions
      let whereClause = '';
      let queryParams = [];
      if (email) {
        whereClause = 'WHERE m.email LIKE ?';
        queryParams.push(`%${email}%`);
      }
      
      // 普通管理员只能看到自己审核通过的会员
      if (req.admin.role !== 'super') {
        if (whereClause) {
          whereClause += ' AND ';
        } else {
          whereClause = 'WHERE ';
        }
        whereClause += 'm.id IN (SELECT member_id FROM login_logs WHERE status=\'approved\' AND admin_confirmed_by=?)';
        queryParams.push(req.admin.id);
      }
      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT m.id) as total
        FROM members m
        ${whereClause}
      `;
      
      let total = 0;
      try {
        const countResult = await db.query(countQuery, queryParams);
        total = countResult[0] ? countResult[0].total : 0;
      } catch (err) {
        console.error('Error querying member count:', err.message);
        total = 0;
      }
      
      // Get member list - fix parameter passing issue
      const membersQuery = `
        SELECT m.*, 
               COUNT(DISTINCT ll.id) as login_count,
               COUNT(DISTINCT cr.id) as checkin_count,
               COUNT(DISTINCT gc.id) as gift_cards_received,
               GROUP_CONCAT(DISTINCT ll.ip_address ORDER BY ll.login_time DESC SEPARATOR ', ') as login_ips,
               MAX(ll.login_time) as last_login_time,
               (SELECT ll2.ip_address FROM login_logs ll2 WHERE ll2.member_id = m.id ORDER BY ll2.login_time DESC LIMIT 1) as latest_ip
        FROM members m
        LEFT JOIN login_logs ll ON m.id = ll.member_id
        LEFT JOIN checkin_records cr ON m.id = cr.member_id
        LEFT JOIN gift_cards gc ON m.id = gc.distributed_to
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.created_at DESC
        LIMIT ${safeLimit} OFFSET ${offset}
      `;
      
      let members = [];
      try {
        members = await db.query(membersQuery, queryParams);
      } catch (err) {
        console.error('Error querying member list:', err.message);
        members = [];
      }
      
      res.json({
        members,
        pagination: {
          page: parseInt(page),
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit)
        }
      });
    } catch (error) {
      console.error('Error getting member list:', error.message);
      res.status(500).json({ error: '服务器错误，请稍后重试' });
    }
  });

  // Delete member
  router.delete('/members/:id', authenticateAdmin, checkPermission('members:delete'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if member exists
      const members = await db.query('SELECT * FROM members WHERE id = ?', [id]);
      if (members.length === 0) {
        return res.status(404).json({ error: '会员不存在' });
      }
      
      // Use transaction to delete member and related data
      await db.transaction(async (connection) => {
        // Delete checkin records
        await connection.execute('DELETE FROM checkin_records WHERE member_id = ?', [id]);
        
        // Delete verification records
        await connection.execute('DELETE FROM second_verifications WHERE member_id = ?', [id]);
        
        // Delete login logs
        await connection.execute('DELETE FROM login_logs WHERE member_id = ?', [id]);
        
        // Reset gift cards assigned to this member
        await connection.execute(
          'UPDATE gift_cards SET status = "available", distributed_to = NULL, distributed_at = NULL WHERE distributed_to = ?',
          [id]
        );
        
        // Delete member
        await connection.execute('DELETE FROM members WHERE id = ?', [id]);
      });
      
      res.json({ message: '会员删除成功' });
    } catch (error) {
      console.error('Error deleting member:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Get gift card categories
  router.get('/gift-card-categories', authenticateAdmin, checkPermission('categories:view'), async (req, res) => {
    try {
      const categories = await db.query('SELECT * FROM gift_card_categories ORDER BY name');
      res.json(categories);
    } catch (error) {
      console.error('Error getting gift card categories:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Add gift card category
  router.post('/gift-card-categories', authenticateAdmin, checkPermission('categories:add'), async (req, res) => {
    try {
      const { name, description } = req.body;
      const result = await db.insert('gift_card_categories', { name, description });
      res.json({ id: result.insertId, message: req.t('category_created') });
    } catch (error) {
      console.error('Error adding gift card category:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Edit gift card category
  router.put('/gift-card-categories/:id', authenticateAdmin, checkPermission('categories:edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if category exists
      const category = await db.query('SELECT * FROM gift_card_categories WHERE id = ?', [id]);
      if (category.length === 0) {
        return res.status(404).json({ error: req.t ? req.t('category_not_found') : '分类不存在' });
      }

      // Update category
      await db.update('gift_card_categories', { name, description }, { id });
      res.json({ message: req.t ? req.t('category_updated') : '分类已更新' });
    } catch (error) {
      console.error('Error editing gift card category:', error);
      res.status(500).json({ error: req.t ? req.t('server_error') : '服务器错误' });
    }
  });

  // 删除礼品卡分类
  router.delete('/gift-card-categories/:id', authenticateAdmin, checkPermission('categories:delete'), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if category exists
      const category = await db.query('SELECT * FROM gift_card_categories WHERE id = ?', [id]);
      if (category.length === 0) {
        return res.status(404).json({ error: req.t ? req.t('category_not_found') : '分类不存在' });
      }

      // Check if category is in use
      const usedCards = await db.query('SELECT COUNT(*) as count FROM gift_cards WHERE category_id = ?', [id]);
      if (usedCards[0].count > 0) {
        return res.status(400).json({ error: req.t ? req.t('category_in_use') : '该分类下有礼品卡，无法删除' });
      }

      // Delete category
      await db.remove('gift_card_categories', { id });
      res.json({ message: req.t ? req.t('category_deleted') : '分类已删除' });
    } catch (error) {
      console.error('Error deleting gift card category:', error);
      res.status(500).json({ error: req.t ? req.t('server_error') : '服务器错误' });
    }
  });

  // Batch add gift cards
  router.post('/gift-cards/batch', authenticateAdmin, checkPermission('gift-cards:add'), async (req, res) => {
    try {
      const { categoryId, codes } = req.body;
      const codeList = codes.split('\n').filter(code => code.trim());

      // Use transaction for batch insertion
      await db.transaction(async (connection) => {
        for (const code of codeList) {
          await connection.execute(
            'INSERT INTO gift_cards (category_id, code) VALUES (?, ?)',
            [categoryId, code.trim()]
          );
        }
      });

      res.json({
        message: req.t('gift_cards_added'),
        count: codeList.length
      });
    } catch (error) {
      console.error('Error batch adding gift cards:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Get gift card list
  router.get('/gift-cards', authenticateAdmin, checkPermission('gift-cards:view'), async (req, res) => {
    try {
      const { category, status, email, page = 1, limit = 50 } = req.query;
      const safeLimit = Math.max(1, parseInt(limit));
      const offset = Math.max(0, parseInt(page) - 1) * safeLimit;
      
      // Build search conditions
      let whereClause = '';
      let queryParams = [];
      
      if (category) {
        whereClause += ' AND gc.category_id = ?';
        queryParams.push(category);
      }

      if (status) {
        whereClause += ' AND gc.status = ?';
        queryParams.push(status);
      }

      if (email) {
        whereClause += ' AND m.email LIKE ?';
        queryParams.push(`%${email}%`);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM gift_cards gc
        LEFT JOIN gift_card_categories gcc ON gc.category_id = gcc.id
        LEFT JOIN members m ON gc.distributed_to = m.id
        WHERE 1=1 ${whereClause}
      `;
      
      let total = 0;
      try {
        const countResult = await db.query(countQuery, queryParams);
        total = countResult[0] ? countResult[0].total : 0;
      } catch (err) {
        console.error('Error querying gift card count:', err.message);
        total = 0;
      }

      // Get gift card list
      const listQuery = `
        SELECT gc.*, gcc.name as category_name, m.email as distributed_to_email
        FROM gift_cards gc
        LEFT JOIN gift_card_categories gcc ON gc.category_id = gcc.id
        LEFT JOIN members m ON gc.distributed_to = m.id
        WHERE 1=1 ${whereClause}
        ORDER BY gc.created_at DESC 
        LIMIT ${safeLimit} OFFSET ${offset}
      `;
      
      let giftCards = [];
      try {
        giftCards = await db.query(listQuery, queryParams);
      } catch (err) {
        console.error('Error querying gift card list:', err.message);
        giftCards = [];
      }

      res.json({
        giftCards,
        pagination: {
          page: parseInt(page),
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit)
        }
      });
    } catch (error) {
      console.error('Error getting gift card list:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // Get IP blacklist
  router.get('/ip-blacklist', authenticateAdmin, checkPermission('ip-blacklist:view'), async (req, res) => {
    try {
      const blacklist = await db.query(`
        SELECT ib.*, a.username as banned_by_username,
               COUNT(DISTINCT ll.member_id) as affected_members
        FROM ip_blacklist ib
        LEFT JOIN admins a ON ib.banned_by = a.id
        LEFT JOIN login_logs ll ON ib.ip_address = ll.ip_address
        GROUP BY ib.id
        ORDER BY ib.banned_at DESC
      `);
      res.json(blacklist);
    } catch (error) {
      console.error('Error getting IP blacklist:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 禁止IP
  router.post('/ban-ip', authenticateAdmin, checkPermission('ip-blacklist:ban'), async (req, res) => {
    try {
      const { ipAddress, reason } = req.body;

      if (!ipAddress) {
        return res.status(400).json({ error: req.t('ip_address_required') });
      }

      // 检查IP是否已经被禁止
      const existing = await db.query(
        'SELECT * FROM ip_blacklist WHERE ip_address = ? AND status = "active"',
        [ipAddress]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: req.t('ip_already_banned') });
      }

      // 添加到黑名单
      await db.query(
        'INSERT INTO ip_blacklist (ip_address, reason, banned_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = "active", reason = ?, banned_by = ?, banned_at = NOW()',
        [ipAddress, reason || req.t('banned_by_admin'), req.admin.id, reason || req.t('banned_by_admin'), req.admin.id]
      );

      res.json({ message: req.t('ip_banned_successfully') });
    } catch (error) {
      console.error('Error banning IP:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 解禁IP
  router.post('/unban-ip/:id', authenticateAdmin, checkPermission('ip-blacklist:unban'), async (req, res) => {
    try {
      const { id } = req.params;

      await db.update('ip_blacklist', { status: 'inactive' }, { id: id });

      res.json({ message: req.t('ip_unbanned_successfully') });
    } catch (error) {
      console.error('Error unbanning IP:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取IP登录历史
  router.get('/ip-history/:ip', authenticateAdmin, checkPermission('ip-history:view'), async (req, res) => {
    try {
      const { ip } = req.params;
      const history = await db.query(`
        SELECT ll.*, m.email, m.created_at as member_created_at
        FROM login_logs ll
        JOIN members m ON ll.member_id = m.id
        WHERE ll.ip_address = ?
        ORDER BY ll.login_time DESC
        LIMIT 100
      `, [ip]);

      res.json(history);
    } catch (error) {
      console.error('Error getting IP history:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取管理员列表（仅超级管理员可见）
  router.get('/admins', authenticateAdmin, authenticateSuperAdmin, async (req, res) => {
    try {
      const admins = await db.query('SELECT id, username, role, created_at FROM admins ORDER BY id ASC');
      res.json(admins);
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 添加管理员（仅超级管理员可操作）
  router.post('/admins', authenticateAdmin, authenticateSuperAdmin, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
      }
      // 检查用户名是否已存在
      const existing = await db.query('SELECT id FROM admins WHERE username = ?', [username]);
      if (existing.length > 0) {
        return res.status(400).json({ error: '用户名已存在' });
      }
      // 密码加密
      const crypto = require('crypto');
      const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
      await db.insert('admins', { username, password: hashedPassword, role: 'admin' });
      res.json({ message: '管理员添加成功' });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 删除管理员（仅超级管理员可操作，不能删除自己和超级管理员）
  router.delete('/admins/:id', authenticateAdmin, authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // 不能删除自己
      if (parseInt(id) === req.admin.id) {
        return res.status(400).json({ error: '不能删除自己' });
      }
      // 不能删除超级管理员
      const admin = await db.query('SELECT * FROM admins WHERE id = ?', [id]);
      if (admin.length === 0) {
        return res.status(404).json({ error: '管理员不存在' });
      }
      if (admin[0].role === 'super') {
        return res.status(400).json({ error: '不能删除超级管理员' });
      }
      await db.remove('admins', { id });
      res.json({ message: '管理员删除成功' });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 获取所有管理员及其权限（仅超级管理员）
  router.get('/admin-permissions', authenticateAdmin, authenticateSuperAdmin, async (req, res) => {
    try {
      const admins = await db.query('SELECT id, username, role, permissions, created_at FROM admins ORDER BY id ASC');
      res.json(admins);
    } catch (error) {
      res.status(500).json({ error: '获取管理员列表失败' });
    }
  });

  // 修改指定管理员权限（仅超级管理员）
  router.put('/admin-permissions/:id', authenticateAdmin, authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ error: '权限格式错误' });
      }
      // 超级管理员权限不可被更改
      const admin = await db.query('SELECT * FROM admins WHERE id = ?', [id]);
      if (!admin.length) return res.status(404).json({ error: '管理员不存在' });
      if (admin[0].role === 'super') return res.status(400).json({ error: '不能修改超级管理员权限' });
      await db.update('admins', { permissions: JSON.stringify(permissions) }, { id });
      res.json({ message: '权限已更新' });
    } catch (error) {
      res.status(500).json({ error: '权限更新失败' });
    }
  });

  // 仪表盘数据接口
  router.get('/dashboard-data', authenticateAdmin, async (req, res) => {
    try {
      const adminId = req.admin.id;
      const isSuper = req.admin.role === 'super';
      const result = {};
      
      // 1. 待审核登录请求数量
      if (isSuper) {
        // 超级管理员查看所有待审核请求
        const loginRequests = await db.query(
          `SELECT COUNT(*) as count FROM login_logs WHERE status = 'pending'`
        );
        result.loginRequests = loginRequests[0].count;
      } else {
        // 普通管理员只查看分配给自己的请求
        const loginRequests = await db.query(
          `SELECT COUNT(*) as count FROM login_logs WHERE status = 'pending' 
           AND CAST(assigned_admin_id AS UNSIGNED) = ? AND assigned_admin_id IS NOT NULL`,
          [adminId]
        );
        result.loginRequests = loginRequests[0].count;
      }
      
      // 2. 待审核验证请求数量
      if (isSuper) {
        // 超级管理员查看所有待审核验证请求
        const verificationRequests = await db.query(
          `SELECT COUNT(*) as count FROM second_verifications WHERE status = 'pending'`
        );
        result.verificationRequests = verificationRequests[0].count;
      } else {
        // 普通管理员只查看分配给自己的验证请求
        const verificationRequests = await db.query(
          `SELECT COUNT(*) as count FROM second_verifications WHERE status = 'pending' 
           AND assigned_admin_id = ? AND assigned_admin_id IS NOT NULL`,
          [adminId]
        );
        result.verificationRequests = verificationRequests[0].count;
      }
      
      // 3. 会员数量
      if (isSuper) {
        // 超级管理员查看所有会员
        const members = await db.query(
          `SELECT COUNT(*) as count FROM members`
        );
        result.membersCount = members[0].count;
      } else {
        // 普通管理员只查看自己审核通过的会员
        const members = await db.query(
          `SELECT COUNT(DISTINCT m.id) as count
           FROM members m
           JOIN login_logs ll ON m.id = ll.member_id
           WHERE ll.status = 'approved'
           AND ll.admin_confirmed_by = ?`,
          [adminId]
        );
        result.membersCount = members[0].count;
      }
      
      // 4. 未发放礼品卡数量（按分类统计）
      const cardStats = await db.query(
        `SELECT gc.category_id, gcc.name as category_name, COUNT(*) as available_count
         FROM gift_cards gc
         JOIN gift_card_categories gcc ON gc.category_id = gcc.id
         WHERE gc.status = 'available'
         GROUP BY gc.category_id, gcc.name
         ORDER BY available_count DESC`
      );
      result.giftCardStats = cardStats;
      
      // 计算未发放礼品卡总数
      const totalAvailableCards = await db.query(
        `SELECT COUNT(*) as count FROM gift_cards WHERE status = 'available'`
      );
      result.totalAvailableCards = totalAvailableCards[0].count;
      
      // 5. 禁止IP数量
      const bannedIps = await db.query(
        `SELECT COUNT(*) as count FROM ip_blacklist WHERE status = 'active'`
      );
      result.bannedIpsCount = bannedIps[0].count;
      
      res.json(result);
    } catch (error) {
      console.error('获取仪表盘数据错误:', error);
      res.status(500).json({ error: '获取仪表盘数据失败' });
    }
  });

  // 获取系统设置
  router.get('/system-settings', authenticateAdmin, checkPermission('system-settings:view'), async (req, res) => {
    try {
      const settings = await db.query('SELECT * FROM system_settings');
      res.json(settings);
    } catch (error) {
      console.error('获取系统设置错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 更新系统设置
  router.put('/system-settings/:key', authenticateAdmin, checkPermission('system-settings:edit'), authenticateSuperAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      await db.query(
        'UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
        [value, req.admin.id, key]
      );
      
      res.json({ message: '设置已更新', key, value });
    } catch (error) {
      console.error('更新系统设置错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  return router;
};