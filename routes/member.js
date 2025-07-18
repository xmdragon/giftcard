const express = require('express');
const router = express.Router();
const db = require('../utils/db');

module.exports = (io) => {
  // 会员签到
  router.post('/checkin', async (req, res) => {
    try {
      const { memberId } = req.body;
      const today = new Date().toISOString().split('T')[0];

      // 检查今天是否已经签到
      const existingCheckin = await db.query(
        'SELECT * FROM checkin_records WHERE member_id = ? AND checkin_date = ?',
        [memberId, today]
      );

      if (existingCheckin.length > 0) {
        return res.status(400).json({ error: req.t('already_checked_in_today') });
      }

      // 检查会员是否有资格签到（之前领过礼品卡）
      const giftCardHistory = await db.query(
        'SELECT * FROM gift_cards WHERE distributed_to = ? AND status = "distributed" LIMIT 1',
        [memberId]
      );

      if (giftCardHistory.length === 0) {
        return res.status(400).json({ error: req.t('no_checkin_eligibility') });
      }

      // 检查7天签到期限
      const firstGiftCard = await db.query(
        'SELECT distributed_at FROM gift_cards WHERE distributed_to = ? ORDER BY distributed_at ASC LIMIT 1',
        [memberId]
      );

      const firstGiftDate = new Date(firstGiftCard[0].distributed_at);
      const daysDiff = Math.floor((new Date() - firstGiftDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 7) {
        return res.status(400).json({ error: req.t('checkin_period_expired') });
      }

      // 使用事务处理签到和礼品卡分配
      return await db.transaction(async (connection) => {
        // 获取可用的签到礼品卡
        const [availableCardsResult] = await connection.execute(
          'SELECT * FROM gift_cards WHERE status = "available" AND card_type = "checkin" LIMIT 1 FOR UPDATE'
        );
        
        let giftCardId = null;
        let giftCardCode = null;

        if (availableCardsResult.length > 0) {
          const giftCard = availableCardsResult[0];
          giftCardId = giftCard.id;
          giftCardCode = giftCard.code;

          // 更新礼品卡状态
          await connection.execute(
            'UPDATE gift_cards SET status = "distributed", distributed_to = ?, distributed_at = NOW() WHERE id = ?',
            [memberId, giftCard.id]
          );
        }

        // 记录签到
        await connection.execute(
          'INSERT INTO checkin_records (member_id, checkin_date, gift_card_id) VALUES (?, ?, ?)',
          [memberId, today, giftCardId]
        );

        return res.json({
          message: req.t('checkin_successful'),
          giftCardCode,
          hasGiftCard: !!giftCardCode
        });
      });

    } catch (error) {
      console.error('签到错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取会员签到历史
  router.get('/checkin-history/:memberId', async (req, res) => {
    try {
      const { memberId } = req.params;

      const history = await db.query(`
        SELECT cr.*, gc.code as gift_card_code
        FROM checkin_records cr
        LEFT JOIN gift_cards gc ON cr.gift_card_id = gc.id
        WHERE cr.member_id = ?
        ORDER BY cr.checkin_date DESC
      `, [memberId]);

      res.json(history);
    } catch (error) {
      console.error('获取签到历史错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 获取会员礼品卡历史
  router.get('/gift-cards/:memberId', async (req, res) => {
    try {
      const { memberId } = req.params;

      const giftCards = await db.query(`
        SELECT gc.*, gcc.name as category_name
        FROM gift_cards gc
        LEFT JOIN gift_card_categories gcc ON gc.category_id = gcc.id
        WHERE gc.distributed_to = ?
        ORDER BY gc.distributed_at DESC
      `, [memberId]);

      res.json(giftCards);
    } catch (error) {
      console.error('获取礼品卡历史错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  // 检查会员签到资格
  router.get('/checkin-eligibility/:memberId', async (req, res) => {
    try {
      const { memberId } = req.params;
      const today = new Date().toISOString().split('T')[0];

      // 检查今天是否已签到
      const todayCheckin = await db.query(
        'SELECT * FROM checkin_records WHERE member_id = ? AND checkin_date = ?',
        [memberId, today]
      );

      // 检查是否有礼品卡历史
      const giftCardHistory = await db.query(
        'SELECT distributed_at FROM gift_cards WHERE distributed_to = ? ORDER BY distributed_at ASC LIMIT 1',
        [memberId]
      );

      let eligible = false;
      let reason = '';
      let daysRemaining = 0;

      if (todayCheckin.length > 0) {
        reason = req.t('already_checked_in_today');
      } else if (giftCardHistory.length === 0) {
        reason = req.t('no_checkin_eligibility');
      } else {
        const firstGiftDate = new Date(giftCardHistory[0].distributed_at);
        const daysDiff = Math.floor((new Date() - firstGiftDate) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, 7 - daysDiff);

        if (daysDiff > 7) {
          reason = req.t('checkin_period_expired');
        } else {
          eligible = true;
        }
      }

      res.json({
        eligible,
        reason,
        daysRemaining,
        alreadyCheckedInToday: todayCheckin.length > 0
      });

    } catch (error) {
      console.error('检查签到资格错误:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  return router;
};