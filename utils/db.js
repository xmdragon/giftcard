const mysql = require('mysql2/promise');
const { getDbConfig } = require('./db-init');

// 创建数据库连接池
const pool = mysql.createPool({
  ...getDbConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 执行查询
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 获取单个结果
async function getOne(sql, params) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// 插入数据
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  
  try {
    const [result] = await pool.execute(sql, values);
    return result;
  } catch (error) {
    console.error(`插入数据到 ${table} 失败:`, error);
    throw error;
  }
}

// 更新数据
async function update(table, data, condition) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  const whereClause = typeof condition === 'string' ? condition : Object.keys(condition).map(key => `${key} = ?`).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  
  const params = values.concat(typeof condition === 'string' ? [] : Object.values(condition));
  
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error(`更新 ${table} 失败:`, error);
    throw error;
  }
}

// 删除数据
async function remove(table, condition) {
  const whereClause = typeof condition === 'string' ? condition : Object.keys(condition).map(key => `${key} = ?`).join(' AND ');
  const params = typeof condition === 'string' ? [] : Object.values(condition);
  
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error(`从 ${table} 删除数据失败:`, error);
    throw error;
  }
}

// 事务处理
async function transaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('事务执行失败:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  getOne,
  insert,
  update,
  remove,
  transaction
};