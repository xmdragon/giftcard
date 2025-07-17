const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'giftcard_user',
  password: process.env.DB_PASSWORD || 'GiftCard_User_2024!',
  database: process.env.DB_NAME || 'gift_card_system'
};

/**
 * 创建数据库连接
 * @returns {Promise<mysql.Connection>} 数据库连接对象
 */
async function createConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}

module.exports = {
  createConnection,
  dbConfig
};