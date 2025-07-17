const mysql = require('mysql2/promise');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

async function testAdminLoginDirect() {
  console.log('开始直接测试管理员登录功能');
  
  // 数据库配置
  const dbConfig = {
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'giftcard_user',
    password: process.env.DB_PASSWORD || 'GiftCard_User_2024!',
    database: process.env.DB_NAME || 'gift_card_system'
  };
  
  try {
    // 连接数据库
    console.log('尝试连接数据库...');
    const db = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 创建一个简单的Express应用
    const app = express();
    app.use(bodyParser.json());
    
    // 添加管理员登录路由
    app.post('/admin/login', async (req, res) => {
      try {
        console.log('管理员登录请求开始处理');
        const { username, password } = req.body;
        console.log(`尝试登录的管理员用户名: ${username}`);
        
        // 准备SQL语句
        const sql = 'SELECT * FROM admins WHERE username = ?';
        const params = [username];
        console.log(`准备执行SQL: ${sql}, 参数: ${JSON.stringify(params)}`);
        
        try {
          const [admins] = await db.execute(sql, params);
          console.log(`查询结果: 找到 ${admins.length} 个匹配的管理员账号`);
          
          if (admins.length === 0) {
            console.log('未找到匹配的管理员账号');
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
            return res.status(400).json({ error: '用户名或密码错误' });
          }

          console.log('管理员登录成功');
          res.json({
            message: '登录成功',
            admin: { id: admin.id, username: admin.username }
          });
        } catch (dbError) {
          console.error(`数据库查询错误: ${dbError.message}`);
          console.error(`执行的SQL: ${sql}, 参数: ${JSON.stringify(params)}`);
          console.error('错误堆栈:', dbError.stack);
          throw dbError;
        }
      } catch (error) {
        console.error('管理员登录错误:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({ error: '服务器错误，请稍后重试' });
      }
    });
    
    // 启动服务器
    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`测试服务器运行在端口 ${PORT}`);
      
      // 模拟登录请求
      setTimeout(async () => {
        try {
          console.log('发送测试登录请求...');
          const response = await fetch('http://localhost:3001/admin/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: 'admin',
              password: 'admin123'
            })
          });
          
          const data = await response.json();
          console.log(`响应状态码: ${response.status}`);
          console.log(`响应数据: ${JSON.stringify(data, null, 2)}`);
          
          // 关闭数据库连接和服务器
          await db.end();
          console.log('测试完成，程序将在3秒后退出');
          setTimeout(() => process.exit(0), 3000);
        } catch (error) {
          console.error('测试请求失败:', error);
          process.exit(1);
        }
      }, 1000);
    });
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

testAdminLoginDirect();