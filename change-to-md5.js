const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function changeToMd5() {
  console.log('开始将管理员密码改为MD5格式');
  
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
    
    // 生成MD5密码
    const password = 'admin123';
    const md5Password = crypto.createHash('md5').update(password).digest('hex');
    console.log(`原始密码: ${password}`);
    console.log(`MD5密码: ${md5Password}`);
    
    // 更新管理员密码为MD5格式
    console.log('更新管理员密码为MD5格式...');
    const [result] = await db.execute(
      'UPDATE admins SET password = ? WHERE username = ?',
      [md5Password, 'admin']
    );
    
    console.log(`更新结果: 影响了 ${result.affectedRows} 行`);
    
    if (result.affectedRows > 0) {
      console.log('管理员密码已更新为MD5格式');
    } else {
      console.log('未找到管理员账号，尝试创建...');
      
      // 创建管理员账号
      const [createResult] = await db.execute(
        'INSERT INTO admins (username, password) VALUES (?, ?)',
        ['admin', md5Password]
      );
      
      console.log(`创建结果: ID = ${createResult.insertId}`);
      console.log('管理员账号创建成功（使用MD5密码）');
    }
    
    // 关闭数据库连接
    await db.end();
    console.log('数据库连接已关闭');
    
  } catch (error) {
    console.error('操作失败:', error);
  }
}

changeToMd5();