const express = require('express');
const router = express.Router();

module.exports = (db, io) => {
  // JWT验证中间件
  const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (err || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.admin = user;
      next();
    });
  };

  // 获取待审核的登录请求
  router.get('/login-requests', authenticateAdmin, async (req, res) => {
    try {
      const [requests] = await db.execute(`
        SELECT ll.*, m.email 
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

      await db.execute(
        'UPDATE login_logs SET status = ?, admin_confirmed_by = ?, admin_confirmed_at = NOW() WHERE id = ?',
        [status, req.admin.id, id]
      );

      // 获取登录记录详情
      const [loginLogs] = await db.execute(
        'SELECT ll.*, m.email FROM login_logs ll JOIN members m ON ll.member_id = m.id WHERE ll.id = ?',
        [id]
      );

      if (loginLogs.length > 0) {
        const loginLog = loginLogs[0];
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
      const [requests] = await db.execute(`
        SELECT sv.*, m.email 
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

  // 审核验证请求
  router.post('/approve-verification/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      const status = approved ? 'approved' : 'rejected';

      await db.execute(
        'UPDATE second_verifications SET status = ?, admin_confirmed_by = ?, admin_confirmed_at = NOW() WHERE id = ?',
        [status, req.admin.id, id]
      );

      if (approved) {
        // 获取验证记录详情
        const [verifications] = await db.execute(
          'SELECT sv.*, m.email FROM second_verifications sv JOIN members m ON sv.member_id = m.id WHERE sv.id = ?',
          [id]
        );

        if (verifications.length > 0) {
          const verification = verifications[0];
          
          // 分配礼品卡
          const [availableCards] = await db.execute(
            'SELECT * FROM gift_cards WHERE status = "available" AND card_type = "login" LIMIT 1'
          );

          if (availableCards.length > 0) {
            const giftCard = availableCards[0];
            
            // 更新礼品卡状态
            await db.execute(
              'UPDATE gift_cards SET status = "distributed", distributed_to = ?, distributed_at = NOW() WHERE id = ?',
              [verification.member_id, giftCard.id]
            );

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
        const [verifications] = await db.execute('SELECT member_id FROM second_verifications WHERE id = ?', [id]);
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

  // 获取会员列表
  router.get('/members', authenticateAdmin, async (req, res) => {
    try {
      const [members] = await db.execute(`
        SELECT m.*, 
               COUNT(DISTINCT ll.id) as login_count,
               COUNT(DISTINCT cr.id) as checkin_count,
               COUNT(DISTINCT gc.id) as gift_cards_received
        FROM members m
        LEFT JOIN login_logs ll ON m.id = ll.member_id
        LEFT JOIN checkin_records cr ON m.id = cr.member_id
        LEFT JOIN gift_cards gc ON m.id = gc.distributed_to
        GROUP BY m.id
        ORDER BY m.created_at DESC
      `);
      res.json(members);
    } catch (error) {
      console.error('获取会员列表错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取礼品卡分类
  router.get('/gift-card-categories', authenticateAdmin, async (req, res) => {
    try {
      const [categories] = await db.execute('SELECT * FROM gift_card_categories ORDER BY name');
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
      const [result] = await db.execute(
        'INSERT INTO gift_card_categories (name, description) VALUES (?, ?)',
        [name, description]
      );
      res.json({ id: result.insertId, message: req.t('category_created') });
    } catch (error) {
      console.error('添加礼品卡分类错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 批量添加礼品卡
  router.post('/gift-cards/batch', authenticateAdmin, async (req, res) => {
    try {
      const { categoryId, codes, cardType = 'login' } = req.body;
      const codeList = codes.split('\n').filter(code => code.trim());
      
      const values = codeList.map(code => [categoryId, code.trim(), cardType]);
      
      if (values.length > 0) {
        await db.execute(
          'INSERT INTO gift_cards (category_id, code, card_type) VALUES ?',
          [values]
        );
      }

      res.json({ 
        message: req.t('gift_cards_added'),
        count: values.length 
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

      query += ' ORDER BY gc.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const [giftCards] = await db.execute(query, params);
      res.json(giftCards);
    } catch (error) {
      console.error('获取礼品卡列表错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  return router;
};