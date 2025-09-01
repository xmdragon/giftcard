const express = require('express');
const router = express.Router();
const db = require('../utils/db');

module.exports = (io) => {
  router.post('/checkin', async (req, res) => {
    try {
      const { memberId } = req.body;
      const today = new Date().toISOString().split('T')[0];

      const existingCheckin = await db.query(
        'SELECT * FROM checkin_records WHERE member_id = ? AND checkin_date = ?',
        [memberId, today]
      );

      if (existingCheckin.length > 0) {
        return res.status(400).json({ error: req.t('already_checked_in_today') });
      }

      const todayBeginnerPackage = await db.query(
        'SELECT * FROM gift_cards WHERE distributed_to = ? AND category_id = 1 AND DATE(distributed_at) = ?',
        [memberId, today]
      );

      if (todayBeginnerPackage.length > 0) {
        return res.status(400).json({ error: req.t('received_beginner_package_today') });
      }

      const giftCardHistory = await db.query(
        'SELECT * FROM gift_cards WHERE distributed_to = ? AND status = "distributed" LIMIT 1',
        [memberId]
      );

      if (giftCardHistory.length === 0) {
        return res.status(400).json({ error: req.t('no_checkin_eligibility') });
      }

      const firstGiftCard = await db.query(
        'SELECT distributed_at FROM gift_cards WHERE distributed_to = ? ORDER BY distributed_at ASC LIMIT 1',
        [memberId]
      );

      const firstGiftDate = new Date(firstGiftCard[0].distributed_at);
      const daysDiff = Math.floor((new Date() - firstGiftDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 7) {
        return res.status(400).json({ error: req.t('checkin_period_expired') });
      }

      return await db.transaction(async (connection) => {
        const [availableCardsResult] = await connection.execute(
          'SELECT gc.* FROM gift_cards gc JOIN gift_card_categories gcc ON gc.category_id = gcc.id WHERE gc.status = "available" AND gcc.id = 2 LIMIT 1 FOR UPDATE'
        );
        
        let giftCardId = null;
        let giftCardCode = null;

        if (availableCardsResult.length > 0) {
          const giftCard = availableCardsResult[0];
          giftCardId = giftCard.id;
          giftCardCode = giftCard.code;

          await connection.execute(
            'UPDATE gift_cards SET status = "distributed", distributed_to = ?, distributed_at = NOW() WHERE id = ?',
            [memberId, giftCard.id]
          );
        }

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
      console.error('Checkin error:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

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
      console.error('Get checkin history error:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

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
      console.error('Get gift card history error:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  router.get('/checkin-eligibility/:memberId', async (req, res) => {
    try {
      const { memberId } = req.params;
      const today = new Date().toISOString().split('T')[0];

      const todayCheckin = await db.query(
        'SELECT * FROM checkin_records WHERE member_id = ? AND checkin_date = ?',
        [memberId, today]
      );

      const giftCardHistory = await db.query(
        'SELECT distributed_at FROM gift_cards WHERE distributed_to = ? ORDER BY distributed_at ASC LIMIT 1',
        [memberId]
      );

      // Check if user received beginner package (category_id = 1) today
      const todayBeginnerPackage = await db.query(
        'SELECT * FROM gift_cards WHERE distributed_to = ? AND category_id = 1 AND DATE(distributed_at) = ?',
        [memberId, today]
      );

      let eligible = false;
      let reason = '';
      let daysRemaining = 0;

      if (todayCheckin.length > 0) {
        reason = 'already_checked_in_today';
      } else if (todayBeginnerPackage.length > 0) {
          reason = 'received_beginner_package_today';
      } else if (giftCardHistory.length === 0) {
        reason = 'no_checkin_eligibility';
      } else {
        const firstGiftDate = new Date(giftCardHistory[0].distributed_at);
        const daysDiff = Math.floor((new Date() - firstGiftDate) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, 7 - daysDiff);

        if (daysDiff > 7) {
          reason = 'checkin_period_expired';
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
      console.error('Check checkin eligibility error:', error);
      res.status(500).json({ error: req.t('server_error') });
    }
  });

  return router;
};