const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testAdminLogin() {
  console.log('开始测试管理员登录功能');
  
  // 数据库配置
  const dbConfig = {
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'giftcard_user',
    password: process.env.DB_PASSWORD || 'GiftCard_User_2024!',
    database: process.env.DB_NAME || 'gift_card_system'
  };
  
  console.log(`数据库配置: ${JSON.stringify({
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database
  })}`);
  
  try {
    // 连接数据库
    console.log('尝试连接数据库...');
    const db = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 测试查询
    console.log('执行测试查询...');
    const [result] = await db.execute('SELECT 1 as test');
    console.log(`测试查询结果: ${JSON.stringify(result)}`);
    
    // 查询管理员
    console.log('查询管理员账号...');
    const [admins] = await db.execute('SELECT * FROM admins');
    console.log(`找到 ${admins.length} 个管理员账号`);
    
    if (admins.length > 0) {
      const admin = admins[0];
      console.log(`管理员ID: ${admin.id}, 用户名: ${admin.username}`);
      
      // 测试密码验证
      console.log('测试密码验证...');
      const validPassword = await bcrypt.compare('admin123', admin.password);
      console.log(`密码验证结果: ${validPassword ? '成功' : '失败'}`);
      
      if (validPassword) {
        // 生成JWT令牌
        console.log('生成JWT令牌...');
        const token = jwt.sign(
          { id: admin.id, username: admin.username, role: 'admin' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '24h' }
        );
        console.log(`JWT令牌: ${token}`);
      }
    }
    
    // 关闭数据库连接
    await db.end();
    console.log('数据库连接已关闭');
    
  } catch (error) {
    console.error('测试失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

testAdminLogin();