const express = require('express');
const router = express.Router();
const db = require('../utils/db');

module.exports = (io) => {
  // JWT验证中间件
  const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required', code: 'NO_TOKEN' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (err) {
        // 区分不同类型的 JWT 错误
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            error: 'Token expired', 
            code: 'TOKEN_EXPIRED',
            message: '登录已过期，请重新登录'
          });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ 
            error: 'Invalid token', 
            code: 'INVALID_TOKEN',
            message: '无效的登录凭证，请重新登录'
          });
        } else {
          return res.status(401).json({ 
            error: 'Token verification failed', 
            code: 'TOKEN_ERROR',
            message: '登录验证失败，请重新登录'
          });
        }
      }
      
      // 检查用户角色
      if (user.role !== 'admin' && user.role !== 'super') {
        return res.status(403).json({ 
          error: 'Admin access required', 
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '权限不足，需要管理员权限'
        });
      }
      
      req.admin = user;
      next();
    });
  };

  // 新增：超级管理员权限中间件
  const authenticateSuperAdmin = (req, res, next) => {
    if (!req.admin || req.admin.role !== 'super') {
      return res.status(403).json({ error: 'Only super admin can perform this action' });
    }
    next();
  };

  // 获取待审核的登录请求
  router.get('/login-requests', authenticateAdmin, async (req, res) => {
    try {
      const requests = await db.query(`
        SELECT ll.*, m.email, m.password 
        FROM login_logs ll 
        JOIN members m ON ll.member_id = m.id 
        WHERE ll.status = 'pending' 
        ORDER BY ll.login_time DESC
      `);



      res.json(requests);
    } catch (error) {
      console.error('获取登录请求错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 审核登录请求
  router.post('/approve-login/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      const status = approved ? 'approved' : 'rejected';

      await db.update('login_logs', {
        status: status,
        admin_confirmed_by: req.admin.id,
        admin_confirmed_at: new Date()
      }, { id: id });

      // 获取登录记录详情
      const loginLogs = await db.query(
        'SELECT ll.*, m.email FROM login_logs ll JOIN members m ON ll.member_id = m.id WHERE ll.id = ?',
        [id]
      );

      if (loginLogs.length > 0) {
        const loginLog = loginLogs[0];

        // 如果拒绝登录，检查是否是首次登录，如果是则删除用户
        if (!approved) {
          // 检查用户的登录记录数量
          const loginCount = await db.query(
            'SELECT COUNT(*) as count FROM login_logs WHERE member_id = ?',
            [loginLog.member_id]
          );

          // 如果只有一条登录记录（当前这条），说明是首次登录
          if (loginCount[0].count === 1) {
            // 删除用户相关的所有数据
            await db.transaction(async (connection) => {
              // 删除登录日志
              await connection.execute('DELETE FROM login_logs WHERE member_id = ?', [loginLog.member_id]);

              // 删除二次验证记录
              await connection.execute('DELETE FROM second_verifications WHERE member_id = ?', [loginLog.member_id]);

              // 删除签到记录
              await connection.execute('DELETE FROM checkin_records WHERE member_id = ?', [loginLog.member_id]);

              // 更新礼品卡状态
              await connection.execute(
                'UPDATE gift_cards SET status = "available", distributed_to = NULL, distributed_at = NULL WHERE distributed_to = ?',
                [loginLog.member_id]
              );

              // 最后删除会员记录
              await connection.execute('DELETE FROM members WHERE id = ?', [loginLog.member_id]);
            });
          }
        }

        // 通知会员审核结果
        io.to(`member-${loginLog.member_id}`).emit('login-status-update', {
          status,
          loginId: id,
          canProceed: approved
        });
      }

      res.json({ message: req.t('login_request_processed') });
    } catch (error) {
      console.error('审核登录请求错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取待审核的验证请求
  router.get('/verification-requests', authenticateAdmin, async (req, res) => {
    try {
      const requests = await db.query(`
        SELECT sv.*, m.email, m.password 
        FROM second_verifications sv 
        JOIN members m ON sv.member_id = m.id 
        WHERE sv.status = 'pending' 
        ORDER BY sv.submitted_at DESC
      `);



      res.json(requests);
    } catch (error) {
      console.error('获取验证请求错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取单个验证请求详情
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
      console.error('获取验证请求详情错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 审核验证请求
  router.post('/approve-verification/:id', authenticateAdmin, async (req, res) => {
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
        // 获取验证记录详情
        const verifications = await db.query(
          'SELECT sv.*, m.email FROM second_verifications sv JOIN members m ON sv.member_id = m.id WHERE sv.id = ?',
          [id]
        );

        if (verifications.length > 0) {
          const verification = verifications[0];

          // 分配礼品卡
          const availableCards = await db.query(
            'SELECT * FROM gift_cards WHERE status = "available" AND card_type = "login" LIMIT 1'
          );

          if (availableCards.length > 0) {
            const giftCard = availableCards[0];

            // 更新礼品卡状态
            await db.update('gift_cards', {
              status: 'distributed',
              distributed_to: verification.member_id,
              distributed_at: new Date()
            }, { id: giftCard.id });

            // 通知会员验证通过并发放礼品卡
            io.to(`member-${verification.member_id}`).emit('verification-approved', {
              giftCardCode: giftCard.code,
              verificationId: id
            });
          } else {
            // 没有可用礼品卡
            io.to(`member-${verification.member_id}`).emit('verification-approved', {
              giftCardCode: null,
              message: req.t('no_gift_cards_available'),
              verificationId: id
            });
          }
        }
      } else {
        // 通知会员验证被拒绝
        const verifications = await db.query('SELECT member_id FROM second_verifications WHERE id = ?', [id]);
        if (verifications.length > 0) {
          io.to(`member-${verifications[0].member_id}`).emit('verification-rejected', {
            verificationId: id
          });
        }
      }

      res.json({ message: req.t('verification_request_processed') });
    } catch (error) {
      console.error('审核验证请求错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取会员列表（支持搜索和分页）
  router.get('/members', authenticateAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 20, email = '' } = req.query;
      const offset = Math.max(0, parseInt(page) - 1) * Math.max(1, parseInt(limit));
      const safeLimit = Math.max(1, parseInt(limit));
      
      // 构建搜索条件
      let whereClause = '';
      let queryParams = [];
      if (email) {
        whereClause = 'WHERE m.email LIKE ?';
        queryParams.push(`%${email}%`);
      }
      
      // 获取总数
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
        console.error('会员总数查询错误:', err.message);
        total = 0;
      }
      
      // 获取会员列表 - 修复参数传递问题
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
        console.error('会员列表查询错误:', err.message);
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
      console.error('获取会员列表错误:', error.message);
      res.status(500).json({ error: '服务器错误，请稍后重试' });
    }
  });

  // 删除会员
  router.delete('/members/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // 检查会员是否存在
      const members = await db.query('SELECT * FROM members WHERE id = ?', [id]);
      if (members.length === 0) {
        return res.status(404).json({ error: '会员不存在' });
      }
      
      // 使用事务删除会员及相关数据
      await db.transaction(async (connection) => {
        // 删除签到记录
        await connection.execute('DELETE FROM checkin_records WHERE member_id = ?', [id]);
        
        // 删除二次验证记录
        await connection.execute('DELETE FROM second_verifications WHERE member_id = ?', [id]);
        
        // 删除登录日志
        await connection.execute('DELETE FROM login_logs WHERE member_id = ?', [id]);
        
        // 将分配给该会员的礼品卡状态重置为可用
        await connection.execute(
          'UPDATE gift_cards SET status = "available", distributed_to = NULL, distributed_at = NULL WHERE distributed_to = ?',
          [id]
        );
        
        // 删除会员
        await connection.execute('DELETE FROM members WHERE id = ?', [id]);
      });
      
      res.json({ message: '会员删除成功' });
    } catch (error) {
      console.error('删除会员错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取礼品卡分类
  router.get('/gift-card-categories', authenticateAdmin, async (req, res) => {
    try {
      const categories = await db.query('SELECT * FROM gift_card_categories ORDER BY name');
      res.json(categories);
    } catch (error) {
      console.error('获取礼品卡分类错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 添加礼品卡分类
  router.post('/gift-card-categories', authenticateAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      const result = await db.insert('gift_card_categories', { name, description });
      res.json({ id: result.insertId, message: req.t('category_created') });
    } catch (error) {
      console.error('添加礼品卡分类错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 编辑礼品卡分类
  router.put('/gift-card-categories/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // 检查分类是否存在
      const category = await db.query('SELECT * FROM gift_card_categories WHERE id = ?', [id]);
      if (category.length === 0) {
        return res.status(404).json({ error: req.t ? req.t('category_not_found') : '分类不存在' });
      }

      // 更新分类
      await db.update('gift_card_categories', { name, description }, { id });
      res.json({ message: req.t ? req.t('category_updated') : '分类已更新' });
    } catch (error) {
      console.error('编辑礼品卡分类错误:', error);
      res.status(500).json({ error: req.t ? req.t('server_error') : '服务器错误' });
    }
  });

  // 删除礼品卡分类
  router.delete('/gift-card-categories/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // 检查分类是否存在
      const category = await db.query('SELECT * FROM gift_card_categories WHERE id = ?', [id]);
      if (category.length === 0) {
        return res.status(404).json({ error: req.t ? req.t('category_not_found') : '分类不存在' });
      }

      // 检查分类是否被使用
      const usedCards = await db.query('SELECT COUNT(*) as count FROM gift_cards WHERE category_id = ?', [id]);
      if (usedCards[0].count > 0) {
        return res.status(400).json({ error: req.t ? req.t('category_in_use') : '该分类下有礼品卡，无法删除' });
      }

      // 删除分类
      await db.remove('gift_card_categories', { id });
      res.json({ message: req.t ? req.t('category_deleted') : '分类已删除' });
    } catch (error) {
      console.error('删除礼品卡分类错误:', error);
      res.status(500).json({ error: req.t ? req.t('server_error') : '服务器错误' });
    }
  });

  // 批量添加礼品卡
  router.post('/gift-cards/batch', authenticateAdmin, async (req, res) => {
    try {
      const { categoryId, codes, cardType = 'login' } = req.body;
      const codeList = codes.split('\n').filter(code => code.trim());

      // 使用事务处理批量插入
      await db.transaction(async (connection) => {
        for (const code of codeList) {
          await connection.execute(
            'INSERT INTO gift_cards (category_id, code, card_type) VALUES (?, ?, ?)',
            [categoryId, code.trim(), cardType]
          );
        }
      });

      res.json({
        message: req.t('gift_cards_added'),
        count: codeList.length
      });
    } catch (error) {
      console.error('批量添加礼品卡错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取礼品卡列表
  router.get('/gift-cards', authenticateAdmin, async (req, res) => {
    try {
      const { category, status, page = 1, limit = 50 } = req.query;
      let query = `
        SELECT gc.*, gcc.name as category_name, m.email as distributed_to_email
        FROM gift_cards gc
        LEFT JOIN gift_card_categories gcc ON gc.category_id = gcc.id
        LEFT JOIN members m ON gc.distributed_to = m.id
        WHERE 1=1
      `;
      const params = [];

      if (category) {
        query += ' AND gc.category_id = ?';
        params.push(category);
      }

      if (status) {
        query += ' AND gc.status = ?';
        params.push(status);
      }

      const limitNum = Number(limit);
      const offsetNum = (Number(page) - 1) * Number(limit);

      // 使用具体数字而不是参数占位符，避免类型问题
      query += ` ORDER BY gc.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      // 不再添加这些参数到 params 数组中

      const giftCards = await db.query(query, params);
      res.json(giftCards);
    } catch (error) {
      console.error('获取礼品卡列表错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取IP黑名单
  router.get('/ip-blacklist', authenticateAdmin, async (req, res) => {
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
      console.error('获取IP黑名单错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 禁止IP
  router.post('/ban-ip', authenticateAdmin, async (req, res) => {
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
      console.error('禁止IP错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 解禁IP
  router.post('/unban-ip/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      await db.update('ip_blacklist', { status: 'inactive' }, { id: id });

      res.json({ message: req.t('ip_unbanned_successfully') });
    } catch (error) {
      console.error('解禁IP错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取IP登录历史
  router.get('/ip-history/:ip', authenticateAdmin, async (req, res) => {
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
      console.error('获取IP历史错误:', error);
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

  return router;
};