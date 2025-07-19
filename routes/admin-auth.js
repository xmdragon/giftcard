const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../utils/db');
const router = express.Router();

module.exports = (io) => {
  // 管理员登录
  router.post('/login', async (req, res) => {
    try {
      console.log('管理员登录请求开始处理');
      const { username, password } = req.body;
      console.log(`尝试登录的管理员用户名: ${username}`);

      console.log('准备执行数据库查询');
      const admins = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
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
    }
  });

  return router;
};