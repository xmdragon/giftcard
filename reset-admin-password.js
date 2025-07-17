const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAdminPassword() {
  console.log('开始重置管理员密码');
  
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
    
    // 生成新密码的哈希
    console.log('生成新密码哈希...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log(`新密码哈希: ${hashedPassword}`);
    
    // 更新管理员密码
    console.log('更新管理员密码...');
    const [result] = await db.execute(
      'UPDATE admins SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    console.log(`更新结果: 影响了 ${result.affectedRows} 行`);
    
    if (result.affectedRows > 0) {
      console.log('管理员密码重置成功');
    } else {
      console.log('未找到管理员账号，尝试创建...');
      
      // 创建管理员账号
      const [createResult] = await db.execute(
        'INSERT INTO admins (username, password) VALUES (?, ?)',
        ['admin', hashedPassword]
      );
      
      console.log(`创建结果: ID = ${createResult.insertId}`);
      console.log('管理员账号创建成功');
    }
    
    // 关闭数据库连接
    await db.end();
    console.log('数据库连接已关闭');
    
  } catch (error) {
    console.error('重置失败:', error);
  }
}

resetAdminPassword();