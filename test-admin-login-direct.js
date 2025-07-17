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
    
    // 查询管理员
    console.log('查询管理员账号...');
    const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', ['admin']);
    console.log(`找到 ${admins.length} 个匹配的管理员账号`);
    
    if (admins.length > 0) {
      const admin = admins[0];
      console.log(`管理员ID: ${admin.id}, 用户名: ${admin.username}, 密码哈希: ${admin.password}`);
      
      // 测试密码验证
      const password = 'admin123';
      const md5Password = crypto.createHash('md5').update(password).digest('hex');
      console.log(`测试密码: ${password}`);
      console.log(`计算的MD5: ${md5Password}`);
      console.log(`数据库中的密码: ${admin.password}`);
      
      const validPassword = (md5Password === admin.password);
      console.log(`密码验证结果: ${validPassword ? '成功' : '失败'}`);
    }
    
    // 关闭数据库连接
    await db.end();
    console.log('数据库连接已关闭');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testAdminLoginDirect();