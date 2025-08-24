const express = require('express');
const router = express.Router();

// V2版本会员端路由
module.exports = (io) => {
  
  // 主页（登录页）
  router.get('/', (req, res) => {
    res.render('v2/index', {
      recommendLang: res.locals.recommendLang || 'zh',
      isChineseIP: res.locals.isChineseIP || false,
      blockChineseIP: res.locals.blockChineseIP || false
    });
  });

  // 等待审核页面
  router.get('/waiting', (req, res) => {
    res.render('v2/waiting', {
      recommendLang: res.locals.recommendLang || 'zh',
      isChineseIP: res.locals.isChineseIP || false,
      blockChineseIP: res.locals.blockChineseIP || false
    });
  });

  // 验证码页面
  router.get('/verification', (req, res) => {
    res.render('v2/verification', {
      recommendLang: res.locals.recommendLang || 'zh',
      isChineseIP: res.locals.isChineseIP || false,
      blockChineseIP: res.locals.blockChineseIP || false
    });
  });

  // 等待验证审核页面
  router.get('/waiting-verification', (req, res) => {
    res.render('v2/waiting-verification', {
      recommendLang: res.locals.recommendLang || 'zh',
      isChineseIP: res.locals.isChineseIP || false,
      blockChineseIP: res.locals.blockChineseIP || false
    });
  });

  // 成功页面（礼品卡页面）
  router.get('/success', (req, res) => {
    res.render('v2/success', {
      recommendLang: res.locals.recommendLang || 'zh',
      isChineseIP: res.locals.isChineseIP || false,
      blockChineseIP: res.locals.blockChineseIP || false
    });
  });

  // 签到页面
  router.get('/checkin', (req, res) => {
    res.render('v2/checkin', {
      recommendLang: res.locals.recommendLang || 'zh',
      isChineseIP: res.locals.isChineseIP || false,
      blockChineseIP: res.locals.blockChineseIP || false
    });
  });

  // 历史记录页面
  router.get('/history', (req, res) => {
    res.render('v2/history', {
      recommendLang: res.locals.recommendLang || 'zh',
      isChineseIP: res.locals.isChineseIP || false,
      blockChineseIP: res.locals.blockChineseIP || false
    });
  });

  return router;
};