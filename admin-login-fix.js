const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config();

// 创建路由
const router = express.Router();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'giftcard_user',
  password: process.env.DB_PASSWORD || 'GiftCard_User_2024!',
  database: process.env.DB_NAME || 'gift_card_system'
};

// 管理员登录路由
router.post('/admin/login', async (req, res) => {
  try {
    console.log('管理员登录请求开始处理');
    const { username, password } = req.body;
    console.log(`尝试登录的管理员用户名: ${username}`);
    
    // 连接数据库
    console.log('尝试连接数据库...');
    const db = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 准备SQL语句
    const sql = 'SELECT * FROM admins WHERE username = ?';
    const params = [username];
    console.log(`准备执行SQL: ${sql}, 参数: ${JSON.stringify(params)}`);
    
    try {
      const [admins] = await db.execute(sql, params);
      console.log(`查询结果: 找到 ${admins.length} 个匹配的管理员账号`);
      
      if (admins.length === 0) {
        console.log('未找到匹配的管理员账号');
        await db.end();
        return res.status(400).json({ error: '用户名或密码错误' });
      }

      const admin = admins[0];
      console.log(`找到管理员账号: ID=${admin.id}, 用户名=${admin.username}, 密码哈希=${admin.password}`);
      
      // 使用MD5验证密码
      const md5Password = crypto.createHash('md5').update(password).digest('hex');
      console.log(`输入密码的MD5: ${md5Password}`);
      console.log(`数据库中的密码: ${admin.password}`);
      
      const validPassword = (md5Password === admin.password);
      console.log(`密码验证结果: ${validPassword ? '成功' : '失败'}`);
      
      if (!validPassword) {
        await db.end();
        return res.status(400).json({ error: '用户名或密码错误' });
      }

      console.log('生成JWT令牌');
      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      console.log('管理员登录成功');
      await db.end();
      res.json({
        token,
        admin: { id: admin.id, username: admin.username }
      });
    } catch (dbError) {
      console.error(`数据库查询错误: ${dbError.message}`);
      console.error(`执行的SQL: ${sql}, 参数: ${JSON.stringify(params)}`);
      console.error('错误堆栈:', dbError.stack);
      await db.end();
      throw dbError;
    }
  } catch (error) {
    console.error('管理员登录错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
});

module.exports = router;